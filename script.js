const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

// Lưu thông tin vào bộ nhớ
function store(k, v) {
  try {
    if (v === undefined) return JSON.parse(localStorage.getItem(k) || "null");
    localStorage.setItem(k, JSON.stringify(v));
  } catch (e) {
    return null;
  }
}

// ------------------------------------
// 1. TÍNH NĂNG GIAO DIỆN (Sáng/Tối, Màu sắc, Tab, Bot)
// ------------------------------------

// Sáng/Tối
const themeBtn = $("#theme-toggle");
let isDark = store("mm_dark_mode") || false;

function updateDarkMode() {
  if (isDark) document.documentElement.setAttribute("data-theme", "dark");
  else document.documentElement.removeAttribute("data-theme");
  if (themeBtn) themeBtn.innerText = isDark ? "☀️ Sáng" : "🌙 Tối";
}
updateDarkMode();

if (themeBtn) {
  themeBtn.onclick = () => {
    isDark = !isDark;
    store("mm_dark_mode", isDark);
    updateDarkMode();
  };
}

// Bảng Màu
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

// Hiệu ứng hạt lấp lánh & Bot
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

// Chuyển Tab (Soạn thư <-> Diễn đàn)
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

// ------------------------------------
// 2. LOGIC TẠO THƯ & QUÉT LỖI (VALIDATION)
// ------------------------------------
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
    return text + " (Lỗi dịch tự động)";
  }
}

