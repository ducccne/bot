/**
 * Telegram Expense Bot + Google Sheets
 * File: Data.js - Bóc tách dữ liệu giao dịch bằng Regex và phân loại danh mục
 */

/**
 * Hàm phân tích tin nhắn giao dịch của người dùng
 * @param {string} rawText - Tin nhắn người dùng gửi qua Telegram
 * @returns {object|null} - Thông tin giao dịch đã bóc tách hoặc null nếu không hợp lệ
 */
function parseTransaction(rawText) {
  if (!rawText || typeof rawText !== 'string') return null;
  const text = rawText.trim();
  if (!text || text.startsWith('/')) return null; // Bỏ qua lệnh hệ thống

  // 1. Bóc tách Ngày (nếu có tiền tố ngày ở đầu câu)
  // Hỗ trợ: 13/7, 13t7, 13T7, 13-7, 13.7, 13/07/2026
  let transactionDate = new Date();
  let contentWithoutDate = text;

  // Regex bắt ngày ở đầu tin nhắn: vd "13/7 ăn 50k" hoặc "13t7 ăn 50k"
  const dateRegex = /^(\d{1,2})[\/\.\-tT](\d{1,2})(?:[\/\.\-tT](\d{2,4}))?\s+(.+)$/i;
  const dateMatch = text.match(dateRegex);

  if (dateMatch) {
    const day = parseInt(dateMatch[1], 10);
    const month = parseInt(dateMatch[2], 10) - 1; // Month trong JS từ 0-11
    let year = dateMatch[3] ? parseInt(dateMatch[3], 10) : transactionDate.getFullYear();
    
    // Nếu năm chỉ nhập 2 chữ số (vd: 26 -> 2026)
    if (year < 100) {
      year += 2000;
    }

    // Kiểm tra tính hợp lệ của ngày tháng
    const parsedDate = new Date(year, month, day);
    if (parsedDate.getDate() === day && parsedDate.getMonth() === month) {
      transactionDate = parsedDate;
      contentWithoutDate = dateMatch[4].trim();
    }
  }

  // 2. Bóc tách Số tiền (Amount) và Ghi chú (Note)
  // Các định dạng hỗ trợ:
  // - 50k, 65K, 500k
  // - 1.5tr, 1,5tr, 2tr, 1m, 1.5m, 2 triệu, 2 củ
  // - 50000, 50.000, 50,000, 50000d, 50000đ
  let amount = 0;
  let note = '';

  // 2.1 Regex tìm số tiền có hậu tố (k, tr, m, triệu, củ)
  const unitAmountRegex = /(?:^|\s)(\d+(?:[.,]\d+)?)\s*(k|tr|m|triệu|trieu|củ|cu)(?=$|\s|[.,!?;:])/i;
  const unitMatch = contentWithoutDate.match(unitAmountRegex);

  if (unitMatch) {
    const numStr = unitMatch[1].replace(',', '.');
    const num = parseFloat(numStr);
    const unit = unitMatch[2].toLowerCase();

    if (unit === 'k') {
      amount = Math.round(num * 1000);
    } else if (['tr', 'm', 'triệu', 'trieu', 'củ', 'cu'].includes(unit)) {
      amount = Math.round(num * 1000000);
    }

    // Xóa cụm số tiền khỏi nội dung để lấy phần ghi chú
    note = contentWithoutDate.replace(unitMatch[0], ' ').trim();
  } else {
    // 2.2 Regex tìm số tiền dạng số thông thường: vd 50000, 50.000, 50,000, 50000đ
    const plainAmountRegex = /(?:^|\s)(\d{1,3}(?:[.,]\d{3})+|\d+)\s*(?:đ|d|vnd|k)?(?=$|\s|[.,!?;:])/i;
    const plainMatch = contentWithoutDate.match(plainAmountRegex);

    if (plainMatch) {
      // Chuẩn hóa chuỗi số: bỏ dấu phân cách hàng nghìn . hoặc ,
      let cleanNumStr = plainMatch[1];
      if (cleanNumStr.includes('.') || cleanNumStr.includes(',')) {
        cleanNumStr = cleanNumStr.replace(/[.,]/g, '');
      }
      amount = parseInt(cleanNumStr, 10);

      // Nếu người dùng nhập số nhỏ (vd: 50 -> có thể là 50k), tuy nhiên nếu <= 500 thì nhân 1000
      if (amount > 0 && amount <= 500 && !plainMatch[0].toLowerCase().includes('đ')) {
        amount = amount * 1000;
      }

      note = contentWithoutDate.replace(plainMatch[0], ' ').trim();
    }
  }

  // Nếu không nhận diện được số tiền hợp lệ hoặc amount <= 0
  if (!amount || amount <= 0 || isNaN(amount)) {
    return null;
  }

  // Dọn dẹp ghi chú (xóa khoảng trắng thừa)
  note = note.replace(/\s+/g, ' ').trim();
  if (!note) {
    note = 'Chi tiêu';
  }

  // 3. Phân loại Loại giao dịch: Chi / Thu
  let type = 'Chi';
  const lowerNote = note.toLowerCase();
  for (const kw of CONFIG.INCOME_KEYWORDS) {
    if (containsKeyword(lowerNote, kw)) {
      type = 'Thu';
      break;
    }
  }

  // 4. Phân loại Danh mục (Category)
  const categoryInfo = detectCategory(note);

  // Định dạng ngày theo chuẩn
  const dayStr = String(transactionDate.getDate()).padStart(2, '0');
  const monthStr = String(transactionDate.getMonth() + 1).padStart(2, '0');
  const yearStr = transactionDate.getFullYear();
  const dateFormatted = `${dayStr}/${monthStr}/${yearStr}`;
  const monthGroup = `Tháng ${monthStr}/${yearStr}`;

  return {
    dateObj: transactionDate,
    dateStr: dateFormatted,
    monthGroup: monthGroup,
    type: type,
    category: categoryInfo.category,
    categoryIcon: categoryInfo.icon,
    amount: amount,
    note: note,
    rawText: text
  };
}

