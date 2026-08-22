/**
 * Telegram Expense Bot + Google Sheets
 * File: Bot.js - Tiếp nhận Telegram Webhook, chống trùng lặp và điều hướng lệnh
 */

/**
 * Endpoint chính nhận Webhook từ Telegram
 * @param {object} e - Event object từ Google Apps Script
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput('No post data').setMimeType(ContentService.MimeType.TEXT);
    }

    const update = JSON.parse(e.postData.contents);

    // 1. Chống lặp và chống spam: Kiểm tra update_id
    if (update.update_id) {
      if (isDuplicateUpdate(update.update_id)) {
        return ContentService.createTextOutput('Duplicate update ignored').setMimeType(ContentService.MimeType.TEXT);
      }
    }

    // 2. Xử lý tin nhắn văn bản
    if (update.message && update.message.text) {
      handleIncomingMessage(update.message);
    }

    return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
  } catch (error) {
    console.error('Lỗi trong doPost:', error);
    // Luôn trả về 200 OK để Telegram không gửi lại webhook liên tục
    return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
  }
}

/**
 * Endpoint GET để kiểm tra trạng thái hoạt động của Web App
 */
function doGet(e) {
  return ContentService.createTextOutput('🚀 Telegram Expense Bot Backend is running successfully!')
    .setMimeType(ContentService.MimeType.TEXT);
}

/**
 * Xử lý nội dung tin nhắn từ người dùng
 * @param {object} message - Message object từ Telegram Update
 */
function handleIncomingMessage(message) {
  const chatId = message.chat.id;
  const rawText = message.text.trim();

  // 1. Router xử lý các Command Telegram
  if (rawText.startsWith('/')) {
    const command = rawText.split(' ')[0].toLowerCase().split('@')[0];

    switch (command) {
      case '/start':
        sendStartMessage(chatId);
        return;

      case '/help':
        sendHelpMessage(chatId);
        return;

      case '/homnay':
        const todayReport = getTodayReport();
        sendMessage(chatId, todayReport);
        return;

      case '/thongke':
        const monthReport = getMonthReport();
        sendMessage(chatId, monthReport);
        return;

      case '/undo':
        handleUndoCommand(chatId);
        return;

      default:
        sendMessage(chatId, '❓ Lệnh không hợp lệ. Gõ /help để xem danh sách các lệnh hỗ trợ.');
        return;
    }
  }

  // 2. Xử lý tin nhắn thu chi thông thường
  const txn = parseTransaction(rawText);

  if (txn) {
    // Ghi vào Google Sheets và cập nhật bảng tính
    addTransaction(txn);

    // Gửi tin nhắn xác nhận
    let reply = `✅ *Đã ghi giao dịch*\n\n`;
    reply += `📅 ${txn.dateStr}\n`;
    reply += `📌 ${txn.note}\n`;
    reply += `🏷 ${txn.category} ${txn.categoryIcon}\n`;
    reply += `💰 ${formatMoneyVND(txn.amount)}\n`;
    reply += `📊 ${txn.type}`;

    sendMessage(chatId, reply);
  } else {
    // Không nhận diện được cú pháp
    let helpMsg = `❓ Không nhận diện được số tiền hoặc cú pháp.\n\n`;
    helpMsg += `💡 *Ví dụ cú pháp đúng:*\n`;
    helpMsg += `• \`ăn 65k\`\n`;
    helpMsg += `• \`xăng 50k\`\n`;
    helpMsg += `• \`grab 35k\`\n`;
    helpMsg += `• \`13/7 ăn 50k\` (ghi ngày cũ)\n\n`;
    helpMsg += `Gõ /help để xem chi tiết.`;

    sendMessage(chatId, helpMsg);
  }
}

/**
 * Xử lý lệnh /undo
 */
function handleUndoCommand(chatId) {
  const deleted = undoLastTransaction();

  if (deleted) {
    let msg = `🗑 *Đã hoàn tác giao dịch gần nhất:*\n\n`;
    msg += `📅 ${deleted.dateStr}\n`;
    msg += `📌 ${deleted.note}\n`;
    msg += `🏷 ${deleted.category}\n`;
    msg += `💰 ${formatMoneyVND(deleted.amount)}\n`;
    msg += `📊 ${deleted.type}`;
    sendMessage(chatId, msg);
  } else {
    sendMessage(chatId, '⚠️ Không tìm thấy giao dịch nào vừa nhập để hoàn tác.');
  }
}

/**
 * Gửi tin nhắn chào mừng /start
 */
function sendStartMessage(chatId) {
  let msg = `👋 *Chào bạn!*\n\n`;
  msg += `Bot quản lý chi tiêu cá nhân đã sẵn sàng.\n\n`;
  msg += `*Ví dụ nhập nhanh:*\n`;
  msg += `🍜 \`ăn 65k\`\n`;
  msg += `⛽ \`xăng 50k\`\n`;
  msg += `🚕 \`grab 35k\`\n`;
  msg += `🛒 \`mua áo 500k\`\n\n`;
  msg += `*Nếu quên ghi ngày trước:*\n`;
  msg += `📅 \`13/7 ăn 50k\`\n`;
  msg += `📅 \`13t7 ăn 50k\`\n\n`;
  msg += `*Các lệnh điều khiển:*\n`;
  msg += `/homnay - Chi tiêu hôm nay\n`;
  msg += `/thongke - Thống kê tháng này\n`;
  msg += `/undo - Xóa giao dịch vừa nhập\n`;
  msg += `/help - Hướng dẫn chi tiết`;

  sendMessage(chatId, msg);
}