$("#go").onclick = async () => {
  clearAllErrors();
  let hasError = false;

  const rname = $("#rname").value.trim();
  const me = $("#me").value.trim();
  const rto = $("#rto").value.trim();
  const sid = $("#sid").value.trim();
  const maj = $("#maj").value.trim();
  const pts = $("#pts").value.trim();

  const invalidCharRegex = /[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/;
  const nonDigitRegex = /[^0-9]/; // Lọc chữ, chỉ cho phép số

  // Bắt lỗi đỏ: Tên người nhận
  if (!rname) {
    showError("rname", "Vui lòng nhập tên người nhận.");
    hasError = true;
  } else if (invalidCharRegex.test(rname)) {
    showError("rname", "Tên không được chứa số/ký tự đặc biệt.");
    hasError = true;
  }

  // Bắt lỗi đỏ: Tên sinh viên
  if (!me) {
    showError("me", "Vui lòng nhập họ và tên của bạn.");
    hasError = true;
  } else if (invalidCharRegex.test(me)) {
    showError("me", "Họ tên không được chứa số/ký tự đặc biệt.");
    hasError = true;
  }

  // Bắt lỗi đỏ: Email
  if (!rto) {
    showError("rto", "Vui lòng nhập email.");
    hasError = true;
  } else if (!rto.includes("@")) {
    showError("rto", "Email phải có ký tự '@'.");
    hasError = true;
  }

  // Bắt lỗi đỏ: Lớp/Ngành (Không được bỏ trống)
  if (!maj) {
    showError("maj", "Vui lòng nhập Lớp/Ngành học.");
    hasError = true;
  }

  // Bắt lỗi đỏ: MSSV (Không được bỏ trống + Không được có chữ)
  if (!sid) {
    showError("sid", "Vui lòng nhập MSSV.");
    hasError = true;
  } else if (nonDigitRegex.test(sid)) {
    showError("sid", "MSSV bị lỗi (Chỉ được chứa số, không chứa chữ cái).");
    hasError = true;
  }

  // Bắt lỗi đỏ: Lý do
  if (!pts) {
    showError("pts", "Vui lòng nhập lý do chi tiết.");
    hasError = true;
  }

  // Dừng quá trình nếu có lỗi
  if (hasError) return;

  // Bắt đầu tạo thư
  $("#go").disabled = true;
  $("#go").innerText = "⏳ AI đang dịch và tạo thư...";
  $("#msg").innerText = "";

  const lang = $("#lang").value;
  const topic = $("#topic").value;

  let finalName = me;
  let finalTeacher = rname;
  if (lang !== "vi") {
    finalName = removeVietnameseTones(me);
    finalTeacher = removeVietnameseTones(rname);
  }

  // Chờ dịch lý do chi tiết
  let finalDetails = await translateText(pts, lang);
  let finalSubject = "",
    finalBody = "";

  if (topic === "nghi-hoc") {
    if (lang === "vi") {
      finalSubject = `[XIN NGHỈ HỌC] - ${finalName} - MSSV: ${sid}`;
      finalBody = `Kính gửi ${finalTeacher},\n\nEm tên là: ${finalName}\nMã số SV: ${sid}\nLớp/Ngành: ${maj}\n\nEm viết thư này kính xin phép ${finalTeacher} cho em được nghỉ buổi học hôm nay.\nLý do: ${finalDetails}\n\nEm xin cam kết sẽ tự nghiên cứu bài giảng và hoàn thiện các bài tập đầy đủ.\n\nEm xin chân thành cảm ơn.\n\nTrân trọng,\n${finalName}`;
    } else if (lang === "en") {
      finalSubject = `[ABSENCE REQUEST] - ${finalName} - ID: ${sid}`;
      finalBody = `Dear ${finalTeacher},\n\nMy name is ${finalName}, Student ID: ${sid}, Major: ${maj}.\n\nI am writing to respectfully request an excused absence from your class today.\nReason: ${finalDetails}\n\nI assure you that I will catch up on any missed assignments.\n\nThank you for your understanding.\n\nBest regards,\n${finalName}`;
    } else if (lang === "ja") {
      finalSubject = `[欠席届] - ${finalName} - 学籍番号: ${sid}`;
      finalBody = `${finalTeacher} 先生\n\nお疲れ様です。\n${maj}の ${finalName}（学籍番号: ${sid}）です。\n\n誠に恐縮ですが、本日の授業を欠席させていただきたくご連絡いたしました。\n理由：${finalDetails}\n\n欠席した分の課題については後日提出いたします。\n\nよろしくお願いいたします。\n\n敬具\n${finalName}`;
    }
  } else {
    finalSubject = `[${topic.toUpperCase()}] - ${finalName} - ${sid}`;
    finalBody = `Kính gửi ${finalTeacher},\n\nThông tin sinh viên:\n- Họ tên: ${finalName}\n- MSSV: ${sid}\n- Lớp/Ngành: ${maj}\n\nNội dung: ${finalDetails}\n\nTrân trọng,\n${finalName}`;
  }

  // Đẩy kết quả ra màn hình
  $("#subj").value = finalSubject;
  $("#body").value = finalBody;
  $("#to").value = rto; // Tự động điền email nhận vào kết quả

  updateGmailLink(); // Cập nhật lại đường dẫn nút Gmail

  $("#empty").hidden = true;
  $("#out").hidden = false;
  $("#go").disabled = false;
  $("#go").innerText = "✨ AI Soạn Email Ngay";
  $("#msg").innerText = "✅ Đã tạo thư thành công!";
};

// ------------------------------------
// 3. TÍNH NĂNG TIỆN ÍCH (GMAIL, COPY, LƯU NHÁP)
// ------------------------------------
function updateGmailLink() {
  const to = encodeURIComponent($("#to").value.trim());
  const su = encodeURIComponent($("#subj").value);
  const body = encodeURIComponent($("#body").value);

  // Link Gmail chuẩn hóa
  const url = `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${su}&body=${body}`;
  $("#gm").href = url;
}

// Cập nhật link liên tục nếu người dùng sửa ở ô kết quả
["#subj", "#body", "#to"].forEach((id) => {
  const el = $(id);
  if (el) el.addEventListener("input", updateGmailLink);
});

// Lưu tự động các ô thông tin cá nhân
const PF = ["me", "sid", "maj", "fac", "rname", "rto"];
const prof = store("mm_profile") || {};
PF.forEach((id) => {
  if (prof[id]) $("#" + id).value = prof[id];
  $("#" + id).addEventListener("input", () => {
    const p = store("mm_profile") || {};
    p[id] = $("#" + id).value;
    store("mm_profile", p);
  });
});

// Sao chép
$("#copy").onclick = async () => {
  const t = `Tiêu đề: ${$("#subj").value}\n\n${$("#body").value}`;
  try {
    await navigator.clipboard.writeText(t);
    $("#msg").innerText = "✅ Đã sao chép vào khay nhớ tạm.";
  } catch (err) {
    alert("Lỗi sao chép!");
  }
};

// Lưu nháp (Local Storage)
function drawDrafts() {
  const d = store("mm_drafts") || [];
  $("#dl").innerHTML = d.length
    ? d
        .map(
          (x) => `
    <div class="d">
      <div><b>${x.subj || "(Không có tiêu đề)"}</b></div>
      <button class="btn" data-done="${x.id}">Đã gửi (Xóa)</button>
    </div>`,
        )
        .join("")
    : '<div class="note">Chưa có nháp nào.</div>';
}
$("#save").onclick = () => {
  if (!$("#subj").value.trim() && !$("#body").value.trim())
    return alert("⚠️ Thư đang trống!");
  const d = store("mm_drafts") || [];
  d.unshift({ id: Date.now(), subj: $("#subj").value, body: $("#body").value });
  store("mm_drafts", d);
  drawDrafts();
  $("#msg").innerText = "✅ Đã lưu nháp!";
};
$("#dl").addEventListener("click", (e) => {
  if (e.target.dataset.done) {
    const d = store("mm_drafts") || [];
    store(
      "mm_drafts",
      d.filter((i) => i.id != e.target.dataset.done),
    );
    drawDrafts();
  }
});
drawDrafts();
