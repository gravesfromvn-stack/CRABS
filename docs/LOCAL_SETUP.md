# Chạy CRABS local (Windows ARM, VS Code)

Kiểm tra lần cuối: 18/10/2026, nhánh `claude/local-setup`. Bản local dùng D1 local, dữ liệu demo/ẩn danh và email OTA giả lập. Nó không kết nối website CRABS, Make, Gmail hay database production.

## Môi trường đã kiểm tra

| Thành phần | Phiên bản |
|---|---|
| Máy | Surface Laptop, Snapdragon X Elite, Windows 11 ARM64 |
| Node | v22.23.3 **x64** (chạy qua giả lập; `node -p "process.arch"` phải ra `x64`) |
| npm | 10.9.9 |
| Git | 2.56.0.windows.2 ARM64, `core.autocrlf=false` |
| workerd | 2026-05-15 (binary Windows x64 trong `node_modules`) |

**Ghi chú Windows ARM:** workerd/Miniflare không có bản Windows ARM64, nên phải dùng Node x64. Nếu `process.arch` ra `arm64`, đừng chạy `npm install`. Hãy sửa PATH để trỏ tới Node x64 (`.vscode/settings.json` trên máy này đã làm việc đó cho terminal VS Code). Nếu PowerShell chặn `npm.ps1`, dùng `npm.cmd` / `npx.cmd`. Lần khởi động đầu chậm hơn trên máy x64 thật vì phải chạy qua giả lập.

## Lần đầu (hoặc sau khi reset database)

Chạy từ thư mục gốc repo:

```sh
npm run install:ci          # chỉ khi node_modules chưa có hoặc lockfile đổi
npm run db:local:migrate    # áp dụng drizzle/*.sql vào D1 local trong .wrangler/state
```

`db:local:migrate` dùng `wrangler.local-db.jsonc`, chạy với `--local --persist-to .wrangler/state`. Binding `DB`, tên `site-creator-d1` và ID giả `00000000-0000-4000-8000-000000000000` khớp với `vite.config.ts` và `dist/server/wrangler.json`, nên dev server đọc đúng tệp SQLite này. Lệnh này không cần `wrangler login` và không chạm database thật. Chạy lại nhiều lần vẫn an toàn (lần sau báo "No migrations to apply").

Sau mỗi lần lấy mã mới có migration (ví dụ `0008_ota_templates.sql` cho mẫu dùng lại), dừng `npm run dev` rồi chạy lại `npm run db:local:migrate`. Nên sao lưu D1 local trước khi migrate.

## Khởi động hằng ngày

1. Mở VS Code tại thư mục repo, mở Terminal (`` Ctrl+` ``).
2. Chạy `npm run dev`.
3. Mở http://localhost:5173/signin-with-chatgpt?return_to=/ để đăng nhập local (người dùng giả `seedy@sites.test`).
4. Ứng dụng: http://localhost:5173/

Dừng: bấm `Ctrl+C` trong terminal đang chạy `npm run dev`. Chạy lại: gõ `npm run dev` lần nữa. Dữ liệu vẫn giữ trong `.wrangler/state`.

Đăng nhập local là mock có sẵn trong `build/sites-vite-plugin.ts`. Nó chỉ hoạt động khi host là `localhost`/`127.0.0.1`/`::1` và kết nối đến từ chính máy này. `app/chatgpt-auth.ts` và các API route không được sửa: chưa đăng nhập thì `/` chuyển hướng (307), API trả 401.

### `npm run start` (bản build)

`npm run build` rồi `npm run start` chạy bản build bằng wrangler local (cổng mặc định 8787, cùng `.wrangler/state`). **Chế độ này không có đăng nhập local**: `/signin-with-chatgpt` trả 404 và API trả 401. Đây là hành vi đúng, vì việc đăng nhập do lớp Sites đảm nhận khi chạy production. Muốn dùng giao diện thì chạy `npm run dev`.

## Dữ liệu khi chạy local

- **Lễ tân / Sales dịch vụ / Báo giá:** lần đầu gọi `GET /api/workspace`, app tự seed 20 khách mẫu và 151 hồ sơ ẩn danh từ `lib/source-demo-data.json` cho tài khoản local.
- **Hộp thư OTA:** ban đầu trống vì bản local không nối Make/Gmail. Để thử luồng OTA bằng email giả lập:
  1. Tạo tệp `.env` (đã nằm trong `.gitignore`) với một token **chỉ dùng local**, ví dụ `CRABS_INGEST_TOKEN=local-<chuỗi ngẫu nhiên>`. Tuyệt đối không dùng token production.
  2. Trong app, vào Hộp thư OTA → **Kích hoạt nơi nhận email**. Bước này chỉ ghi vào D1 local.
  3. Chạy `node scripts/local-seed-ota.mjs`. Script gửi 5 email giả lập tới `http://127.0.0.1:5173/api/ota/ingest`. Chạy lại vẫn an toàn vì trùng ID sẽ được bỏ qua.
- **AI:** không đặt `OPENAI_API_KEY`. Hồ sơ khách và nháp dùng luật có sẵn (nhãn "Tóm tắt sơ bộ từ lời khách"). Nút "AI viết lại" trả lỗi 503 và giữ nguyên nháp. Lưu ý `GET /api/ota?id=…` sẽ gọi AI và ghi cache nếu có khóa.

## Reset database local

Dừng `npm run dev`, xóa D1 local rồi migrate lại:

```sh
rm -rf .wrangler/state/v3/d1          # PowerShell: Remove-Item -Recurse -Force .wrangler\state\v3\d1
npm run db:local:migrate
```

Bước này chỉ xóa dữ liệu local trên máy này.

## Kiểm thử

Xem `docs/DEVELOPMENT.md`. Chín bộ test cô lập dùng database Miniflare tạm, không cần server đang chạy, nên có thể chạy song song với `npm run dev`. Không chạy `tests/local-flow.mjs` khi chưa sửa: script này cố định cổng 5174, reset database demo và còn kỳ vọng 20 khách đã cũ.
