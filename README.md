# GomFlow AI Production Platform

GomFlow AI Production Platform là hệ thống quản lý quy trình sản xuất dành cho xưởng gốm hoặc các mô hình sản xuất theo công đoạn. Dự án hỗ trợ theo dõi đơn hàng, mẫu quy trình, tài nguyên sản xuất, sự cố công đoạn, dashboard vận hành và một số tính năng AI để phân tích đơn hàng/sự cố.

## 1. Bài Toán

Trong quy trình sản xuất gốm, mỗi đơn hàng thường đi qua nhiều công đoạn như tạo hình, sấy, nung, trang trí, tráng men, QC và đóng gói. Nếu quản lý thủ công bằng giấy tờ hoặc bảng tính, xưởng dễ gặp các vấn đề:

- Khó biết đơn hàng đang ở công đoạn nào.
- Khó kiểm soát máy móc/khu vực sản xuất đang rảnh, đang dùng, bảo trì hay hỏng.
- Khi có sự cố, thông tin ảnh hưởng tới deadline và các đơn hàng liên quan không được ghi nhận kịp thời.
- Quy trình sản xuất thay đổi theo từng loại sản phẩm nhưng thiếu nơi quản lý tập trung.
- Người quản lý thiếu dashboard để nhìn nhanh tình trạng vận hành.

GomFlow giải quyết bài toán này bằng một nền tảng web tập trung, cho phép quản lý vòng đời đơn hàng, mẫu quy trình, tài nguyên, sự cố và thông báo realtime.

## 2. Tính Năng Chính

- Đăng nhập, phân quyền theo vai trò.
- Dashboard tổng quan đơn hàng, công đoạn, tài nguyên và sự cố.
- Tạo đơn hàng theo mẫu quy trình sản xuất.
- Quản lý mẫu quy trình sản xuất và các công đoạn tương ứng.
- Quản lý tài nguyên sản xuất: lò nung, máy sấy, khu tạo hình, trang trí, tráng men, QC, đóng gói.
- Gán/đổi tài nguyên cho công đoạn.
- Báo cáo, xử lý và theo dõi sự cố sản xuất.
- Phân tích đơn hàng và sự cố bằng AI.
- Realtime update qua Socket.IO.
- Migration/seed database bằng Sequelize CLI.
- Đóng gói Docker với MySQL, server Node.js và client Nginx.

## 3. Kiến Trúc

```text
       Client Web
   React + Vite + TS
   Nginx production
           | HTTP / Socket.IO
           v
        API Server
      Express + TS
   Sequelize + Socket
           | MySQL protocol
           v
         Database
          MySQL 8
```

### Client

- React 19, TypeScript, Vite.
- Redux Toolkit để quản lý state.
- React Router cho điều hướng.
- Axios cho API client.
- Socket.IO Client cho realtime.
- Tailwind CSS cho giao diện.
- Zod và React Hook Form cho validate form.

### Server

- Node.js, Express, TypeScript.
- Sequelize ORM kết nối MySQL.
- Sequelize CLI cho migrations/seeders.
- JWT authentication với access token và refresh token.
- Cookie parser, CORS, error middleware.
- Socket.IO cho realtime.
- Google Gemini API cho tính năng AI.
- Telegram notification tùy cấu hình.

### Database

Các nhóm dữ liệu chính:

- Users
- Orders
- Order Stages
- Process Templates
- Process Template Steps
- Resources
- Incidents
- Incident Affected Orders
- Activity Logs
- Notification Logs
- Refresh Tokens

## 4. Cấu Trúc Thư Mục

```text
.
├── client/                 # Frontend React + Vite
│   ├── src/
│   │   ├── components/     # UI components theo domain
│   │   ├── pages/          # Page-level screens
│   │   ├── redux/          # Redux store/slices
│   │   ├── schemas/        # Zod validation schemas
│   │   ├── services/       # API/socket clients
│   │   ├── types/          # TypeScript types
│   │   └── utils/          # Shared helpers
│   ├── Dockerfile
│   └── nginx.conf
├── server/                 # Backend Express + TypeScript
│   ├── src/
│   │   ├── config/         # DB/AI config
│   │   ├── controllers/    # Request handlers
│   │   ├── middlewares/    # Auth/error middleware
│   │   ├── models/         # Sequelize models
│   │   ├── routes/         # Express routes
│   │   ├── services/       # Business/external services
│   │   └── validators/     # Request validators
│   ├── migrations/         # Sequelize migrations
│   ├── seeders/            # Sequelize seeders
│   └── Dockerfile
├── docker-compose.yml
├── .env.example
└── README.md
```

## 5. Yêu Cầu Môi Trường

Chạy bằng Docker:

- Docker Desktop hoặc Docker Engine
- Docker Compose

Chạy local:

- Node.js 22+
- npm
- MySQL 8+

## 6. Cài Đặt Và Chạy Bằng Docker

Tạo file môi trường:

```bash
cp .env.example .env
```

Mở `.env` và đổi các secret trước khi dùng thật:

```env
JWT_ACCESS_SECRET=change_me_access_secret
JWT_REFRESH_SECRET=change_me_refresh_secret
GEMINI_API_KEY=
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
```

