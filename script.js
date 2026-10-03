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
const SUN = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>', MOON = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
const savedDark = store("mm_dark_mode");
let isDark = savedDark ?? matchMedia("(prefers-color-scheme: dark)").matches;

function updateDarkMode() {
  if (isDark) document.documentElement.setAttribute("data-theme", "dark");
  else document.documentElement.setAttribute("data-theme", "light");
  if (themeBtn) themeBtn.innerHTML = isDark ? SUN : MOON;
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
  ["Xanh ngọc", "#14B8C4"],
];
$("#sws").innerHTML = PRE.map(
  (p) =>
    `<button class="sw" style="background:${p[1]}" data-a="${p[1]}" title="${p[0]}"></button>`,
).join("");
function applyColor(a) {
  setTimeout(() => $$("#sws .sw").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.a === a))));
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
document.querySelector(".nav").addEventListener("click-legacy", (e) => {
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
  $("#go").innerText = window.mailMateTranslate?.("quick.generating") || "⏳ AI đang dịch và tạo thư...";
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

  finalBody = applyQuickTone(finalBody, lang); // (mới) giọng điệu

  // Đẩy kết quả ra màn hình
  $("#subj").value = finalSubject;
  $("#body").value = finalBody;
  $("#to").value = rto; // Tự động điền email nhận vào kết quả

  updateGmailLink(); // Cập nhật lại đường dẫn nút Gmail

  $("#empty").hidden = true;
  $("#out").hidden = false;
  $("#go").disabled = false;
  $("#go").innerText = window.mailMateTranslate?.("quick.generate") || "✨ AI Soạn Email Ngay";
  $("#msg").innerText = window.mailMateTranslate?.("quick.created") || "✅ Đã tạo thư thành công!";
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
  if (!$("#" + id)) return; // (sửa lỗi) bỏ qua ô không tồn tại như "fac"
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
    $("#msg").innerText = window.mailMateTranslate?.("quick.copied") || "✅ Đã sao chép vào khay nhớ tạm.";
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
  $("#msg").innerText = window.mailMateTranslate?.("quick.saved") || "✅ Đã lưu nháp!";
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


// =====================================================================
// 4. TÍNH NĂNG MỞ RỘNG (lấy từ web Phú): giọng điệu, soạn theo mẫu & song ngữ,
//    nháp + nhắc nhở, diễn đàn cộng đồng, quản trị, đa ngôn ngữ giao diện
// =====================================================================

// Giọng điệu cho chế độ "AI Soạn nhanh" (Trang trọng = giữ nguyên thư gốc)
function applyQuickTone(body, lang) {
  const sel = document.getElementById("qTone");
  if (!sel || sel.value !== "friendly") return body;
  const map = {
    vi: [[/^Kính gửi /, "Chào "], [/Trân trọng,/, "Cảm ơn và thân mến,"]],
    en: [[/^Dear /, "Hi "], [/Best regards,/, "Many thanks,"]],
    ja: [],
  };
  return (map[lang] || []).reduce((t, [a, b]) => t.replace(a, b), body);
}

(() => {
  "use strict";
  const q = (s, r = document) => r.querySelector(s);
  const qa = (s, r = document) => [...r.querySelectorAll(s)];

  const KEYS = { config: "mm2.config", drafts: "mm2.drafts", posts: "mm2.posts", liked: "mm2.liked", ui: "mm2.ui", admin: "mm2.admin" };
  const DEFAULT_CONFIG = {
    siteName: "MailMate", uiLang: "vi", mailLang: "vi", tone: "formal",
    autoRemindHours: 24, moderation: true, comments: true,
    pin: "1234", // chỉ là demo phía trình duyệt
    topics: null,
  };

  // ---------- Trường nhập ----------
  const f = (vi, en, exVi, exEn) => ({ vi, en, ex: { vi: exVi, en: exEn } });
  const FIELDS = {
    recipient: f("Người nhận", "Recipient", "Thầy Nguyễn Văn A", "Prof. Smith"),
    sender: f("Họ tên của bạn", "Your name", "Trần Thu Hà", "Ha Tran"),
    senderInfo: f("Thông tin của bạn (lớp, MSSV hoặc chức vụ)", "Your details (class, ID or role)", "sinh viên lớp K65-CNTT, MSSV 20201234", "a student of class K65-IT, ID 20201234"),
    course: f("Tên môn học", "Course", "Giải tích 1", "Calculus 1"),
    date: f("Ngày", "Date", "12/03/2026", "March 12, 2026"),
    reason: f("Lý do", "Reason", "em bị sốt và có lịch khám tại bệnh viện", "I have a fever and a hospital appointment"),
    handover: f("Phương án bàn giao", "Handover plan", "anh Nam sẽ tiếp nhận các yêu cầu của khách hàng", "Nam will cover customer requests"),
    position: f("Vị trí", "Position", "Nhân viên Marketing", "Marketing Executive"),
    company: f("Công ty / tổ chức", "Company / organization", "Công ty ABC", "ABC Company"),
    highlights: f("Điểm mạnh nổi bật", "Key strengths", "3 năm chạy quảng cáo, thành thạo Google Analytics, làm việc nhóm tốt", "3 years running ads, strong Google Analytics skills, great teamwork"),
    major: f("Chuyên ngành", "Major", "Quản trị kinh doanh", "Business Administration"),
    duration: f("Thời gian thực tập", "Internship period", "3 tháng, từ 01/06 đến 31/08", "3 months, June 1 to August 31"),
    deadline: f("Hạn chót", "Deadline", "20/03/2026", "March 20, 2026"),
    newDate: f("Hạn mới đề xuất", "Proposed new date", "27/03/2026", "March 27, 2026"),
    lastDay: f("Ngày làm việc cuối cùng", "Last working day", "30/04/2026", "April 30, 2026"),
    purpose: f("Mục đích (học bổng, chương trình…)", "Purpose (scholarship, program…)", "học bổng Chevening", "the Chevening scholarship"),
    achievements: f("Thành tích nổi bật", "Key achievements", "GPA 3.6/4, nhóm đạt điểm cao nhất đồ án cuối kỳ, 2 năm trong CLB sinh viên", "GPA 3.6/4, top project in the class, 2 years in the student club"),
    originalSubject: f("Tiêu đề email đã gửi", "Original subject", "Xin gia hạn nộp bài Giải tích 1", "Extension request for Calculus 1"),
    sentDate: f("Ngày đã gửi", "Date sent", "05/03/2026", "March 5, 2026"),
  };
  const JA_FIELDS = {
    recipient: "宛先", sender: "あなたの氏名", senderInfo: "あなたの情報（クラス、学生番号、役職）", course: "科目名", date: "日付", reason: "理由", handover: "引き継ぎ計画", position: "応募職種", company: "会社・組織", highlights: "主な強み", major: "専攻", duration: "インターン期間", deadline: "締め切り", newDate: "希望する新しい期限", lastDay: "最終勤務日", purpose: "目的（奨学金、プログラムなど）", achievements: "主な実績", originalSubject: "送信済みメールの件名", sentDate: "送信日"
  };
  const COMMON_KEYS = ["recipient", "sender", "senderInfo"];
  const AREA_KEYS = new Set(["reason", "handover", "highlights", "achievements"]);

  const TONES = {
    formal: { vi: { hi: "Kính gửi {{recipient}},", bye: "Trân trọng,\n{{sender}}" }, en: { hi: "Dear {{recipient}},", bye: "Best regards,\n{{sender}}" } },
    friendly: { vi: { hi: "Chào {{recipient}},", bye: "Cảm ơn và thân mến,\n{{sender}}" }, en: { hi: "Hi {{recipient}},", bye: "Many thanks,\n{{sender}}" } },
  };

  const topic = (id, icon, name, subject, body) => ({
    id, icon, enabled: true,
    name: { vi: name[0], en: name[1] }, subject: { vi: subject[0], en: subject[1] }, body: { vi: body[0], en: body[1] },
  });
  const DEFAULT_TOPICS = [
    topic("leave_school", "🎒", ["Xin nghỉ học", "Absence from class"],
      ["Xin phép nghỉ học môn {{course}} ngày {{date}}", "Absence request for {{course}} on {{date}}"],
      ["Em tên là {{sender}}, {{senderInfo}}. Em viết thư này để xin phép nghỉ buổi học môn {{course}} vào ngày {{date}} với lý do: {{reason}}.\n\nEm sẽ chủ động xem lại tài liệu và hoàn thành phần bài đã bỏ lỡ. Rất mong {{recipient}} xem xét và thông cảm cho em.",
       "My name is {{sender}}, {{senderInfo}}. I am writing to request permission to miss the {{course}} class on {{date}} because {{reason}}.\n\nI will review the materials and catch up on everything I miss. Thank you for your understanding."]),
    topic("leave_work", "🗓️", ["Xin nghỉ phép đi làm", "Leave from work"],
      ["Xin nghỉ phép ngày {{date}} – {{sender}}", "Leave request for {{date}} – {{sender}}"],
      ["Tôi là {{sender}}, {{senderInfo}}. Tôi xin phép được nghỉ vào ngày {{date}} với lý do: {{reason}}.\n\nTrong thời gian nghỉ, công việc sẽ được bàn giao như sau: {{handover}}. Tôi vẫn có thể liên lạc qua điện thoại khi có việc khẩn cấp.\n\nRất mong {{recipient}} xem xét và phê duyệt.",
       "I am {{sender}}, {{senderInfo}}. I would like to request leave on {{date}} for the following reason: {{reason}}.\n\nWhile I am away, my work will be handled as follows: {{handover}}. I can still be reached by phone for urgent matters.\n\nI would be grateful for your approval."]),
    topic("job_apply", "💼", ["Ứng tuyển việc làm", "Job application"],
      ["Ứng tuyển vị trí {{position}} – {{sender}}", "Application for {{position}} – {{sender}}"],
      ["Tôi là {{sender}}, {{senderInfo}}. Tôi xin gửi đến {{company}} đơn ứng tuyển cho vị trí {{position}}.\n\nVới những điểm mạnh nổi bật của bản thân: {{highlights}}, tôi tin rằng mình có thể đóng góp tích cực cho đội ngũ. CV của tôi được đính kèm để tiện tham khảo.\n\nRất mong có cơ hội trao đổi trực tiếp với {{recipient}}.",
       "My name is {{sender}}, {{senderInfo}}. I am writing to apply for the {{position}} position at {{company}}.\n\nWith my key strengths ({{highlights}}), I am confident I can contribute meaningfully to your team. My CV is attached for your reference.\n\nI would welcome the chance to discuss my application with {{recipient}}."]),
    topic("internship", "🌱", ["Xin thực tập", "Internship request"],
      ["Xin thực tập vị trí {{position}} tại {{company}}", "Internship request: {{position}} at {{company}}"],
      ["Em tên là {{sender}}, {{senderInfo}}, chuyên ngành {{major}}. Em rất quan tâm đến {{company}} và mong muốn được thực tập ở vị trí {{position}} trong thời gian {{duration}}.\n\nEm mong được học hỏi trong môi trường chuyên nghiệp của công ty và sẵn sàng đảm nhận những nhiệm vụ được giao. CV của em được đính kèm theo thư.\n\nEm rất mong nhận được phản hồi từ {{recipient}}.",
       "My name is {{sender}}, {{senderInfo}}, majoring in {{major}}. I am very interested in {{company}} and would like to apply for an internship as {{position}} for {{duration}}.\n\nI am eager to learn in your professional environment and ready to take on any tasks assigned to me. My CV is attached.\n\nI look forward to hearing from {{recipient}}."]),
    topic("extension", "⏳", ["Xin gia hạn nộp bài", "Deadline extension"],
      ["Xin gia hạn nộp bài {{course}}", "Extension request for {{course}}"],
      ["Em tên là {{sender}}, {{senderInfo}}. Em viết thư này để xin gia hạn thời hạn nộp bài môn {{course}} từ ngày {{deadline}} sang ngày {{newDate}}.\n\nLý do: {{reason}}.\n\nEm xin cam kết hoàn thành bài đúng hạn mới. Rất mong {{recipient}} xem xét giúp em.",
       "My name is {{sender}}, {{senderInfo}}. I am writing to request an extension for the {{course}} assignment, moving the deadline from {{deadline}} to {{newDate}}.\n\nReason: {{reason}}.\n\nI promise to submit the work by the new date. Thank you for considering my request."]),
    topic("thanks_interview", "🤝", ["Cảm ơn sau phỏng vấn", "Thank-you after interview"],
      ["Cảm ơn buổi phỏng vấn vị trí {{position}}", "Thank you for the {{position}} interview"],
      ["Tôi là {{sender}}, ứng viên vị trí {{position}} đã phỏng vấn vào ngày {{date}}. Tôi xin chân thành cảm ơn {{recipient}} đã dành thời gian trao đổi với tôi.\n\nBuổi phỏng vấn giúp tôi hiểu rõ hơn về {{company}} và củng cố mong muốn được đồng hành cùng đội ngũ. Nếu cần thêm thông tin, tôi luôn sẵn sàng cung cấp.",
       "I am {{sender}}, the candidate who interviewed for the {{position}} position on {{date}}. Thank you very much, {{recipient}}, for taking the time to speak with me.\n\nThe conversation gave me a clearer picture of {{company}} and strengthened my wish to join the team. Please let me know if I can provide any further information."]),
    topic("resign", "🚪", ["Xin nghỉ việc", "Resignation"],
      ["Thông báo xin nghỉ việc – {{sender}}", "Resignation notice – {{sender}}"],
      ["Tôi là {{sender}}, hiện đảm nhiệm vị trí {{position}}. Tôi viết thư này để thông báo nguyện vọng chấm dứt hợp đồng lao động, với ngày làm việc cuối cùng là {{lastDay}}.\n\nLý do: {{reason}}. Tôi xin chân thành cảm ơn công ty và các đồng nghiệp đã tạo điều kiện cho tôi trong thời gian qua, và sẽ phối hợp bàn giao công việc đầy đủ.\n\nRất mong {{recipient}} xem xét và chấp thuận.",
       "I am {{sender}}, currently working as {{position}}. I am writing to formally notify you of my resignation, with my last working day being {{lastDay}}.\n\nReason: {{reason}}. I sincerely thank the company and my colleagues for their support, and I will ensure a complete handover of my work.\n\nI would appreciate your acceptance of my resignation."]),
    topic("recommend", "📝", ["Xin thư giới thiệu", "Recommendation letter"],
      ["Xin thư giới thiệu cho {{purpose}}", "Request for a recommendation letter – {{purpose}}"],
      ["Em tên là {{sender}}, {{senderInfo}}. Em đang chuẩn bị hồ sơ {{purpose}} và rất mong {{recipient}} có thể viết giúp em một thư giới thiệu trước ngày {{deadline}}.\n\nĐể thuận tiện cho {{recipient}}, em xin tóm tắt một số thành tích của mình: {{achievements}}. Em có thể gửi thêm CV và bảng điểm nếu cần.\n\nEm xin chân thành cảm ơn.",
       "My name is {{sender}}, {{senderInfo}}. I am preparing my application for {{purpose}} and would be grateful if {{recipient}} could write a recommendation letter for me before {{deadline}}.\n\nTo make this easier, here is a summary of my achievements: {{achievements}}. I can send my CV and transcript if needed.\n\nThank you very much for your support."]),
    topic("follow_up", "🔔", ["Nhắc lại email chưa phản hồi", "Follow-up on no reply"],
      ["Theo dõi: {{originalSubject}}", "Following up: {{originalSubject}}"],
      ["Tôi viết thư này để hỏi thăm về email \"{{originalSubject}}\" mà tôi đã gửi vào ngày {{sentDate}}. Tôi hiểu {{recipient}} có thể đang rất bận, nên chỉ xin nhắc nhẹ để chắc rằng thư đã đến đúng nơi.\n\nNếu cần bổ sung thông tin gì, xin cứ cho tôi biết. Cảm ơn {{recipient}} rất nhiều.",
       "I am writing to follow up on my email \"{{originalSubject}}\", sent on {{sentDate}}. I understand you may be very busy, so this is just a gentle reminder to make sure it reached you.\n\nIf you need any additional information, please let me know. Thank you very much, {{recipient}}."]),
  ];

  // Bài mẫu ban đầu của diễn đàn (gồm 2 bài cũ của web KienBinh)
  const seedPosts = () => {
    const ago = (d) => Date.now() - d * 864e5;
    return [
      { id: "seed0", status: "live", topicId: "leave_school", lang: "vi", author: "Nguyễn Minh", createdAt: ago(0), likes: 4,
        title: "Xin nghỉ ốm tiêu chuẩn", subject: "Xin phép nghỉ học vì ốm",
        body: "Kính gửi Thầy/Cô,\n\nEm bị sốt cao không thể đến lớp, xin phép thầy cô cho em nghỉ buổi học hôm nay.\n\nEm xin gửi kèm giấy khám bệnh khi đi học lại.\n\nTrân trọng,\nNguyễn Minh", comments: [] },
      { id: "seed00", status: "live", topicId: "extension", lang: "vi", author: "Trần An", createdAt: ago(1), likes: 3,
        title: "Xin nộp bài tập trễ", subject: "Xin gia hạn nộp bài tập",
        body: "Kính gửi Thầy/Cô,\n\nDo sự cố máy tính mất dữ liệu, em kính xin thầy cô gia hạn thêm 1 ngày để em hoàn thiện bài tập.\n\nEm xin cam kết nộp đúng hạn mới.\n\nTrân trọng,\nTrần An", comments: [] },
      { id: "seed1", status: "live", topicId: "leave_school", lang: "vi", author: "Thu Hà", createdAt: ago(6), likes: 12,
        title: "Xin nghỉ học vì ốm: ngắn gọn, lịch sự", subject: "Xin phép nghỉ học môn Giải tích 1 ngày 12/03",
        body: "Kính gửi Thầy Nguyễn Văn A,\n\nEm tên là Trần Thu Hà, sinh viên lớp K65-CNTT. Em viết thư này để xin phép nghỉ buổi học môn Giải tích 1 vào ngày 12/03 vì em bị sốt và có lịch khám tại bệnh viện.\n\nEm sẽ chủ động xem lại tài liệu và hoàn thành phần bài đã bỏ lỡ. Em xin gửi kèm giấy khám bệnh khi đi học lại.\n\nTrân trọng,\nTrần Thu Hà",
        comments: [{ id: "c1", name: "Minh Quân", text: "Nên ghi rõ mã lớp học phần để thầy cô dễ tra cứu nhé.", createdAt: ago(5) }] },
      { id: "seed2", status: "live", topicId: "job_apply", lang: "en", author: "Linh P.", createdAt: ago(3), likes: 8,
        title: "Application email for a Marketing Intern role", subject: "Application for Marketing Intern – Linh Pham",
        body: "Dear Hiring Team,\n\nMy name is Linh Pham, a final-year Business student. I am writing to apply for the Marketing Intern position at Bright Studio.\n\nWhile leading my university's social media club, I grew our followers by 40% in one semester and ran three campaigns with local brands. I would love to bring this hands-on experience to your team. My CV is attached.\n\nThank you for your time and consideration.\n\nBest regards,\nLinh Pham", comments: [] },
      { id: "seed3", status: "live", topicId: "follow_up", lang: "vi", author: "Nam", createdAt: ago(1), likes: 5,
        title: "Nhắc nhẹ sau một tuần chưa có phản hồi", subject: "Theo dõi: Ứng tuyển vị trí Nhân viên Marketing",
        body: "Chào chị Hoa,\n\nEm viết thư này để hỏi thăm về email ứng tuyển em đã gửi vào ngày 05/03. Em hiểu chị có thể đang rất bận, nên chỉ xin nhắc nhẹ để chắc rằng thư đã đến đúng nơi.\n\nNếu cần bổ sung thông tin gì, chị cứ cho em biết. Em cảm ơn chị nhiều.\n\nThân mến,\nNam", comments: [] },
    ];
  };

  // ---------- Chuỗi giao diện [VI, EN] ----------
  const UI = {
    "nav.compose": ["✉️ Soạn email", "✉️ Compose"], "nav.drafts": ["⏰ Nháp & nhắc nhở", "⏰ Drafts & reminders"],
    "nav.community": ["💌 Diễn đàn mẫu", "💌 Community"], "nav.admin": ["🔐 Quản trị", "🔐 Admin"],
    "g.save": ["Lưu", "Save"], "g.cancel": ["Hủy", "Cancel"], "g.close": ["Đóng", "Close"],
    "err.storage": ["Không lưu được dữ liệu. Bộ nhớ trình duyệt có thể đã đầy hoặc bị chặn.", "Could not save data. Browser storage may be full or blocked."],
    "c.modeQuick": ["⚡ AI soạn nhanh", "⚡ Quick AI compose"], "c.modeTpl": ["🧩 Soạn theo chủ đề mẫu", "🧩 Compose from templates"],
    "c.step1": ["1. Chọn chủ đề", "1. Choose a topic"], "c.step2": ["2. Giọng điệu & ngôn ngữ", "2. Tone & language"], "c.step3": ["3. Điền thông tin", "3. Fill in the details"],
    "c.tone": ["Giọng điệu", "Tone"], "c.formal": ["Trang trọng", "Formal"], "c.friendly": ["Thân thiện", "Friendly"],
    "c.mailLang": ["Ngôn ngữ email", "Email language"], "c.both": ["Song ngữ (VI + EN)", "Bilingual (VI + EN)"],
    "c.bilingualHint": ["Thông tin bạn nhập được giữ nguyên ở cả hai bản. Hãy ưu tiên tên, ngày tháng, số liệu, hoặc chỉnh trực tiếp bản dịch.", "What you type is kept as-is in both versions. Stick to names, dates and figures, or edit the translation directly."],
    "c.sample": ["Điền ví dụ", "Fill with an example"], "c.reset": ["Làm lại", "Start over"], "c.result": ["Bản thư của bạn", "Your email"],
    "c.copy": ["📋 Sao chép", "📋 Copy"], "c.mailto": ["✉️ Mở ứng dụng mail", "✉️ Open in mail app"], "c.save": ["💾 Lưu nháp", "💾 Save draft"],
    "c.share": ["💌 Chia sẻ lên diễn đàn", "💌 Share to community"], "c.subject": ["Tiêu đề", "Subject"], "c.body": ["Nội dung", "Body"],
    "c.edited": ["Đã chỉnh tay", "Edited by hand"], "c.regen": ["Soạn lại từ mẫu", "Rewrite from template"],
    "c.missing": ["Còn {n} mục chưa điền, chúng hiện trong ngoặc vuông.", "{n} fields still empty. They show in square brackets."],
    "c.complete": ["Đã đủ thông tin, bạn có thể gửi.", "All details filled in. Ready to send."],
    "c.copied": ["Đã sao chép email", "Email copied"], "c.editingDraft": ["Đang sửa bản nháp", "Editing a draft"],
    "c.noTopics": ["Chưa có chủ đề nào. Quản trị viên có thể thêm trong mục Quản trị.", "No topics yet. An admin can add some under Admin."],
    "d.title": ["Nháp & nhắc nhở", "Drafts & reminders"],
    "d.lead": ["Email chưa gửi sẽ được nhắc đúng giờ bạn chọn, để không bỏ sót thư quan trọng.", "Unsent emails nudge you at the time you pick, so nothing important slips by."],
    "d.fPending": ["Chưa gửi", "Unsent"], "d.fSent": ["Đã gửi", "Sent"], "d.fAll": ["Tất cả", "All"],
    "d.empty": ["Chưa có bản nháp nào. Soạn một email theo mẫu và bấm “Lưu nháp”.", "No drafts yet. Write an email from a template and press “Save draft”."],
    "d.edit": ["Soạn tiếp", "Keep editing"], "d.send": ["Mở mail để gửi", "Open to send"], "d.markSent": ["Đã gửi", "Mark sent"], "d.markUnsent": ["Chưa gửi", "Mark unsent"],
    "d.remind": ["Đặt nhắc", "Set reminder"], "d.delete": ["Xóa", "Delete"], "d.noRemind": ["Chưa đặt nhắc", "No reminder"],
    "d.remindAt": ["Nhắc lúc {t}", "Remind at {t}"], "d.overdue": ["Đã đến hạn nhắc", "Reminder due"], "d.updated": ["Cập nhật {t}", "Updated {t}"],
    "d.sentAt": ["Đã gửi {t}", "Sent {t}"], "d.confirmDelete": ["Xóa bản nháp này?", "Delete this draft?"], "d.saved": ["Đã lưu nháp", "Draft saved"],
    "d.alert": ["Bạn có {n} email chưa gửi đã đến hạn nhắc", "You have {n} unsent email(s) due for a reminder"], "d.alertBtn": ["Xem ngay", "Review now"],
    "d.notifyTitle": ["Nhắc gửi email", "Time to send your email"], "d.sendHint": ["Gửi xong, hãy bấm “Đã gửi” để tắt nhắc nhở.", "After sending, press “Mark sent” to stop reminders."],
    "r.title": ["Nhắc tôi gửi email này", "Remind me to send this email"],
    "r.lead": ["Nếu đến giờ mà thư vẫn chưa được đánh dấu đã gửi, bạn sẽ nhận thông báo.", "If the email is still unsent at that time, you will get a notification."],
    "r.time": ["Thời điểm nhắc", "Remind me at"], "r.q1h": ["Sau 1 giờ", "In 1 hour"], "r.q1d": ["Sau 1 ngày", "In 1 day"], "r.q3d": ["Sau 3 ngày", "In 3 days"], "r.none": ["Không nhắc", "No reminder"],
    "m.title": ["Diễn đàn mẫu email 💌", "Community samples 💌"],
    "m.lead": ["Xem thư của người khác, dùng làm mẫu và góp ý để cùng viết tốt hơn.", "Browse emails from others, reuse them as templates, and leave feedback."],
    "m.search": ["Tìm theo tiêu đề, nội dung, tác giả…", "Search by title, content, author…"], "m.allTopics": ["Mọi chủ đề", "All topics"],
    "m.sortNew": ["Mới nhất", "Newest"], "m.sortTop": ["Nhiều lượt thích", "Most liked"], "m.post": ["Đăng mail mẫu", "Post a sample"],
    "m.privacy": ["Hãy xóa thông tin cá nhân (họ tên thật, số điện thoại, MSSV) trước khi đăng.", "Remove personal details (real name, phone number, student ID) before posting."],
    "m.empty": ["Không tìm thấy mail mẫu nào.", "No samples found."], "m.use": ["Dùng làm mẫu", "Use as template"],
    "m.comments": ["Góp ý ({n})", "Feedback ({n})"], "m.noComments": ["Chưa có góp ý nào. Hãy là người đầu tiên.", "No feedback yet. Be the first."],
    "m.commentPh": ["Viết góp ý của bạn…", "Write your feedback…"], "m.commentsOff": ["Tính năng góp ý đang tắt.", "Feedback is turned off."],
    "m.name": ["Tên (tùy chọn)", "Name (optional)"], "m.send": ["Gửi góp ý", "Send feedback"], "m.anon": ["Ẩn danh", "Anonymous"],
    "m.postTitle": ["Tiêu đề bài đăng", "Post title"], "m.topic": ["Chủ đề", "Topic"], "m.lang": ["Ngôn ngữ", "Language"],
    "m.author": ["Tên hiển thị (tùy chọn)", "Display name (optional)"], "m.submit": ["Đăng bài", "Publish"],
    "m.posted": ["Đã đăng mail mẫu", "Sample published"], "m.postedPending": ["Đã gửi. Bài sẽ hiện sau khi quản trị viên duyệt.", "Submitted. It will appear once an admin approves it."],
    "m.used": ["Đã nạp mẫu vào trình soạn thảo", "Template loaded into the editor"],
    "a.title": ["Khu vực quản trị", "Admin area"], "a.gate": ["Nhập mã PIN để quản lý chủ đề, bài đăng và cài đặt. (Mặc định: 1234)", "Enter the PIN to manage topics, posts and settings. (Default: 1234)"],
    "a.pin": ["Mã PIN", "PIN"], "a.login": ["Đăng nhập", "Sign in"], "a.wrongPin": ["Sai mã PIN, hãy thử lại.", "Wrong PIN, please try again."], "a.logout": ["Đăng xuất", "Sign out"],
    "a.tabSettings": ["Cài đặt", "Settings"], "a.tabTopics": ["Chủ đề & mẫu", "Topics & templates"], "a.tabPosts": ["Kiểm duyệt", "Moderation"], "a.tabData": ["Dữ liệu", "Data"],
    "a.siteName": ["Tên trang", "Site name"], "a.defUi": ["Ngôn ngữ giao diện mặc định", "Default interface language"], "a.defMail": ["Ngôn ngữ email mặc định", "Default email language"],
    "a.defTone": ["Giọng điệu mặc định", "Default tone"], "a.autoRemind": ["Tự đặt nhắc sau (giờ, 0 = tắt)", "Auto-remind after (hours, 0 = off)"],
    "a.moderation": ["Duyệt bài trước khi hiển thị công khai", "Approve posts before they appear"], "a.allowComments": ["Cho phép góp ý dưới bài đăng", "Allow feedback on posts"],
    "a.newPin": ["Đổi mã PIN (bỏ trống nếu giữ nguyên)", "Change PIN (leave empty to keep)"], "a.saved": ["Đã lưu cài đặt", "Settings saved"],
    "a.addTopic": ["Thêm chủ đề", "Add topic"], "a.resetTopics": ["Khôi phục chủ đề mặc định", "Restore default topics"],
    "a.confirmResetTopics": ["Khôi phục toàn bộ chủ đề về mặc định? Các chỉnh sửa của bạn sẽ mất.", "Restore all topics to defaults? Your edits will be lost."],
    "a.confirmDelTopic": ["Xóa chủ đề này?", "Delete this topic?"], "a.confirmDelPost": ["Xóa bài đăng này?", "Delete this post?"],
    "a.edit": ["Sửa", "Edit"], "a.delete": ["Xóa", "Delete"], "a.approve": ["Duyệt", "Approve"], "a.statusPending": ["Chờ duyệt", "Pending"], "a.statusLive": ["Đang hiển thị", "Live"],
    "a.noPosts": ["Chưa có bài đăng nào.", "No posts yet."], "a.topicNew": ["Thêm chủ đề mới", "New topic"], "a.topicEdit": ["Sửa chủ đề", "Edit topic"], "a.topicSaved": ["Đã lưu chủ đề", "Topic saved"],
    "a.icon": ["Biểu tượng (emoji)", "Icon (emoji)"], "a.nameVi": ["Tên chủ đề (VI)", "Topic name (VI)"], "a.nameEn": ["Tên chủ đề (EN)", "Topic name (EN)"],
    "a.subjVi": ["Tiêu đề mẫu (VI)", "Subject template (VI)"], "a.subjEn": ["Tiêu đề mẫu (EN)", "Subject template (EN)"],
    "a.bodyVi": ["Nội dung mẫu (VI)", "Body template (VI)"], "a.bodyEn": ["Nội dung mẫu (EN)", "Body template (EN)"],
    "a.phHint": ["Gõ {{tên_trường}} để tạo ô nhập tự động. Trường có sẵn:", "Type {{field_name}} to create an input automatically. Built-in fields:"],
    "a.export": ["Xuất dữ liệu (.json)", "Export data (.json)"], "a.import": ["Nhập dữ liệu", "Import data"], "a.imported": ["Đã nhập dữ liệu", "Data imported"],
    "a.badFile": ["Tệp không hợp lệ.", "Invalid file."], "a.wipe": ["Xóa dữ liệu mở rộng", "Erase extension data"],
    "a.confirmWipe": ["Xóa toàn bộ nháp mẫu, bài đăng và cài đặt quản trị? Không thể hoàn tác.", "Erase all template drafts, posts and admin settings? This cannot be undone."],
  };

  Object.entries({"nav.compose": "✉️ メール作成", "nav.drafts": "⏰ 下書き＆リマインド", "nav.community": "💌 テンプレ広場", "nav.admin": "🔐 管理", "g.save": "保存", "g.cancel": "キャンセル", "g.close": "閉じる", "c.modeQuick": "⚡ AIクイック作成", "c.modeTpl": "🧩 テンプレから作成", "c.step1": "1. トピックを選ぶ", "c.step2": "2. トーンと言語", "c.step3": "3. 情報を入力", "c.tone": "トーン", "c.formal": "丁寧", "c.friendly": "フレンドリー", "c.mailLang": "メールの言語", "c.both": "バイリンガル (VI + EN)", "c.sample": "例を入力", "c.reset": "やり直す", "c.result": "あなたのメール", "c.copy": "📋 コピー", "c.mailto": "✉️ メールアプリで開く", "c.save": "💾 下書き保存", "c.share": "💌 広場に共有", "c.subject": "件名", "c.body": "本文", "d.title": "下書き＆リマインド", "d.fPending": "未送信", "d.fSent": "送信済み", "d.fAll": "すべて", "d.edit": "編集を続ける", "d.send": "送信画面を開く", "d.markSent": "送信済みにする", "d.remind": "リマインド設定", "d.delete": "削除", "d.alert": "期限のリマインドが {n} 件あります", "d.alertBtn": "見る", "d.notifyTitle": "メール送信の時間です", "r.title": "このメールのリマインド", "r.none": "通知なし", "m.title": "テンプレ広場 💌", "m.post": "投稿する", "m.sortNew": "新着順", "m.sortTop": "人気順", "m.allTopics": "すべてのトピック", "a.title": "管理エリア"}).forEach(([k, v]) => UI[k] && (UI[k][2] = v));
  Object.assign(UI, {"isl.snooze": ["Hoãn 10 phút", "Snooze 10 min", "10分後に再通知"], "isl.demo": ["Email xin nghỉ học (thử)", "Absence email (preview)", "欠席メール（テスト）"], "isl.big": ["Tệp quá lớn (tối đa 2MB)", "File too large (max 2MB)", "ファイルが大きすぎます（最大2MB）"], "rv.title": ["Khách hàng nói gì về MailMate", "What users say about MailMate", "利用者の声"], "rv.all": ["Tất cả", "All", "すべて"], "rv.pos": ["Tích cực", "Positive", "良い評価"], "rv.neg": ["Cần cải thiện", "Needs work", "改善点"], "rv.note": ["Góp ý minh họa (dữ liệu demo, nhân vật hư cấu).", "Sample feedback (demo data, fictional users).", "サンプルのフィードバック（デモ用・架空のユーザー）"]});


  // Bản dịch bổ sung cho các phần giao diện, đánh giá và gói nâng cấp.
  Object.assign(UI, {
    "nav.pro": ["💎 Nâng cấp", "💎 Upgrade", "💎 アップグレード"],
    "hello.title": ["Chào bạn, mình là MailMate ✨", "Hi, I'm MailMate ✨", "こんにちは、MailMateです ✨"],
    "hello.lead": ["Mình là người trợ lý thân thiết của bạn.<br>Hôm nay mình có thể giúp gì cho bạn đây?", "Your friendly writing assistant.<br>How can I help you today?", "あなたの文章作成アシスタントです。<br>今日は何をお手伝いしましょうか？"],
    "hello.start": ["Bắt đầu soạn thư", "Start writing", "メール作成を始める"],
    "site.lead": ["Hôm nay mình có thể giúp gì cho bạn? Điền thông tin bên dưới hoặc tham khảo diễn đàn, mình sẽ soạn email hoàn chỉnh để bạn gửi.", "What can I help you write today? Fill in the details or browse the community to create a polished email.", "今日はどのようなメールを作成しますか？情報を入力するか、コミュニティの例を参考にしてください。"],
    "quick.info": ["Thông tin & Cấu hình", "Details & settings", "情報と設定"], "quick.generate": ["✨ AI Soạn Email Ngay", "✨ Generate Email with AI", "✨ AIでメールを作成"], "quick.generating": ["⏳ AI đang dịch và tạo thư...", "⏳ Translating and generating your email...", "⏳ 翻訳してメールを作成中…"], "quick.created": ["✅ Đã tạo thư thành công!", "✅ Email created successfully!", "✅ メールを作成しました！"], "quick.copied": ["✅ Đã sao chép vào khay nhớ tạm.", "✅ Copied to clipboard.", "✅ クリップボードにコピーしました。"], "quick.saved": ["✅ Đã lưu nháp!", "✅ Draft saved!", "✅ 下書きを保存しました！"], "quick.topic": ["Chủ đề email", "Email topic", "メールのトピック"],
    "quick.topicLeave": ["Xin nghỉ học / nghỉ làm", "Absence from school / work", "学校・仕事の欠席連絡"], "quick.topicLate": ["Xin nộp bài trễ", "Request an extension", "提出期限の延長依頼"], "quick.topicJob": ["Ứng tuyển / Xin thực tập", "Job / internship application", "就職・インターン応募"], "quick.topicOther": ["Khác (Liên hệ chung)", "Other (general inquiry)", "その他（一般的な問い合わせ）"],
    "quick.recipient": ["Tên giảng viên / người nhận", "Recipient / instructor name", "先生・宛先の名前"], "quick.yourName": ["Họ và tên của bạn", "Your full name", "あなたの氏名"], "quick.email": ["Email người nhận", "Recipient email", "宛先のメールアドレス"], "quick.studentId": ["Mã số sinh viên", "Student ID", "学生番号"], "quick.class": ["Lớp / Ngành", "Class / Major", "クラス・専攻"], "quick.remember": ["Trình duyệt sẽ tự động nhớ thông tin của bạn cho lần sau.", "Your browser will remember these details for next time.", "入力内容は次回のためにブラウザーに保存されます。"], "quick.reason": ["Lý do chi tiết", "Detailed reason", "詳しい理由"], "quick.targetLang": ["Ngôn ngữ đầu ra", "Output language", "出力言語"], "quick.empty": ["Email của bạn sẽ hiện ở đây. Bạn có thể sửa trực tiếp.", "Your email will appear here. You can edit it directly.", "作成したメールがここに表示され、直接編集できます。"], "quick.to": ["Đến (email)", "To (email)", "宛先（メール）"], "quick.gmail": ["🚀 Gửi qua Gmail ➜", "🚀 Continue in Gmail ➜", "🚀 Gmailで開く ➜"],
    "quick.phRecipient": ["VD: Thầy Shin", "e.g. Professor Smith", "例：田中先生"], "quick.phName": ["VD: Nguyễn Văn A", "e.g. Alex Nguyen", "例：山田太郎"], "quick.phEmail": ["Email người nhận", "Recipient email address", "宛先メールアドレス"], "quick.phId": ["VD: 21110123", "e.g. 21110123", "例：21110123"], "quick.phClass": ["VD: 12C3 / CNTT", "e.g. Class 12C3 / IT", "例：情報工学科"], "quick.phReason": ["VD: Em bị sốt từ đêm qua, không thể đi học...", "e.g. I have had a fever since last night...", "例：昨夜から熱があり、授業に出席できません…"],
    "lang.vi": ["Tiếng Việt", "Vietnamese", "ベトナム語"], "lang.en": ["Tiếng Anh", "English", "英語"], "lang.ja": ["Tiếng Nhật", "Japanese", "日本語"],
    "d.unfinished": ["Nháp chưa gửi", "Unsent drafts", "未送信の下書き"], "d.emptyQuick": ["Chưa có nháp nào.", "No drafts yet.", "下書きはまだありません。"],
    "ring.chime": ["Chuông ngân", "Chime", "チャイム"], "ring.marimba": ["Marimba", "Marimba", "マリンバ"], "ring.pulse": ["Xung điện tử", "Electronic pulse", "電子パルス"], "ring.classic": ["Báo thức", "Alarm", "アラーム"], "ring.iphone": ["Thông báo iPhone", "iPhone notification", "iPhone通知音"], "ring.newtone": ["Nhạc chuông mới", "New ringtone", "新しい着信音"], "ring.test": ["▶ Nghe thử", "▶ Preview", "▶ 試聴"], "ring.add": ["＋ Thêm nhạc", "＋ Add audio", "＋ 音声を追加"], "ring.delete": ["🗑 Xóa nhạc", "🗑 Remove audio", "🗑 音声を削除"], "ring.note": ["Bạn có thể thêm nhiều file âm thanh từ máy tính. Nhạc được lưu trong trình duyệt hiện tại.", "Add audio files from your computer. Custom audio is saved in this browser only.", "パソコンから音声ファイルを追加できます。追加した音声はこのブラウザーに保存されます。"],
    "fb.title": ["Đóng góp ý kiến về MailMate", "Share your feedback about MailMate", "MailMateへのフィードバック"], "fb.lead": ["Chia sẻ trải nghiệm thực tế, đánh giá số sao và đề xuất cải thiện.", "Tell us about your experience, rate the site, and suggest improvements.", "使ってみた感想、星評価、改善案をお寄せください。"], "fb.name": ["Tên hiển thị (không bắt buộc)", "Display name (optional)", "表示名（任意）"], "fb.rating": ["Đánh giá của bạn", "Your rating", "評価"], "fb.comment": ["Ý kiến đóng góp", "Your feedback", "ご意見"], "fb.submit": ["Gửi đánh giá", "Submit feedback", "フィードバックを送信"], "fb.phName": ["Tên của bạn", "Your name", "お名前"], "fb.phComment": ["Bạn thích điểm nào? Điều gì nên cải thiện?", "What did you like? What could be improved?", "良かった点や改善してほしい点を教えてください。"], "fb.thanks": ["Cảm ơn bạn đã đóng góp ý kiến!", "Thanks for your feedback!", "ご意見ありがとうございます！"], "fb.required": ["Vui lòng chọn số sao và nhập ý kiến.", "Please choose a star rating and enter your feedback.", "星評価を選び、コメントを入力してください。"], "fb.user": ["Người dùng", "User", "ユーザー"], "fb.userReview": ["Đánh giá của người dùng", "User review", "ユーザー評価"],
    "pro.kicker": ["MAILMATE MEMBERSHIP", "MAILMATE MEMBERSHIP", "MAILMATE メンバーシップ"], "pro.title": ["Nâng cấp trải nghiệm viết email", "Upgrade your email-writing experience", "メール作成体験をアップグレード"], "pro.lead": ["Chọn gói phù hợp với bạn. Đây là giao diện minh họa; chưa có thanh toán tự động.", "Choose a plan that suits you. This is a demo page; automatic payment is not connected.", "用途に合ったプランを選択してください。これはデモ画面で、自動決済には接続されていません。"], "pro.forever": ["/ mãi mãi", "/ forever", "/ 永久"], "pro.month": ["/ tháng", "/ month", "/ 月"], "pro.free1": ["Mẫu email cơ bản", "Basic email templates", "基本メールテンプレート"], "pro.free2": ["Lưu nháp trên thiết bị", "Save drafts on this device", "この端末に下書きを保存"], "pro.free3": ["Cộng đồng chia sẻ", "Community sharing", "コミュニティ共有"], "pro.current": ["Gói hiện tại", "Current plan", "現在のプラン"], "pro.go1": ["Nhiều mẫu email hơn", "More email templates", "メールテンプレートを追加"], "pro.go2": ["Tùy chỉnh giao diện", "Interface customization", "画面のカスタマイズ"], "pro.go3": ["Quản lý nhắc nhở nâng cao", "Advanced reminder management", "リマインダー管理の強化"], "pro.chooseGo": ["Chọn MailMate Go", "Choose MailMate Go", "MailMate Goを選択"], "pro.pro1": ["Trải nghiệm đầy đủ tính năng", "Full feature experience", "すべての機能を体験"], "pro.pro2": ["Bộ mẫu chuyên nghiệp", "Professional template library", "プロ向けテンプレート集"], "pro.pro3": ["Ưu tiên tính năng mới", "Early access to new features", "新機能への先行アクセス"], "pro.choosePro": ["Nâng cấp Pro", "Upgrade to Pro", "Proにアップグレード"], "pay.title": ["Thanh toán gói", "Plan payment", "プランのお支払い"], "pay.note": ["Mã QR bên dưới chỉ là hình minh họa. Hãy thay bằng QR thanh toán thật của bạn trước khi công khai.", "The QR below is only a placeholder. Replace it with your real payment QR before publishing.", "下のQRコードは仮の画像です。公開前に実際の決済QRコードに差し替えてください。"], "pay.placeholder": ["QR MINH HỌA", "DEMO QR", "QRデモ"], "pay.selected": ["Gói đã chọn", "Selected plan", "選択中のプラン"],
    "rv.title": ["Người dùng nói gì về MailMate", "What users say about MailMate", "MailMateへのユーザーの声"], "rv.all": ["Tất cả", "All", "すべて"], "rv.pos": ["Tích cực", "Positive", "良い評価"], "rv.neg": ["Cần cải thiện", "Needs improvement", "改善点"], "rv.note": ["Các đánh giá minh họa được ghi rõ là dữ liệu demo; ý kiến gửi qua biểu mẫu sẽ lưu trên trình duyệt này.", "Demo reviews are labeled as examples. Feedback submitted here is stored in this browser only.", "サンプル評価はデモと明記されています。フォームからの意見はこのブラウザー内に保存されます。"],
    "nav.compose": ["✉️ Soạn email", "✉️ Compose", "✉️ メール作成"], "nav.drafts": ["⏰ Nháp & nhắc nhở", "⏰ Drafts & reminders", "⏰ 下書き＆リマインド"], "nav.community": ["💌 Diễn đàn mẫu", "💌 Community", "💌 コミュニティ"], "nav.admin": ["🔐 Quản trị", "🔐 Admin", "🔐 管理"],
    "c.modeQuick": ["⚡ AI soạn nhanh", "⚡ Quick AI compose", "⚡ AIクイック作成"], "c.modeTpl": ["🧩 Soạn theo chủ đề mẫu", "🧩 Compose from templates", "🧩 テンプレートから作成"], "c.step1": ["1. Chọn chủ đề", "1. Choose a topic", "1. トピックを選ぶ"], "c.step2": ["2. Giọng điệu & ngôn ngữ", "2. Tone & language", "2. トーンと言語"], "c.step3": ["3. Điền thông tin", "3. Fill in the details", "3. 情報を入力"], "c.tone": ["Giọng điệu", "Tone", "トーン"], "c.formal": ["Trang trọng", "Formal", "丁寧"], "c.friendly": ["Thân thiện", "Friendly", "フレンドリー"], "c.mailLang": ["Ngôn ngữ email", "Email language", "メールの言語"], "c.both": ["Song ngữ (VI + EN)", "Bilingual (VI + EN)", "バイリンガル (VI + EN)"], "c.sample": ["Điền ví dụ", "Fill with an example", "例を入力"], "c.reset": ["Làm lại", "Start over", "やり直す"], "c.result": ["Bản thư của bạn", "Your email", "あなたのメール"], "c.copy": ["📋 Sao chép", "📋 Copy", "📋 コピー"], "c.save": ["💾 Lưu nháp", "💾 Save draft", "💾 下書き保存"], "c.share": ["💌 Chia sẻ lên diễn đàn", "💌 Share to community", "💌 コミュニティに共有"], "c.subject": ["Tiêu đề", "Subject", "件名"], "c.body": ["Nội dung", "Body", "本文"], "d.title": ["Nháp & nhắc nhở", "Drafts & reminders", "下書き＆リマインド"], "d.lead": ["Email chưa gửi sẽ được nhắc đúng giờ bạn chọn, để không bỏ sót thư quan trọng.", "Get reminders for unsent emails at the time you choose.", "未送信メールを指定した時間にリマインドします。"], "d.fPending": ["Chưa gửi", "Unsent", "未送信"], "d.fSent": ["Đã gửi", "Sent", "送信済み"], "d.fAll": ["Tất cả", "All", "すべて"], "m.title": ["Diễn đàn mẫu email 💌", "Email template community 💌", "メールテンプレート広場 💌"], "m.lead": ["Xem thư của người khác, dùng làm mẫu và góp ý để cùng viết tốt hơn.", "Browse email examples, reuse templates, and share feedback.", "他のメール例を参考にし、意見を共有しましょう。"], "a.title": ["Khu vực quản trị", "Admin area", "管理エリア"]
  });


  Object.assign(UI, {
    "g.save": ["Lưu", "Save", "保存"], "g.cancel": ["Hủy", "Cancel", "キャンセル"], "g.close": ["Đóng", "Close", "閉じる"],
    "err.storage": ["Không lưu được dữ liệu. Bộ nhớ trình duyệt có thể đã đầy hoặc bị chặn.", "Could not save data. Browser storage may be full or blocked.", "データを保存できません。ブラウザーの保存領域がいっぱいか、制限されている可能性があります。"],
    "c.bilingualHint": ["Thông tin bạn nhập được giữ nguyên ở cả hai bản.", "Your details are kept in both versions.", "入力した情報は両方の言語版に保持されます。"], "c.edited": ["Đã chỉnh tay", "Edited by hand", "手動で編集済み"], "c.regen": ["Soạn lại từ mẫu", "Rewrite from template", "テンプレートから再作成"], "c.missing": ["Còn {n} mục chưa điền, chúng hiện trong ngoặc vuông.", "{n} fields still empty. They show in square brackets.", "未入力の項目が {n} 件あります。角括弧で表示されます。"], "c.complete": ["Đã đủ thông tin, bạn có thể gửi.", "All details filled in. Ready to send.", "必要な情報が入力されました。送信できます。"], "c.copied": ["Đã sao chép email", "Email copied", "メールをコピーしました"], "c.editingDraft": ["Đang sửa bản nháp", "Editing a draft", "下書きを編集中"], "c.noTopics": ["Chưa có chủ đề nào.", "No topics yet.", "トピックがまだありません。"],
    "d.empty": ["Chưa có bản nháp nào.", "No drafts yet.", "下書きはまだありません。"], "d.edit": ["Soạn tiếp", "Keep editing", "編集を続ける"], "d.send": ["Mở mail để gửi", "Open to send", "メールを開いて送信"], "d.markSent": ["Đã gửi", "Mark sent", "送信済みにする"], "d.markUnsent": ["Chưa gửi", "Mark unsent", "未送信に戻す"], "d.remind": ["Đặt nhắc", "Set reminder", "リマインダーを設定"], "d.delete": ["Xóa", "Delete", "削除"], "d.noRemind": ["Chưa đặt nhắc", "No reminder", "リマインダー未設定"], "d.saved": ["Đã lưu nháp", "Draft saved", "下書きを保存しました"],
    "m.search": ["Tìm email mẫu…", "Search email examples…", "メール例を検索…"], "m.sortNew": ["Mới nhất", "Newest", "新着順"], "m.sortTop": ["Phổ biến", "Popular", "人気順"], "m.post": ["＋ Đăng email mẫu", "＋ Share an email", "＋ メール例を投稿"], "m.allTopics": ["Tất cả chủ đề", "All topics", "すべてのトピック"], "m.privacy": ["Không đăng thông tin cá nhân hoặc dữ liệu nhạy cảm.", "Do not post personal or sensitive information.", "個人情報や機密情報を投稿しないでください。"], "m.postTitle": ["Tiêu đề bài đăng", "Post title", "投稿タイトル"], "m.topic": ["Chủ đề", "Topic", "トピック"], "m.lang": ["Ngôn ngữ", "Language", "言語"], "m.author": ["Tên hiển thị (tùy chọn)", "Display name (optional)", "表示名（任意）"], "m.submit": ["Đăng bài", "Publish", "投稿する"], "m.used": ["Đã nạp mẫu vào trình soạn thảo", "Template loaded into the editor", "テンプレートをエディターに読み込みました"],
    "a.gate": ["Nhập mã PIN để quản lý chủ đề, bài đăng và cài đặt.", "Enter the PIN to manage topics, posts and settings.", "トピック、投稿、設定を管理するにはPINを入力してください。"], "a.pin": ["Mã PIN", "PIN", "PINコード"], "a.login": ["Đăng nhập", "Sign in", "ログイン"], "a.wrongPin": ["Sai mã PIN, hãy thử lại.", "Wrong PIN, please try again.", "PINが違います。もう一度お試しください。"], "a.logout": ["Đăng xuất", "Sign out", "ログアウト"], "a.tabSettings": ["Cài đặt", "Settings", "設定"], "a.tabTopics": ["Chủ đề & mẫu", "Topics & templates", "トピックとテンプレート"], "a.tabPosts": ["Kiểm duyệt", "Moderation", "投稿の管理"], "a.tabData": ["Dữ liệu", "Data", "データ"], "a.siteName": ["Tên trang", "Site name", "サイト名"], "a.defUi": ["Ngôn ngữ giao diện mặc định", "Default interface language", "既定の表示言語"], "a.defMail": ["Ngôn ngữ email mặc định", "Default email language", "既定のメール言語"], "a.defTone": ["Giọng điệu mặc định", "Default tone", "既定のトーン"], "a.autoRemind": ["Tự đặt nhắc sau (giờ, 0 = tắt)", "Auto-remind after (hours, 0 = off)", "自動リマインドまでの時間（時間、0で無効）"], "a.moderation": ["Duyệt bài trước khi hiển thị công khai", "Approve posts before they appear", "公開前に投稿を承認する"], "a.allowComments": ["Cho phép góp ý dưới bài đăng", "Allow feedback on posts", "投稿へのコメントを許可"], "a.newPin": ["Đổi mã PIN (bỏ trống nếu giữ nguyên)", "Change PIN (leave empty to keep)", "PINを変更（変更しない場合は空欄）"], "a.saved": ["Đã lưu cài đặt", "Settings saved", "設定を保存しました"], "a.addTopic": ["Thêm chủ đề", "Add topic", "トピックを追加"], "a.resetTopics": ["Khôi phục chủ đề mặc định", "Restore default topics", "既定のトピックに戻す"], "a.edit": ["Sửa", "Edit", "編集"], "a.delete": ["Xóa", "Delete", "削除"], "a.approve": ["Duyệt", "Approve", "承認"], "a.statusPending": ["Chờ duyệt", "Pending", "承認待ち"], "a.statusLive": ["Đang hiển thị", "Live", "公開中"], "a.noPosts": ["Chưa có bài đăng nào.", "No posts yet.", "投稿はまだありません。"], "a.topicNew": ["Thêm chủ đề mới", "New topic", "新しいトピック"], "a.topicEdit": ["Sửa chủ đề", "Edit topic", "トピックを編集"], "a.topicSaved": ["Đã lưu chủ đề", "Topic saved", "トピックを保存しました"], "a.icon": ["Biểu tượng (emoji)", "Icon (emoji)", "アイコン（絵文字）"], "a.nameVi": ["Tên chủ đề (VI)", "Topic name (VI)", "トピック名（ベトナム語）"], "a.nameEn": ["Tên chủ đề (EN)", "Topic name (EN)", "トピック名（英語）"], "a.subjVi": ["Tiêu đề mẫu (VI)", "Subject template (VI)", "件名テンプレート（ベトナム語）"], "a.subjEn": ["Tiêu đề mẫu (EN)", "Subject template (EN)", "件名テンプレート（英語）"], "a.bodyVi": ["Nội dung mẫu (VI)", "Body template (VI)", "本文テンプレート（ベトナム語）"], "a.bodyEn": ["Nội dung mẫu (EN)", "Body template (EN)", "本文テンプレート（英語）"], "a.export": ["Xuất dữ liệu (.json)", "Export data (.json)", "データをエクスポート（.json）"], "a.import": ["Nhập dữ liệu", "Import data", "データをインポート"], "a.imported": ["Đã nhập dữ liệu", "Data imported", "データをインポートしました"], "a.badFile": ["Tệp không hợp lệ.", "Invalid file.", "無効なファイルです。"], "a.wipe": ["Xóa dữ liệu mở rộng", "Erase extension data", "追加データを消去"]
  });

  // ---------- Tiện ích ----------
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const autosize = (el) => { if (!el.scrollHeight) return; el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; };
  const PLACEHOLDER = /\{\{(\w+)\}\}/g;
  const keysOf = (...texts) => [...new Set(texts.flatMap((x) => [...x.matchAll(PLACEHOLDER)].map((m) => m[1])))];
  const toLocalInput = (ms) => new Date(ms - new Date(ms).getTimezoneOffset() * 6e4).toISOString().slice(0, 16);
  const SEPARATOR = "\n\n──────────\n\n";
  function download(name, text) {
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(new Blob([text], { type: "application/json" })), download: name });
    a.click(); URL.revokeObjectURL(a.href);
  }
  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); }
    catch { const ta = Object.assign(document.createElement("textarea"), { value: text }); document.body.append(ta); ta.select(); document.execCommand("copy"); ta.remove(); }
  }

  // ---------- Lưu trữ & trạng thái ----------
  const Store = {
    read(k, fb) { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : fb; } catch { return fb; } },
    write(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { toast(t("err.storage"), "error"); } },
  };
  let config = { ...DEFAULT_CONFIG, ...Store.read(KEYS.config, {}) };
  let drafts = Store.read(KEYS.drafts, []);
  let posts = Store.read(KEYS.posts, null) ?? seedPosts();
  let liked = Store.read(KEYS.liked, []);
  let uiLang = Store.read(KEYS.ui, null) ?? config.uiLang;
  let currentView = "compose";
  const saveConfig = () => Store.write(KEYS.config, config);
  const saveDrafts = () => Store.write(KEYS.drafts, drafts);
  const savePosts = () => Store.write(KEYS.posts, posts);
  const isAdmin = () => { try { return sessionStorage.getItem(KEYS.admin) === "1"; } catch { return false; } };
  const getTopics = () => config.topics ?? DEFAULT_TOPICS;
  const liveTopics = () => getTopics().filter((x) => x.enabled !== false);
  const findTopic = (id) => getTopics().find((x) => x.id === id);
  const editableTopics = () => (config.topics ??= clone(DEFAULT_TOPICS));
  const fieldMeta = (k) => {
    const meta = FIELDS[k] ?? { vi: k, en: k, ex: { vi: "", en: "" } };
    if (uiLang !== "ja") return meta;
    return { ...meta, ja: JA_FIELDS[k] ?? meta.en, ex: { ...meta.ex, ja: meta.ex.en ?? "" } };
  };
  const fieldLabel = (k, l) => fieldMeta(k)[l] ?? fieldMeta(k).en;
  const fmt = (ms, dateOnly = false) => new Date(ms).toLocaleString({ vi: "vi-VN", en: "en-GB", ja: "ja-JP" }[uiLang], dateOnly ? { dateStyle: "medium" } : { dateStyle: "short", timeStyle: "short" });

  // ---------- Đa ngôn ngữ giao diện ----------
  const t = (key, vars = {}) => (UI[key]?.[{ vi: 0, en: 1, ja: 2 }[uiLang]] ?? UI[key]?.[1] ?? key).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
  function applyI18n() {
    document.documentElement.lang = uiLang;
    window.mailMateTranslate = (key) => t(key);
    qa("[data-i18n]").forEach((el) => { if (UI[el.dataset.i18n]) el.textContent = t(el.dataset.i18n); });
    qa("[data-i18n-ph]").forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });
    qa("[data-ui-lang]").forEach((b) => b.classList.toggle("active", b.dataset.uiLang === uiLang));
    q("#siteName").textContent = config.siteName;
    const h1 = q("h1"); if (h1 && h1.firstChild) h1.firstChild.textContent = config.siteName + " ";
    document.title = config.siteName + " – " + ({ vi: "Soạn email hoàn chỉnh", en: "Write polished emails", ja: "メールを作成" }[uiLang] || "Write polished emails");
  }
  function setUiLang(l) { uiLang = l; Store.write(KEYS.ui, l); applyI18n(); renderAll(); }

  // ---------- Toast & hộp thoại ----------
  function toast(msg, type = "") {
    const el = Object.assign(document.createElement("div"), { className: "toast " + type, textContent: msg });
    q("#toasts").append(el); setTimeout(() => el.remove(), 4500);
  }
  function bindDialogs() {
    document.addEventListener("click", (e) => {
      const c = e.target.closest("[data-close]");
      if (c) return c.closest("dialog").close();
      if (e.target instanceof HTMLDialogElement) {
        const r = e.target.getBoundingClientRect();
        if (!(e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom)) e.target.close();
      }
    });
  }

  // ---------- Trình soạn theo mẫu ----------
  const cs = {};
  const mailLangs = () => (cs.mailLang === "both" ? ["vi", "en"] : [cs.mailLang]);
  const currentTopic = () => findTopic(cs.topicId);
  function resetComposer() {
    Object.assign(cs, { topicId: liveTopics()[0]?.id ?? null, tone: config.tone, mailLang: config.mailLang, values: {}, outputs: {}, dirty: {}, draftId: null });
  }
  const isPristine = () => !cs.draftId && !Object.values(cs.values).some(Boolean) && !Object.keys(cs.dirty).length;
  function topicKeys(tp) {
    const texts = mailLangs().flatMap((l) => [tp.subject[l], tp.body[l], TONES[cs.tone][l].hi, TONES[cs.tone][l].bye]);
    const keys = keysOf(...texts);
    return [...COMMON_KEYS.filter((k) => keys.includes(k)), ...keys.filter((k) => !COMMON_KEYS.includes(k))];
  }
  function compose(tp, lang) {
    const tone = TONES[cs.tone][lang];
    const fill = (tpl) => tpl.replace(PLACEHOLDER, (_, k) => (cs.values[k] ?? "").trim() || `[${fieldLabel(k, lang)}]`);
    return { subject: fill(tp.subject[lang]), body: fill(`${tone.hi}\n\n${tp.body[lang]}\n\n${tone.bye}`) };
  }
  function generate() {
    const tp = currentTopic(); if (!tp) return;
    mailLangs().forEach((l) => { if (!cs.dirty[l]) cs.outputs[l] = compose(tp, l); });
  }
  const mergeOutputs = (outputs, ml) => {
    const list = (ml === "both" ? ["vi", "en"] : [ml]).map((l) => outputs[l]);
    return list.length === 1 ? list[0] : { subject: list.map((o) => o.subject).join(" / "), body: list.map((o) => o.body).join(SEPARATOR) };
  };
  const mailtoUrl = (m) => `mailto:?subject=${encodeURIComponent(m.subject)}&body=${encodeURIComponent(m.body)}`;
  const gmailUrl = (m) => `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(m.subject)}&body=${encodeURIComponent(m.body)}`;

  function renderComposer() {
    q("#tone").value = cs.tone; q("#mailLang").value = cs.mailLang;
    q("#bilingualHint").hidden = cs.mailLang !== "both";
    q("#editingBadge").hidden = !cs.draftId;
    renderTopics(); renderFields(); generate(); renderOutputs();
  }
  const JA_TOPIC_NAMES = { leave_school: "欠席連絡", leave_work: "休暇申請", job_apply: "求人応募", internship: "インターン申請", extension: "提出期限の延長", thanks_interview: "面接後のお礼", resign: "退職届", recommend: "推薦状の依頼", follow_up: "返信のフォローアップ" };
  function renderTopics() {
    q("#topicGrid").innerHTML = liveTopics().map((x) => `
      <button type="button" class="topic ${x.id === cs.topicId ? "active" : ""}" data-id="${esc(x.id)}">
        <span class="topic-icon">${esc(x.icon)}</span><span>${esc((uiLang === "ja" ? (JA_TOPIC_NAMES[x.id] ?? x.name.en) : (x.name[uiLang] ?? x.name.en)))}</span></button>`).join("");
  }
  function renderFields() {
    const tp = currentTopic(); const exLang = mailLangs()[0];
    q("#fields").innerHTML = !tp ? "" : topicKeys(tp).map((k) => {
      const ph = esc(fieldMeta(k).ex[exLang]); const val = esc(cs.values[k] ?? ""); const area = AREA_KEYS.has(k);
      return `<label class="field ${area ? "wide" : ""}"><span>${esc((fieldMeta(k)[uiLang] ?? fieldMeta(k).en))}</span>${area
        ? `<textarea data-key="${k}" rows="3" placeholder="${ph}">${val}</textarea>`
        : `<input data-key="${k}" value="${val}" placeholder="${ph}">`}</label>`;
    }).join("");
  }
  const editedMarkup = (l) => (cs.dirty[l] ? `<span class="chip chip-warn">${t("c.edited")}</span><button type="button" class="link" data-act="regen">${t("c.regen")}</button>` : "");
  function renderOutputs() {
    const box = q("#outputs");
    if (!mailLangs().every((l) => cs.outputs[l])) { box.innerHTML = `<p class="empty">${t("c.noTopics")}</p>`; updateStatus(); return; }
    box.innerHTML = mailLangs().map((l) => `
      <article class="tmail" data-lang="${l}">
        <header class="tmail-head"><span class="chip chip-lang">${l.toUpperCase()}</span>${editedMarkup(l)}</header>
        <label class="tmail-row"><span>${t("c.subject")}</span><input class="tmail-subject" value="${esc(cs.outputs[l].subject)}"></label>
        <textarea class="tmail-body" aria-label="${t("c.body")}">${esc(cs.outputs[l].body)}</textarea>
      </article>`).join("");
    qa(".tmail-body").forEach(autosize); updateStatus();
  }
  function syncOutputs() {
    mailLangs().forEach((l) => {
      if (cs.dirty[l] || !cs.outputs[l]) return;
      const art = q(`.tmail[data-lang="${l}"]`); if (!art) return;
      q(".tmail-subject", art).value = cs.outputs[l].subject;
      const b = q(".tmail-body", art); b.value = cs.outputs[l].body; autosize(b);
    });
    updateStatus();
  }
  function updateStatus() {
    const el = q("#missingInfo"); const tp = currentTopic();
    if (!tp || mailLangs().every((l) => cs.dirty[l])) { el.textContent = ""; return; }
    const n = topicKeys(tp).filter((k) => !(cs.values[k] ?? "").trim()).length;
    el.textContent = n ? t("c.missing", { n }) : t("c.complete");
    el.classList.toggle("warn", n > 0);
  }
  function setMode(m) {
    q("#modeQuick").hidden = m !== "quick"; q("#modeTpl").hidden = m !== "tpl";
    qa("#modeTabs button").forEach((b) => b.classList.toggle("active", b.dataset.mode === m));
    if (m === "tpl") qa(".tmail-body").forEach(autosize);
  }
  function loadIntoComposer(state) { Object.assign(cs, state); renderComposer(); go("compose"); setMode("tpl"); }
  function fillSample() {
    const tp = currentTopic(); if (!tp) return;
    const lang = mailLangs()[0];
    topicKeys(tp).forEach((k) => { cs.values[k] = fieldMeta(k).ex[lang]; });
    cs.dirty = {}; renderComposer();
  }
  function shareCurrent() {
    const lang = mailLangs()[0]; const out = cs.outputs[lang]; if (!out) return;
    openPostDialog({ title: (currentTopic()?.name[uiLang] ?? currentTopic()?.name.en) ?? "", topicId: cs.topicId, lang, ...out });
  }
  function bindComposer() {
    q("#modeTabs").addEventListener("click", (e) => { if (e.target.dataset.mode) setMode(e.target.dataset.mode); });
    q("#topicGrid").addEventListener("click", (e) => {
      const b = e.target.closest(".topic"); if (!b || b.dataset.id === cs.topicId) return;
      cs.topicId = b.dataset.id; cs.dirty = {}; renderComposer();
    });
    q("#tone").addEventListener("change", (e) => { cs.tone = e.target.value; cs.dirty = {}; renderComposer(); });
    q("#mailLang").addEventListener("change", (e) => { cs.mailLang = e.target.value; renderComposer(); });
    q("#fields").addEventListener("input", (e) => { const k = e.target.dataset.key; if (!k) return; cs.values[k] = e.target.value; generate(); syncOutputs(); });
    const out = q("#outputs");
    out.addEventListener("input", (e) => {
      const art = e.target.closest(".tmail"); if (!art) return;
      const l = art.dataset.lang;
      cs.outputs[l] = { subject: q(".tmail-subject", art).value, body: q(".tmail-body", art).value };
      if (e.target.classList.contains("tmail-body")) autosize(e.target);
      if (!cs.dirty[l]) { cs.dirty[l] = true; q(".tmail-head", art).insertAdjacentHTML("beforeend", editedMarkup(l)); updateStatus(); }
    });
    out.addEventListener("click", (e) => {
      if (e.target.dataset.act !== "regen") return;
      delete cs.dirty[e.target.closest(".tmail").dataset.lang]; generate(); renderOutputs();
    });
    q("#btnSample").addEventListener("click", fillSample);
    q("#btnReset").addEventListener("click", () => { resetComposer(); renderComposer(); });
    q("#btnCopy").addEventListener("click", async () => { const m = mergeOutputs(cs.outputs, cs.mailLang); await copyText(`${t("c.subject")}: ${m.subject}\n\n${m.body}`); toast(t("c.copied")); });
    q("#btnMail").addEventListener("click", () => { window.location.href = mailtoUrl(mergeOutputs(cs.outputs, cs.mailLang)); });
    q("#btnGmail").addEventListener("click", () => { window.open(gmailUrl(mergeOutputs(cs.outputs, cs.mailLang)), "_blank", "noopener"); });
    q("#btnSave").addEventListener("click", saveDraft);
    q("#btnShare").addEventListener("click", shareCurrent);
  }

  // ---------- Nháp & nhắc nhở ----------
  let draftFilter = "pending"; let reminderCallback = null;
  const autoRemindAt = () => (config.autoRemindHours > 0 ? Date.now() + config.autoRemindHours * 36e5 : null);
  const isOverdue = (d) => d.status !== "sent" && d.remindAt && d.remindAt <= Date.now();
  function openReminder(ms, cb) { reminderCallback = cb; q("#remindInput").value = ms ? toLocalInput(ms) : ""; q("#dlgReminder").showModal(); }
  function saveDraft() {
    if (!mailLangs().every((l) => cs.outputs[l])) return;
    const existing = drafts.find((d) => d.id === cs.draftId);
    openReminder(existing ? existing.remindAt : autoRemindAt(), (remindAt) => {
      const data = { topicId: cs.topicId, tone: cs.tone, mailLang: cs.mailLang, values: clone(cs.values), outputs: clone(cs.outputs), dirty: clone(cs.dirty),
        subject: mergeOutputs(cs.outputs, cs.mailLang).subject, remindAt, notified: false, updatedAt: Date.now() };
      if (existing) Object.assign(existing, data);
      else { cs.draftId = uid(); drafts.unshift({ id: cs.draftId, status: "draft", createdAt: Date.now(), ...data }); q("#editingBadge").hidden = false; }
      saveDrafts(); toast(t("d.saved")); refreshDrafts();
    });
  }
  function renderDrafts() {
    const list = drafts.filter((d) => draftFilter === "all" || (draftFilter === "sent") === (d.status === "sent"));
    q("#draftList").innerHTML = list.length ? list.map(draftCard).join("") : `<p class="empty">${t("d.empty")}</p>`;
    qa("#draftTabs button").forEach((b) => b.classList.toggle("active", b.dataset.filter === draftFilter));
  }
  function draftCard(d) {
    const tp = findTopic(d.topicId);
    const out = d.outputs[d.mailLang === "both" ? "vi" : d.mailLang] ?? Object.values(d.outputs)[0];
    const sent = d.status === "sent"; const overdue = isOverdue(d);
    const chip = sent ? `<span class="chip chip-ok">${t("d.sentAt", { t: fmt(d.sentAt ?? d.updatedAt) })}</span>`
      : overdue ? `<span class="chip chip-danger">${t("d.overdue")}</span>`
      : d.remindAt ? `<span class="chip chip-warn">${t("d.remindAt", { t: fmt(d.remindAt) })}</span>` : `<span class="chip">${t("d.noRemind")}</span>`;
    return `<article class="draft-card ${overdue ? "overdue" : ""} ${sent ? "sent" : ""}" data-id="${esc(d.id)}">
      <div class="chips">${tp ? `<span class="chip">${esc(tp.icon)} ${esc((tp.name[uiLang] ?? tp.name.en))}</span>` : ""}
        <span class="chip chip-lang">${d.mailLang === "both" ? "VI + EN" : d.mailLang.toUpperCase()}</span>${chip}</div>
      <h3>${esc(d.subject)}</h3><p class="snippet">${esc(out?.body ?? "")}</p><p class="note">${t("d.updated", { t: fmt(d.updatedAt) })}</p>
      <div class="bar">
        <button type="button" class="btn" data-act="edit">${t("d.edit")}</button>
        ${sent ? "" : `<button type="button" class="btn" data-act="send">${t("d.send")}</button>`}
        <button type="button" class="btn" data-act="toggle">${sent ? t("d.markUnsent") : t("d.markSent")}</button>
        ${sent ? "" : `<button type="button" class="btn" data-act="remind">${t("d.remind")}</button>`}
        <button type="button" class="btn danger" data-act="delete">${t("d.delete")}</button></div></article>`;
  }
  function onDraftAction(act, d) {
    if (act === "edit") {
      loadIntoComposer({ topicId: d.topicId, tone: d.tone, mailLang: d.mailLang, draftId: d.id, values: clone(d.values), outputs: clone(d.outputs),
        dirty: !findTopic(d.topicId) ? { vi: true, en: true } : clone(d.dirty) });
      return;
    } else if (act === "send") { toast(t("d.sendHint")); window.location.href = mailtoUrl(mergeOutputs(d.outputs, d.mailLang)); }
    else if (act === "toggle") { d.status = d.status === "sent" ? "draft" : "sent"; d.sentAt = d.status === "sent" ? Date.now() : null; d.notified = false; }
    else if (act === "remind") return openReminder(d.remindAt, (ms) => { d.remindAt = ms; d.notified = false; persistDrafts(); });
    else if (act === "delete") { if (!confirm(t("d.confirmDelete"))) return; drafts = drafts.filter((x) => x.id !== d.id); if (cs.draftId === d.id) cs.draftId = null; }
    persistDrafts();
  }
  const persistDrafts = () => { saveDrafts(); refreshDrafts(); };
  function refreshDrafts() { renderDrafts(); renderDraftBadge(); checkReminders(); }
  function renderDraftBadge() {
    const n = drafts.filter((d) => d.status !== "sent").length; const b = q("#draftBadge");
    b.hidden = !n; b.textContent = n;
  }
  function checkReminders() {
    const due = drafts.filter(isOverdue); const fresh = due.filter((d) => !d.notified);
    fresh.forEach((d) => {
      d.notified = true; ringIsland(d);
      if ("Notification" in window && Notification.permission === "granted") new Notification(t("d.notifyTitle"), { body: d.subject });
    });
    if (fresh.length) saveDrafts();
    const bar = q("#alertBar"); bar.hidden = !due.length;
    if (due.length) bar.innerHTML = `<span>⏰ ${t("d.alert", { n: due.length })}</span><button type="button" class="btn" data-go="drafts">${t("d.alertBtn")}</button>`;
    if (currentView === "drafts" && fresh.length) renderDrafts();
  }
  function bindDrafts() {
    q("#draftTabs").addEventListener("click", (e) => { if (!e.target.dataset.filter) return; draftFilter = e.target.dataset.filter; renderDrafts(); });
    q("#draftList").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-act]"); const d = btn && drafts.find((x) => x.id === btn.closest(".draft-card").dataset.id);
      if (d) onDraftAction(btn.dataset.act, d);
    });
    const form = q("#formReminder");
    const finish = (ms) => {
      q("#dlgReminder").close();
      if (ms && "Notification" in window && Notification.permission === "default") Notification.requestPermission();
      reminderCallback?.(ms); reminderCallback = null;
    };
    form.addEventListener("submit", (e) => { e.preventDefault(); const v = q("#remindInput").value; finish(v ? new Date(v).getTime() : null); });
    q("#remindNone").addEventListener("click", () => finish(null));
    qa("[data-mins]", form).forEach((b) => b.addEventListener("click", () => { q("#remindInput").value = toLocalInput(Date.now() + Number(b.dataset.mins) * 6e4); }));
    document.addEventListener("visibilitychange", () => { if (!document.hidden) checkReminders(); });
    setInterval(checkReminders, 30000);
  }

  // ---------- Diễn đàn / cộng đồng ----------
  const cm = { search: "", topic: "", sort: "new" }; let openPostId = null;
  function visiblePosts() {
    const s = cm.search.trim().toLowerCase();
    return posts.filter((p) => p.status === "live").filter((p) => !cm.topic || p.topicId === cm.topic)
      .filter((p) => !s || [p.title, p.subject, p.body, p.author].some((x) => x.toLowerCase().includes(s)))
      .sort((a, b) => (cm.sort === "top" ? b.likes - a.likes : b.createdAt - a.createdAt));
  }
  function renderCommunity() {
    const sel = q("#cmTopic");
    sel.innerHTML = `<option value="">${t("m.allTopics")}</option>` + getTopics().map((x) => `<option value="${esc(x.id)}">${esc(x.icon)} ${esc((uiLang === "ja" ? (JA_TOPIC_NAMES[x.id] ?? x.name.en) : (x.name[uiLang] ?? x.name.en)))}</option>`).join("");
    sel.value = cm.topic;
    const list = visiblePosts();
    q("#postGrid").innerHTML = list.length ? list.map(postCard).join("") : `<p class="empty">${t("m.empty")}</p>`;
  }
  function postCard(p) {
    const tp = findTopic(p.topicId);
    return `<article class="post-card" data-id="${esc(p.id)}" tabindex="0">
      <div class="chips">${tp ? `<span class="chip">${esc(tp.icon)} ${esc((tp.name[uiLang] ?? tp.name.en))}</span>` : ""}<span class="chip chip-lang">${esc(p.lang.toUpperCase())}</span></div>
      <h3>${esc(p.title)}</h3><p class="snippet">${esc(p.body)}</p>
      <footer><span>${esc(p.author)}, ${fmt(p.createdAt, true)}</span><span>👍 ${p.likes}&nbsp; 💬 ${p.comments.length}</span></footer></article>`;
  }
  function openPost(id) { openPostId = id; renderDetail(); q("#dlgDetail").showModal(); }
  function renderDetail() {
    const p = posts.find((x) => x.id === openPostId); if (!p) return q("#dlgDetail").close();
    const tp = findTopic(p.topicId);
    const comments = p.comments.length ? p.comments.map((c) => `<li class="comment"><strong>${esc(c.name || t("m.anon"))}</strong><small>${fmt(c.createdAt)}</small><p>${esc(c.text)}</p>
      ${isAdmin() ? `<button type="button" class="link" data-act="delcomment" data-cid="${esc(c.id)}">${t("a.delete")}</button>` : ""}</li>`).join("") : `<li class="note">${t("m.noComments")}</li>`;
    q("#detailBody").innerHTML = `
      <div class="detail-head"><div class="chips">${tp ? `<span class="chip">${esc(tp.icon)} ${esc((tp.name[uiLang] ?? tp.name.en))}</span>` : ""}<span class="chip chip-lang">${esc(p.lang.toUpperCase())}</span></div>
        <button type="button" class="icon-btn" data-close aria-label="${t("g.close")}">✕</button></div>
      <h2>${esc(p.title)}</h2><p class="note">${esc(p.author)}, ${fmt(p.createdAt, true)}</p>
      <div class="mail-preview"><strong>${t("c.subject")}: ${esc(p.subject)}</strong><pre>${esc(p.body)}</pre></div>
      <div class="bar"><button type="button" class="btn ${liked.includes(p.id) ? "liked" : ""}" data-act="like">👍 ${p.likes}</button>
        <button type="button" class="btn main" style="width:auto;margin:0" data-act="use">${t("m.use")}</button>
        <button type="button" class="btn" data-act="copy">${t("c.copy")}</button>
        ${isAdmin() ? `<button type="button" class="btn danger" data-act="delpost">${t("a.delete")}</button>` : ""}</div>
      <h3 style="margin-top:18px">${t("m.comments", { n: p.comments.length })}</h3><ul class="comments">${comments}</ul>
      ${config.comments ? `<form class="comment-form" id="formComment"><input name="name" maxlength="40" placeholder="${t("m.name")}">
        <textarea name="text" rows="3" maxlength="600" required placeholder="${t("m.commentPh")}"></textarea>
        <button type="submit" class="btn main" style="width:auto;margin:0">${t("m.send")}</button></form>` : `<p class="note">${t("m.commentsOff")}</p>`}`;
  }
  function onPostAction(act, p, cid) {
    if (act === "like") { const has = liked.includes(p.id); liked = has ? liked.filter((x) => x !== p.id) : [...liked, p.id]; p.likes += has ? -1 : 1; Store.write(KEYS.liked, liked); }
    else if (act === "use") {
      const tp = findTopic(p.topicId); q("#dlgDetail").close();
      loadIntoComposer({ topicId: tp?.id ?? cs.topicId, mailLang: p.lang, draftId: null, outputs: { [p.lang]: { subject: p.subject, body: p.body } }, dirty: { [p.lang]: true } });
      return toast(t("m.used"));
    } else if (act === "copy") { copyText(`${t("c.subject")}: ${p.subject}\n\n${p.body}`).then(() => toast(t("c.copied"))); return; }
    else if (act === "delpost") { if (!confirm(t("a.confirmDelPost"))) return; posts = posts.filter((x) => x.id !== p.id); q("#dlgDetail").close(); }
    else if (act === "delcomment") p.comments = p.comments.filter((c) => c.id !== cid);
    savePosts(); renderCommunity(); renderAdminPosts(); renderDetail();
  }
  function openPostDialog(prefill = {}) {
    const form = q("#formPost"); form.reset();
    form.elements.topicId.innerHTML = getTopics().map((x) => `<option value="${esc(x.id)}">${esc(x.icon)} ${esc((uiLang === "ja" ? (JA_TOPIC_NAMES[x.id] ?? x.name.en) : (x.name[uiLang] ?? x.name.en)))}</option>`).join("");
    Object.entries({ title: "", topicId: liveTopics()[0]?.id, lang: uiLang, subject: "", body: "", ...prefill }).forEach(([k, v]) => { if (form.elements[k] && v != null) form.elements[k].value = v; });
    q("#dlgPost").showModal();
  }
  function bindCommunity() {
    q("#cmSearch").addEventListener("input", (e) => { cm.search = e.target.value; renderCommunity(); });
    q("#cmTopic").addEventListener("change", (e) => { cm.topic = e.target.value; renderCommunity(); });
    q("#cmSort").addEventListener("change", (e) => { cm.sort = e.target.value; renderCommunity(); });
    q("#btnNewPost").addEventListener("click", () => openPostDialog());
    const grid = q("#postGrid");
    grid.addEventListener("click", (e) => { const c = e.target.closest(".post-card"); if (c) openPost(c.dataset.id); });
    grid.addEventListener("keydown", (e) => { const c = e.target.closest(".post-card"); if (c && e.key === "Enter") openPost(c.dataset.id); });
    const detail = q("#detailBody");
    detail.addEventListener("click", (e) => { const b = e.target.closest("[data-act]"); const p = posts.find((x) => x.id === openPostId); if (b && p) onPostAction(b.dataset.act, p, b.dataset.cid); });
    detail.addEventListener("submit", (e) => {
      e.preventDefault(); const p = posts.find((x) => x.id === openPostId); const d = new FormData(e.target);
      p.comments.push({ id: uid(), name: d.get("name").trim(), text: d.get("text").trim(), createdAt: Date.now() });
      savePosts(); renderCommunity(); renderDetail(); detail.scrollTop = detail.scrollHeight;
    });
    q("#formPost").addEventListener("submit", (e) => {
      e.preventDefault(); const d = Object.fromEntries(new FormData(e.target)); const pending = config.moderation && !isAdmin();
      posts.unshift({ id: uid(), status: pending ? "pending" : "live", topicId: d.topicId, lang: d.lang, title: d.title.trim(), subject: d.subject.trim(), body: d.body.trim(),
        author: d.author.trim() || t("m.anon"), createdAt: Date.now(), likes: 0, comments: [] });
      savePosts(); q("#dlgPost").close(); renderCommunity(); renderAdminPosts(); toast(t(pending ? "m.postedPending" : "m.posted"));
    });
  }

  // ---------- Quản trị ----------
  let adminTab = "settings"; let editingTopicId = null;
  function renderAdmin() {
    const ok = isAdmin(); q("#formLogin").hidden = ok; q("#adminPanel").hidden = !ok; if (!ok) return;
    qa("#adminTabs [data-tab]").forEach((b) => b.classList.toggle("active", b.dataset.tab === adminTab));
    qa(".admin-pane").forEach((p) => { p.hidden = p.dataset.pane !== adminTab; });
    fillSettings(); renderAdminTopics(); renderAdminPosts();
  }
  function fillSettings() {
    const el = q("#formSettings").elements;
    ["siteName", "uiLang", "mailLang", "tone", "autoRemindHours"].forEach((k) => { el[k].value = config[k]; });
    el.moderation.checked = config.moderation; el.comments.checked = config.comments; el.newPin.value = "";
  }
  function saveSettings(form) {
    const el = form.elements;
    Object.assign(config, { siteName: el.siteName.value.trim() || DEFAULT_CONFIG.siteName, uiLang: el.uiLang.value, mailLang: el.mailLang.value, tone: el.tone.value,
      autoRemindHours: Math.max(0, Number(el.autoRemindHours.value) || 0), moderation: el.moderation.checked, comments: el.comments.checked });
    if (el.newPin.value) config.pin = el.newPin.value;
    saveConfig(); applyI18n(); if (isPristine()) { resetComposer(); renderComposer(); } toast(t("a.saved"));
  }
  function renderAdminTopics() {
    q("#adminTopics").innerHTML = getTopics().map((x) => `<li class="row-item" data-id="${esc(x.id)}">
      <input type="checkbox" data-act="toggle" ${x.enabled !== false ? "checked" : ""} aria-label="${esc((uiLang === "ja" ? (JA_TOPIC_NAMES[x.id] ?? x.name.en) : (x.name[uiLang] ?? x.name.en)))}"><span class="topic-icon">${esc(x.icon)}</span>
      <div class="grow"><strong>${esc((uiLang === "ja" ? (JA_TOPIC_NAMES[x.id] ?? x.name.en) : (x.name[uiLang] ?? x.name.en)))}</strong><small>${esc((x.subject[uiLang] ?? x.subject.en))}</small></div>
      <button type="button" class="btn" data-act="edit">${t("a.edit")}</button><button type="button" class="btn danger" data-act="delete">${t("a.delete")}</button></li>`).join("");
  }
  function openTopicDialog(id = null) {
    editingTopicId = id; const tp = id ? findTopic(id) : null; const el = q("#formTopic").elements;
    q("#topicDlgTitle").textContent = t(tp ? "a.topicEdit" : "a.topicNew");
    q("#phList").innerHTML = Object.keys(FIELDS).map((k) => `<code>{{${k}}}</code>`).join("");
    el.icon.value = tp?.icon ?? "✉️"; el.nameVi.value = tp?.name.vi ?? ""; el.nameEn.value = tp?.name.en ?? "";
    el.subjVi.value = tp?.subject.vi ?? ""; el.subjEn.value = tp?.subject.en ?? ""; el.bodyVi.value = tp?.body.vi ?? ""; el.bodyEn.value = tp?.body.en ?? "";
    q("#dlgTopic").showModal();
  }
  function saveTopic(form) {
    const el = form.elements;
    const data = { icon: el.icon.value.trim(), name: { vi: el.nameVi.value.trim(), en: el.nameEn.value.trim() },
      subject: { vi: el.subjVi.value.trim(), en: el.subjEn.value.trim() }, body: { vi: el.bodyVi.value.trim(), en: el.bodyEn.value.trim() } };
    const list = editableTopics(); const ex = list.find((x) => x.id === editingTopicId);
    if (ex) Object.assign(ex, data); else list.push({ id: "custom_" + uid(), enabled: true, ...data });
    saveConfig(); q("#dlgTopic").close(); refreshTopics(); toast(t("a.topicSaved"));
  }
  function refreshTopics() {
    if (!cs.draftId && !liveTopics().some((x) => x.id === cs.topicId)) cs.topicId = liveTopics()[0]?.id ?? null;
    renderComposer(); renderCommunity(); renderAdminTopics();
  }
  function onTopicAction(act, id, checked) {
    const list = editableTopics(); const tp = list.find((x) => x.id === id);
    if (act === "edit") return openTopicDialog(id);
    if (act === "toggle") tp.enabled = checked;
    if (act === "delete") { if (!confirm(t("a.confirmDelTopic"))) return; config.topics = list.filter((x) => x.id !== id); }
    saveConfig(); refreshTopics();
  }
  function renderAdminPosts() {
    q("#adminPosts").innerHTML = posts.length ? posts.map((p) => `<li class="row-item" data-id="${esc(p.id)}">
      <span class="chip ${p.status === "live" ? "chip-ok" : "chip-warn"}">${t(p.status === "live" ? "a.statusLive" : "a.statusPending")}</span>
      <div class="grow"><strong>${esc(p.title)}</strong><small>${esc(p.author)}: ${esc(p.subject)}</small></div>
      ${p.status === "pending" ? `<button type="button" class="btn main" style="width:auto;margin:0;padding:6px 12px;font-size:.9rem" data-act="approve">${t("a.approve")}</button>` : ""}
      <button type="button" class="btn" data-act="view">${t("c.body")}</button><button type="button" class="btn danger" data-act="delete">${t("a.delete")}</button></li>`).join("") : `<li class="empty">${t("a.noPosts")}</li>`;
  }
  function onAdminPostAction(act, id) {
    const p = posts.find((x) => x.id === id); if (!p) return;
    if (act === "view") return openPost(id);
    if (act === "approve") p.status = "live";
    if (act === "delete") { if (!confirm(t("a.confirmDelPost"))) return; posts = posts.filter((x) => x.id !== id); }
    savePosts(); renderAdminPosts(); renderCommunity();
  }
  async function importData(file) {
    try {
      const d = JSON.parse(await file.text());
      if (!Array.isArray(d.drafts) || !Array.isArray(d.posts) || typeof d.config !== "object") throw new Error("shape");
      config = { ...DEFAULT_CONFIG, ...d.config, pin: config.pin }; drafts = d.drafts; posts = d.posts;
      saveConfig(); saveDrafts(); savePosts(); resetComposer(); applyI18n(); renderAll(); toast(t("a.imported"));
    } catch { toast(t("a.badFile"), "error"); }
  }
  function bindAdmin() {
    q("#formLogin").addEventListener("submit", (e) => {
      e.preventDefault(); const pin = new FormData(e.target).get("pin");
      if (pin !== config.pin) return toast(t("a.wrongPin"), "error");
      sessionStorage.setItem(KEYS.admin, "1"); e.target.reset(); renderAdmin();
    });
    q("#btnLogout").addEventListener("click", () => { sessionStorage.removeItem(KEYS.admin); renderAdmin(); });
    q("#adminTabs").addEventListener("click", (e) => { if (!e.target.dataset.tab) return; adminTab = e.target.dataset.tab; renderAdmin(); });
    q("#formSettings").addEventListener("submit", (e) => { e.preventDefault(); saveSettings(e.target); });
    q("#btnAddTopic").addEventListener("click", () => openTopicDialog());
    q("#btnResetTopics").addEventListener("click", () => { if (!confirm(t("a.confirmResetTopics"))) return; config.topics = null; saveConfig(); refreshTopics(); });
    q("#adminTopics").addEventListener("click", (e) => { const el = e.target.closest("[data-act]"); if (el) onTopicAction(el.dataset.act, el.closest(".row-item").dataset.id, el.checked); });
    q("#formTopic").addEventListener("submit", (e) => { e.preventDefault(); saveTopic(e.target); });
    q("#adminPosts").addEventListener("click", (e) => { const el = e.target.closest("[data-act]"); if (el) onAdminPostAction(el.dataset.act, el.closest(".row-item").dataset.id); });
    q("#btnExport").addEventListener("click", () => { const { pin, ...safe } = config; download("mailmate-backup.json", JSON.stringify({ version: 1, config: safe, drafts, posts }, null, 2)); });
    q("#fileImport").addEventListener("change", async (e) => { if (e.target.files[0]) await importData(e.target.files[0]); e.target.value = ""; });
    q("#btnWipe").addEventListener("click", () => {
      if (!confirm(t("a.confirmWipe"))) return;
      Object.values(KEYS).forEach((k) => { localStorage.removeItem(k); sessionStorage.removeItem(k); }); location.reload();
    });
  }

  // ---------- Điều hướng & khởi động ----------
  // Script gốc đã tự ẩn/hiện #vCompose và #vForum; ở đây chỉ bổ sung hai màn mới.
  const VIEWS = ["compose", "drafts", "forum", "admin", "pro"];
  // Chuyển tab mượt (View Transitions API: nhòe + trượt); trình duyệt cũ thì đổi thẳng
  function show(view) {
    const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!document.startViewTransition || calm) return showNow(view);
    document.startViewTransition(() => showNow(view));
  }
  function showNow(view) {
    currentView = VIEWS.includes(view) ? view : "compose";
    q("#vCompose").hidden = currentView !== "compose"; q("#vForum").hidden = currentView !== "forum";
    q("#vDrafts").hidden = currentView !== "drafts"; q("#vAdmin").hidden = currentView !== "admin"; q("#vPro").hidden = currentView !== "pro";
    qa(".nav .tab").forEach((b) => b.setAttribute("aria-selected", b.dataset.v === currentView));
    moveThumb();
    if (currentView === "drafts") renderDrafts();
    if (currentView === "forum") renderCommunity();
    if (currentView === "admin") renderAdmin();
    if (currentView === "pro") renderPlanState();
    if (currentView === "compose" && !q("#modeTpl").hidden) qa(".tmail-body").forEach(autosize);
  }
  const go = (view) => show(view);
  function renderAll() { renderComposer(); renderDrafts(); renderDraftBadge(); renderCommunity(); renderAdmin(); checkReminders(); renderReviews(); requestAnimationFrame(moveThumb); }

  function init() {
    resetComposer(); bindDialogs(); bindComposer(); bindDrafts(); bindCommunity(); bindAdmin();
    q(".nav").addEventListener("click", (e) => { const b = e.target.closest(".tab"); if (b) show(b.dataset.v); });
    qa("[data-ui-lang]").forEach((b) => b.addEventListener("click", () => setUiLang(b.dataset.uiLang)));
    document.addEventListener("click", (e) => { const b = e.target.closest("[data-go]"); if (b) go(b.dataset.go); });
    q("#modeTabs [data-mode=quick]").classList.add("active");
    applyI18n(); renderAll(); show("compose");
  }

  // ---------- Thanh điều hướng: nút trượt kiểu iOS ----------
  function moveThumb() {
    const a = q('.nav .tab[aria-selected="true"]'), th = q(".nav-thumb");
    if (!a || !th) return;
    th.style.width = a.offsetWidth + "px";
    th.style.transform = `translateX(${a.offsetLeft}px)`;
  }
  addEventListener("resize", moveThumb);
  document.fonts?.ready.then(moveThumb);
  q("#dockMain").addEventListener("click", () => q("#theme").classList.toggle("open"));

  // ---------- Nhạc chuông: âm thanh có sẵn + nhiều file người dùng thêm ----------
  let actx, ringTimer, ringStop, ringAudio;
  const RTK = "mm2.ring";
  const CUSTOM_RINGS_KEY = "mm2.customRings";
  const ring = Store.read(RTK, { id: "chime" });
  let customRings = Store.read(CUSTOM_RINGS_KEY, []);
  if (!Array.isArray(customRings)) customRings = [];

  // Tương thích với phiên bản cũ chỉ lưu được một file "Nhạc của tôi".
  if (ring.id === "custom" && ring.data && !customRings.some((item) => item.data === ring.data)) {
    customRings.push({ id: "custom-legacy", name: ring.name || "Nhạc của tôi", data: ring.data });
    ring.id = "custom-legacy";
    Store.write(CUSTOM_RINGS_KEY, customRings);
    Store.write(RTK, ring);
  }

  const tone = (f, s, d, ty = "sine", g = 0.2) => {
    const o = actx.createOscillator(), n = actx.createGain(), t0 = actx.currentTime + s;
    o.type = ty; o.frequency.value = f; o.connect(n); n.connect(actx.destination);
    n.gain.setValueAtTime(1e-4, t0); n.gain.exponentialRampToValueAtTime(g, t0 + 0.02); n.gain.exponentialRampToValueAtTime(1e-4, t0 + d);
    o.start(t0); o.stop(t0 + d + 0.05);
  };
  const RINGS = {
    chime: () => [880, 1175, 1568, 1760].forEach((f, i) => tone(f, i * 0.2, 1.3, "sine", 0.2)),
    marimba: () => [523, 659, 784, 1046, 784].forEach((f, i) => tone(f, i * 0.14, 0.5, "triangle", 0.3)),
    pulse: () => [0, 0.25, 0.5].forEach((s) => { tone(1200, s, 0.12, "square", 0.07); tone(1800, s + 0.1, 0.12, "square", 0.05); }),
    classic: () => [0, 0.3, 0.6, 0.9].forEach((s) => tone(988, s, 0.18, "sawtooth", 0.1)),
  };
  const RING_FILES = {
    iphone: "audio/thong-bao-iphone.mp3",
    newtone: "audio/nhac-chuong-moi.mp3",
  };
  const rs = q("#ringSel");
  const ringDelete = q("#ringDelete");

  function renderRingOptions() {
    const selectedId = ring.id;
    rs.querySelectorAll("option[data-custom-ring]").forEach((option) => option.remove());
    customRings.forEach((item) => {
      const option = document.createElement("option");
      option.value = item.id;
      option.textContent = "🎵 " + item.name;
      option.dataset.customRing = "true";
      rs.appendChild(option);
    });
    const valid = [...rs.options].some((option) => option.value === selectedId);
    rs.value = valid ? selectedId : "chime";
    ring.id = rs.value;
    const isCustom = customRings.some((item) => item.id === ring.id);
    ringDelete.hidden = !isCustom;
  }
  renderRingOptions();

  function startRing() {
    stopRing();
    const customTrack = customRings.find((item) => item.id === ring.id);
    const fileSource = customTrack?.data || RING_FILES[ring.id];
    if (fileSource) {
      ringAudio = new Audio(fileSource);
      ringAudio.loop = true;
      ringAudio.play().catch(() => toast("Trình duyệt chưa phát được âm thanh. Hãy bấm nút ▶ để thử lại.", "error"));
      ringStop = setTimeout(stopRing, 30000);
      return;
    }
    const play = () => {
      actx ??= new (window.AudioContext || window.webkitAudioContext)();
      actx.resume().then(() => (RINGS[ring.id] || RINGS.chime)()).catch(() => {});
    };
    play(); ringTimer = setInterval(play, 2800); ringStop = setTimeout(stopRing, 30000);
  }
  function stopRing() { clearInterval(ringTimer); clearTimeout(ringStop); ringAudio?.pause(); ringAudio = null; }

  rs.onchange = () => {
    ring.id = rs.value;
    Store.write(RTK, ring);
    ringDelete.hidden = !customRings.some((item) => item.id === ring.id);
  };
  q("#ringTest").onclick = () => ringIsland({ subject: t("isl.demo") }, true);
  q("#ringFile").onchange = async (e) => {
    const files = [...(e.target.files || [])];
    e.target.value = "";
    if (!files.length) return;

    const MAX_FILE_SIZE = 2 * 1024 * 1024;
    const MAX_TOTAL_CHARS = 3_500_000;
    let totalChars = customRings.reduce((sum, item) => sum + (item.data?.length || 0), 0);
    let added = 0;

    for (const file of files) {
      if (!file.type.startsWith("audio/") && !/\.(mp3|wav|ogg|m4a|aac|webm)$/i.test(file.name)) {
        toast("Bỏ qua file không phải âm thanh: " + file.name, "error");
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast("File quá lớn (tối đa 2 MB): " + file.name, "error");
        continue;
      }
      const data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("Không đọc được file"));
        reader.readAsDataURL(file);
      }).catch(() => null);
      if (!data) {
        toast("Không đọc được file: " + file.name, "error");
        continue;
      }
      if (totalChars + data.length > MAX_TOTAL_CHARS) {
        toast("Đã gần đầy bộ nhớ trình duyệt. Hãy xóa bớt nhạc chuông rồi thử lại.", "error");
        break;
      }
      const id = "custom-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
      customRings.push({ id, name: file.name.replace(/\.[^.]+$/, ""), data });
      totalChars += data.length;
      added++;
    }

    if (added) {
      try {
        Store.write(CUSTOM_RINGS_KEY, customRings);
        ring.id = customRings[customRings.length - 1].id;
        Store.write(RTK, ring);
        renderRingOptions();
        toast("Đã thêm " + added + " nhạc chuông. Bạn có thể chọn trong danh sách.");
      } catch {
        toast("Không đủ bộ nhớ để lưu nhạc chuông. Hãy xóa bớt file rồi thử lại.", "error");
      }
    }
  };
  ringDelete.onclick = () => {
    const selected = customRings.find((item) => item.id === ring.id);
    if (!selected) return;
    if (!confirm(`Xóa nhạc chuông "${selected.name}" khỏi trình duyệt này?`)) return;
    customRings = customRings.filter((item) => item.id !== selected.id);
    Store.write(CUSTOM_RINGS_KEY, customRings);
    ring.id = "chime";
    Store.write(RTK, ring);
    stopRing();
    renderRingOptions();
    toast("Đã xóa nhạc chuông.");
  };

  // ---------- Dynamic Island nhắc gửi email ----------
  const isl = q("#island"); const islQ = []; let islBusy = false;
  function ringIsland(d, demo = false) { islQ.push({ d, demo }); if (!islBusy) nextIsland(); }
  function nextIsland() {
    const it = islQ.shift(); if (!it) { islBusy = false; return; }
    islBusy = true;
    isl.className = "island"; isl.dataset.id = it.demo ? "" : it.d.id;
    isl.innerHTML = `<div class="isl-in"><div class="isl-top"><span class="isl-bell">🔔</span><b>${t("d.notifyTitle")}</b><button data-i="x" aria-label="${t("g.close")}">✕</button></div>
      <p>${esc(it.d.subject)}</p>
      <div class="isl-acts"><button data-i="open">${t("d.alertBtn")}</button>${it.demo ? "" : `<button data-i="sent">${t("d.markSent")}</button><button data-i="snooze">${t("isl.snooze")}</button>`}</div></div>`;
    void isl.offsetWidth; isl.classList.add("show");
    setTimeout(() => isl.classList.add("open"), 450);
    startRing(); isl._t = setTimeout(closeIsland, 30000);
  }
  function closeIsland() {
    clearTimeout(isl._t); stopRing(); isl.classList.remove("open");
    setTimeout(() => { isl.classList.remove("show"); setTimeout(nextIsland, 500); }, 350);
  }
  isl.addEventListener("click", (e) => {
    const a = e.target.dataset.i; if (!a) return;
    const d = drafts.find((x) => x.id === isl.dataset.id);
    if (a === "open") go("drafts");
    if (d && a === "sent") { d.status = "sent"; d.sentAt = Date.now(); }
    if (d && a === "snooze") { d.remindAt = Date.now() + 6e5; d.notified = false; }
    if (d) persistDrafts();
    closeIsland();
  });

  // ---------- Đánh giá minh họa và góp ý do người dùng gửi ----------
  // REVIEWS bên dưới là dữ liệu demo hư cấu; ý kiến thực tế được lưu riêng trên trình duyệt hiện tại.
  const REVIEWS = [
    { n: "Minh Anh", h: "@minhanh.k65", e: "👩🏻‍🎓", s: 5, l: 128, demo: true, t: { vi: "Soạn mail xin nghỉ học chưa đến 1 phút, thầy trả lời luôn. Quá tiện!", en: "Wrote my absence email in under a minute and my professor replied right away.", ja: "1分以内に欠席メールを作成でき、とても便利でした。" } },
    { n: "Hoàng Long", h: "@long.dev", e: "🧑🏽‍💻", s: 5, l: 96, demo: true, t: { vi: "Dark mode đẹp, đổi màu mượt như app iPhone.", en: "Beautiful dark mode and smooth colour switching.", ja: "ダークモードがきれいで、色の切り替えも滑らかです。" } },
    { n: "Sakura T.", h: "@sakura_t", e: "👩🏻", s: 5, l: 74, demo: true, t: { vi: "Có cả tiếng Nhật nên mình gửi mail cho giáo sư rất tự tin.", en: "Japanese support helps me write emails to professors with confidence.", ja: "日本語に対応しているので、先生へのメールも安心して作成できます。" } },
    { n: "Quốc Bảo", h: "@baoquoc", e: "👨🏻‍🎤", s: 4, l: 41, demo: true, t: { vi: "Mẫu email đủ dùng, diễn đàn có nhiều ví dụ hay để tham khảo.", en: "Useful templates and plenty of examples in the community.", ja: "便利なテンプレートと参考例がたくさんあります。" } },
    { n: "Linh Chi", h: "@chi.linh", e: "👩🏻‍🦰", s: 3, l: 22, demo: true, t: { vi: "Mẫu hay nhưng cần đồng bộ nháp giữa các máy.", en: "Nice templates, but syncing drafts across devices would help.", ja: "テンプレートは良いですが、端末間で下書きを同期できると便利です。" } },
    { n: "Anh Tuấn", h: "@tuan_it", e: "🧔🏻", s: 2, l: 15, demo: true, t: { vi: "Mong có thêm tùy chọn chỉnh âm lượng nhạc chuông.", en: "A ringtone volume control would be helpful.", ja: "着信音の音量調節機能があるとうれしいです。" } },
  ];
  const USER_REVIEWS_KEY = "mm2.userReviews";
  let userReviews = Store.read(USER_REVIEWS_KEY, []);
  if (!Array.isArray(userReviews)) userReviews = [];
  let rvF = "all", selectedRating = 5;
  function renderReviews() {
    qa("#rvFilter button").forEach((b) => b.classList.toggle("active", b.dataset.f === rvF));
    const all = [...userReviews.map(r => ({...r, userSubmitted: true, e: "💬", h: t("fb.userReview"), l: 0, t: {vi:r.comment,en:r.comment,ja:r.comment}})), ...REVIEWS];
    q("#rvGrid").innerHTML = all.filter((r) => rvF === "all" || (rvF === "pos") === (r.s >= 4)).map((r, i) => `
      <article class="rv-card"><header>
        <span class="rv-av" style="--h:${i * 47}">${r.img ? `<img src="${esc(r.img)}" alt="">` : esc(r.e || "💬")}</span>
        <div><b>${esc(r.n || t("fb.user"))}</b><small>${esc(r.userSubmitted ? t("fb.userReview") : r.h)}${r.demo ? " · DEMO" : ""}</small></div>
        <span class="rv-stars" aria-label="${r.s}/5">${"★".repeat(r.s)}<i>${"★".repeat(5 - r.s)}</i></span></header>
        <p>${esc(r.t[uiLang] ?? r.t.en)}</p>${r.userSubmitted ? "" : `<footer>♥ ${r.l}</footer>`}</article>`).join("");
  }
  q("#rvFilter").addEventListener("click", (e) => { if (e.target.dataset.f) { rvF = e.target.dataset.f; renderReviews(); } });
  function renderFeedbackStars() {
    qa("#feedbackStars button").forEach(b => { const active = Number(b.dataset.rating) <= selectedRating; b.classList.toggle("active", active); b.setAttribute("aria-checked", String(Number(b.dataset.rating) === selectedRating)); });
  }
  qa("#feedbackStars button").forEach(b => b.addEventListener("click", () => { selectedRating = Number(b.dataset.rating); renderFeedbackStars(); }));
  q("#feedbackForm").addEventListener("submit", (e) => {
    e.preventDefault(); const form = e.currentTarget; const fd = new FormData(form); const comment = String(fd.get("comment") || "").trim();
    if (!selectedRating || !comment) { q("#feedbackStatus").textContent = t("fb.required"); return; }
    userReviews.unshift({ id: uid(), n: String(fd.get("name") || "").trim() || t("fb.user"), s: selectedRating, comment, createdAt: Date.now() });
    Store.write(USER_REVIEWS_KEY, userReviews); form.reset(); selectedRating = 5; renderFeedbackStars(); renderReviews(); q("#feedbackStatus").textContent = t("fb.thanks");
  });
  function renderPlanState() {
    const p = Store.read("mm2.selectedPlan", "free");
    qa("[data-plan]").forEach(b => b.classList.toggle("selected", b.dataset.plan === p));
  }
  const PLAN_LABELS = { free: { vi: "MailMate Free · 0đ", en: "MailMate Free · 0 VND", ja: "MailMate Free · 0 VND" }, go: { vi: "MailMate Go · 29.000đ/tháng", en: "MailMate Go · 29,000 VND/month", ja: "MailMate Go · 月額29,000 VND" }, pro: { vi: "MailMate Pro · 79.000đ/tháng", en: "MailMate Pro · 79,000 VND/month", ja: "MailMate Pro · 月額79,000 VND" } };
  qa("[data-plan]").forEach(b => b.addEventListener("click", () => {
    const plan = b.dataset.plan; Store.write("mm2.selectedPlan", plan); renderPlanState();
    if (plan === "free") { q("#paymentPanel").hidden = true; return; }
    q("#paymentPanel").hidden = false; q("#selectedPlan").textContent = PLAN_LABELS[plan][uiLang] || PLAN_LABELS[plan].en;
    q("#paymentPanel").scrollIntoView({ behavior: "smooth", block: "center" });
  }));
  renderFeedbackStars();

  // ---------- Nhắc đính kèm trước khi mở Gmail + rung nhẹ khi bấm ----------
  UI["att.ask"] = ["Thư có nhắc đến file đính kèm. Bạn đã sẵn sàng đính kèm khi gửi chưa?", "Your email mentions an attachment. Ready to attach it when sending?", "メールに添付ファイルの記載があります。送信時に添付できますか？"];
  q("#gm").addEventListener("click", (e) => {
    if (/đính kèm|\bCV\b|attach|添付/i.test(q("#body").value) && !confirm(t("att.ask"))) e.preventDefault();
  });
  document.addEventListener("click", (e) => { if (e.target.closest("button, .btn, .tab")) navigator.vibrate?.(8); });

  init();
})();
