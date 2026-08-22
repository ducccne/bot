# Hướng dẫn Cài đặt & Vận hành Telegram Expense Bot + Google Sheets

Hệ thống quản lý chi tiêu cá nhân tự động hóa qua Telegram Bot kết nối Google Sheets, chạy 100% không tốn chi phí trên **Google Apps Script (Serverless)**, không sử dụng AI, hoạt động ổn định và xử lý dữ liệu chuẩn xác dựa trên Regex và Rule Engine.

---

## 📁 1. Cấu trúc Source Code

Dự án gồm 5 file mã nguồn chính có thể copy trực tiếp vào Google Apps Script:

- **`Config.js`**: Cấu hình hệ thống, múi giờ (`Asia/Ho_Chi_Minh`), danh sách danh mục chi tiêu & từ khóa nhận diện theo thứ tự ưu tiên.
- **`Data.js`**: Bóc tách dữ liệu tin nhắn (Ngày, Số tiền, Ghi chú, Thu/Chi) và phân loại danh mục theo rules.
- **`Sheets.js`**: Thao tác ghi dữ liệu, sắp xếp tự động theo ngày tăng dần, quản lý gộp ô Cột A (**Tháng**) và xử lý `/undo`.
- **`Report.js`**: Xử lý báo cáo chi tiêu hôm nay (`/homnay`) và thống kê tháng (`/thongke`).
- **`Bot.js`**: Điểm tiếp nhận Webhook (`doPost`), chống duplicate tin nhắn, điều hướng lệnh và các hàm tiện ích Telegram API.
- **`Test.js`**: Bộ hàm Unit Test để kiểm tra thử nghiệm trực tiếp trên Google Apps Script.

---

## 📊 2. Thiết kế Database Google Sheets

| Cột | Tên Cột | Vai trò | Mô tả |
| :---: | :--- | :---: | :--- |
| **A** | **Tháng** | *Presentation* | Tự động merge dọc theo từng nhóm tháng (`Tháng 07/2026`, `Tháng 08/2026`). Căn giữa. |
| **B** | **Date** | *Data* | Ngày giao dịch (`dd/MM/yyyy`). Luôn được sắp xếp tăng dần. |
| **C** | **Type** | *Data* | `Chi` hoặc `Thu`. |
| **D** | **Category** | *Data* | Danh mục: Ăn uống, Xăng xe, Di chuyển, Mua sắm, v.v. |
| **E** | **Amount** | *Data* | Số tiền giao dịch (định dạng VND: `50.000 đ`). |
| **F** | **Note** | *Data* | Ghi chú ngắn gọn (ví dụ: `ăn trưa`, `đổ xăng`). |
| **G** | **Raw Text** | *Data* | Toàn bộ tin nhắn gốc gửi từ Telegram. |

---

## 🚀 3. Các bước cài đặt chi tiết (Từ A-Z)

### Bước 1: Tạo Telegram Bot & Lấy Token
1. Mở Telegram, tìm kiếm bot **`@BotFather`**.
2. Gõ lệnh `/newbot` và làm theo hướng dẫn để đặt tên và username cho bot.
3. BotFather sẽ cấp cho bạn một chuỗi **HTTP API Token** (dạng `123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ`). Hãy lưu lại mã token này.

