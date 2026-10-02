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

  generateBtn.addEventListener("click", () => {
    // Lấy dữ liệu từ các ô nhập
    const name = document.getElementById("student-name").value || "[Họ và Tên]";
    const stuClass = document.getElementById("student-class").value || "[Lớp]";
    const stuId = document.getElementById("student-id").value || "[MSSV]";

    const topic = document.getElementById("topic").value;
    const lang = document.getElementById("language").value;
    const extraDetails = document.getElementById("prompt").value;

    generateBtn.innerText = "⏳ Đang tạo thư...";
    generateBtn.disabled = true;

    setTimeout(() => {
      if (topic === "nghi-hoc") {
        if (lang === "vi") {
          emailSubject.value = `[XIN NGHỈ HỌC] - ${name} - MSSV: ${stuId}`;
          emailBody.value = `Kính gửi Thầy/Cô,\n\nEm tên là: ${name}\nMã số SV: ${stuId}\nLớp: ${stuClass}\n\nEm viết thư này kính xin Thầy/Cô cho phép em được nghỉ buổi học hôm nay. \nLý do: ${extraDetails || "Em bị ốm/sốt không thể đến lớp."}\n\nEm xin cam kết sẽ chép bài và hoàn thiện các bài tập được giao đầy đủ.\n\nEm xin chân thành cảm ơn Thầy/Cô.\n\nTrân trọng,\n${name}`;
        } else if (lang === "en") {
          emailSubject.value = `[ABSENCE REQUEST] - ${name} - ID: ${stuId}`;
          emailBody.value = `Dear Professor,\n\nMy name is ${name}, a student of class ${stuClass} (Student ID: ${stuId}).\n\nI am writing to respectfully request an excused absence from today's class. \nReason: ${extraDetails || "I am currently experiencing health issues (fever/illness)."}\n\nI assure you that I will review the lecture notes and catch up on any missed assignments.\n\nThank you for your time and understanding.\n\nBest regards,\n${name}`;
        } else if (lang === "ja") {
          // Bổ sung Tiếng Nhật
          emailSubject.value = `[欠席届] - ${name} - 学籍番号: ${stuId}`;
          emailBody.value = `先生へ\n\nお疲れ様です。\n${stuClass}クラスの ${name}（学籍番号: ${stuId}）です。\n\n誠に恐縮ですが、本日の授業を欠席させていただきたくご連絡いたしました。\n理由：${extraDetails || "体調不良（発熱）のため。"}\n\n欠席した分の授業内容や課題については、必ず確認し後日提出いたします。\n\nご迷惑をおかけして大変申し訳ありませんが、よろしくお願いいたします。\n\n敬具\n${name}`;
        }
      } else {
        emailSubject.value = `[THƯ LIÊN HỆ] - ${name} - ${topic.toUpperCase()}`;
        emailBody.value = `Kính gửi Thầy/Cô,\n\nThông tin người gửi:\n- Họ tên: ${name}\n- MSSV: ${stuId}\n- Lớp: ${stuClass}\n\nNội dung: ${extraDetails}\n\nTrân trọng,\n${name}`;
      }

      generateBtn.innerText = "✨ Tạo Email Ngay";
      generateBtn.disabled = false;
    }, 1000);
  });

  document.getElementById("copy-btn").addEventListener("click", () => {
    navigator.clipboard.writeText(
      `Tiêu đề: ${emailSubject.value}\n\n${emailBody.value}`,
    );
    alert("Đã sao chép vào khay nhớ tạm!");
  });

  document.getElementById("send-direct-btn").addEventListener("click", () => {
    if (!emailSubject.value) return alert("Vui lòng tạo thư trước!");
    window.location.href = `mailto:?subject=${encodeURIComponent(emailSubject.value)}&body=${encodeURIComponent(emailBody.value)}`;
  });
});
