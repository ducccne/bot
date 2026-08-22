/**
 * Telegram Expense Bot + Google Sheets
 * File: Report.js - Báo cáo thống kê chi tiêu hàng ngày và hàng tháng
 */

/**
 * Lấy báo cáo chi tiêu ngày hôm nay (/homnay)
 * @returns {string} - Nội dung báo cáo gửi về Telegram
 */
function getTodayReport() {
  const sheet = getExpenseSheet();
  const lastRow = sheet.getLastRow();

  const now = new Date();
  const todayStr = formatDateObject(now);

  if (lastRow <= 1) {
    return `📅 *HÔM NAY (${todayStr})*\n\nBạn chưa ghi nhận giao dịch nào trong hôm nay!`;
  }

  const data = sheet.getRange(2, 2, lastRow - 1, 5).getValues();
  let totalExpense = 0;
  let totalIncome = 0;
  const categoryMap = {};

  for (let i = 0; i < data.length; i++) {
    const rowDate = formatAnyDateToString(data[i][0]);
    const rowType = String(data[i][1]).trim();
    const rowCategory = String(data[i][2]).trim();
    const rowAmount = Number(data[i][3]) || 0;

    if (rowDate === todayStr) {
      if (rowType === 'Thu') {
        totalIncome += rowAmount;
      } else {
        totalExpense += rowAmount;
        categoryMap[rowCategory] = (categoryMap[rowCategory] || 0) + rowAmount;
      }
    }
  }

  if (totalExpense === 0 && totalIncome === 0) {
    return `📅 *HÔM NAY (${todayStr})*\n\nBạn chưa ghi nhận giao dịch nào trong hôm nay!`;
  }

  let msg = `📅 *HÔM NAY (${todayStr})*\n\n`;
  msg += `💸 *Tổng chi:* ${formatMoneyVND(totalExpense)}\n`;
  if (totalIncome > 0) {
    msg += `💵 *Tổng thu:* ${formatMoneyVND(totalIncome)}\n`;
  }

  // Danh sách chi tiết theo Category
  const categories = Object.keys(categoryMap);
  if (categories.length > 0) {
    msg += `\n*Chi tiết chi tiêu:*\n`;
    // Sắp xếp danh mục có số tiền chi giảm dần
    categories.sort((a, b) => categoryMap[b] - categoryMap[a]);

    for (const cat of categories) {
      const icon = getCategoryIcon(cat);
      const amount = categoryMap[cat];
      msg += `${icon} ${cat}: ${formatMoneyVND(amount)}\n`;
    }
  }

  return msg.trim();
}

/**
 * Lấy báo cáo thống kê tháng hiện tại (/thongke)
 * @returns {string} - Nội dung báo cáo gửi về Telegram
 */
function getMonthReport() {
  const sheet = getExpenseSheet();
  const lastRow = sheet.getLastRow();

  const now = new Date();
  const currentMonthGroup = getMonthGroupString(now); // vd: "Tháng 08/2026"
  const monthNum = String(now.getMonth() + 1).padStart(2, '0');
  const yearNum = now.getFullYear();

  if (lastRow <= 1) {
    return `📊 *${currentMonthGroup.toUpperCase()}*\n\nChưa có dữ liệu giao dịch trong tháng này!`;
  }

  const data = sheet.getRange(2, 2, lastRow - 1, 5).getValues();
  let totalExpense = 0;
  let totalIncome = 0;
  const categoryMap = {};

  for (let i = 0; i < data.length; i++) {
    const rowDateStr = formatAnyDateToString(data[i][0]);
    const rowType = String(data[i][1]).trim();
    const rowCategory = String(data[i][2]).trim();
    const rowAmount = Number(data[i][3]) || 0;

    // Kiểm tra xem dòng có thuộc tháng/năm hiện tại không (chuỗi định dạng dd/MM/yyyy)
    if (rowDateStr.endsWith(`/${monthNum}/${yearNum}`)) {
      if (rowType === 'Thu') {
        totalIncome += rowAmount;
      } else {
        totalExpense += rowAmount;
        categoryMap[rowCategory] = (categoryMap[rowCategory] || 0) + rowAmount;
      }
    }
  }

  if (totalExpense === 0 && totalIncome === 0) {
    return `📊 *${currentMonthGroup.toUpperCase()}*\n\nChưa có giao dịch nào trong tháng này!`;
  }

  let msg = `📊 *${currentMonthGroup.toUpperCase()}*\n\n`;
  msg += `💸 *Tổng chi:* ${formatMoneyVND(totalExpense)}\n`;
  if (totalIncome > 0) {
    msg += `💵 *Tổng thu:* ${formatMoneyVND(totalIncome)}\n`;
    const balance = totalIncome - totalExpense;
    const balanceSign = balance >= 0 ? '+' : '';
    msg += `💰 *Còn lại:* ${balanceSign}${formatMoneyVND(balance)}\n`;
  }

  // Danh sách chi tiết danh mục kèm %
  const categories = Object.keys(categoryMap);
  if (categories.length > 0) {
    msg += `\n*Chi tiết theo danh mục:*\n`;
    categories.sort((a, b) => categoryMap[b] - categoryMap[a]);

    for (const cat of categories) {
      const icon = getCategoryIcon(cat);
      const amount = categoryMap[cat];
      const percent = totalExpense > 0 ? ((amount / totalExpense) * 100).toFixed(1) : '0';
      msg += `${icon} ${cat}: ${formatMoneyVND(amount)} (${percent}%)\n`;
    }
  }

  return msg.trim();
}

/**
 * Lấy icon tương ứng cho danh mục
 */
function getCategoryIcon(categoryName) {
  for (const rule of CONFIG.CATEGORY_RULES) {
    if (rule.category === categoryName) {
      return rule.icon;
    }
  }
  return CONFIG.DEFAULT_ICON;
}

