/**
 * Telegram Expense Bot + Google Sheets
 * File: Test.js - Bộ hàm kiểm thử (Unit Tests) trực tiếp trên Google Apps Script
 */

/**
 * Hàm chạy kiểm thử toàn diện cho Parser & Category
 */
function testParserAndCategories() {
  const testCases = [
    { input: 'ăn 65k', expectedNote: 'ăn', expectedAmount: 65000, expectedCategory: 'Ăn uống', expectedType: 'Chi' },
    { input: 'xăng 50k', expectedNote: 'xăng', expectedAmount: 50000, expectedCategory: 'Xăng xe', expectedType: 'Chi' },
    { input: 'grab 35k', expectedNote: 'grab', expectedAmount: 35000, expectedCategory: 'Di chuyển', expectedType: 'Chi' },
    { input: 'mua áo 500k', expectedNote: 'mua áo', expectedAmount: 500000, expectedCategory: 'Mua sắm', expectedType: 'Chi' },
    { input: '13/7 ăn 50k', expectedNote: 'ăn', expectedAmount: 50000, expectedCategory: 'Ăn uống', expectedDateStr: '13/07/2026' },
    { input: '13t7 đổ xăng 50k', expectedNote: 'đổ xăng', expectedAmount: 50000, expectedCategory: 'Xăng xe', expectedDateStr: '13/07/2026' },
    { input: 'mua màn hình 5tr', expectedNote: 'mua màn hình', expectedAmount: 5000000, expectedCategory: 'Điện tử' },
    { input: 'tiền phòng 3.5tr', expectedNote: 'tiền phòng', expectedAmount: 3500000, expectedCategory: 'Nhà ở' },
    { input: 'nhận lương 15tr', expectedNote: 'nhận lương', expectedAmount: 15000000, expectedType: 'Thu' }
  ];

  let passed = 0;
  let failed = 0;

  Logger.log('=== BẮT ĐẦU KIỂM THỬ PARSER & CATEGORIES ===');

  testCases.forEach((tc, idx) => {
    const res = parseTransaction(tc.input);
    if (!res) {
      Logger.log(`❌ Test #${idx + 1} FAILED [${tc.input}]: Kết quả trả về null`);
      failed++;
      return;
    }

    let isOk = true;
    if (tc.expectedAmount && res.amount !== tc.expectedAmount) {
      Logger.log(`❌ Test #${idx + 1} [${tc.input}]: Sai amount (Nhận: ${res.amount}, Kỳ vọng: ${tc.expectedAmount})`);
      isOk = false;
    }
    if (tc.expectedCategory && res.category !== tc.expectedCategory) {
      Logger.log(`❌ Test #${idx + 1} [${tc.input}]: Sai category (Nhận: ${res.category}, Kỳ vọng: ${tc.expectedCategory})`);
      isOk = false;
    }
    if (tc.expectedType && res.type !== tc.expectedType) {
      Logger.log(`❌ Test #${idx + 1} [${tc.input}]: Sai type (Nhận: ${res.type}, Kỳ vọng: ${tc.expectedType})`);
      isOk = false;
    }

    if (isOk) {
      Logger.log(`✅ Test #${idx + 1} PASSED [${tc.input}] -> ${res.category} | ${res.amount}đ | ${res.type} | ${res.dateStr}`);
      passed++;
    } else {
      failed++;
    }
  });

  Logger.log(`=== TỔNG KẾT: ${passed} PASSED, ${failed} FAILED ===`);
}

/**
 * Hàm kiểm thử ghi dữ liệu và sắp xếp tháng trên Sheet thật
 */
function testInsertSampleData() {
  Logger.log('Đang khởi tạo dữ liệu mẫu kiểm thử...');

  const sampleInputs = [
    '01/07 ăn trưa 50k',
    '03/07 xăng 50k',
    '15/07 mua sách 120k',
    '01/08 ăn sáng 35k',
    '02/08 mua áo 500k',
    '13/07 grab 35k', // Thêm ngày cũ xen kẽ tháng 7 để test auto-sort
    '10/08 trà sữa 45k'
  ];

  for (const input of sampleInputs) {
    const txn = parseTransaction(input);
    if (txn) {
      addTransaction(txn);
      Logger.log(`Đã thêm: ${input}`);
    }
  }

  Logger.log('Hoàn thành thêm dữ liệu mẫu! Hãy mở Google Sheets để kiểm tra cột A và thứ tự ngày.');
}

