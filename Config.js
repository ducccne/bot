/**
 * Telegram Expense Bot + Google Sheets
 * File: Config.js - Cấu hình hệ thống, danh mục và quy tắc phân loại
 */

const CONFIG = {
  // Tên Sheet lưu trữ dữ liệu
  SHEET_NAME: 'Sổ Thu Chi',

  // Múi giờ Việt Nam
  TIMEZONE: 'Asia/Ho_Chi_Minh',

  // Định dạng ngày hiển thị
  DATE_FORMAT: 'dd/MM/yyyy',

  // Cấu trúc cột dữ liệu trong Google Sheets
  COLUMNS: {
    MONTH: 1,     // Cột A: Tháng (Presentation - Merged dọc)
    DATE: 2,      // Cột B: Ngày (Date: dd/MM/yyyy)
    TYPE: 3,      // Cột C: Loại (Type: Chi / Thu)
    CATEGORY: 4,  // Cột D: Danh mục (Category)
    AMOUNT: 5,    // Cột E: Số tiền (Amount: VND)
    NOTE: 6,      // Cột F: Ghi chú (Note)
    RAW_TEXT: 7   // Cột G: Nội dung gốc (Raw Text)
  },

  // Tổng số cột database
  TOTAL_COLUMNS: 7,

  // Danh sách từ khóa phân loại danh mục theo thứ tự ưu tiên
  // (Lưu ý: Xếp các danh mục đặc thù trước để tránh nhầm lẫn với Ăn uống/Mua sắm)
  CATEGORY_RULES: [
    {
      category: 'Xăng xe',
      icon: '⛽',
      keywords: ['xăng', 'đổ xăng', 'cây xăng', 'bơm xăng', 'dau xe', 'dầu xe']
    },
    {
      category: 'Di chuyển',
      icon: '🚕',
      keywords: [
        'grab', 'be', 'gojek', 'taxi', 'bus', 'xe buýt', 'xe buýt', 'vé tàu', 've tau', 
        'vé xe', 've xe', 'gửi xe', 'gui xe', 'giữ xe', 'giu xe', 'rửa xe', 'rua xe', 
        'sửa xe', 'sua xe', 'bảo dưỡng', 'bao duong', 'cầu đường', 'vé cầu đường', 
        'thay nhớt', 'vá xe', 'bến xe', 'sân bay', 'san bay'
      ]
    },
    {
      category: 'Điện tử',
      icon: '💻',
      keywords: [
        'điện thoại', 'dien thoai', 'iphone', 'ipad', 'laptop', 'macbook', 'pc', 'máy tính',
        'màn hình', 'man hinh', 'tai nghe', 'sạc', 'củ sạc', 'dây sạc', 'chuột', 'bàn phím',
        'ram', 'ssd', 'camera', 'tivi', 'tv', 'tủ lạnh', 'máy giặt', 'máy lạnh', 'điều hòa'
      ]
    },
    {
      category: 'Nhà ở',
      icon: '🏠',
      keywords: [
        'tiền nhà', 'tien nha', 'tiền trọ', 'tien tro', 'tiền phòng', 'tien phong',
        'tiền điện', 'tien dien', 'tiền nước', 'tien nuoc', 'nước sinh hoạt',
        'tiền mạng', 'tien mang', 'internet', 'wifi', 'tiền rác', 'tien rac',
        'vệ sinh', 'quản lý chung cư', 'phí quản lý', 'đồ gia dụng', 'bình gas', 'gas'
      ]
    },
    {
      category: 'Sức khỏe',
      icon: '💊',
      keywords: [
        'thuốc', 'thuoc', 'khám', 'kham', 'bác sĩ', 'bac si', 'bệnh viện', 'benh vien',
        'nha khoa', 'răng', 'rang', 'gym', 'yoga', 'vitamin', 'khẩu trang', 'y tế',
        'tiêm', 'cắt kính', 'mat kinh', 'mắt kính', 'thể thao'
      ]
    },
    {
      category: 'Học tập',
      icon: '📚',
      keywords: [
        'học phí', 'hoc phi', 'khóa học', 'khoa hoc', 'sách vở', 'tài liệu',
        'thi cử', 'lệ phí thi', 'chứng chỉ', 'bút', 'vở', 'thư viện', 'mua sách'
      ]
    },
    {
      category: 'Du lịch',
      icon: '✈️',
      keywords: [
        'khách sạn', 'khach san', 'resort', 'homestay', 'vé máy bay', 've may bay',
        'tour', 'du lịch', 'du lich', 'phượt', 'hành lý', 'vali'
      ]
    },
    {
      category: 'Quà tặng',
      icon: '🎁',
      keywords: [
        'quà', 'qua', 'mừng cưới', 'mung cuoi', 'đám cưới', 'dam cuoi', 'sinh nhật',
        'sinh nhat', 'biếu', 'bieu', 'lì xì', 'li xi', 'từ thiện', 'tu thien', 'quyên góp'
      ]
    },
    {
      category: 'Dịch vụ',
      icon: '✂️',
      keywords: [
        'cắt tóc', 'cat toc', 'gội đầu', 'goi dau', 'spa', 'nail', 'giặt là', 'giat la',
        'giặt sấy', 'ship', 'tiền ship', 'phí dịch vụ', 'photo', 'in ấn', 'massage'
      ]
    },
    {
      category: 'Giải trí',
      icon: '🎮',
      keywords: [
        'netflix', 'spotify', 'youtube', 'game', 'nạp game', 'nap game', 'xem phim',
        'rạp', 'cgv', 'bida', 'bi-a', 'karaoke', 'truyện', 'truyen', 'board game'
      ]
    },
    {
      category: 'Mua sắm',
      icon: '🛒',
      keywords: [
        'mua áo', 'mua ao', 'mua quần', 'mua quan', 'quần áo', 'quan ao', 'áo', 'quần',
        'váy', 'đầm', 'giày', 'giay', 'dép', 'dep', 'túi', 'tui', 'ví', 'vi',
        'mỹ phẩm', 'my pham', 'son', 'đồ chơi', 'shopee', 'lazada', 'tiktok shop', 'tiki', 'mua sắm'
      ]
    },
    {
      category: 'Ăn uống',
      icon: '🍜',
      keywords: [
        'ăn', 'an', 'uống', 'uong', 'cà phê', 'ca phe', 'cafe', 'cf', 'trà sữa', 'tra sua',
        'phở', 'pho', 'bún', 'bun', 'cơm', 'com', 'bánh mì', 'banh mi', 'lẩu', 'lau',
        'nướng', 'nuong', 'thịt', 'thit', 'cá', 'ca', 'rau', 'siêu thị', 'sieu thi',
        'chợ', 'cho', 'tạp hóa', 'tap hoa', 'đồ ăn', 'do an', 'nước', 'nuoc',
        'sinh tố', 'sinh to', 'nhậu', 'nhau', 'bia', 'tiệc', 'tiec', 'trưa', 'trua',
        'tối', 'toi', 'sáng', 'sang', 'xôi', 'xoi', 'chè', 'che', 'cháo', 'chao',
        'ăn vặt', 'an vat', 'trà', 'tra', 'kem', 'bánh', 'banh'
      ]
    }
  ],

  DEFAULT_CATEGORY: 'Khác',
  DEFAULT_ICON: '📌',

  // Từ khóa nhận diện giao dịch "Thu"
  INCOME_KEYWORDS: [
    'thu', 'lương', 'luong', 'thưởng', 'thuong', 'nhận', 'nhan', 'hoàn tiền',
    'hoan tien', 'được cho', 'duoc cho', 'được tặng', 'duoc tang', 'tiền về'
  ]
};

/**
 * Lấy cấu hình Token từ Script Properties hoặc biến cấu hình
 */
function getBotToken() {
  const props = PropertiesService.getScriptProperties();
  const token = props.getProperty('BOT_TOKEN');
  if (token) return token.trim();
  
  // Có thể cấu hình trực tiếp vào đây nếu cần
  return 'YOUR_TELEGRAM_BOT_TOKEN_HERE';
}

/**
 * Helper lưu trữ dữ liệu vào Script Properties
 */
function setScriptProperty(key, value) {
  PropertiesService.getScriptProperties().setProperty(key, typeof value === 'string' ? value : JSON.stringify(value));
}

/**
 * Helper lấy dữ liệu từ Script Properties
 */
function getScriptProperty(key) {
  return PropertiesService.getScriptProperties().getProperty(key);
}