/**
 * Nhận diện danh mục chi tiêu dựa trên quy tắc từ khóa có thứ tự ưu tiên
 * @param {string} noteText - Ghi chú giao dịch
 * @returns {object} - { category: string, icon: string }
 */
function detectCategory(noteText) {
  if (!noteText) {
    return { category: CONFIG.DEFAULT_CATEGORY, icon: CONFIG.DEFAULT_ICON };
  }

  const lowerNote = noteText.toLowerCase();

  // Duyệt qua danh sách quy tắc theo thứ tự ưu tiên đã cấu hình
  for (const rule of CONFIG.CATEGORY_RULES) {
    for (const kw of rule.keywords) {
      if (containsKeyword(lowerNote, kw.toLowerCase())) {
        return {
          category: rule.category,
          icon: rule.icon
        };
      }
    }
  }

  return {
    category: CONFIG.DEFAULT_CATEGORY,
    icon: CONFIG.DEFAULT_ICON
  };
}

/**
 * Kiểm tra xem từ khóa có xuất hiện độc lập trong chuỗi hay không
 * (Tránh trường hợp "ăn" bị match trong "xăng" hay "vàng" bị match trong "quà")
 * @param {string} text - Chuỗi văn bản đã chuyển chữ thường
 * @param {string} keyword - Từ khóa cần tìm (chữ thường)
 * @returns {boolean}
 */
function containsKeyword(text, keyword) {
  if (!text || !keyword) return false;

  // Nếu từ khóa có chứa dấu cách (cụm từ như "mua áo", "tiền nhà")
  if (keyword.includes(' ')) {
    return text.includes(keyword);
  }

  // Đối với từ đơn: kiểm tra ranh giới từ (đầu dòng, cuối dòng, khoảng trắng hoặc dấu câu)
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(?:^|[^a-z0-9àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ])${escaped}(?:$|[^a-z0-9àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ])`, 'i');
  return regex.test(text);
}

/**
 * Định dạng số tiền thành chuỗi VND dễ đọc (vd: 50.000đ)
 * @param {number} amount
 * @returns {string}
 */
function formatMoneyVND(amount) {
  if (typeof amount !== 'number') {
    amount = parseInt(amount, 10) || 0;
  }
  return amount.toLocaleString('vi-VN') + 'đ';
}

