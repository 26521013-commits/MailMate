// HÀM XÓA DẤU TIẾNG VIỆT
function removeVietnameseTones(str) {
  str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
  str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
  str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
  str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
  str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
  str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
  str = str.replace(/đ/g, "d");
  str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
  str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
  str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
  str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
  str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
  str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
  str = str.replace(/Đ/g, "D");
  return str;
}

// HÀM DỊCH NGÔN NGỮ TỰ ĐỘNG
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

// --- CÁC HÀM HIỂN THỊ LỖI (MỚI THÊM) ---
function showError(inputId, message) {
  const inputEl = document.getElementById(inputId);
  const errorEl = document.getElementById("err-" + inputId);
  inputEl.classList.add("input-error");
  errorEl.innerText = message;
  errorEl.classList.add("show");
}

function clearAllErrors() {
  // Xóa hết viền đỏ
  document
    .querySelectorAll(".input-error")
    .forEach((el) => el.classList.remove("input-error"));
  // Ẩn hết chữ đỏ
  document.querySelectorAll(".error-text").forEach((el) => {
    el.classList.remove("show");
    el.innerText = "";
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const themeToggleBtn = document.getElementById("theme-toggle");

  if (localStorage.getItem("mailmate_theme") === "dark") {
    document.body.classList.add("dark-mode");
    themeToggleBtn.innerText = "🌤️ Chế độ Sáng";
  }

  themeToggleBtn.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    const isDark = document.body.classList.contains("dark-mode");
    themeToggleBtn.innerText = isDark ? "🌤️ Chế độ Sáng" : "🌙 Chế độ Đêm";
    localStorage.setItem("mailmate_theme", isDark ? "dark" : "light");
  });

  const generateBtn = document.getElementById("generate-btn");
  const emailSubject = document.getElementById("email-subject");
  const emailBody = document.getElementById("email-body");

  generateBtn.addEventListener("click", async () => {
    // 0. Xóa tất cả cảnh báo cũ trước khi kiểm tra lại
    clearAllErrors();
    let hasError = false; // Cờ theo dõi lỗi

    const name = document.getElementById("student-name").value.trim();
    const stuClass = document.getElementById("student-class").value.trim();
    const stuId = document.getElementById("student-id").value.trim();
    const teacherName = document.getElementById("teacher-name").value.trim();
    const recipientEmail = document
      .getElementById("recipient-email")
      .value.trim();
    const extraDetails = document.getElementById("prompt").value.trim();
    const topic = document.getElementById("topic").value;
    const lang = document.getElementById("language").value;

    const invalidCharRegex = /[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/;

    // --- 1. KIỂM TRA TỪNG Ô VÀ BÔI ĐỎ NẾU SAI ---
    if (!name) {
      showError("student-name", "Vui lòng nhập Họ và tên.");
      hasError = true;
    } else if (invalidCharRegex.test(name)) {
      showError("student-name", "Tên không được chứa số hoặc ký tự đặc biệt.");
      hasError = true;
    }

    if (!stuClass) {
      showError("student-class", "Vui lòng nhập Lớp học.");
      hasError = true;
    }

    if (!stuId) {
      showError("student-id", "Vui lòng nhập MSSV.");
      hasError = true;
    }

    if (!teacherName) {
      showError("teacher-name", "Vui lòng nhập Tên giảng viên.");
      hasError = true;
    } else if (invalidCharRegex.test(teacherName)) {
      showError(
        "teacher-name",
        "Tên GV không được chứa số hoặc ký tự đặc biệt.",
      );
      hasError = true;
    }

    if (!recipientEmail) {
      showError("recipient-email", "Vui lòng nhập Email.");
      hasError = true;
    } else if (!recipientEmail.includes("@")) {
      showError("recipient-email", "Email bị sai định dạng (Thiếu '@').");
      hasError = true;
    }

    if (!extraDetails) {
      showError("prompt", "Vui lòng nhập Lý do chi tiết.");
      hasError = true;
    }

    // Nếu có ít nhất 1 ô bị lỗi -> Chặn tiến trình tạo thư
    if (hasError) return;

    // --- NẾU TẤT CẢ ĐỀU HỢP LỆ, TIẾN HÀNH TẠO THƯ ---
    generateBtn.innerText = "⏳ AI đang dịch và tạo thư...";
    generateBtn.disabled = true;

    let finalName = name;
    let finalTeacher = teacherName;
    if (lang !== "vi") {
      finalName = removeVietnameseTones(name);
      finalTeacher = removeVietnameseTones(teacherName);
    }

    let finalDetails = await translateText(extraDetails, lang);

    if (topic === "nghi-hoc") {
      if (lang === "vi") {
        emailSubject.value = `[XIN NGHỈ HỌC] - ${finalName} - MSSV: ${stuId}`;
        emailBody.value = `Kính gửi ${finalTeacher},\n\nEm tên là: ${finalName}\nMã số SV: ${stuId}\nLớp: ${stuClass}\n\nEm viết thư này kính xin phép ${finalTeacher} cho em được nghỉ buổi học môn của cô/thầy hôm nay.\nLý do: ${finalDetails}\n\nEm xin cam kết sẽ tự nghiên cứu bài giảng và hoàn thiện các bài tập được giao đầy đủ.\n\nEm xin chân thành cảm ơn.\n\nTrân trọng,\n${finalName}`;
      } else if (lang === "en") {
        emailSubject.value = `[ABSENCE REQUEST] - ${finalName} - ID: ${stuId}`;
        emailBody.value = `Dear ${finalTeacher},\n\nMy name is ${finalName}, a student of class ${stuClass} (Student ID: ${stuId}).\n\nI am writing to respectfully request an excused absence from your class today.\nReason: ${finalDetails}\n\nI assure you that I will review the lecture notes and catch up on any missed assignments.\n\nThank you for your time and understanding.\n\nBest regards,\n${finalName}`;
      } else if (lang === "ja") {
        emailSubject.value = `[欠席届] - ${finalName} - 学籍番号: ${stuId}`;
        emailBody.value = `${finalTeacher} 先生\n\nお疲れ様です。\n${stuClass}クラスの ${finalName}（学籍番号: ${stuId}）です。\n\n誠に恐縮ですが、本日の授業を欠席させていただきたくご連絡いたしました。\n理由：${finalDetails}\n\n欠席した分の授業内容や課題については、必ず確認し後日提出いたします。\n\nご迷惑をおかけして大変申し訳ありませんが、よろしくお願いいたします。\n\n敬具\n${finalName}`;
      }
    } else {
      emailSubject.value = `[LIÊN HỆ / CONTACT] - ${finalName} - ${topic.toUpperCase()}`;
      emailBody.value = `To ${finalTeacher},\n\nThông tin người gửi / Sender info:\n- Name: ${finalName}\n- ID: ${stuId}\n- Class: ${stuClass}\n\nNội dung / Message: ${finalDetails}\n\nTrân trọng / Best,\n${finalName}`;
    }

    generateBtn.innerText = "✨ AI Soạn Email Ngay";
    generateBtn.disabled = false;
  });

  document.getElementById("copy-btn").addEventListener("click", () => {
    if (!emailBody.value) return alert("Chưa có nội dung để copy!");
    navigator.clipboard.writeText(
      `Tiêu đề: ${emailSubject.value}\n\n${emailBody.value}`,
    );
    alert("Đã sao chép vào khay nhớ tạm!");
  });

  document.getElementById("save-draft-btn").addEventListener("click", () => {
    if (!emailSubject.value.trim() && !emailBody.value.trim()) {
      return alert(
        "⚠️ Thư đang trống! Vui lòng tạo nội dung thư trước khi lưu nháp.",
      );
    }
    const draft = {
      subject: emailSubject.value,
      body: emailBody.value,
      date: new Date().toLocaleString(),
    };
    localStorage.setItem("mailmate_draft", JSON.stringify(draft));
    alert("✅ Đã lưu bản nháp thành công vào trình duyệt!");
  });

  document.getElementById("send-direct-btn").addEventListener("click", () => {
    const recipientEmail = document
      .getElementById("recipient-email")
      .value.trim();
    if (!emailSubject.value || !emailBody.value)
      return alert("Vui lòng tạo thư trước khi gửi!");
    const gmailWebLink = `https://mail.google.com/mail/?view=cm&fs=1&to=${recipientEmail}&su=${encodeURIComponent(emailSubject.value)}&body=${encodeURIComponent(emailBody.value)}`;
    window.open(gmailWebLink, "_blank");
  });
});
