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

// HÀM DỊCH NGÔN NGỮ TỰ ĐỘNG (Dùng API miễn phí MyMemory)
async function translateText(text, targetLang) {
  if (targetLang === "vi") return text; // Tiếng Việt thì giữ nguyên

  try {
    const response = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=vi|${targetLang}`,
    );
    const data = await response.json();
    return data.responseData.translatedText;
  } catch (error) {
    console.error("Lỗi API Dịch:", error);
    return text + " (Lỗi dịch tự động, vui lòng tự dịch đoạn này)";
  }
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

  // Đổi thành async function để đợi AI dịch
  generateBtn.addEventListener("click", async () => {
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

    if (
      !name ||
      !stuClass ||
      !stuId ||
      !teacherName ||
      !recipientEmail ||
      !extraDetails
    ) {
      alert(
        "⚠️ Lỗi: Vui lòng điền đầy đủ tất cả các thông tin có dấu (*) màu đỏ!",
      );
      return;
    }

    generateBtn.innerText = "⏳ AI đang dịch và tạo thư...";
    generateBtn.disabled = true;

    // XỬ LÝ 1: Nếu là Tiếng Anh / Tiếng Nhật -> Xóa dấu tiếng Việt của Tên người và Tên giảng viên
    let finalName = name;
    let finalTeacher = teacherName;
    if (lang !== "vi") {
      finalName = removeVietnameseTones(name);
      finalTeacher = removeVietnameseTones(teacherName);
    }

    // XỬ LÝ 2: Dịch lý do chi tiết sang ngôn ngữ đang chọn
    let finalDetails = await translateText(extraDetails, lang);

    // XỬ LÝ 3: Tạo thư với thông tin đã xử lý
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

  document.getElementById("send-direct-btn").addEventListener("click", () => {
    const recipientEmail = document
      .getElementById("recipient-email")
      .value.trim();
    if (!emailSubject.value || !emailBody.value)
      return alert("Vui lòng tạo thư trước khi gửi!");
    window.location.href = `mailto:${recipientEmail}?subject=${encodeURIComponent(emailSubject.value)}&body=${encodeURIComponent(emailBody.value)}`;
  });
});
