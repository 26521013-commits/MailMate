// ==========================================
// FILE: script.js (Chỉ chứa Logic xử lý)
// ==========================================

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
let currentTopic = Object.keys(TOPICS)[0];
function store(k, v) {
  try {
    if (v === undefined) {
      const item = localStorage.getItem(k);
      return JSON.parse(item !== null ? item : "null");
    }
    localStorage.setItem(k, JSON.stringify(v));
  } catch (e) {
    return null;
  }
} // Chuyển đổi Ngôn ngữ UI
let uiLang = store("mm_ui_lang") || "vi";
function applyUiLang() {
  $$("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (I18N[uiLang] && I18N[uiLang][key]) {
      el.innerHTML = I18N[uiLang][key];
    }
  });
  $$("#uiLangSwitch button").forEach((btn) => {
    btn.classList.toggle("active", btn.getAttribute("data-lang") === uiLang);
  });
}
applyUiLang();
$$("#uiLangSwitch button").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    uiLang = e.target.getAttribute("data-lang");
    store("mm_ui_lang", uiLang);
    applyUiLang();
  });
});

// Chuyển Sáng Tối & Màu Sắc
const themeBtn = $("#theme-toggle");
let isDark = store("mm_dark_mode") === true;
function updateDarkMode() {
  if (isDark) document.documentElement.setAttribute("data-theme", "dark");
  else document.documentElement.removeAttribute("data-theme");
  if (themeBtn) themeBtn.innerText = isDark ? "☀️" : "🌙";
}
updateDarkMode();
if (themeBtn)
  themeBtn.onclick = () => {
    isDark = !isDark;
    store("mm_dark_mode", isDark);
    updateDarkMode();
  };

const PRE = [
  ["Xanh dương", "#1F5FBF"],
  ["Hồng", "#E8589A"],
  ["Đỏ", "#D62839"],
  ["Tím", "#7C5CFF"],
  ["Xanh lá", "#2E9E6B"],
  ["Cam", "#F07A22"],
];
$("#sws").innerHTML = PRE.map(
  (p) =>
    `<button class="sw" style="background:${p[1]}" data-a="${p[1]}" title="${p[0]}"></button>`,
).join("");
function applyColor(a) {
  if (!a) {
    document.documentElement.style.removeProperty("--acc");
    return;
  }
  document.documentElement.style.setProperty("--acc", a);
}
$("#sws").addEventListener("click", (e) => {
  const d = e.target.dataset;
  if (d.a) {
    applyColor(d.a);
    store("mm_color", d.a);
  }
});
$("#rst").onclick = () => {
  applyColor(null);
  store("mm_color", null);
};
{
  const c = store("mm_color");
  if (c) applyColor(c);
}

// Hiệu ứng Bot & Chuyển Tab
function sparkle(host, n) {
  const ch = ["✦", "✧", "♡", "✉", "⋆", "✿"],
    r = Math.random;
  for (let i = 0; i < n; i++) {
    const e = document.createElement("span");
    e.className = "spk";
    e.textContent = ch[i % ch.length];
    e.style.cssText = `left:${r() * 96}%;top:${r() * 96}%;font-size:${11 + r() * 17}px;animation-delay:${r() * 3}s;animation-duration:${2 + r() * 2}s;color:var(${i % 2 ? "--acc" : "--acc2"})`;
    if (host) host.appendChild(e);
  }
}
sparkle($("#deco"), 14);
sparkle($("#hello"), 20);

const helloBot = $("#hello");
if (helloBot) {
  let t;
  const close = () => {
    clearTimeout(t);
    helloBot.classList.add("out");
    setTimeout(() => helloBot.remove(), 600);
  };
  helloBot.addEventListener("click", close);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" || e.key === "Enter") close();
  });
  const hiBtn = $("#hi");
  if (hiBtn) hiBtn.focus();
  t = setTimeout(close, 4000);
}

