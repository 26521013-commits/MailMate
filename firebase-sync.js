import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { collection, deleteDoc, doc, getDoc, getDocs, getFirestore, onSnapshot, serverTimestamp, setDoc } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC6lBZUMo2zY56xXz8IRJV4PvuU1K8ZsI0",
  authDomain: "mailmate-gtn-c54d9.firebaseapp.com",
  projectId: "mailmate-gtn-c54d9",
  storageBucket: "mailmate-gtn-c54d9.firebasestorage.app",
  messagingSenderId: "58712199631",
  appId: "1:58712199631:web:4677f078dd4ea1782e42ba",
  measurementId: "G-C30E0ZT71G",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

const signInButton = document.querySelector("#googleSignIn");
const signOutButton = document.querySelector("#googleSignOut");
const accountLabel = document.querySelector("#accountLabel");
const statusLabel = document.querySelector("#cloudStatus");
const translations = {
  vi: { signedOut: "Chưa đăng nhập", syncing: "Đang đồng bộ nháp…", synced: "Nháp đã đồng bộ", syncError: "Chưa đồng bộ được. Hãy kiểm tra Firestore Rules.", signInError: "Không đăng nhập được. Hãy kiểm tra Google provider và miền được phép.", signingIn: "Đang mở Google…" },
  en: { signedOut: "Signed out", syncing: "Syncing drafts…", synced: "Drafts synced", syncError: "Could not sync. Check Firestore Rules.", signInError: "Sign-in failed. Check the Google provider and authorized domains.", signingIn: "Opening Google…" },
  ja: { signedOut: "未ログイン", syncing: "下書きを同期中…", synced: "下書きを同期しました", syncError: "同期できません。Firestoreルールを確認してください。", signInError: "ログインできません。Googleプロバイダと承認済みドメインを確認してください。", signingIn: "Googleを開いています…" },
};
const language = () => localStorage.getItem("mm2.ui") || "vi";
const say = (key) => (translations[language()] || translations.vi)[key];
const setStatus = (message = "") => { if (statusLabel) statusLabel.textContent = message; };
const privateKeys = ["mm_drafts", "mm2.drafts", "mm_profile"];
const readLocal = (key, fallback) => { try { const value = JSON.parse(localStorage.getItem(key) || "null"); return value ?? fallback; } catch { return fallback; } };
const writeLocal = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const validItems = (items) => Array.isArray(items) ? items.filter((item) => item && typeof item === "object" && item.id != null) : [];
const idFor = (id) => `id_${btoa(unescape(encodeURIComponent(String(id)))).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "")}`;
const bucketRef = (uid, name) => collection(db, "users", uid, name);
const userRef = (uid) => doc(db, "users", uid);
const localKey = { drafts: "mm2.drafts", quickDrafts: "mm_drafts" };
const baselines = { drafts: new Map(), quickDrafts: new Map() };
let activeUser = null;
let muteLocalEvents = false;
let syncTimer = 0;
let syncQueue = Promise.resolve();
const pendingKeys = new Set();
let stopDraftListener = null;
let stopQuickDraftListener = null;
let stopProfileListener = null;

function mergedItems(localItems, cloudItems) {
  const result = new Map();
  validItems(localItems).forEach((item) => result.set(String(item.id), item));
  validItems(cloudItems).forEach((item) => result.set(String(item.id), item));
  return [...result.values()];
}

function setAccount(user) {
  if (accountLabel) accountLabel.textContent = user ? (user.displayName || user.email || "Google account") : say("signedOut");
  if (signInButton) signInButton.hidden = Boolean(user);
  if (signOutButton) signOutButton.hidden = !user;
}

async function checkAdminAccess(user) {
  try {
    // Firestore Rules validate the signed-in Google email; the allowlist stays
    // out of this publicly downloadable client bundle.
    await getDoc(doc(db, "adminAccess", user.uid));
    return true;
  } catch (error) {
    if (error.code !== "permission-denied") console.error("MailMate admin access check failed", error);
    return false;
  }
}

function emitAuthState(user, isAdmin = false) {
  window.dispatchEvent(new CustomEvent("mailmate:auth-state", {
    detail: { email: user?.email || null, isAdmin },
  }));
}

function emitCloudUpdate() {
  window.dispatchEvent(new CustomEvent("mailmate:cloud-updated"));
}

function stopListeners() {
  [stopDraftListener, stopQuickDraftListener, stopProfileListener].forEach((stop) => stop?.());
  stopDraftListener = stopQuickDraftListener = stopProfileListener = null;
}

function applyRemoteBucket(name, items) {
  const key = localKey[name];
  muteLocalEvents = true;
  writeLocal(key, items);
  baselines[name] = new Map(validItems(items).map((item) => [String(item.id), item]));
  muteLocalEvents = false;
  emitCloudUpdate();
}

async function readCloudBucket(uid, name) {
  const snapshot = await getDocs(bucketRef(uid, name));
  return snapshot.docs.map((entry) => entry.data().item).filter((item) => item && item.id != null);
}

async function saveBucket(uid, name, migration = false) {
  const current = validItems(readLocal(localKey[name], []));
  const now = new Map(current.map((item) => [String(item.id), item]));
  const previous = baselines[name];
  const changes = [];
  for (const [id, oldItem] of previous) {
    if (!now.has(id) && !migration) changes.push(deleteDoc(doc(bucketRef(uid, name), idFor(id))));
    else if (now.has(id) && JSON.stringify(now.get(id)) !== JSON.stringify(oldItem)) {
      changes.push(setDoc(doc(bucketRef(uid, name), idFor(id)), { id, item: now.get(id) }));
    }
  }
  for (const [id, item] of now) {
    if (!previous.has(id)) changes.push(setDoc(doc(bucketRef(uid, name), idFor(id)), { id, item }));
  }
  await Promise.all(changes);
  baselines[name] = now;
}

