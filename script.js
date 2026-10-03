window.VT = (s) => s;
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

// Lưu thông tin vào bộ nhớ
function store(k, v) {
  try {
    if (v === undefined) return JSON.parse(localStorage.getItem(k) || "null");
    localStorage.setItem(k, JSON.stringify(v));
    if (["mm_profile", "mm_drafts", "mm2.drafts"].includes(k)) window.dispatchEvent(new CustomEvent("mailmate:data-changed", { detail: { key: k } }));
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

async function translateText(text, targetLang, fromLang = "vi") {
  if (targetLang === fromLang) return text;
  try {
    const response = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${fromLang}|${targetLang}`,
    );
    const data = await response.json();
    if (Number(data.responseStatus) !== 200) throw new Error("mm");
    return data.responseData.translatedText;
  } catch (error) {
    return fromLang === "en" ? text : text + " (Lỗi dịch tự động)";
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
    showError("rname", VT("Vui lòng nhập tên người nhận."));
    hasError = true;
  } else if (invalidCharRegex.test(rname)) {
    showError("rname", VT("Tên không được chứa số/ký tự đặc biệt."));
    hasError = true;
  }

  // Bắt lỗi đỏ: Tên sinh viên
  if (!me) {
    showError("me", VT("Vui lòng nhập họ và tên của bạn."));
    hasError = true;
  } else if (invalidCharRegex.test(me)) {
    showError("me", VT("Họ tên không được chứa số/ký tự đặc biệt."));
    hasError = true;
  }

  // Bắt lỗi đỏ: Email
  if (!rto) {
    showError("rto", VT("Vui lòng nhập email."));
    hasError = true;
  } else if (!rto.includes("@")) {
    showError("rto", VT("Email phải có ký tự '@'."));
    hasError = true;
  }

  // Bắt lỗi đỏ: Lớp/Ngành (Không được bỏ trống)
  if (!maj) {
    showError("maj", VT("Vui lòng nhập Lớp/Ngành học."));
    hasError = true;
  }

  // Bắt lỗi đỏ: MSSV (Không được bỏ trống + Không được có chữ)
  if (!sid) {
    showError("sid", VT("Vui lòng nhập MSSV."));
    hasError = true;
  } else if (nonDigitRegex.test(sid)) {
    showError("sid", VT("MSSV bị lỗi (Chỉ được chứa số, không chứa chữ cái)."));
    hasError = true;
  }

  // Bắt lỗi đỏ: Lý do
  if (!pts) {
    showError("pts", VT("Vui lòng nhập lý do chi tiết."));
    hasError = true;
  }

  // Dừng quá trình nếu có lỗi
  if (hasError) return;

  // Bắt đầu tạo thư
  $("#go").disabled = true;
  $("#go").innerText = VT("⏳ AI đang dịch và tạo thư...");
  $("#msg").innerText = "";

  const lang = $("#lang").value;
  const EXT = !["vi", "en", "ja"].includes(lang); // ngôn ngữ khác: soạn bản tiếng Anh rồi dịch
  const topic = $("#topic").value;

  let finalName = me;
  let finalTeacher = rname;
  if (lang !== "vi") {
    finalName = removeVietnameseTones(me);
    finalTeacher = removeVietnameseTones(rname);
  }

  // Chờ dịch lý do chi tiết
  let finalDetails = await translateText(pts, EXT ? "en" : lang);
  let finalSubject = "",
    finalBody = "";

  if (EXT) {
    const g = quickGeneric(topic, "en", finalName, finalTeacher, sid, maj, finalDetails);
    finalBody = applyQuickTone(g.b, "en");
    [finalSubject, finalBody] = await Promise.all([translateText(g.s, lang, "en"), translateLines(finalBody, lang)]);
  } else if (topic === "nghi-hoc") {
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
    const g = quickGeneric(topic, lang, finalName, finalTeacher, sid, maj, finalDetails);
    finalSubject = g.s;
    finalBody = g.b;
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
  $("#go").innerText = VT("✨ AI Soạn Email Ngay");
  $("#msg").innerText = VT("✅ Đã tạo thư thành công!");
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
  const t = `${VT("Tiêu đề")}: ${$("#subj").value}\n\n${$("#body").value}`;
  try {
    await navigator.clipboard.writeText(t);
    $("#msg").innerText = VT("✅ Đã sao chép vào khay nhớ tạm.");
  } catch (err) {
    alert(VT("Lỗi sao chép!"));
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
    return alert(VT("⚠️ Thư đang trống!"));
  const d = store("mm_drafts") || [];
  d.unshift({ id: Date.now(), subj: $("#subj").value, body: $("#body").value });
  store("mm_drafts", d);
  drawDrafts();
  $("#msg").innerText = VT("✅ Đã lưu nháp!");
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
const QT = { // giọng điệu -> ngôn ngữ -> [lời chào thay "Kính gửi/Dear/お疲れ様です。", lời kết thay "Trân trọng,/Best regards,/敬具"]
  friendly: { vi: ["Chào ", "Cảm ơn và thân mến,"], en: ["Hi ", "Many thanks,"], ja: ["こんにちは。", "ありがとうございます。"] },
  respectful: { vi: ["Kính thưa ", "Kính chúc sức khỏe và thành công.\nKính thư,"], en: ["Respected ", "With sincere respect and gratitude,"], ja: ["謹んでご連絡申し上げます。", "心より感謝申し上げます。\n敬具"] },
  casual: { vi: ["Hi ", "Thanks nhiều nhé,"], en: ["Hey ", "Thanks!"], ja: ["やあ、", "ありがとう！"] },
  enthusiastic: { vi: ["Xin chào ", "Rất mong sớm nhận được phản hồi của bạn!"], en: ["Hello ", "Looking forward to hearing from you!"], ja: ["こんにちは！", "ご返信をお待ちしております！"] },
  apologetic: { vi: ["Kính gửi ", "Em xin lỗi vì đã làm phiền và rất cảm ơn sự thông cảm.\nTrân trọng,"], en: ["Dear ", "I apologize for any inconvenience and truly appreciate your understanding.\nBest regards,"], ja: ["お忙しいところ恐れ入ります。", "ご迷惑をおかけし申し訳ありません。\n敬具"] },
  urgent: { vi: ["Kính gửi ", "Rất mong nhận được phản hồi sớm.\nTrân trọng,"], en: ["Dear ", "I would appreciate your earliest reply.\nBest regards,"], ja: ["お急ぎで恐縮ですが、", "お早めのご返信をお願いいたします。\n敬具"] },
};
function applyQuickTone(body, lang) {
  const sel = document.getElementById("qTone"), p = sel && QT[sel.value] && QT[sel.value][lang];
  if (!p) return body;
  const G = { vi: /^Kính gửi /, en: /^Dear /, ja: /お疲れ様です。/ }[lang], C = { vi: /Trân trọng,/, en: /Best regards,/, ja: /敬具/ }[lang];
  return body.replace(G, p[0]).replace(C, p[1]);
}
const QTONES = [["formal", ["Trang trọng", "Formal", "丁寧・フォーマル"]], ["friendly", ["Thân thiện", "Friendly", "フレンドリー"]], ["respectful", ["Kính trọng", "Respectful", "敬意を込めて"]], ["casual", ["Thoải mái", "Casual", "カジュアル"]], ["enthusiastic", ["Nhiệt tình", "Enthusiastic", "熱意を込めて"]], ["apologetic", ["Nhẹ nhàng, xin lỗi", "Apologetic", "お詫びの気持ちで"]], ["urgent", ["Khẩn trương", "Urgent", "お急ぎで"]]];
const QLANGS = [["vi", ["Tiếng Việt", "Vietnamese", "ベトナム語"]], ["en", ["Tiếng Anh", "English", "英語"]], ["ja", ["Tiếng Nhật", "Japanese", "日本語"]], ["ko", ["Tiếng Hàn", "Korean", "韓国語"]], ["zh-CN", ["Tiếng Trung (giản thể)", "Chinese (Simplified)", "中国語（簡体字）"]], ["zh-TW", ["Tiếng Trung (phồn thể)", "Chinese (Traditional)", "中国語（繁体字）"]], ["fr", ["Tiếng Pháp", "French", "フランス語"]], ["de", ["Tiếng Đức", "German", "ドイツ語"]], ["es", ["Tiếng Tây Ban Nha", "Spanish", "スペイン語"]], ["pt", ["Tiếng Bồ Đào Nha", "Portuguese", "ポルトガル語"]], ["it", ["Tiếng Ý", "Italian", "イタリア語"]], ["ru", ["Tiếng Nga", "Russian", "ロシア語"]], ["th", ["Tiếng Thái", "Thai", "タイ語"]], ["id", ["Tiếng Indonesia", "Indonesian", "インドネシア語"]], ["ar", ["Tiếng Ả Rập", "Arabic", "アラビア語"]], ["hi", ["Tiếng Hindi", "Hindi", "ヒンディー語"]]];
const QTOPICS = [ // [id, icon, [nhãn VI, EN, JA], [câu mở đầu VI, EN, JA]]
  ["nghi-hoc", "🎒", ["Xin nghỉ học / nghỉ làm", "Absence from school / work", "学校・仕事の欠席"], ["Em viết thư này để xin phép được nghỉ.", "I am writing to respectfully request an excused absence.", "欠席のお願いでご連絡いたしました。"]],
  ["nop-tre", "⏰", ["Xin nộp bài trễ", "Late submission", "提出遅延のお願い"], ["Em viết thư này để xin phép được nộp bài trễ hạn.", "I am writing to kindly ask for permission to submit my work late.", "課題の提出が遅れることについてお願いしたくご連絡いたしました。"]],
  ["gia-han", "⏳", ["Xin gia hạn thời hạn", "Deadline extension", "期限延長のお願い"], ["Em viết thư này để xin gia hạn thêm thời gian hoàn thành.", "I am writing to request an extension of the deadline.", "期限の延長をお願いしたくご連絡いたしました。"]],
  ["ung-tuyen", "💼", ["Ứng tuyển / Xin thực tập", "Job application / Internship", "応募・インターン希望"], ["Em viết thư này để ứng tuyển / xin thực tập tại quý đơn vị.", "I am writing to apply for a position / internship at your organization.", "貴社への応募（インターン希望）のご連絡です。"]],
  ["thu-gioi-thieu", "📝", ["Xin thư giới thiệu", "Recommendation letter", "推薦状のお願い"], ["Em viết thư này để kính xin một thư giới thiệu.", "I am writing to kindly ask for a letter of recommendation.", "推薦状を書いていただきたくご連絡いたしました。"]],
  ["hoc-bong", "🎓", ["Xin xét học bổng", "Scholarship application", "奨学金の申請"], ["Em viết thư này để xin được xét học bổng.", "I am writing to apply for the scholarship.", "奨学金の申請についてご連絡いたしました。"]],
  ["phuc-khao", "📊", ["Xin phúc khảo điểm", "Grade review request", "成績再確認のお願い"], ["Em viết thư này để xin được phúc khảo điểm bài thi.", "I am writing to request a review of my grade.", "成績の再確認をお願いしたくご連絡いたしました。"]],
  ["xin-gap", "🤝", ["Xin hẹn gặp", "Meeting request", "面談のお願い"], ["Em viết thư này để xin hẹn một buổi gặp trao đổi.", "I am writing to request a meeting with you.", "面談のお時間をいただきたくご連絡いたしました。"]],
  ["doi-lich", "📅", ["Xin đổi lịch", "Reschedule request", "日程変更のお願い"], ["Em viết thư này để xin đổi lịch hẹn.", "I am writing to ask whether we could reschedule.", "日程の変更をお願いしたくご連絡いたしました。"]],
  ["tai-lieu", "📚", ["Xin tài liệu", "Request for materials", "資料のお願い"], ["Em viết thư này để xin được gửi tài liệu.", "I am writing to request some materials.", "資料をいただきたくご連絡いたしました。"]],
  ["cam-on", "💐", ["Gửi lời cảm ơn", "Thank-you note", "お礼"], ["Em viết thư này để gửi lời cảm ơn chân thành.", "I am writing to express my sincere thanks.", "心より御礼申し上げたくご連絡いたしました。"]],
  ["xin-loi", "🙏", ["Gửi lời xin lỗi", "Apology", "お詫び"], ["Em viết thư này để xin lỗi về sự việc vừa qua.", "I am writing to sincerely apologize for what happened.", "このたびの件につきお詫びを申し上げたくご連絡いたしました。"]],
  ["nghi-viec", "🚪", ["Xin nghỉ việc", "Resignation", "退職のご連絡"], ["Em viết thư này để thông báo nguyện vọng nghỉ việc.", "I am writing to formally notify you of my resignation.", "退職のご意向をお伝えしたくご連絡いたしました。"]],
  ["nhac-lai", "🔔", ["Nhắc lại email chưa phản hồi", "Follow-up on no reply", "返信のお願い（再送）"], ["Em viết thư này để hỏi thăm về email em đã gửi trước đó.", "I am writing to follow up on my earlier email.", "先日お送りしたメールについてご連絡いたしました。"]],
  ["khac", "✉️", ["Khác (Liên hệ chung)", "Other (general contact)", "その他（一般連絡）"], ["Em viết thư này để liên hệ với quý Thầy/Cô.", "I am writing to get in touch with you.", "ご連絡させていただきました。"]],
];
function quickGeneric(topic, lang, name, teacher, sid, maj, details) {
  const T = QTOPICS.find((x) => x[0] === topic) || QTOPICS[QTOPICS.length - 1], i = { vi: 0, en: 1, ja: 2 }[lang];
  const idLabel = ["MSSV: ", "ID: ", "学籍番号: "][i];
  const s = `[${T[2][i].toUpperCase()}] - ${name} - ${idLabel}${sid}`;
  const b = [
    `Kính gửi ${teacher},\n\nEm tên là: ${name}\nMã số SV: ${sid}\nLớp/Ngành: ${maj}\n\n${T[3][0]}\nNội dung: ${details}\n\nEm xin chân thành cảm ơn.\n\nTrân trọng,\n${name}`,
    `Dear ${teacher},\n\nMy name is ${name}, Student ID: ${sid}, Major: ${maj}.\n\n${T[3][1]}\nDetails: ${details}\n\nThank you for your time and consideration.\n\nBest regards,\n${name}`,
    `${teacher} 先生\n\nお疲れ様です。\n${maj}の ${name}（学籍番号: ${sid}）です。\n\n${T[3][2]}\n内容：${details}\n\nよろしくお願いいたします。\n\n敬具\n${name}`,
  ][i];
  return { s, b };
}
async function translateLines(text, to) { // MyMemory giới hạn ~500 ký tự/lần nên dịch từng dòng
  return (await Promise.all(text.split("\n").map((l) => (l.trim() ? translateText(l, to, "en") : l)))).join("\n");
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
    "nav.developers": ["👥 Các nhà phát triển", "👥 Developers"], "dev.title": ["Đội ngũ MailMate", "The MailMate team"], "nav.upgrade": ["💎 Nâng cấp", "💎 Upgrade"],
    "footer.product": ["MailMate", "MailMate"], "footer.features": ["Tính năng", "Features"], "footer.compose": ["Soạn email", "Compose email"], "footer.community": ["Diễn đàn mẫu", "Email examples"], "footer.support": ["Hỗ trợ", "Support"], "footer.reviews": ["Đánh giá", "Reviews"], "footer.note": ["Được tạo để giúp mỗi email trở nên rõ ràng hơn.", "Built to make every email clearer."],
    "features.eyebrow": ["MỌI THỨ BẠN CẦN ĐỂ VIẾT TỐT HƠN", "EVERYTHING YOU NEED TO WRITE BETTER"], "features.title": ["Một không gian nhỏ, nhiều trợ giúp thiết thực.", "One thoughtful space, practical help at every step."], "features.copy": ["Từ email đầu tiên đến việc theo dõi phản hồi, MailMate giúp bạn sắp xếp lời nói và công việc rõ ràng hơn.", "From the first draft to following up, MailMate helps you communicate clearly and stay organized."], "features.composeTitle": ["Soạn email theo từng bước", "Step-by-step email writing"], "features.composeCopy": ["Chọn chủ đề, giọng điệu và điền thông tin để tạo bản nháp có cấu trúc rõ ràng.", "Choose a topic and tone, then fill in details to create a clear, structured draft."], "features.draftsTitle": ["Nháp và nhắc nhở", "Drafts and reminders"], "features.draftsCopy": ["Lưu email chưa gửi, đặt lịch nhắc và theo dõi việc cần làm tiếp theo.", "Save unsent emails, schedule reminders, and keep track of what comes next."], "features.communityTitle": ["Mẫu thư và góp ý cộng đồng", "Email examples and community feedback"], "features.communityCopy": ["Tham khảo ví dụ, chia sẻ kinh nghiệm và học cách viết phù hợp với từng tình huống.", "Explore examples, share experiences, and learn how to write for different situations."], "features.cta": ["Bắt đầu viết email ↘", "Start writing an email ↘"], "settings.title": ["Cài đặt", "Settings"], "settings.copy": ["Tùy chỉnh trải nghiệm của bạn.", "Customize your experience."], "settings.language": ["Ngôn ngữ giao diện", "Interface language"], "settings.time": ["Thời gian và vị trí", "Time and location"], "settings.timezone": ["Múi giờ", "Time zone"], "settings.location": ["Tên vị trí hiển thị", "Location label"], "settings.format": ["Định dạng giờ", "Time format"], "settings.timeHint": ["Bạn có thể đổi múi giờ hiển thị; đồng hồ không thay đổi giờ hệ thống của thiết bị.", "You can change the displayed time zone; this does not change your device's system clock."], "settings.save": ["Lưu cài đặt", "Save settings"], "settings.account": ["Tài khoản", "Account"], "settings.accountCopy": ["Đăng xuất khỏi phiên quản trị trên thiết bị này.", "Sign out of the admin session on this device."], "settings.logout": ["Đăng xuất quản trị", "Sign out of admin"] ,
    "hero.eyebrow": ["TRỢ LÝ EMAIL CỦA BẠN", "YOUR EMAIL WRITING COMPANION"], "hero.title": ["Viết email tốt hơn. Tự tin hơn.", "Write better emails. Feel more confident."], "hero.copy": ["Biến ý tưởng thành những email rõ ràng, chuyên nghiệp chỉ trong vài bước.", "Turn your ideas into clear, professional emails in just a few steps."], "hero.try": ["Try on web ↘", "Try on web ↘"], "hero.learn": ["Khám phá tính năng", "Explore features"], "hero.caption": ["Không gian viết thư dành cho sinh viên và người đi làm", "A thoughtful writing space for students and professionals"], "hero.trusted": ["Được nhiều đội ngũ hàng đầu tin tưởng", "Trusted by teams building what’s next"], "hero.disclaimer": ["Logo minh họa giao diện — không hàm ý hợp tác hoặc chứng thực chính thức.", "Illustrative logos for interface design only; no official affiliation or endorsement implied."],
    "clock.live": ["GIỜ ĐỊA PHƯƠNG · TRỰC TIẾP", "LIVE LOCAL TIME"], "clock.title": ["Một nhịp dừng giữa những email", "A mindful pause between emails"], "clock.copy": ["Thời gian đang trôi — hãy dành một phút để viết điều bạn muốn nói thật rõ ràng.", "Time keeps moving — take a moment to say what you mean, clearly."],
    "upgrade.eyebrow": ["THÀNH VIÊN MAILMATE", "MAILMATE MEMBERSHIP"], "upgrade.title": ["Chọn không gian viết của bạn", "Choose your writing space"], "upgrade.copy": ["Bắt đầu miễn phí hoặc chọn gói phù hợp với nhu cầu.", "Start for free or choose a plan that fits your needs."], "upgrade.free1": ["Mẫu email cơ bản", "Essential email templates"], "upgrade.free2": ["Lưu nháp trên trình duyệt", "Save drafts in your browser"], "upgrade.go1": ["Quy trình viết mở rộng", "Expanded writing workflow"], "upgrade.go2": ["Hỗ trợ dự án MailMate", "Support the MailMate project"], "upgrade.pro1": ["Trải nghiệm nâng cao", "Enhanced experience"], "upgrade.pro2": ["Ủng hộ phát triển MailMate", "Support MailMate development"], "upgrade.freeBtn": ["Dùng miễn phí", "Use Free"], "upgrade.goBtn": ["Chọn Go", "Choose Go"], "upgrade.proBtn": ["Chọn Pro", "Choose Pro"], "upgrade.secure": ["THANH TOÁN", "PAYMENT"], "upgrade.qrCopy": ["Quét mã QR bằng ứng dụng ngân hàng. Hãy kiểm tra thông tin trước khi xác nhận.", "Scan the QR code with your banking app. Check the details before confirming."], "upgrade.qrNote": ["Website chưa tự động xác minh giao dịch. Vui lòng liên hệ quản trị viên sau khi thanh toán.", "Payments are not automatically verified yet. Please contact the administrator after paying."],
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

  Object.entries({"nav.compose": "✉️ メール作成", "nav.drafts": "⏰ 下書き＆リマインド", "nav.community": "💌 テンプレ広場", "nav.admin": "🔐 管理", "nav.developers": "👥 開発チーム", "dev.title": "MailMate チーム", "nav.upgrade": "💎 アップグレード", "features.eyebrow":"より良いメールを書くために", "features.title":"ひとつの場所に、実用的なサポートを。", "features.copy":"最初の下書きから返信のフォローアップまで、MailMate が明確なコミュニケーションを支援します。", "features.composeTitle":"ステップごとのメール作成", "features.composeCopy":"トピックとトーンを選び、情報を入力して構成の整った下書きを作成します。", "features.draftsTitle":"下書きとリマインダー", "features.draftsCopy":"未送信メールを保存し、リマインダーを設定して次の作業を管理します。", "features.communityTitle":"メール例とコミュニティの意見", "features.communityCopy":"例を参考にし、経験を共有し、状況に合った書き方を学びましょう。", "features.cta":"メール作成を始める ↘", "settings.title":"設定", "settings.copy":"使い方をカスタマイズします。", "settings.language":"表示言語", "settings.time":"時刻と場所", "settings.timezone":"タイムゾーン", "settings.location":"表示する場所", "settings.format":"時刻形式", "settings.timeHint":"表示するタイムゾーンを変更できます。端末のシステム時刻は変更されません。", "settings.save":"設定を保存", "settings.account":"アカウント", "settings.accountCopy":"この端末の管理者セッションからログアウトします。", "settings.logout":"管理者からログアウト", "hero.eyebrow": "あなたのメール作成アシスタント", "hero.title": "もっと良いメールを。もっと自信を。", "hero.copy": "アイデアを、わずか数ステップで明確でプロフェッショナルなメールに。", "hero.try": "Try on web ↘", "hero.learn": "機能を見る", "hero.caption": "学生と社会人のためのメール作成スペース", "hero.trusted": "多くのチームに信頼されています", "hero.disclaimer": "ロゴはデザイン見本です。公式な提携・推薦を示すものではありません。", "clock.live": "リアルタイム現地時刻", "clock.title": "メールの合間にひと呼吸", "clock.copy": "時間は流れています。伝えたいことを明確に書く時間を少し取りましょう。", "upgrade.eyebrow": "MAILMATE メンバーシップ", "upgrade.title": "自分に合ったプランを選ぶ", "upgrade.copy": "無料で始めるか、用途に合ったプランをお選びください。", "upgrade.free1": "基本メールテンプレート", "upgrade.free2": "ブラウザーに下書きを保存", "upgrade.go1": "拡張された作成ワークフロー", "upgrade.go2": "MailMate プロジェクトを支援", "upgrade.pro1": "高度な利用体験", "upgrade.pro2": "MailMate の開発を支援", "upgrade.freeBtn": "無料で使う", "upgrade.goBtn": "Go を選択", "upgrade.proBtn": "Pro を選択", "upgrade.secure": "お支払い", "upgrade.qrCopy": "銀行アプリで QR コードをスキャンし、確定前に情報をご確認ください。", "upgrade.qrNote": "現在、支払いは自動確認されません。支払い後、管理者にご連絡ください。", "g.save": "保存", "g.cancel": "キャンセル", "g.close": "閉じる", "c.modeQuick": "⚡ AIクイック作成", "c.modeTpl": "🧩 テンプレから作成", "c.step1": "1. トピックを選ぶ", "c.step2": "2. トーンと言語", "c.step3": "3. 情報を入力", "c.tone": "トーン", "c.formal": "丁寧", "c.friendly": "フレンドリー", "c.mailLang": "メールの言語", "c.both": "バイリンガル (VI + EN)", "c.sample": "例を入力", "c.reset": "やり直す", "c.result": "あなたのメール", "c.copy": "📋 コピー", "c.mailto": "✉️ メールアプリで開く", "c.save": "💾 下書き保存", "c.share": "💌 広場に共有", "c.subject": "件名", "c.body": "本文", "d.title": "下書き＆リマインド", "d.fPending": "未送信", "d.fSent": "送信済み", "d.fAll": "すべて", "d.edit": "編集を続ける", "d.send": "送信画面を開く", "d.markSent": "送信済みにする", "d.remind": "リマインド設定", "d.delete": "削除", "d.alert": "期限のリマインドが {n} 件あります", "d.alertBtn": "見る", "d.notifyTitle": "メール送信の時間です", "r.title": "このメールのリマインド", "r.none": "通知なし", "m.title": "テンプレ広場 💌", "m.post": "投稿する", "m.sortNew": "新着順", "m.sortTop": "人気順", "m.allTopics": "すべてのトピック", "a.title": "管理エリア"}).forEach(([k, v]) => UI[k] && (UI[k][2] = v));
  Object.assign(UI, {"isl.snooze": ["Hoãn 10 phút", "Snooze 10 min", "10分後に再通知"], "isl.demo": ["Email xin nghỉ học (thử)", "Absence email (preview)", "欠席メール（テスト）"], "isl.big": ["Tệp quá lớn (tối đa 2MB)", "File too large (max 2MB)", "ファイルが大きすぎます（最大2MB）"], "rv.title": ["Khách hàng nói gì về MailMate", "What users say about MailMate", "利用者の声"], "rv.all": ["Tất cả", "All", "すべて"], "rv.pos": ["Tích cực", "Positive", "良い評価"], "rv.neg": ["Cần cải thiện", "Needs work", "改善点"]});

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
    write(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); if ([KEYS.drafts].includes(k)) window.dispatchEvent(new CustomEvent("mailmate:data-changed", { detail: { key: k } })); } catch { toast(t("err.storage"), "error"); } },
  };
  let config = { ...DEFAULT_CONFIG, ...Store.read(KEYS.config, {}) };
  let drafts = Store.read(KEYS.drafts, []);
  let posts = Store.read(KEYS.posts, null) ?? seedPosts();
  let liked = Store.read(KEYS.liked, []);
  let uiLang = Store.read(KEYS.ui, null) ?? config.uiLang;
  let currentView = "compose";
  let adminGoogleAllowed = false;
  const saveConfig = () => Store.write(KEYS.config, config);
  const saveDrafts = () => Store.write(KEYS.drafts, drafts);
  const savePosts = () => Store.write(KEYS.posts, posts);
  const isAdmin = () => adminGoogleAllowed;
  const getTopics = () => config.topics ?? DEFAULT_TOPICS;
  const liveTopics = () => getTopics().filter((x) => x.enabled !== false);
  const findTopic = (id) => getTopics().find((x) => x.id === id);
  const editableTopics = () => (config.topics ??= clone(DEFAULT_TOPICS));
  const fieldMeta = (k) => FIELDS[k] ?? { vi: k, en: k, ex: { vi: "", en: "" } };
  const fieldLabel = (k, l) => fieldMeta(k)[l];
  const fmt = (ms, dateOnly = false) => new Date(ms).toLocaleString({ vi: "vi-VN", en: "en-GB", ja: "ja-JP" }[uiLang], dateOnly ? { dateStyle: "medium" } : { dateStyle: "short", timeStyle: "short" });

  // ---------- Đa ngôn ngữ giao diện ----------
  const t = (key, vars = {}) => (UI[key]?.[{ vi: 0, en: 1, ja: 2 }[uiLang]] ?? UI[key]?.[1] ?? key).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
  function applyI18n() {
    renderQuickOptions(); translateStatic();
    document.documentElement.lang = uiLang;
    qa("[data-i18n]").forEach((el) => { if (UI[el.dataset.i18n]) el.textContent = t(el.dataset.i18n); });
    qa("[data-i18n-ph]").forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });
    qa("[data-ui-lang]").forEach((b) => b.classList.toggle("active", b.dataset.uiLang === uiLang));
    q("#siteName").textContent = config.siteName;
    const h1 = q(".wrap > h1"); if (h1 && h1.firstChild) h1.firstChild.textContent = config.siteName + " ";
    document.title = config.siteName + " – " + (uiLang === "vi" ? "Soạn email hoàn chỉnh" : "Write polished emails");
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
  function renderTopics() {
    q("#topicGrid").innerHTML = liveTopics().map((x) => `
      <button type="button" class="topic ${x.id === cs.topicId ? "active" : ""}" data-id="${esc(x.id)}">
        <span class="topic-icon">${esc(x.icon)}</span><span>${esc((x.name[uiLang] ?? x.name.en))}</span></button>`).join("");
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
    sel.innerHTML = `<option value="">${t("m.allTopics")}</option>` + getTopics().map((x) => `<option value="${esc(x.id)}">${esc(x.icon)} ${esc((x.name[uiLang] ?? x.name.en))}</option>`).join("");
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
    form.elements.topicId.innerHTML = getTopics().map((x) => `<option value="${esc(x.id)}">${esc(x.icon)} ${esc((x.name[uiLang] ?? x.name.en))}</option>`).join("");
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
    const ok = isAdmin(); q("#formLogin").hidden = true; q("#adminPanel").hidden = !ok; if (!ok) return;
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
      <input type="checkbox" data-act="toggle" ${x.enabled !== false ? "checked" : ""} aria-label="${esc((x.name[uiLang] ?? x.name.en))}"><span class="topic-icon">${esc(x.icon)}</span>
      <div class="grow"><strong>${esc((x.name[uiLang] ?? x.name.en))}</strong><small>${esc((x.subject[uiLang] ?? x.subject.en))}</small></div>
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
      e.preventDefault();
    });
    q("#btnLogout").addEventListener("click", () => q("#googleSignOut")?.click());
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
  const VIEWS = ["compose", "drafts", "forum", "admin"];
  // Chuyển tab mượt (View Transitions API: nhòe + trượt); trình duyệt cũ thì đổi thẳng
  function show(view) {
    const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!document.startViewTransition || calm) return showNow(view);
    document.startViewTransition(() => showNow(view));
  }
  function showNow(view) {
    currentView = VIEWS.includes(view) ? view : "compose";
    if (currentView === "admin" && !isAdmin()) currentView = "compose";
    q("#vCompose").hidden = currentView !== "compose"; q("#vForum").hidden = currentView !== "forum";
    q("#vDrafts").hidden = currentView !== "drafts"; q("#vAdmin").hidden = currentView !== "admin";
    qa(".nav .tab").forEach((b) => b.setAttribute("aria-selected", b.dataset.v === currentView));
    moveThumb();
    if (currentView === "drafts") renderDrafts();
    if (currentView === "forum") renderCommunity();
    if (currentView === "admin") renderAdmin();
    if (currentView === "compose" && !q("#modeTpl").hidden) qa(".tmail-body").forEach(autosize);
  }
  const go = (view) => show(view);
  function renderAll() { renderComposer(); renderDrafts(); renderDraftBadge(); renderCommunity(); renderAdmin(); checkReminders(); renderReviews(); requestAnimationFrame(moveThumb); }

  let smoothScrollFrame = 0;
  function smoothScrollTo(target) {
    const element = typeof target === "number" ? null : target;
    const margin = element ? parseFloat(getComputedStyle(element).scrollMarginTop) || 0 : 0;
    const maxScroll = Math.max(0, document.documentElement.scrollHeight - innerHeight);
    const destination = Math.min(maxScroll, Math.max(0, typeof target === "number" ? target : element.getBoundingClientRect().top + scrollY - margin));
    const start = scrollY;
    const distance = destination - start;
    cancelAnimationFrame(smoothScrollFrame);
    if (matchMedia("(prefers-reduced-motion: reduce)").matches || Math.abs(distance) < 2) {
      window.scrollTo(0, destination);
      return;
    }
    const duration = Math.min(1600, Math.max(850, Math.abs(distance) * 0.52));
    let began = 0;
    const frame = (now) => {
      if (!began) began = now;
      const progress = Math.min(1, (now - began) / duration);
      const eased = progress < 0.5 ? 4 * progress ** 3 : 1 - ((-2 * progress + 2) ** 3) / 2;
      window.scrollTo(0, start + distance * eased);
      if (progress < 1) smoothScrollFrame = requestAnimationFrame(frame);
      else smoothScrollFrame = 0;
    };
    smoothScrollFrame = requestAnimationFrame(frame);
  }
  const cancelSmoothScroll = () => { cancelAnimationFrame(smoothScrollFrame); smoothScrollFrame = 0; };
  window.addEventListener("wheel", cancelSmoothScroll, { passive: true });
  window.addEventListener("touchstart", cancelSmoothScroll, { passive: true });

  function init() {
    resetComposer(); bindDialogs(); bindComposer(); bindDrafts(); bindCommunity(); bindAdmin();
    window.addEventListener("mailmate:auth-state", (event) => {
      adminGoogleAllowed = event.detail?.isAdmin === true;
      const adminTab = q('.nav [data-v="admin"]');
      if (adminTab) adminTab.hidden = !adminGoogleAllowed;
      if (!adminGoogleAllowed && currentView === "admin") show("compose");
      renderCommunity();
      renderAdmin();
    });
    window.addEventListener("mailmate:cloud-updated", () => {
      drafts = Store.read(KEYS.drafts, []);
      const profile = store("mm_profile") || {};
      PF.forEach((id) => { const input = q("#" + id); if (input && profile[id] != null) input.value = profile[id]; });
      drawDrafts(); renderAll();
    });
    const clockPrefs = () => ({ timezone: localStorage.getItem("mm_timezone") || "Asia/Ho_Chi_Minh", location: localStorage.getItem("mm_location") || "", format: localStorage.getItem("mm_time_format") || "24" });
    const updateLiveClock = () => { const now = new Date(), prefs = clockPrefs(), locale = ({vi:"vi-VN",en:"en-GB",ja:"ja-JP"})[uiLang] || "vi-VN", options = {hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:prefs.format === "12",timeZone:prefs.timezone}; try { const time = now.toLocaleTimeString(locale, options); const date = now.toLocaleDateString(locale,{weekday:"long",year:"numeric",month:"long",day:"numeric",timeZone:prefs.timezone}); q("#liveClock").textContent = time; q("#liveDate").textContent = date; q("#floatingTime").textContent = time; q("#floatingDate").textContent = now.toLocaleDateString(locale,{day:"2-digit",month:"short",year:"numeric",timeZone:prefs.timezone}); q("#floatingLocation").textContent = prefs.location || prefs.timezone; } catch { q("#floatingTime").textContent = now.toLocaleTimeString(locale, options); } };
    updateLiveClock(); setInterval(updateLiveClock, 1000);
    const scrollToView = (id) => setTimeout(() => { const target = q(id); if (target) smoothScrollTo(target); }, 140);
    document.addEventListener("click", (e) => {
      const link = e.target.closest('a[href^="#"]');
      if (!link) return;
      const href = link.getAttribute("href");
      if (href === "#") { e.preventDefault(); smoothScrollTo(0); return; }
      let id;
      try { id = decodeURIComponent(href.slice(1)); } catch { return; }
      const target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      history.pushState(null, "", href);
      const targetView = { vCompose: "compose", vDrafts: "drafts", vForum: "forum", vAdmin: "admin" }[id];
      if (targetView) show(targetView);
      setTimeout(() => smoothScrollTo(target), targetView ? 150 : 0);
    });
    q("#tryWeb").addEventListener("click", () => { show("compose"); scrollToView("#vCompose"); });
    q("#heroLearn").addEventListener("click", () => scrollToView("#features"));
    q("#featureTry").addEventListener("click", () => { show("compose"); scrollToView("#vCompose"); });
    q("#openSettings").addEventListener("click", () => { const prefs = clockPrefs(); q("#settingsTimezone").value = prefs.timezone; q("#settingsLocation").value = prefs.location; q("#settingsTimeFormat").value = prefs.format; q("#settingsDialog").showModal(); });
    q("#closeSettings").addEventListener("click", () => q("#settingsDialog").close());
    q("#settingsDialog").addEventListener("click", (e) => { if (e.target === q("#settingsDialog")) q("#settingsDialog").close(); });
    q("#saveSettings").addEventListener("click", () => { localStorage.setItem("mm_timezone", q("#settingsTimezone").value); localStorage.setItem("mm_location", q("#settingsLocation").value.trim()); localStorage.setItem("mm_time_format", q("#settingsTimeFormat").value); updateLiveClock(); q("#settingsDialog").close(); });
    q("#settingsLogout").addEventListener("click", () => { q("#settingsDialog").close(); q("#googleSignOut")?.click(); });
    q("#openUpgrade").addEventListener("click", () => q("#upgradeDialog").showModal());
    q("#closeUpgrade").addEventListener("click", () => q("#upgradeDialog").close());
    q("#upgradeDialog").addEventListener("click", (e) => { if (e.target === q("#upgradeDialog")) q("#upgradeDialog").close(); const b = e.target.closest("[data-plan]"); if (!b) return; if (b.dataset.plan === "free") { q("#upgradeDialog").close(); return; } const go = b.dataset.plan === "go"; q("#qrPayment").hidden = false; q("#qrTitle").textContent = go ? "Thanh toán MailMate Go" : "Thanh toán MailMate Pro"; q("#qrAmount").textContent = go ? "1807¥" : "2008¥"; smoothScrollTo(q("#qrPayment")); });
    q(".nav").addEventListener("click", (e) => { const b = e.target.closest(".tab"); if (!b) return; if (b.dataset.v) { show(b.dataset.v); scrollToView({compose:"#vCompose",drafts:"#vDrafts",forum:"#vForum",admin:"#vAdmin"}[b.dataset.v]); } });
    const updateLanguageButtons = () => qa("[data-ui-lang]").forEach((b) => b.classList.toggle("active", b.dataset.uiLang === uiLang));
    qa("[data-ui-lang]").forEach((b) => b.addEventListener("click", () => { setUiLang(b.dataset.uiLang); updateLanguageButtons(); }));
    updateLanguageButtons();
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

  // ---------- Nhạc chuông (tự tạo bằng Web Audio, hoặc tải nhạc của bạn) ----------
  let actx, ringTimer, ringStop, ringAudio;
  const RTK = "mm2.ring"; const ring = Store.read(RTK, { id: "chime" });
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
  const FILES = { iphone: "sounds/iphone.mp3", tone2: "sounds/tone2.mp3" };
  const sweep = (f1, f2, s, d, g = 0.2) => {
    const o = actx.createOscillator(), n = actx.createGain(), t0 = actx.currentTime + s;
    o.frequency.setValueAtTime(f1, t0); o.frequency.exponentialRampToValueAtTime(f2, t0 + d); o.connect(n); n.connect(actx.destination);
    n.gain.setValueAtTime(1e-4, t0); n.gain.exponentialRampToValueAtTime(g, t0 + 0.02); n.gain.exponentialRampToValueAtTime(1e-4, t0 + d); o.start(t0); o.stop(t0 + d + 0.05);
  };
  Object.assign(RINGS, {
    bubble: () => [0, 0.22, 0.44].forEach((s, i) => sweep(400 + i * 150, 1200 + i * 200, s, 0.18, 0.25)),
    harp: () => [392, 494, 587, 784, 988, 1175].forEach((f, i) => tone(f, i * 0.12, 1.2, "sine", 0.18)),
    sonar: () => { tone(660, 0, 1.6, "sine", 0.3); tone(660, 0.9, 1.6, "sine", 0.12); },
    arcade: () => [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone(f, i * 0.09, 0.1, "square", 0.07)),
    doorbell: () => { tone(659, 0, 1.0, "sine", 0.25); tone(523, 0.55, 1.4, "sine", 0.25); },
    zen: () => { tone(220, 0, 2.4, "sine", 0.3); tone(440, 0, 2.0, "sine", 0.12); tone(660, 0, 1.6, "sine", 0.06); },
    xylo: () => [784, 988, 1175, 1568, 1175, 988].forEach((f, i) => tone(f, i * 0.11, 0.35, "triangle", 0.28)),
  });
  function startRing() {
    stopRing();
    const play = () => {
      if ((ring.id === "custom" && ring.data) || FILES[ring.id]) {
        if (!ringAudio) { ringAudio = new Audio(FILES[ring.id] || ring.data); ringAudio.loop = true; }
        ringAudio.play().catch(() => {});
      } else {
        actx ??= new (window.AudioContext || window.webkitAudioContext)();
        actx.resume().then(() => (RINGS[ring.id] || RINGS.chime)()).catch(() => {});
      }
    };
    play(); ringTimer = setInterval(play, 2800); ringStop = setTimeout(stopRing, 30000);
  }
  function stopRing() { clearInterval(ringTimer); clearTimeout(ringStop); ringAudio?.pause(); ringAudio = null; }
  const rs = q("#ringSel");
  q("#ringSel [value=custom]").hidden = !ring.data; rs.value = ring.id;
  rs.onchange = () => { ring.id = rs.value; Store.write(RTK, ring); startRing(); setTimeout(stopRing, 3500); };
  q("#ringTest").onclick = () => ringIsland({ subject: t("isl.demo") }, true);
  q("#ringFile").onchange = (e) => {
    const f = e.target.files[0]; if (!f) return;
    if (f.size > 2e6) return toast(t("isl.big"), "error");
    const r = new FileReader();
    r.onload = () => { Object.assign(ring, { id: "custom", data: r.result, name: f.name }); Store.write(RTK, ring); q("#ringSel [value=custom]").hidden = false; rs.value = "custom"; toast("🔔 " + f.name); };
    r.readAsDataURL(f);
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

  // ---------- Góp ý của khách hàng (nhân vật hư cấu, có cả tích cực & tiêu cực) ----------
  // Muốn dùng ảnh thật của bạn bè/đồng đội (đã được đồng ý) thì thêm img: "link-ảnh" vào từng mục.
  const REVIEWS = [
    { n: "Trường Giang", h: "@hoichieu.mua", e: "👩🏻‍🎓", s: 5, l: 128, t: { vi: "Soạn mail xin nghỉ học chưa đến 1 phút, thầy trả lời luôn. Quá tiện!", en: "Wrote my absence email in under a minute and my professor replied right away." } },
    { n: "Hoàng Long", h: "@long.dev", e: "🧑🏽‍💻", s: 5, l: 96, t: { vi: "Dark mode đẹp, đổi màu mượt như app iPhone. Thông báo nhắc gửi mail kiểu Dynamic Island xịn thật.", en: "Beautiful dark mode and buttery colour switching. The Dynamic Island reminder is slick." } },
    { n: "Sakura T.", h: "@sakura_t", e: "👩🏻", s: 5, l: 74, t: { vi: "Có cả tiếng Nhật nên mình gửi mail cho giáo sư rất tự tin.", en: "日本語のメールも作れて、とても助かります！" } },
    { n: "Quốc Bảo", h: "@baoquoc", e: "👨🏻‍🎤", s: 4.5, l: 41, t: { vi: "Mẫu email đủ dùng, diễn đàn có nhiều ví dụ hay để tham khảo.", en: "Good templates and plenty of useful samples on the community board." } },
    { n: "Linh Chi", h: "@chi.linh", e: "👩🏻‍🦰", s: 3.5, l: 22, t: { vi: "Mẫu hay nhưng chưa có đăng nhập Google để đồng bộ nháp giữa các máy.", en: "Nice templates, but no Google sign-in to sync drafts across devices." } },
    { n: "Anh Tuấn", h: "@tuan_it", e: "🧔🏻", s: 2, l: 15, t: { vi: "Nhạc chuông hơi to, suýt làm cả lớp giật mình 😅 mong có chỉnh âm lượng.", en: "The ringtone is loud and startled the whole class 😅 please add a volume slider." } },
    { n: "Emily R.", h: "@emily.r", e: "👩🏼", s: 2, l: 9, t: { vi: "Bản dịch tự động đôi lúc chưa tự nhiên, vẫn phải tự sửa lại.", en: "The auto-translation sometimes sounds unnatural, I still have to edit it by hand." } },
  ];
  let rvF = "all";
  function renderReviews() {
    qa("#rvFilter button").forEach((b) => b.classList.toggle("active", b.dataset.f === rvF));
    q("#rvGrid").innerHTML = REVIEWS.filter((r) => rvF === "all" || (rvF === "pos") === (r.s >= 4)).map((r, i) => `
      <article class="rv-card"><span class="rv-av" style="--h:${i * 47}">${r.img ? `<img src="${esc(r.img)}" alt="${esc(r.n)}">` : r.e}</span>
        <p>“${esc(r.t[uiLang] ?? r.t.en)}”</p>
        <footer><b>${esc(r.n)}</b><small>${esc(r.h)} · ♥ ${r.l}</small></footer></article>`).join("");
  }
  q("#rvFilter").addEventListener("click", (e) => { if (e.target.dataset.f) { rvF = e.target.dataset.f; renderReviews(); } });

  // ---------- Feedback form: local demo storage ----------
  const FEEDBACK_KEY = "mailmate_public_feedback_v1";
  function readFeedback() { try { const data = JSON.parse(localStorage.getItem(FEEDBACK_KEY) || "[]"); return Array.isArray(data) ? data : []; } catch { return []; } }
  function renderFeedback() {
    const items = readFeedback(); q("#feedbackCount").textContent = String(items.length);
    const list = q("#feedbackList");
    if (!items.length) { list.innerHTML = `<p class="note">${esc(t("fb.empty"))}</p>`; return; }
    list.innerHTML = items.slice().reverse().map((it) => { const nm = it.name || t("fb.anonymous"); return `<article class="feedback-entry"><div class="feedback-entry-head"><span class="fb-av">${it.photo ? `<img src="${esc(it.photo)}" alt="">` : esc(nm.trim().charAt(0).toUpperCase())}</span><div><strong>${esc(nm)}</strong></div></div><p>${esc(it.message)}</p><small>${esc(it.typeLabel)} · ${esc(it.dateLabel)}</small></article>`; }).join("");
  }
  let fbPhoto = "";
  q("#feedbackPhoto").addEventListener("change", (e) => {
    const f = e.target.files[0]; fbPhoto = ""; q("#fbPhotoPrev").hidden = true; if (!f) return;
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas"); c.width = c.height = 240; const s = Math.min(img.width, img.height);
      c.getContext("2d").drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 240, 240);
      fbPhoto = c.toDataURL("image/jpeg", 0.82); q("#fbPhotoPrev").src = fbPhoto; q("#fbPhotoPrev").hidden = false; URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(f);
  });
  q("#feedbackForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const message = q("#feedbackMessage").value.trim();
    if (!message) { q("#feedbackMessage").focus(); return; }
    const type = q("#feedbackType").value;
    const typeLabels = { suggestion: t("fb.suggestion"), bug: t("fb.bug"), experience: t("fb.experience") };
    const now = new Date();
    const item = { id: Date.now(), name: q("#feedbackName").value.trim(), photo: fbPhoto, type, typeLabel: typeLabels[type] || type, message, dateLabel: now.toLocaleDateString(uiLang === "ja" ? "ja-JP" : uiLang === "en" ? "en-US" : "vi-VN") };
    try { const items = readFeedback(); items.push(item); localStorage.setItem(FEEDBACK_KEY, JSON.stringify(items.slice(-50))); } catch { q("#feedbackStatus").textContent = t("fb.storageError"); return; }
    q("#feedbackMessage").value = ""; fbPhoto = ""; q("#feedbackPhoto").value = ""; q("#fbPhotoPrev").hidden = true; q("#feedbackStatus").textContent = t("fb.success"); renderFeedback();
  });

  // ---------- Nhắc đính kèm trước khi mở Gmail + rung nhẹ khi bấm ----------
  Object.assign(UI, {
    "auth.signedOut": ["Chưa đăng nhập", "Signed out", "未ログイン"], "auth.signIn": ["Đăng nhập Google", "Continue with Google", "Googleでログイン"], "auth.signOut": ["Đăng xuất", "Sign out", "ログアウト"], "auth.syncing": ["Đang đồng bộ nháp…", "Syncing drafts…", "下書きを同期中…"], "auth.synced": ["Đã đồng bộ nháp", "Drafts synced", "下書きを同期しました"], "auth.syncError": ["Đăng nhập được nhưng chưa đồng bộ dữ liệu. Kiểm tra Firestore Rules.", "Signed in, but data did not sync. Check Firestore Rules.", "ログインしましたが同期できません。Firestoreルールを確認してください。"], "auth.signInError": ["Không đăng nhập được. Hãy kiểm tra Google provider và miền được phép.", "Sign-in failed. Check the Google provider and authorized domains.", "ログインできません。Googleプロバイダと承認済みドメインを確認してください。"],
    "footer.product": ["MailMate", "MailMate", "MailMate"], "footer.features": ["Tính năng", "Features", "機能"], "footer.compose": ["Soạn email", "Compose email", "メールを作成"], "footer.community": ["Diễn đàn mẫu", "Email examples", "メール例"], "footer.support": ["Điều khoản và chính sách", "Terms and policies", "利用規約とポリシー"], "footer.terms": ["Điều khoản sử dụng", "Terms of Use", "利用規約"], "footer.privacy": ["Chính sách quyền riêng tư", "Privacy Policy", "プライバシーポリシー"], "footer.usage": ["Chính sách sử dụng", "Acceptable Use Policy", "利用ポリシー"], "footer.other": ["Chính sách khác", "Other Policies", "その他のポリシー"], "footer.reviews": ["Đánh giá", "Reviews", "レビュー"], "footer.note": ["Được tạo để giúp mỗi email trở nên rõ ràng hơn.", "Built to make every email clearer.", "メールをもっと明確にするために。"],
    "fb.eyebrow": ["MAILMATE / GÓP Ý", "MAILMATE / FEEDBACK", "MAILMATE / フィードバック"],
    "fb.title": ["Cùng MailMate tốt hơn mỗi ngày.", "Help MailMate get better every day.", "MailMate をもっと良くするために"],
    "fb.copy": ["Hãy chia sẻ cảm nhận, báo lỗi hoặc đề xuất tính năng mới.", "Share your experience, report a bug, or suggest a feature.", "感想、バグ報告、新機能の提案をお寄せください。"],
    "fb.rating": ["Bạn đánh giá trải nghiệm thế nào?", "How would you rate your experience?", "体験を評価してください"],
    "fb.type": ["Loại phản hồi", "Feedback type", "フィードバックの種類"],
    "fb.suggestion": ["Đề xuất", "Suggestion", "提案"], "fb.bug": ["Báo lỗi", "Bug report", "バグ報告"], "fb.experience": ["Trải nghiệm chung", "General experience", "全体的な感想"],
    "fb.name": ["Tên hiển thị (không bắt buộc)", "Display name (optional)", "表示名（任意）"], "fb.namePh": ["Tên của bạn", "Your name", "お名前"],
    "fb.message": ["Nội dung góp ý", "Your feedback", "フィードバック内容"], "fb.messagePh": ["Bạn muốn MailMate cải thiện điều gì?", "What should MailMate improve?", "MailMate に改善してほしい点は？"],
    "fb.localNote": ["Bản hiện tại chỉ lưu phản hồi trên trình duyệt này. Để chia sẻ giữa tất cả người dùng, cần kết nối cơ sở dữ liệu trực tuyến.", "This version stores feedback only in this browser. A shared online database is needed for feedback visible to all users.", "現在のバージョンではこのブラウザー内にのみ保存されます。全ユーザーで共有するにはオンラインデータベースが必要です。"],
    "fb.submit": ["Gửi phản hồi ↗", "Send feedback ↗", "フィードバックを送信 ↗"], "fb.recent": ["Phản hồi trên thiết bị này", "Feedback on this device", "この端末のフィードバック"],
    "fb.empty": ["Chưa có phản hồi nào. Bạn có thể là người đầu tiên!", "No feedback yet. Be the first!", "まだフィードバックはありません。最初の投稿者になりましょう！"], "fb.anonymous": ["Người dùng", "User", "ユーザー"],
    "fb.success": ["Cảm ơn bạn! Phản hồi đã được lưu trên thiết bị này.", "Thank you! Your feedback has been saved on this device.", "ありがとうございます。この端末にフィードバックを保存しました。"], "fb.storageError": ["Không thể lưu phản hồi. Hãy kiểm tra bộ nhớ trình duyệt.", "Could not save feedback. Please check browser storage.", "保存できませんでした。ブラウザーのストレージを確認してください。"],
    "fb.footer": ["Được tạo để giúp mỗi email trở nên rõ ràng hơn.", "Built to make every email clearer.", "メールをもっと明確にするために。"], "fb.footerLink": ["Gửi góp ý", "Send feedback", "フィードバックを送る"]
  });
  UI["att.ask"] = ["Thư có nhắc đến file đính kèm. Bạn đã sẵn sàng đính kèm khi gửi chưa?", "Your email mentions an attachment. Ready to attach it when sending?", "メールに添付ファイルの記載があります。送信時に添付できますか？"];
  q("#gm").addEventListener("click", (e) => {
    if (/đính kèm|\bCV\b|attach|添付/i.test(q("#body").value) && !confirm(t("att.ask"))) e.preventDefault();
  });
  document.addEventListener("click", (e) => { if (e.target.closest("button, .btn, .tab")) navigator.vibrate?.(8); });

  renderFeedback();
  // ---------- Tùy chọn form soạn nhanh (chủ đề / giọng điệu / ngôn ngữ) + dịch chữ tĩnh ----------
  Object.assign(UI, {
    "fb.photo": ["Ảnh của bạn (không bắt buộc)", "Your photo (optional)", "あなたの写真（任意）"],
    "fb.halfHint": ["Bấm nửa trái của ngôi sao để chọn nửa điểm (ví dụ 3.5).", "Click the left half of a star to give half a point (e.g. 3.5).", "星の左半分をクリックすると0.5点になります（例：3.5）。"],
  });
  Object.entries(QT).forEach(([k, v]) => { // giọng điệu mới cho chế độ soạn theo mẫu
    if (TONES[k]) return; TONES[k] = {};
    ["vi", "en"].forEach((l) => { TONES[k][l] = { hi: `${v[l][0]}{{recipient}},`, bye: `${v[l][1]}\n{{sender}}` }; });
  });
  const QI = () => ({ vi: 0, en: 1, ja: 2 }[uiLang]);
  function renderQuickOptions() {
    const fill = (sel, items) => { if (!sel) return; const old = sel.value; sel.innerHTML = items.map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join(""); sel.value = items.some((x) => x[0] === old) ? old : items[0][0]; };
    fill(q("#topic"), QTOPICS.map((x) => [x[0], `${x[1]} ${x[2][QI()]}`]));
    fill(q("#lang"), QLANGS.map((x) => [x[0], x[1][QI()]]));
    const tones = QTONES.map((x) => [x[0], x[1][QI()]]);
    ["#qTone", "#tone", "#formSettings [name=tone]"].forEach((s) => fill(q(s), tones));
  }
  const VLIST = [["Chào bạn, mình là MailMate ✨", "Hi, I'm MailMate ✨", "こんにちは、MailMateです ✨"], ["Mình là người trợ lý thân thiết của bạn.", "I'm your friendly writing assistant.", "あなたの頼れるメール作成アシスタントです。"], ["Hôm nay mình có thể giúp gì cho bạn đây?", "How can I help you today?", "今日は何をお手伝いしましょうか？"], ["Bắt đầu soạn thư", "Start writing", "作成を始める"], ["Hôm nay mình có thể giúp gì cho bạn? Điền thông tin bên dưới hoặc tham khảo diễn đàn, mình sẽ soạn email hoàn chỉnh để bạn gửi.", "How can I help today? Fill in the details below or browse the community, and I'll write a complete email for you.", "下の情報を入力するか広場を参考にすれば、完成したメールを作成します。"], ["Thông tin & Cấu hình", "Details & Settings", "情報と設定"], ["Chủ đề email", "Email topic", "メールのトピック"], ["Tên Giảng viên/Người nhận", "Recipient / Lecturer name", "受取人・講師の名前"], ["Họ và tên của bạn", "Your full name", "あなたの氏名"], ["Email người nhận", "Recipient email", "受取人のメール"], ["Mã số sinh viên", "Student ID", "学籍番号"], ["Lớp / Ngành", "Class / Major", "クラス・専攻"], ["Trình duyệt sẽ tự động nhớ thông tin của bạn cho lần sau.", "Your browser will remember your details for next time.", "次回のためにブラウザが情報を記憶します。"], ["Lý do chi tiết", "Detailed reason", "詳しい理由"], ["Ngôn ngữ đích", "Target language", "出力言語"], ["✨ AI Soạn Email Ngay", "✨ Write Email with AI", "✨ AIでメールを作成"], ["Email của bạn sẽ hiện ở đây. Bạn có thể sửa trực tiếp.", "Your email will appear here. You can edit it directly.", "ここにメールが表示されます。直接編集できます。"], ["Đến (email)", "To (email)", "宛先（メール）"], ["Tiêu đề", "Subject", "件名"], ["Nội dung", "Body", "本文"], ["📋 Sao chép", "📋 Copy", "📋 コピー"], ["💾 Lưu nháp", "💾 Save draft", "💾 下書き保存"], ["🚀 Gửi qua Gmail ➜", "🚀 Send via Gmail ➜", "🚀 Gmailで送信 ➜"], ["Nháp chưa gửi", "Unsent drafts", "未送信の下書き"], ["Chưa có nháp nào.", "No drafts yet.", "下書きはまだありません。"], ["Đã gửi (Xóa)", "Sent (Delete)", "送信済み（削除）"], ["(Không có tiêu đề)", "(No subject)", "（件名なし）"], ["VD: Cô Lê Hằng", "e.g. Prof. Smith", "例：山田先生"], ["VD: Nguyễn Văn A", "e.g. John Smith", "例：山田太郎"], ["VD: 21110123", "e.g. 21110123", "例：21110123"], ["VD: 12C3 / CNTT", "e.g. 12C3 / IT", "例：12C3 / 情報工学"], ["VD: Em bị sốt cấp tính từ đêm qua, không thể đi học được...", "e.g. I've had a high fever since last night and can't attend class...", "例：昨夜から高熱があり、授業に出られません…"], ["Vui lòng nhập tên người nhận.", "Please enter the recipient's name.", "受取人の名前を入力してください。"], ["Tên không được chứa số/ký tự đặc biệt.", "Name can't contain digits or special characters.", "名前に数字や特殊文字は使えません。"], ["Vui lòng nhập họ và tên của bạn.", "Please enter your full name.", "氏名を入力してください。"], ["Họ tên không được chứa số/ký tự đặc biệt.", "Your name can't contain digits or special characters.", "氏名に数字や特殊文字は使えません。"], ["Vui lòng nhập email.", "Please enter an email.", "メールアドレスを入力してください。"], ["Email phải có ký tự '@'.", "Email must contain '@'.", "メールには「@」が必要です。"], ["Vui lòng nhập Lớp/Ngành học.", "Please enter your class / major.", "クラス・専攻を入力してください。"], ["Vui lòng nhập MSSV.", "Please enter your student ID.", "学籍番号を入力してください。"], ["MSSV bị lỗi (Chỉ được chứa số, không chứa chữ cái).", "Invalid ID (digits only, no letters).", "学籍番号が不正です（数字のみ）。"], ["Vui lòng nhập lý do chi tiết.", "Please enter a detailed reason.", "詳しい理由を入力してください。"], ["⏳ AI đang dịch và tạo thư...", "⏳ AI is translating and writing...", "⏳ AIが翻訳・作成中…"], ["✅ Đã tạo thư thành công!", "✅ Email created!", "✅ メールを作成しました！"], ["✅ Đã sao chép vào khay nhớ tạm.", "✅ Copied to clipboard.", "✅ クリップボードにコピーしました。"], ["Lỗi sao chép!", "Copy failed!", "コピーに失敗しました！"], ["⚠️ Thư đang trống!", "⚠️ The email is empty!", "⚠️ メールが空です！"], ["✅ Đã lưu nháp!", "✅ Draft saved!", "✅ 下書きを保存しました！"]];
  const norm = (s) => s.replace(/\s+/g, " ").trim();
  const VM = new Map(); VLIST.forEach((e) => e.forEach((x) => VM.set(norm(x), e)));
  const VT = (s) => { const e = VM.get(norm(s)); return e ? e[QI()] : s; };
  window.VT = VT;
  function translateStatic() {
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.parentElement.closest("script,style,[data-i18n]") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) });
    for (let n; (n = w.nextNode()); ) {
      const e = VM.get(norm(n.nodeValue)); if (!e) continue;
      n.nodeValue = n.nodeValue.match(/^\s*/)[0] + e[QI()] + n.nodeValue.match(/\s*$/)[0];
    }
    qa("[placeholder]:not([data-i18n-ph])").forEach((el) => { const e = VM.get(norm(el.placeholder)); if (e) el.placeholder = e[QI()]; });
  }

  init();
})();