document.querySelector(".nav").addEventListener("click", (e) => {
  const b = e.target.closest(".tab");
  if (b) {
    $("#vCompose").hidden = b.dataset.v !== "compose";
    $("#vForum").hidden = b.dataset.v !== "forum";
    $$(".nav .tab").forEach((tab) =>
      tab.setAttribute("aria-selected", tab === b),
    );
  }
});

// Dropdown & Soạn thư
$("#topic").innerHTML = Object.keys(TOPICS)
  .map((t) => `<option value="${t}">${t}</option>`)
  .join("");
$("#topic").addEventListener("change", (e) => {
  setTopic(e.target.value);
});

function setTopic(t) {
  currentTopic = t;
  const sug = TOPICS[t].r;
  const list = [...sug, ...ALL_R.filter((x) => !sug.includes(x)), OTHER];
  $("#rcp").innerHTML = list
    .map((x) => `<option value="${x}">${x}</option>`)
    .join("");
  $("#rcpx").hidden = true;
}
setTopic(currentTopic);

$("#rcp").addEventListener("change", () => {
  const o = $("#rcp").value === OTHER;
  $("#rcpx").hidden = !o;
  if (o) $("#rcpx").focus();
});
function getRecipientRole() {
  return $("#rcp").value === OTHER ? $("#rcpx").value.trim() : $("#rcp").value;
}

