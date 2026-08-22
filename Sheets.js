/**
 * Telegram Expense Bot + Google Sheets
 * File: Sheets.js - Quản lý Google Sheets, sắp xếp dữ liệu và hiển thị tháng
 */

/**
 * Lấy hoặc khởi tạo Sheet chi tiêu
 * @returns {GoogleAppsScript.Spreadsheet.Sheet}
 */
function getExpenseSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEET_NAME);
    initSheetLayout(sheet);
  }

  return sheet;
}

/**
 * Khởi tạo tiêu đề và cấu hình layout ban đầu cho Sheet
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 */
function initSheetLayout(sheet) {
  const headers = [
    ['Tháng', 'Date', 'Type', 'Category', 'Amount', 'Note', 'Raw Text']
  ];

  const headerRange = sheet.getRange(1, 1, 1, CONFIG.TOTAL_COLUMNS);
  headerRange.setValues(headers);

  // Định dạng dòng Header
  headerRange
    .setBackground('#1E293B')      // Màu nền xanh đen hiện đại
    .setFontColor('#FFFFFF')       // Chữ trắng
    .setFontWeight('bold')
    .setFontSize(10)
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');

  sheet.setRowHeight(1, 36);
  sheet.setFrozenRows(1);

  // Đặt độ rộng cột tiêu chuẩn
  sheet.setColumnWidth(1, 130); // Tháng (Col A)
  sheet.setColumnWidth(2, 110); // Date (Col B)
  sheet.setColumnWidth(3, 80);  // Type (Col C)
  sheet.setColumnWidth(4, 130); // Category (Col D)
  sheet.setColumnWidth(5, 120); // Amount (Col E)
  sheet.setColumnWidth(6, 180); // Note (Col F)
  sheet.setColumnWidth(7, 200); // Raw Text (Col G)
}

/**
 * Thêm một giao dịch mới vào Sheet, tự động sắp xếp theo ngày và cập nhật hiển thị tháng
 * @param {object} txn - Thông tin giao dịch đã parse từ Data.js
 * @returns {boolean}
 */
function addTransaction(txn) {
  const sheet = getExpenseSheet();
  const lastRow = sheet.getLastRow();

  // Đảm bảo header tồn tại
  if (lastRow === 0) {
    initSheetLayout(sheet);
  }

  // Thêm dòng mới vào cuối database
  // Cột B lưu Date object hoặc chuỗi ngày để JS sort chính xác
  sheet.appendRow([
    '', // Cột A sẽ được tự động điền và merge bởi rebuildMonthDisplay
    txn.dateStr,
    txn.type,
    txn.category,
    txn.amount,
    txn.note,
    txn.rawText
  ]);

  // Lưu thông tin giao dịch gần nhất vào Script Properties phục vụ lệnh /undo
  setScriptProperty('LAST_TRANSACTION', {
    dateStr: txn.dateStr,
    type: txn.type,
    category: txn.category,
    amount: txn.amount,
    note: txn.note,
    rawText: txn.rawText,
    timestamp: new Date().getTime()
  });

  // Sắp xếp database và rebuild giao diện hiển thị tháng
  sortDatabaseAndRebuild(sheet);

  return true;
}

/**
 * Xóa giao dịch gần nhất vừa được thêm vào (Lệnh /undo)
 * @returns {object|null} - Chi tiết giao dịch đã bị xóa hoặc null nếu không tìm thấy
 */
function undoLastTransaction() {
  const lastTxnJson = getScriptProperty('LAST_TRANSACTION');
  const sheet = getExpenseSheet();
  const lastRow = sheet.getLastRow();

  if (lastRow <= 1) {
    return null;
  }

  let targetRow = -1;
  let deletedTxn = null;

  if (lastTxnJson) {
    try {
      const lastTxn = JSON.parse(lastTxnJson);
      const data = sheet.getRange(2, 2, lastRow - 1, 6).getValues();

      // Tìm dòng khớp chính xác với thông tin giao dịch gần nhất (quét từ dưới lên)
      for (let i = data.length - 1; i >= 0; i--) {
        const rowDate = formatAnyDateToString(data[i][0]);
        const rowType = String(data[i][1]);
        const rowCategory = String(data[i][2]);
        const rowAmount = Number(data[i][3]);
        const rowNote = String(data[i][4]);
        const rowRawText = String(data[i][5]);

        if (
          rowDate === lastTxn.dateStr &&
          rowType === lastTxn.type &&
          rowCategory === lastTxn.category &&
          rowAmount === lastTxn.amount &&
          rowRawText === lastTxn.rawText
        ) {
          targetRow = i + 2; // +2 do offset từ dòng 2
          deletedTxn = lastTxn;
          break;
        }
      }
    } catch (e) {
      console.warn('Lỗi khi đọc LAST_TRANSACTION:', e);
    }
  }

  // Nếu không tìm thấy qua LAST_TRANSACTION thì lấy mặc định dòng cuối cùng
  if (targetRow === -1 && lastRow > 1) {
    targetRow = lastRow;
    const rowValues = sheet.getRange(targetRow, 2, 1, 6).getValues()[0];
    deletedTxn = {
      dateStr: formatAnyDateToString(rowValues[0]),
      type: rowValues[1],
      category: rowValues[2],
      amount: rowValues[3],
      note: rowValues[4],
      rawText: rowValues[5]
    };
  }

  if (targetRow > 1) {
    sheet.deleteRow(targetRow);
    // Xóa cache giao dịch gần nhất
    setScriptProperty('LAST_TRANSACTION', null);

    // Cập nhật lại giao diện và merge cột A
    sortDatabaseAndRebuild(sheet);
    return deletedTxn;
  }

  return null;
}