Build và chạy toàn bộ hệ thống:

```bash
docker compose up --build
```

Sau khi chạy:

- Client: http://localhost:5000
- Server API: http://localhost:3001
- Health check: http://localhost:3001/health
- MySQL: localhost:3306

Server container sẽ tự chạy migration trước khi start:

```bash
npm run migrate && npm run start
```

Dừng hệ thống:

```bash
docker compose down
```

Dừng và xóa volume database:

```bash
docker compose down -v
```

## 7. Cài Đặt Và Chạy Local

### 7.1. Cấu Hình Database

Tạo database MySQL:

```sql
CREATE DATABASE gom_flow_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Tạo file `server/.env`:

```env
PORT=3001
HOST=0.0.0.0
DB_HOST=localhost
DB_PORT=3306
DB_NAME=gom_flow_db
DB_USER=root
DB_PASSWORD=your_mysql_password

CLIENT_URL=http://localhost:5000,http://127.0.0.1:5000
CORS_ORIGIN=http://localhost:5000,http://127.0.0.1:5000

JWT_ACCESS_SECRET=your_access_secret
JWT_ACCESS_EXPIRE=1h
JWT_REFRESH_SECRET=your_refresh_secret
JWT_REFRESH_EXPIRE=7d

GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.6-flash
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
TZ=Asia/Ho_Chi_Minh
```

### 7.2. Chạy Server

```bash
cd server
npm install
npm run migrate
npm run seed
npm run dev
```

Server chạy tại:

```text
http://localhost:3001
```

### 7.3. Chạy Client

Tạo file `client/.env` nếu cần đổi API URL:

```env
VITE_API_URL=http://localhost:3001
VITE_SOCKET_URL=http://localhost:3001
```

Chạy client:

```bash
cd client
npm install
npm run dev
```

Client chạy tại:

```text
http://localhost:5000
```

## 8. Scripts Hữu Ích

### Client

```bash
npm run dev        # Chạy Vite dev server
npm run build      # Build production
npm run lint       # Kiểm tra ESLint
npm run preview    # Preview bản build
```

### Server

```bash
npm run dev              # Chạy server bằng nodemon
npm run build            # Build TypeScript sang dist
npm run start            # Chạy dist/server.js
npm run lint             # Kiểm tra ESLint
npm run migrate          # Chạy database migrations
npm run migrate:undo     # Rollback migration gần nhất
npm run seed             # Chạy seeders
npm run seed:undo        # Rollback seed gần nhất
```

## 9. Biến Môi Trường Quan Trọng

| Biến | Mô tả |
| --- | --- |
| `PORT` | Port chạy API server |
| `HOST` | Host bind API server, nên là `0.0.0.0` khi chạy Docker |
| `DB_HOST` | Host MySQL |
| `DB_PORT` | Port MySQL |
| `DB_NAME` | Tên database |
| `DB_USER` | User database |
| `DB_PASSWORD` | Password database |
| `CLIENT_URL` | Origin frontend được phép dùng cookie/auth |
| `CORS_ORIGIN` | Danh sách origin được CORS cho phép |
| `JWT_ACCESS_SECRET` | Secret ký access token |
| `JWT_REFRESH_SECRET` | Secret ký refresh token |
| `GEMINI_API_KEY` | API key cho tính năng AI |
| `TELEGRAM_BOT_TOKEN` | Bot token Telegram, tùy chọn |
| `TELEGRAM_CHAT_ID` | Chat ID Telegram, tùy chọn |
| `VITE_API_URL` | API URL được build vào client |
| `VITE_SOCKET_URL` | Socket URL được build vào client |

## 10. API Chính

Các route chính của backend:

- `/api/auth`
- `/api/orders`
- `/api/order-stages`
- `/api/process-templates`
- `/api/resources`
- `/api/incidents`
- `/api/dashboard`
- `/api/ai`
- `/health`

## 11. Docker Notes

`docker-compose.yml` gồm 3 service:

- `mysql`: MySQL 8.4, lưu dữ liệu bằng volume `mysql-data`.
- `server`: build từ `server/Dockerfile`, chạy migration rồi start API.
- `client`: build static React app, serve bằng Nginx.

Khi deploy lên domain/server thật, cần cập nhật:

```env
CLIENT_URL=https://your-domain.com
CORS_ORIGIN=https://your-domain.com
VITE_API_URL=https://api.your-domain.com
VITE_SOCKET_URL=https://api.your-domain.com
JWT_ACCESS_SECRET=strong_random_secret
JWT_REFRESH_SECRET=strong_random_secret
```

## 12. Kiểm Tra Build

Client:

```bash
cd client
npm run build
npm run lint
```

Server:

```bash
cd server
npm run build
npm run lint
```

Docker compose config:

```bash
docker compose config
```

## 13. Ghi Chú Bảo Mật

- Không commit file `.env` thật lên GitHub.
- Không đưa JWT secret, Gemini API key, Telegram token vào README hoặc source code.
- Đổi toàn bộ secret trong `.env.example` trước khi chạy production.
- Nếu đã từng commit secret thật, cần rotate secret/token ngay.
