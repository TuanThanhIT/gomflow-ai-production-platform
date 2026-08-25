# GomFlow - CeramiOps AI Production Platform

GomFlow là hệ thống quản lý sản xuất theo công đoạn cho xưởng gốm. Dự án hỗ trợ theo dõi đơn hàng, quy trình sản xuất, tài nguyên, sự cố, nhật ký hoạt động, dashboard realtime, AI phân tích nội dung và thông báo Telegram.

## Mục Tiêu

Trong sản xuất gốm, một đơn hàng thường đi qua nhiều công đoạn như tạo hình, phơi/sấy, trang trí, tráng men, nung, kiểm tra chất lượng và đóng gói. Nếu theo dõi thủ công, xưởng dễ gặp các vấn đề:

- Khó biết đơn hàng đang ở công đoạn nào.
- Khó kiểm soát tài nguyên nào đang rảnh, đang dùng, bảo trì hoặc hỏng.
- Sự cố không được ghi nhận kịp thời, khó đánh giá ảnh hưởng tới deadline.
- Thiếu nhật ký thao tác để truy vết ai đã làm gì, vào thời điểm nào.
- Người quản lý thiếu dashboard để nhìn nhanh tình hình sản xuất.

GomFlow gom các phần này vào một nền tảng web tập trung, có realtime và Telegram để người vận hành theo dõi sát hơn.

## Tính Năng Chính

- Đăng nhập bằng JWT, refresh token và phân quyền theo vai trò `ADMIN`, `MANAGER`, `OPERATOR`.
- Dashboard tổng quan: KPI, Kanban sản xuất, đơn hàng cần chú ý, sự cố gần đây, tình trạng tài nguyên và biểu đồ hoàn thành theo ngày.
- Quản lý đơn hàng: tạo đơn, xem danh sách, xem chi tiết, bắt đầu sản xuất.
- Quản lý công đoạn: gán tài nguyên, tiếp tục công đoạn bị chặn, xác nhận hoàn thành công đoạn.
- Quản lý tài nguyên sản xuất: lò nung, máy sấy, khu tạo hình, trang trí, tráng men, QC, đóng gói.
- Quản lý quy trình sản xuất và các bước mẫu.
- Báo cáo và xử lý sự cố sản xuất, tự liên kết đơn hàng/công đoạn/tài nguyên bị ảnh hưởng.
- Nhật ký hoạt động, gom theo từng đơn hàng để dễ theo dõi lịch sử.
- AI phân tích đơn hàng và sự cố bằng Google Gemini.
- Socket.IO realtime cho dashboard, đơn hàng, sự cố và tài nguyên.
- Telegram notification:
  - Gửi cảnh báo công đoạn đang thực hiện.
  - Xác nhận hoàn thành công đoạn từ Telegram.
  - Gửi thông báo hoàn thành công đoạn đồng nhất với thao tác trên web.
  - Gửi cảnh báo sự cố và thông báo đã giải quyết sự cố.
  - Sau khi giải quyết sự cố, gửi nút `Tiếp tục công đoạn`, rồi mới cho `Xác nhận hoàn thành`.
- Phân trang các bảng chính 10 dòng/trang.
- Migration và seed database bằng Sequelize CLI.
- Docker Compose cho MySQL, server và client.

## Công Nghệ

### Client

- React 19
- TypeScript
- Vite
- Redux Toolkit
- React Router
- Axios
- Socket.IO Client
- Tailwind CSS
- React Hook Form
- Zod
- Recharts
- Lucide React

### Server

- Node.js
- Express
- TypeScript
- Sequelize ORM
- Sequelize CLI
- MySQL 8
- JWT authentication
- Cookie parser
- CORS
- Socket.IO
- Google Gemini API
- Telegram Bot API

## Cấu Trúc Thư Mục

```text
.
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── constants/
│   │   ├── contexts/
│   │   ├── pages/
│   │   ├── redux/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── types/
│   │   └── utils/
│   ├── Dockerfile
│   └── nginx.conf
├── server/
│   ├── migrations/
│   ├── seeders/
│   └── src/
│       ├── config/
│       ├── constants/
│       ├── controllers/
│       ├── errors/
│       ├── helpers/
│       ├── middlewares/
│       ├── models/
│       ├── routes/
│       ├── services/
│       ├── types/
│       ├── utils/
│       └── validations/
├── docker-compose.yml
├── .env.example
└── README.md
```

## Yêu Cầu

Chạy bằng Docker:

- Docker Desktop hoặc Docker Engine
- Docker Compose

Chạy local:

- Node.js 22+
- npm
- MySQL 8+

## Chạy Bằng Docker

Tạo file môi trường ở thư mục gốc:

```bash
cp .env.example .env
```

Cập nhật các biến quan trọng trong `.env`:

```env
MYSQL_ROOT_PASSWORD=123456789
DB_NAME=cerami_ops_db
DB_USER=ceramiops
DB_PASSWORD=ceramiops_password

SERVER_PORT=3001
CLIENT_PORT=5000
MYSQL_PORT=3306

CLIENT_URL=http://localhost:5000,http://127.0.0.1:5000,http://localhost
CORS_ORIGIN=http://localhost:5000,http://127.0.0.1:5000,http://localhost
VITE_API_URL=http://localhost:3001
VITE_SOCKET_URL=http://localhost:3001

JWT_ACCESS_SECRET=change_me_access_secret
JWT_REFRESH_SECRET=change_me_refresh_secret

GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.6-flash

TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
TELEGRAM_USER_MAP={"<telegram_user_id>":<gomflow_user_id>}
TZ=Asia/Ho_Chi_Minh
```