/**
 * Gửi hướng dẫn chi tiết /help
 */
function sendHelpMessage(chatId) {
  let msg = `📖 *HƯỚNG DẪN SỬ DỤNG BOT*\n\n`;
  msg += `*1. Cú pháp ghi chi tiêu:*\n`;
  msg += `• \`ăn sáng 35k\`\n`;
  msg += `• \`đổ xăng 50k\`\n`;
  msg += `• \`mua chuột logitech 500k\`\n`;
  msg += `• \`tiền phòng 3.5tr\`\n\n`;
  msg += `*2. Ghi bù cho ngày trong quá khứ:*\n`;
  msg += `• \`13/7 ăn trưa 50k\`\n`;
  msg += `• \`13t7 cà phê 30k\`\n`;
  msg += `• \`02/08/2026 grab 45k\`\n\n`;
  msg += `*3. Ghi nhận tiền Thu:*\n`;
  msg += `• \`nhận lương 15tr\`\n`;
  msg += `• \`thưởng dự án 2tr\`\n\n`;
  msg += `*4. Danh sách lệnh:*\n`;
  msg += `/homnay - Xem tổng chi và phân loại hôm nay\n`;
  msg += `/thongke - Xem báo cáo tổng kết tháng này\n`;
  msg += `/undo - Xóa bỏ giao dịch vừa thêm gần nhất\n`;
  msg += `/help - Mở lại hướng dẫn này`;

  sendMessage(chatId, msg);
}

/**
 * Kiểm tra và lưu trữ update_id để chống duplicate
 * @param {number} updateId
 * @returns {boolean} - true nếu updateId đã từng được xử lý
 */
function isDuplicateUpdate(updateId) {
  const key = 'PROCESSED_UPDATES';
  const raw = getScriptProperty(key);
  let list = [];

  if (raw) {
    try {
      list = JSON.parse(raw);
    } catch (e) {
      list = [];
    }
  }

  if (list.includes(updateId)) {
    return true;
  }

  // Thêm update_id mới và giữ lại tối đa 50 ID gần nhất
  list.push(updateId);
  if (list.length > 50) {
    list = list.slice(-50);
  }

  setScriptProperty(key, list);
  return false;
}

/**
 * Gửi tin nhắn đến Telegram Chat
 * @param {number|string} chatId
 * @param {string} text
 * @param {string} parseMode - 'Markdown' hoặc 'HTML'
 */
function sendMessage(chatId, text, parseMode = 'Markdown') {
  const token = getBotToken();
  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  const payload = {
    chat_id: chatId,
    text: text,
    parse_mode: parseMode
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    return JSON.parse(response.getContentText());
  } catch (e) {
    console.error('Lỗi gửi tin nhắn Telegram:', e);
    return null;
  }
}

/**
 * Thiết lập Webhook cho Telegram Bot
 * @param {string} webAppUrl - URL Web App đã Deploy từ Google Apps Script
 */
function setTelegramWebhook(webAppUrl) {
  const token = getBotToken();
  const url = `https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(webAppUrl)}`;
  const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  Logger.log('Set Webhook Result: ' + res.getContentText());
  return res.getContentText();
}

/**
 * Kiểm tra thông tin Webhook hiện tại
 */
function getTelegramWebhookInfo() {
  const token = getBotToken();
  const url = `https://api.telegram.org/bot${token}/getWebhookInfo`;
  const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  Logger.log('Webhook Info: ' + res.getContentText());
  return res.getContentText();
}

/**
 * Xóa Webhook
 */
function deleteTelegramWebhook() {
  const token = getBotToken();
  const url = `https://api.telegram.org/bot${token}/deleteWebhook`;
  const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  Logger.log('Delete Webhook Result: ' + res.getContentText());
  return res.getContentText();
}

/**
 * Đăng ký danh sách Commands hiển thị menu gợi ý trên Telegram
 */
function registerBotCommands() {
  const token = getBotToken();
  const url = `https://api.telegram.org/bot${token}/setMyCommands`;

  const commands = [
    { command: 'start', description: 'Khởi động bot' },
    { command: 'homnay', description: 'Chi tiêu hôm nay' },
    { command: 'thongke', description: 'Thống kê tháng này' },
    { command: 'undo', description: 'Xóa giao dịch gần nhất' },
    { command: 'help', description: 'Hướng dẫn sử dụng' }
  ];

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ commands: commands }),
    muteHttpExceptions: true
  };

  const res = UrlFetchApp.fetch(url, options);
  Logger.log('Register Commands Result: ' + res.getContentText());
  return res.getContentText();
}