### Bước 2: Tạo Google Sheets & Mở Google Apps Script
1. Truy cập [Google Sheets](https://sheets.new) và tạo một bảng tính mới (đặt tên ví dụ: `Quản Lý Chi Tiêu`).
2. Trên thanh menu, chọn **Tiện ích mở rộng** (Extensions) ➔ **Apps Script**.
3. Đổi tên dự án Apps Script (ví dụ: `Expense-Bot`).

### Bước 3: Đưa Code vào Apps Script
1. Trong giao diện Apps Script, bạn tạo các file `.gs` tương ứng với các file trong thư mục dự án:
   - `Config.gs` (paste nội dung từ `Config.js`)
   - `Data.gs` (paste nội dung từ `Data.js`)
   - `Sheets.gs` (paste nội dung từ `Sheets.js`)
   - `Report.gs` (paste nội dung từ `Report.js`)
   - `Bot.gs` (paste nội dung từ `Bot.js`)
   - `Test.gs` (paste nội dung từ `Test.js` - tùy chọn)
2. Nhấn biểu tượng 💾 **Save all** (hoặc `Ctrl + S`).

### Bước 4: Thiết lập BOT_TOKEN
Bạn có 2 cách để thiết lập Token:
- **Cách 1 (Khuyên dùng - Bảo mật):**
  1. Trong Apps Script, chọn biểu tượng ⚙️ **Cài đặt dự án** (Project Settings) ở menu bên trái.
  2. Cuộn xuống mục **Thuộc tính tập lệnh** (Script Properties) ➔ bấm **Thêm thuộc tính tập lệnh**.
  3. Nhập:
     - Thuộc tính (Property): `BOT_TOKEN`
     - Giá trị (Value): `<Dán Bot Token bạn nhận từ BotFather>`
  4. Bấm **Lưu thuộc tính tập lệnh**.
- **Cách 2:** Mở file `Config.js`, thay trực tiếp chuỗi token vào hàm `getBotToken()`.

### Bước 5: Triển khai (Deploy) Web App
1. Ở góc trên bên phải giao diện Apps Script, nhấn nút **Triển khai** (Deploy) ➔ **Tùy chọn triển khai mới** (New deployment).
2. Nhấn biểu tượng ⚙️ (chọn loại) ➔ Chọn **Ứng dụng web** (Web app).
3. Cấu hình các mục:
   - **Mô tả:** `Telegram Expense Bot v1.0`
   - **Thực thi dưới dạng (Execute as):** `Tôi (Email của bạn)` *(Me)*
   - **Ai có quyền truy cập (Who has access):** `Bất kỳ ai` *(Anyone)*  *(Bắt buộc chọn Anyone để Telegram có thể gửi Webhook tới)*
4. Nhấn **Triển khai** (Deploy).
5. Khi Google yêu cầu **Cấp quyền truy cập** (Authorize access):
   - Chọn tài khoản Google của bạn.
   - Nhấn **Nâng cao** (Advanced) ➔ Nhấn **Đi tới Expense-Bot (Không an toàn)** ➔ Nhấn **Cho phép** (Allow).
6. Sau khi triển khai thành công, sao chép chuỗi **URL ứng dụng web** (Web App URL) có đuôi `/exec`.

### Bước 6: Đăng ký Webhook & Menu Command cho Bot
1. Quay lại Apps Script, mở file `Bot.gs`.
2. Tìm đến hàm `setTelegramWebhook` và điền URL Web App của bạn vào hoặc chạy trực tiếp bằng cách tạo một hàm kích hoạt nhanh:
   ```javascript
   function setupBot() {
     const WEB_APP_URL = "DÁN_WEB_APP_URL_Ở_BƯỚC_5_VÀO_ĐÂY";
     setTelegramWebhook(WEB_APP_URL);
     registerBotCommands();
   }
   ```
3. Chọn hàm `setupBot` ở thanh menu bên trên và nhấn nút **Chạy** (Run).
4. Xem nhật ký (Execution Log) hiển thị `{"ok":true,"result":true,"description":"Webhook was set"}` là hoàn tất!

---

## 💬 4. Hướng dẫn sử dụng Bot

### 1. Nhập chi tiêu hàng ngày (Tự lấy ngày hiện tại)
- `ăn 65k`
- `xăng 50k`
- `grab 35k`
- `mua áo 500k`
- `tiền phòng 3.5tr`

### 2. Ghi bù cho ngày trong quá khứ
- `13/7 ăn trưa 50k`
- `13t7 cà phê 30k`
- `13-7 xăng 50k`
- `02/08/2026 trà sữa 45k`

### 3. Ghi nhận khoản thu
- `nhận lương 15tr`
- `thưởng tết 5tr`
- `được hoàn tiền 200k`

### 4. Các lệnh điều khiển Telegram
| Lệnh | Ý nghĩa |
| :--- | :--- |
| `/start` | Khởi động bot và xem thông tin chào mừng |
| `/homnay` | Xem tổng tiền chi hôm nay và thống kê từng danh mục |
| `/thongke`| Báo cáo tổng kết thu - chi và tỷ lệ % danh mục tháng này |
| `/undo` | Hoàn tác và xóa giao dịch vừa nhập gần nhất |
| `/help` | Xem hướng dẫn cú pháp |

---

## 🛠 5. Cơ chế xử lý nổi bật
- **Bảo toàn tính toàn vẹn dữ liệu:** Toàn bộ dữ liệu tại các cột `B:G` luôn liên tục, không bị chèn các dòng phân cách tháng ở giữa, đảm bảo dễ dàng lập công thức, Pivot Table hay truy vấn `QUERY()` sau này.
- **Tự động gom nhóm & Merge Cột A:** Dù bạn nhập giao dịch ngày hôm nay hay ngày của tháng trước, hệ thống sẽ tự động chèn vào đúng vị trí theo thứ tự ngày và vẽ lại cột A đẹp mắt.
- **Chống Duplicate & Webhook Loop:** Tự động ghi nhớ `update_id` đã xử lý để tránh trường hợp Telegram gửi lại làm nhân đôi giao dịch.

