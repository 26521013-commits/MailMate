// ==========================================
// FILE: data.js (Chỉ chứa Dữ liệu và Từ điển)
// ==========================================

const I18N = {
  vi: {
    hello_title: "Chào bạn, mình là MailMate ✨",
    hello_sub:
      "Mình là người trợ lý thân thiết của bạn.<br>Hôm nay mình có thể giúp gì cho bạn đây?",
    hello_btn: "Bắt đầu soạn thư",
    theme_color: "Màu:",
    theme_default: "Mặc định",
    main_sub:
      "Hôm nay mình có thể giúp gì cho bạn? Điền thông tin bên dưới hoặc tham khảo diễn đàn, mình sẽ soạn email hoàn chỉnh để bạn gửi.",
    tab_compose: "✉ Soạn email",
    tab_forum: "💌 Diễn đàn mẫu",
    forum_title: "Diễn đàn mẫu email 💌",
    panel_config: "Thông tin & Cấu hình",
    lbl_topic: "Chủ đề email",
    lbl_role: "Vai trò người nhận",
    lbl_tone: "Giọng điệu",
    tone_formal: "Trang trọng (Dành cho cấp trên, đối tác)",
    tone_friendly: "Lịch sự, gần gũi (Đồng nghiệp)",
    tone_short: "Ngắn gọn, đi thẳng vào vấn đề",
    lbl_rname: "Tên người nhận cụ thể",
    lbl_me: "Họ và tên của bạn",
    lbl_email: "Email người nhận",
    lbl_sid: "Mã số sinh viên",
    lbl_maj: "Lớp / Ngành",
    note_save:
      "Trình duyệt sẽ tự động nhớ thông tin cá nhân của bạn cho lần sau.",
    lbl_reason: "Lý do / Ý chính cần nói",
    lbl_lang: "Ngôn ngữ đích",
    btn_generate: "✨ AI Soạn Email Ngay",
    empty_mail: "Email của bạn sẽ hiện ở đây. Bạn có thể sửa trực tiếp.",
    out_to: "Đến (email)",
    out_subj: "Tiêu đề",
    out_body: "Nội dung",
    btn_copy: "📋 Sao chép",
    btn_save: "💾 Lưu nháp",
    btn_share: "🌐 Chia sẻ lên diễn đàn",
    draft_title: "Nháp chưa gửi",
    draft_empty: "Chưa có nháp nào.",
    dlg_share_title: "Đăng lên diễn đàn",
    dlg_share_hint:
      "Hãy đảm bảo xóa các thông tin cá nhân nhạy cảm trước khi chia sẻ mẫu này với mọi người.",
    dlg_share_name: "Tiêu đề bài viết",
    dlg_share_author: "Tên tác giả (Tùy chọn)",
    btn_cancel: "Hủy",
    btn_post: "Đăng bài",
  },
  en: {
    hello_title: "Hello, I'm MailMate ✨",
    hello_sub:
      "I am your reliable writing assistant.<br>How can I help you today?",
    hello_btn: "Start writing",
    theme_color: "Color:",
    theme_default: "Default",
    main_sub:
      "How can I help you today? Fill in the details below or browse the community forum, and I'll compose a polished email for you.",
    tab_compose: "✉ Compose",
    tab_forum: "💌 Community Forum",
    forum_title: "Community Email Templates 💌",
    panel_config: "Email Details",
    lbl_topic: "Email Topic",
    lbl_role: "Recipient Role",
    lbl_tone: "Tone",
    tone_formal: "Formal (For superiors, partners)",
    tone_friendly: "Polite, friendly (Colleagues)",
    tone_short: "Concise, straight to the point",
    lbl_rname: "Recipient's Name",
    lbl_me: "Your Full Name",
    lbl_email: "Recipient's Email",
    lbl_sid: "Student ID",
    lbl_maj: "Class / Major",
    note_save:
      "The browser will automatically remember your details for next time.",
    lbl_reason: "Reason / Main Points",
    lbl_lang: "Target Language",
    btn_generate: "✨ AI Compose Now",
    empty_mail: "Your email will appear here. You can edit it directly.",
    out_to: "To (email)",
    out_subj: "Subject",
    out_body: "Body",
    btn_copy: "📋 Copy",
    btn_save: "💾 Save Draft",
    btn_share: "🌐 Share to Community",
    draft_title: "Unsent Drafts",
    draft_empty: "No drafts yet.",
    dlg_share_title: "Share to Community",
    dlg_share_hint:
      "Please make sure to remove sensitive personal information before sharing this template.",
    dlg_share_name: "Post Title",
    dlg_share_author: "Author Name (Optional)",
    btn_cancel: "Cancel",
    btn_post: "Post",
  },
};

const TOPICS = {
  "Xin nghỉ học/nghỉ làm": { r: ["Giảng viên", "Quản lý"] },
  "Xin việc/thực tập": { r: ["Nhà tuyển dụng (HR)"] },
  "Gửi thầy cô": { r: ["Giảng viên"] },
  "Xin gia hạn nộp bài": { r: ["Giảng viên", "Quản lý"] },
  "Khiếu nại/phản hồi": { r: ["Quản lý", "Đối tác/khách hàng"] },
  "Cảm ơn": { r: ["Giảng viên", "Quản lý", "Đối tác/khách hàng"] },
  "Nhắc lại/follow-up": {
    r: ["Nhà tuyển dụng (HR)", "Quản lý", "Đối tác/khách hàng"],
  },
};

const ALL_R = [
  "Quản lý",
  "Đối tác/khách hàng",
  "Giảng viên",
  "Giáo viên chủ nhiệm/Cố vấn học tập",
  "Trưởng khoa/Trưởng bộ môn",
  "Phòng đào tạo/Phòng công tác sinh viên",
  "Ban tổ chức/Câu lạc bộ",
  "Nhà tuyển dụng (HR)",
  "Quản lý trực tiếp",
  "Giám đốc/Lãnh đạo",
  "Đồng nghiệp",
  "Bộ phận hỗ trợ/Chăm sóc khách hàng",
  "Ban quản lý ký túc xá/nhà trọ",
];

const OTHER = "Khác (tự nhập)";