function showError(inputId, message) {
  const inputEl = document.getElementById(inputId);
  const errorEl = document.getElementById("err-" + inputId);
  if (inputEl) inputEl.classList.add("input-error");
  if (errorEl) {
    errorEl.innerText = message;
    errorEl.classList.add("show");
  }
}
function clearAllErrors() {
  $$(".input-error").forEach((el) => el.classList.remove("input-error"));
  $$(".error-text").forEach((el) => {
    el.classList.remove("show");
    el.innerText = "";
  });
}
function removeVietnameseTones(str) {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}
async function translateText(text, targetLang) {
  if (targetLang === "vi") return text;
  try {
    const response = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=vi|${targetLang}`,
    );
    const data = await response.json();
    return data.responseData.translatedText;
  } catch (error) {
    return text;
  }
}

$("#go").onclick = async () => {
  clearAllErrors();
  let hasError = false;

  const role = getRecipientRole();
  const rname = $("#rname").value.trim();
  const me = $("#me").value.trim();
  const rto = $("#rto").value.trim();
  const sid = $("#sid").value.trim();
  const maj = $("#maj").value.trim();
  const pts = $("#pts").value.trim();
  const tone = $("#tone").value;

  const invalidCharRegex = /[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/;
  const nonDigitRegex = /[^0-9]/;

  if (!rname) {
    showError(
      "rname",
      uiLang === "vi"
        ? "Vui lòng nhập tên người nhận."
        : "Please enter recipient name.",
    );
    hasError = true;
  } else if (invalidCharRegex.test(rname)) {
    showError(
      "rname",
      uiLang === "vi"
        ? "Tên không chứa ký tự đặc biệt."
        : "No special characters.",
    );
    hasError = true;
  }

  if (!me) {
    showError(
      "me",
      uiLang === "vi" ? "Vui lòng nhập họ tên." : "Please enter your name.",
    );
    hasError = true;
  } else if (invalidCharRegex.test(me)) {
    showError(
      "me",
      uiLang === "vi"
        ? "Họ tên không chứa ký tự đặc biệt."
        : "No special characters.",
    );
    hasError = true;
  }

  if (!rto || !rto.includes("@")) {
    showError(
      "rto",
      uiLang === "vi" ? "Email không hợp lệ." : "Invalid email.",
    );
    hasError = true;
  }
  if (!maj) {
    showError(
      "maj",
      uiLang === "vi" ? "Vui lòng nhập ngành." : "Major required.",
    );
    hasError = true;
  }
  if (!sid || nonDigitRegex.test(sid)) {
    showError(
      "sid",
      uiLang === "vi"
        ? "MSSV chỉ chứa số."
        : "Student ID must be numbers only.",
    );
    hasError = true;
  }
  if (!pts) {
    showError(
      "pts",
      uiLang === "vi" ? "Vui lòng nhập lý do." : "Reason required.",
    );
    hasError = true;
  }

  if (hasError) return;

  $("#go").disabled = true;
  $("#go").innerText =
    uiLang === "vi" ? "⏳ AI đang dịch và tạo thư..." : "⏳ AI is composing...";
  $("#msg").innerText = "";

  const lang = $("#lang").value;
  let finalName = me,
    finalTeacher = rname;
  if (lang !== "vi") {
    finalName = removeVietnameseTones(me);
    finalTeacher = removeVietnameseTones(rname);
  }

  let finalDetails = await translateText(pts, lang);
  let finalSubject = "",
    finalBody = "";

  let greeting = `Kính gửi ${role} ${finalTeacher},`;
  let closing = `Kính thư,\n\n${finalName}`;

  if (tone.includes("gần gũi")) {
    greeting = `Thân gửi ${role} ${finalTeacher},`;
    closing = `Trân trọng,\n\n${finalName}`;
  } else if (tone.includes("Ngắn gọn")) {
    greeting = `Gửi ${finalTeacher},`;
    closing = `${finalName}`;
  }

  if (lang === "vi") {
    finalSubject = `[${currentTopic.toUpperCase()}] - ${finalName} - MSSV: ${sid}`;
    if (currentTopic === "Xin nghỉ học/nghỉ làm") {
      finalBody = `${greeting}\n\nTôi/Em tên là: ${finalName}\nMSSV: ${sid}\nLớp/Ngành: ${maj}\n\nTôi/Em viết thư này để kính xin phép ${role} cho tôi/em được nghỉ.\nLý do: ${finalDetails}\n\nTôi/Em xin cam kết sẽ tự cập nhật bài giảng.\n\nXin chân thành cảm ơn.\n\n${closing}`;
    } else {
      finalBody = `${greeting}\n\nThông tin:\n- Họ tên: ${finalName}\n- MSSV: ${sid}\n- Lớp/Ngành: ${maj}\n\nNội dung chi tiết: ${finalDetails}\n\n${closing}`;
    }
  } else if (lang === "en") {
    finalSubject = `[${currentTopic.toUpperCase()}] - ${finalName} - ID: ${sid}`;
    finalBody = `Dear ${role} ${finalTeacher},\n\nMy name is ${finalName}, Student ID: ${sid}, Major: ${maj}.\n\nMessage: ${finalDetails}\n\nThank you for your time.\n\nBest regards,\n${finalName}`;
  } else {
    finalSubject = `[${currentTopic.toUpperCase()}] - ${finalName} - 学籍番号: ${sid}`;
    finalBody = `${role} ${finalTeacher} 様\n\nお疲れ様です。\n${maj}の ${finalName}（学籍番号: ${sid}）です。\n\n詳細：${finalDetails}\n\nよろしくお願いいたします。\n\n敬具\n${finalName}`;
  }

  $("#subj").value = finalSubject;
  $("#body").value = finalBody;
  $("#to").value = rto;
  updateGmailLink();

  $("#empty").hidden = true;
  $("#out").hidden = false;
  $("#go").disabled = false;
  $("#go").innerText =
    uiLang === "vi" ? "✨ AI Soạn Email Ngay" : "✨ AI Compose Now";
  $("#msg").innerText =
    uiLang === "vi"
      ? "✅ Đã tạo thư thành công!"
      : "✅ Email successfully composed!";
};

function updateGmailLink() {
  const to = encodeURIComponent($("#to").value.trim());
  const su = encodeURIComponent($("#subj").value);
  const body = encodeURIComponent($("#body").value);
  $("#gm").href =
    `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${su}&body=${body}`;
}
["#subj", "#body", "#to"].forEach((id) => {
  $(id)?.addEventListener("input", updateGmailLink);
});

// Lưu thông tin & Nháp
let savedProf = store("mm_profile");
const prof = savedProf ? savedProf : {};
["me", "sid", "maj", "rname", "rto"].forEach((id) => {
  if (prof[id]) $("#" + id).value = prof[id];
  $("#" + id).addEventListener("input", () => {
    let p = store("mm_profile");
    p = p ? p : {};
    p[id] = $("#" + id).value;
    store("mm_profile", p);
  });
});

$("#copy").onclick = async () => {
  try {
    await navigator.clipboard.writeText(
      `Tiêu đề: ${$("#subj").value}\n\n${$("#body").value}`,
    );
    $("#msg").innerText = "✅ Đã sao chép";
  } catch (err) {
    alert("Lỗi sao chép");
  }
};

function drawDrafts() {
  let d = store("mm_drafts");
  d = d ? d : [];
  $("#dl").innerHTML = d.length
    ? d
        .map(
          (x) => `
    <div class="d">
      <div><b>${x.subj ? x.subj : "..."}</b></div>
      <button class="btn" data-done="${x.id}">Đã gửi (Xóa)</button>
    </div>`,
        )
        .join("")
    : `<div class="note">${uiLang === "vi" ? "Chưa có nháp nào." : "No drafts yet."}</div>`;
}
$("#save").onclick = () => {
  if (!$("#subj").value.trim()) return;
  let d = store("mm_drafts");
  d = d ? d : [];
  d.unshift({ id: Date.now(), subj: $("#subj").value, body: $("#body").value });
  store("mm_drafts", d);
  drawDrafts();
  $("#msg").innerText = "✅ Đã lưu nháp!";
};
$("#dl").addEventListener("click", (e) => {
  if (e.target.dataset.done) {
    let d = store("mm_drafts");
    d = d ? d : [];
    store(
      "mm_drafts",
      d.filter((i) => i.id != e.target.dataset.done),
    );
    drawDrafts();
  }
});
drawDrafts();

// Logic Diễn đàn Cộng đồng (Đăng bài)
const defaultPosts = [
  {
    id: "1",
    title: "Xin nghỉ ốm tiêu chuẩn",
    topic: "Xin nghỉ học",
    author: "Nguyễn Minh",
    body: "Kính gửi Thầy/Cô, em bị sốt cao không thể đến lớp, xin phép thầy cô cho em nghỉ buổi học hôm nay...",
  },
  {
    id: "2",
    title: "Xin nộp bài tập trễ",
    topic: "Xin nộp trễ",
    author: "Trần An",
    body: "Kính gửi Thầy/Cô, do sự cố máy tính mất dữ liệu, em kính xin thầy cô gia hạn thêm 1 ngày để em hoàn thiện bài tập...",
  },
];

function drawCommunity() {
  let posts = store("mm_community_posts");
  posts = posts ? posts : defaultPosts;
  $("#flist").innerHTML = posts
    .map(
      (p) => `
    <article class="fc">
      <div class="fh">
        <div><b>${p.title}</b><small><span class="tag">${p.topic}</span>${p.author || "Ẩn danh"} · Mới nhất</small></div>
      </div>
      <p class="pv">${p.body.substring(0, 120)}...</p>
    </article>
  `,
    )
    .join("");
}
drawCommunity();

$("#shareToCommunity").onclick = () => {
  $("#dlgShare").showModal();
};
$("#cancelShare").onclick = (e) => {
  e.preventDefault();
  $("#dlgShare").close();
};
$("#confirmShare").onclick = (e) => {
  e.preventDefault();
  const title = $("#sharePostTitle").value.trim();
  const author = $("#sharePostAuthor").value.trim();
  const body = $("#body").value.trim();

  if (!title)
    return alert(
      uiLang === "vi"
        ? "Vui lòng nhập tiêu đề bài viết!"
        : "Please enter a post title!",
    );

  let posts = store("mm_community_posts");
  posts = posts ? posts : defaultPosts;

  posts.unshift({
    id: Date.now().toString(),
    title: title,
    topic: currentTopic,
    author: author,
    body: body,
  });

  store("mm_community_posts", posts);
  drawCommunity();

  $("#sharePostTitle").value = "";
  $("#sharePostAuthor").value = "";
  $("#dlgShare").close();
  $("#msg").innerText =
    uiLang === "vi"
      ? "✅ Đã đăng lên diễn đàn cộng đồng!"
      : "✅ Posted to community forum!";
};