async function saveProfile(uid) {
  const profile = readLocal("mm_profile", {});
  const cloudDoc = userRef(uid);
  await setDoc(cloudDoc, {
    email: activeUser?.email || "",
    displayName: activeUser?.displayName || "",
    photoURL: activeUser?.photoURL || "",
    profile,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

async function initialSync(user) {
  setStatus(say("syncing"));
  const previousUid = localStorage.getItem("mm_cloud_uid");
  if (previousUid && previousUid !== user.uid) privateKeys.forEach((key) => localStorage.removeItem(key));

  const [cloudDrafts, cloudQuickDrafts] = await Promise.all([
    readCloudBucket(user.uid, "drafts"),
    readCloudBucket(user.uid, "quickDrafts"),
  ]);
  if (auth.currentUser?.uid !== user.uid) return;
  // Profile data is stored on the user's private owner document.
  const profileDoc = await getDoc(userRef(user.uid));
  if (auth.currentUser?.uid !== user.uid) return;
  const cloudProfile = profileDoc.exists() ? (profileDoc.data().profile || {}) : {};
  const mergedDrafts = mergedItems(readLocal("mm2.drafts", []), cloudDrafts);
  const mergedQuickDrafts = mergedItems(readLocal("mm_drafts", []), cloudQuickDrafts);
  const mergedProfile = { ...readLocal("mm_profile", {}), ...cloudProfile };

  muteLocalEvents = true;
  writeLocal("mm2.drafts", mergedDrafts);
  writeLocal("mm_drafts", mergedQuickDrafts);
  writeLocal("mm_profile", mergedProfile);
  localStorage.setItem("mm_cloud_uid", user.uid);
  muteLocalEvents = false;
  baselines.drafts = new Map(cloudDrafts.map((item) => [String(item.id), item]));
  baselines.quickDrafts = new Map(cloudQuickDrafts.map((item) => [String(item.id), item]));

  await Promise.all([saveBucket(user.uid, "drafts", true), saveBucket(user.uid, "quickDrafts", true), saveProfile(user.uid)]);
  if (auth.currentUser?.uid !== user.uid) return;
  stopListeners();
  stopDraftListener = onSnapshot(bucketRef(user.uid, "drafts"), (snapshot) => applyRemoteBucket("drafts", snapshot.docs.map((entry) => entry.data().item).filter(Boolean)), () => setStatus(say("syncError")));
  stopQuickDraftListener = onSnapshot(bucketRef(user.uid, "quickDrafts"), (snapshot) => applyRemoteBucket("quickDrafts", snapshot.docs.map((entry) => entry.data().item).filter(Boolean)), () => setStatus(say("syncError")));
  stopProfileListener = onSnapshot(userRef(user.uid), (snapshot) => {
    if (!snapshot.exists()) return;
    muteLocalEvents = true;
    writeLocal("mm_profile", snapshot.data().profile || {});
    muteLocalEvents = false;
    emitCloudUpdate();
  }, () => setStatus(say("syncError")));
  setStatus(say("synced"));
  emitCloudUpdate();
}

async function syncChangedData(keys) {
  if (!activeUser) return;
  const user = activeUser;
  const job = syncQueue.then(async () => {
    if (activeUser?.uid !== user.uid) return;
    const writes = [];
    if (keys.has("mm2.drafts")) writes.push(saveBucket(user.uid, "drafts"));
    if (keys.has("mm_drafts")) writes.push(saveBucket(user.uid, "quickDrafts"));
    if (keys.has("mm_profile")) writes.push(saveProfile(user.uid));
    await Promise.all(writes);
    setStatus(say("synced"));
  });
  syncQueue = job.catch((error) => { console.error("MailMate cloud sync failed", error); setStatus(say("syncError")); });
  await job;
}

window.addEventListener("mailmate:data-changed", (event) => {
  if (muteLocalEvents || !activeUser || !["mm2.drafts", "mm_drafts", "mm_profile"].includes(event.detail?.key)) return;
  setStatus(say("syncing"));
  pendingKeys.add(event.detail.key);
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    const keys = new Set(pendingKeys);
    pendingKeys.clear();
    syncChangedData(keys);
  }, 500);
});

signInButton?.addEventListener("click", async () => {
  signInButton.disabled = true;
  setStatus(say("signingIn"));
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    if (["auth/popup-blocked", "auth/operation-not-supported-in-this-environment"].includes(error.code)) {
      try { await signInWithRedirect(auth, provider); return; } catch (redirectError) { console.error("Google sign-in failed", redirectError); }
    } else console.error("Google sign-in failed", error);
    signInButton.disabled = false;
    setStatus(say("signInError"));
  }
});

signOutButton?.addEventListener("click", async () => {
  signOutButton.disabled = true;
  try {
    await signOut(auth);
    privateKeys.forEach((key) => localStorage.removeItem(key));
    localStorage.removeItem("mm_cloud_uid");
    location.reload();
  } catch (error) {
    console.error("Sign-out failed", error);
    signOutButton.disabled = false;
  }
});

onAuthStateChanged(auth, async (user) => {
  activeUser = user;
  setAccount(user);
  setStatus("");
  stopListeners();
  if (!user) {
    emitAuthState(null, false);
    return;
  }
  const isAdmin = Boolean(user.emailVerified && await checkAdminAccess(user));
  if (auth.currentUser?.uid !== user.uid) return;
  emitAuthState(user, isAdmin);
  try {
    await initialSync(user);
  } catch (error) {
    console.error("MailMate initial sync failed", error);
    setStatus(say("syncError"));
  }
});