/**
 * Sắp xếp toàn bộ dữ liệu theo ngày tăng dần và xây dựng lại cột A (Tháng)
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 */
function sortDatabaseAndRebuild(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    // Không có dữ liệu, unmerge cột A nếu có
    if (lastRow === 1) {
      sheet.getRange(1, 1, 1, 1).setValue('Tháng');
    }
    return;
  }

  const numRows = lastRow - 1;

  // 1. Đọc toàn bộ dữ liệu từ Cột B đến G (Data rows)
  const dataRange = sheet.getRange(2, 2, numRows, 6);
  const rawValues = dataRange.getValues();

  // 2. Chuẩn hóa và sort trong JavaScript theo Date tăng dần
  const items = rawValues.map(row => {
    const dateObj = parseDateValue(row[0]);
    const dateFormatted = formatDateObject(dateObj);
    return {
      dateObj: dateObj,
      dateStr: dateFormatted,
      type: row[1],
      category: row[2],
      amount: row[3],
      note: row[4],
      rawText: row[5]
    };
  });

  // Sắp xếp tăng dần theo mốc thời gian
  items.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

  // 3. Ghi lại dữ liệu đã sort vào Cột B:G
  const sortedValues = items.map(item => [
    item.dateStr,
    item.type,
    item.category,
    item.amount,
    item.note,
    item.rawText
  ]);

  dataRange.setValues(sortedValues);

  // 4. Xóa bỏ merge cũ trên Cột A và làm sạch Cột A
  const colARange = sheet.getRange(2, 1, numRows, 1);
  colARange.breakApart();
  colARange.clearContent();
  colARange.clearFormat();

  // 5. Gom nhóm các dòng theo Tháng (Tháng MM/yyyy) và thực hiện Merge Cột A
  let groupStartIndex = 0;
  let currentMonthGroup = getMonthGroupString(items[0].dateObj);

  for (let i = 1; i <= items.length; i++) {
    const isEnd = (i === items.length);
    const itemMonthGroup = isEnd ? '' : getMonthGroupString(items[i].dateObj);

    if (isEnd || itemMonthGroup !== currentMonthGroup) {
      const startRow = groupStartIndex + 2; // +2 do dòng 1 là header
      const endRow = i + 1;
      const rowCount = endRow - startRow + 1;

      const groupRange = sheet.getRange(startRow, 1, rowCount, 1);

      if (rowCount > 1) {
        groupRange.merge();
      }

      groupRange
        .setValue(currentMonthGroup)
        .setHorizontalAlignment('center')
        .setVerticalAlignment('middle')
        .setFontWeight('bold')
        .setFontSize(10)
        .setBackground('#F8FAFC')     // Màu nền xám nhạt tinh tế
        .setFontColor('#334155');

      // Thêm viền nhẹ bao quanh nhóm tháng
      sheet.getRange(startRow, 1, rowCount, CONFIG.TOTAL_COLUMNS)
        .setBorder(true, false, true, false, false, false, '#CBD5E1', SpreadsheetApp.BorderStyle.SOLID);

      if (!isEnd) {
        groupStartIndex = i;
        currentMonthGroup = itemMonthGroup;
      }
    }
  }

  // 6. Định dạng thẩm mỹ cho các cột dữ liệu B:G
  // Cột B (Date): Căn giữa
  sheet.getRange(2, 2, numRows, 1)
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');

  // Cột C (Type): Căn giữa
  sheet.getRange(2, 3, numRows, 1)
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');

  // Cột D (Category): Căn giữa / trái
  sheet.getRange(2, 4, numRows, 1)
    .setHorizontalAlignment('left')
    .setVerticalAlignment('middle');

  // Cột E (Amount): Định dạng tiền tệ VND, căn phải
  sheet.getRange(2, 5, numRows, 1)
    .setNumberFormat('#,##0 "đ"')
    .setHorizontalAlignment('right')
    .setVerticalAlignment('middle')
    .setFontWeight('bold');

  // Cột F (Note) & G (Raw Text): Căn trái
  sheet.getRange(2, 6, numRows, 2)
    .setHorizontalAlignment('left')
    .setVerticalAlignment('middle');

  // Đặt chiều cao dòng dữ liệu
  for (let r = 2; r <= lastRow; r++) {
    sheet.setRowHeight(r, 28);
  }
}

/**
 * Chuyển đổi mọi định dạng ngày trong ô thành đối tượng Date hợp lệ
 */
function parseDateValue(val) {
  if (val instanceof Date && !isNaN(val.getTime())) {
    return val;
  }
  if (typeof val === 'string') {
    const parts = val.trim().split('/');
    if (parts.length === 3) {
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const y = parseInt(parts[2], 10);
      const date = new Date(y, m, d);
      if (!isNaN(date.getTime())) return date;
    }
  }
  return new Date();
}

/**
 * Format Date thành dd/MM/yyyy
 */
function formatDateObject(d) {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Format chuỗi nhóm tháng Tháng MM/yyyy
 */
function getMonthGroupString(d) {
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `Tháng ${month}/${year}`;
}

/**
 * Chuyển Date hoặc String thành chuỗi dd/MM/yyyy
 */
function formatAnyDateToString(val) {
  if (val instanceof Date) {
    return formatDateObject(val);
  }
  if (typeof val === 'string') {
    return val.trim();
  }
  return '';
}