Build và chạy:

```bash
docker compose up --build
```

Sau khi chạy:

- Client: `http://localhost:5000`
- Server API: `http://localhost:3001`
- Health check: `http://localhost:3001/health`
- MySQL: `localhost:3306`

Server container tự chạy migration trước khi start:

```bash
npm run migrate && npm run start
```

Dừng hệ thống:

```bash
docker compose down
```

Dừng và xoá volume database:

```bash
docker compose down -v
```

## Chạy Local

### 1. Tạo Database

```sql
CREATE DATABASE cerami_ops_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. Cấu Hình Server

Tạo file `server/.env`:

```env
PORT=3001
HOST=0.0.0.0

DB_HOST=localhost
DB_PORT=3306
DB_NAME=cerami_ops_db
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
TELEGRAM_USER_MAP={"<telegram_user_id>":<gomflow_user_id>}
TZ=Asia/Ho_Chi_Minh
```

Chạy server:

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

### 3. Cấu Hình Client

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

## Tài Khoản Demo

Sau khi chạy seed:

| Vai trò  | Email                      | Mật khẩu   |
| -------- | -------------------------- | ---------- |
| ADMIN    | `admin@ceramiops.local`    | `Demo@123` |
| MANAGER  | `manager@ceramiops.local`  | `Demo@123` |
| OPERATOR | `operator@ceramiops.local` | `Demo@123` |

## Dữ Liệu Seed

Các seeders hiện có tạo dữ liệu mẫu cho:

- Người dùng demo.
- Quy trình sản xuất gốm.
- Các bước quy trình.
- Tài nguyên sản xuất.
- Đơn hàng, công đoạn, sự cố, nhật ký hoạt động.

Seeder mới nhất `20260825093000-weekly-demo-production-data.cjs` chuẩn hoá dữ liệu demo:

- 6 đơn hàng đã hoàn thành trong vòng 7 ngày gần đây.
- 1 đơn hàng mới `GOM-000007` để test bắt đầu sản xuất.
- 3 sự cố trong tuần vừa rồi.
- 2 tài nguyên cho mỗi nhóm công đoạn chính.
- Activity logs tương ứng để test trang nhật ký.

Chạy seed:

```bash
cd server
npm run seed
```

Nếu muốn làm sạch toàn bộ seed và chạy lại:

```bash
cd server
npm run seed:undo:all
npm run seed
```

## Telegram Bot

Để bật Telegram notification:

1. Tạo bot và lấy `TELEGRAM_BOT_TOKEN`.
2. Lấy chat id nhóm/người nhận và điền `TELEGRAM_CHAT_ID`.
3. Liên kết Telegram user với user GomFlow qua `TELEGRAM_USER_MAP`.

Ví dụ:

```env
TELEGRAM_USER_MAP={"123456789":2}
```

Trong ví dụ trên, Telegram user id `123456789` được map với user GomFlow có id `2`.

Khi server start, `telegramCallbackService` sẽ polling callback button từ Telegram. Các nút đang hỗ trợ:

- `Xác nhận hoàn thành`
- `Đã xử lý`
- `Tiếp tục công đoạn`

## API Chính

| Nhóm              | Route                    |
| ----------------- | ------------------------ |
| Auth              | `/auth`                  |
| Dashboard         | `/api/dashboard`         |
| AI                | `/api/ai`                |
| Orders            | `/api/orders`            |
| Order stages      | `/api/order-stages`      |
| Process templates | `/api/process-templates` |
| Resources         | `/api/resources`         |
| Incidents         | `/api/incidents`         |
| Activity logs     | `/api/activity-logs`     |
| Health check      | `/health`                |

Các route nghiệp vụ dùng middleware theo format:

```ts
(auth, authorize(USER_ROLE.MANAGER), validate(schema), controller.handler);
```

Vai trò `ADMIN` được phép truy cập toàn bộ route có `authorize`. `MANAGER` và `OPERATOR` được phân quyền theo từng nghiệp vụ.

## Scripts

### Client

```bash
npm run dev          # Chạy Vite dev server
npm run build        # Build production
npm run lint         # Kiểm tra ESLint
npm run lint:fix     # Tự sửa ESLint nếu có thể
npm run prettier     # Kiểm tra format
npm run prettier:fix # Tự format code
npm run preview      # Preview bản build
```

### Server

```bash
npm run dev              # Chạy server bằng nodemon
npm run build            # Build TypeScript sang dist
npm run start            # Chạy dist/server.js
npm run lint             # Kiểm tra ESLint
npm run lint:fix         # Tự sửa ESLint nếu có thể
npm run prettier         # Kiểm tra format
npm run prettier:fix     # Tự format code
npm run migrate          # Chạy database migrations
npm run migrate:undo     # Rollback migration gần nhất
npm run migrate:undo:all # Rollback toàn bộ migrations
npm run seed             # Chạy seeders
npm run seed:undo        # Rollback seeder gần nhất
npm run seed:undo:all    # Rollback toàn bộ seeders
```

## Kiểm Tra Trước Khi Nộp

Client:

```bash
cd client
npm run lint
npm run build
```

Server:

```bash
cd server
npm run lint
npm run build
```

Docker compose:

```bash
docker compose config
```

## Ghi Chú Bảo Mật

- Không commit file `.env` thật.
- Không đưa JWT secret, Gemini API key hoặc Telegram bot token vào README/source code.
- Đổi toàn bộ secret mặc định trước khi chạy production.
- Nếu token/secret thật từng bị commit, cần rotate ngay.
- Với Telegram, chỉ map những Telegram user id được phép thao tác production.
