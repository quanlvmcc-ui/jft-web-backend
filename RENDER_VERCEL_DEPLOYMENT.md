# Render & Vercel Deployment Guide

## 📋 Tổng quan

Dự án sẽ deploy trên 2 platform:
- **Backend (NestJS)**: Render + Supabase PostgreSQL
- **Frontend (Next.js)**: Vercel

---

## 🚀 Backend Deployment (Render)

### Step 1: Tạo tài khoản Render

1. Truy cập https://render.com/
2. Đăng ký bằng GitHub account
3. Authorize Render để access GitHub repositories

### Step 2: Deploy Backend Service

1. Nhấn **"New +"** (góc trên phải)
2. Chọn **"Web Service"**
3. Kết nối GitHub:
   - Chọn repository: `jft-web-backend`
   - Chọn branch: `main`
4. Cấu hình Service:
   - **Name**: `jft-api` (hoặc tên khác)
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start:prod` (hoặc `npm run start`)
   - **Instance Type**: Free (miễn phí)

### Step 3: Cấu hình Environment Variables

Nhấn **"Environment"** tab, thêm các biến sau:

```
NODE_ENV=production

DATABASE_URL=postgresql://postgres:Gyt9r62I8%2A%21a6%5E@db.oohiagwdedaazeryxzok.supabase.co:5432/postgres?schema=public

JWT_ACCESS_SECRET=X7k9mL2pQv6vNw3wRz5tJb8yUe4bFd7gH

JWT_ACCESS_EXPIRES_IN=15m

JWT_REFRESH_EXPIRES_IN=7d

CORS_ORIGIN=https://your-frontend.vercel.app

PORT=3000
```

**⚠️ Lưu ý:**
- `DATABASE_URL`: Thay bằng Supabase connection string (URL-encoded password)
- `CORS_ORIGIN`: Thay bằng URL frontend Vercel (sau khi deploy Vercel)
- JWT_ACCESS_SECRET: Không chứa ký tự `#` (bị coi là comment)

### Step 4: Deploy

Nhấn **"Create Web Service"** → Render sẽ:
1. Clone repo từ GitHub
2. Chạy build command
3. Deploy service
4. Cấp URL: `https://jft-api.onrender.com` (tên khác tuỳ bạn)

**Kiểm tra Deployment:**
- Vào tab **"Logs"** để xem build progress
- Khi thấy `Listening on port 3000` → Deploy thành công ✅
- Dùng `curl` để test: `curl https://jft-api.onrender.com/health`

---

## 🌐 Frontend Deployment (Vercel)

### Step 1: Tạo tài khoản Vercel

1. Truy cập https://vercel.com/
2. Đăng ký bằng GitHub account
3. Authorize Vercel để access GitHub

### Step 2: Import Project

1. Nhấn **"New Project"**
2. Chọn **"Import Git Repository"**
3. Tìm và chọn: `jft-web-frontend`
4. Vercel sẽ auto-detect Next.js framework

### Step 3: Cấu hình Build

Vercel thường auto-detect, nhưng kiểm tra:
- **Build Command**: `npm run build` (default)
- **Output Directory**: `.next` (default)
- **Install Command**: `npm install` (default)

### Step 4: Cấu hình Environment Variables

1. Nhấn **"Environment Variables"**
2. Thêm:
   ```
   NEXT_PUBLIC_API_URL=https://jft-api.onrender.com/
   ```

   **Thay `jft-api.onrender.com` bằng domain backend Render thực tế**

### Step 5: Deploy

Nhấn **"Deploy"** → Vercel sẽ:
1. Clone repo từ GitHub
2. Build Next.js app
3. Deploy lên CDN
4. Cấp URL: `https://your-app.vercel.app` (auto-generate)

**Kiểm tra Deployment:**
- Vào domain Vercel → Kiểm tra frontend có load không
- Test login, exam flow để xác nhận API integration

---

## 🔄 Kết nối Frontend ↔ Backend

### Sau khi deploy, cập nhật CORS_ORIGIN on Render:

1. Vào Render Dashboard > chọn `jft-api`
2. Chọn tab **"Environment"**
3. Update: `CORS_ORIGIN=https://your-frontend.vercel.app`
4. Nhấn **"Save"** → Render sẽ redeploy

### Test Kết nối:

```bash
# Từ terminal hoặc browser dev console
curl -X POST https://jft-api.onrender.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

Nếu không lỗi CORS → Thành công! ✅

---

## 🚨 Troubleshooting

### Error: "Can't reach database server"

- Kiểm tra `DATABASE_URL` có đúng format không
- Ký tự đặc biệt phải URL-encode: `*` = `%2A`, `!` = `%21`, `^` = `%5E`
- Supabase project có active không?

### Error: "CORS error" từ frontend

- Kiểm tra `CORS_ORIGIN` on Render có match frontend domain không
- Vercel domain thường là `https://your-app.vercel.app` (không có trailing slash)

### Error: "Module not found" khi build

- Kiểm tra `.gitignore` không exclude `node_modules` (hoặc thực sự có `package.json`)
- Run `npm install` trước commit

### Render App ngủ (Free Tier)

- Free Render instance sẽ sleep sau 15 phút inactivity
- Lần đầu request sẽ slow (30 giây)
- Nếu cần production: Upgrade lên **Starter** ($7/tháng)

---

## 📚 Environment Variables Checklist

### Backend (.render.com):
- [x] NODE_ENV = `production`
- [x] DATABASE_URL = Supabase connection (URL-encoded)
- [x] JWT_ACCESS_SECRET = Strong secret (không có `#`)
- [x] CORS_ORIGIN = Frontend URL (https://...)
- [x] PORT = `3000`

### Frontend (.vercel.app):
- [x] NEXT_PUBLIC_API_URL = Backend URL (https://.../)

---

## ✅ Deployment Checklist

- [ ] Backend code push to GitHub `main` branch
- [ ] Frontend code push to GitHub `main` branch
- [ ] Create Render account
- [ ] Deploy backend on Render
- [ ] Create Vercel account
- [ ] Deploy frontend on Vercel
- [ ] Get Render backend URL: `https://jft-api.onrender.com`
- [ ] Get Vercel frontend URL: `https://xxx.vercel.app`
- [ ] Update `NEXT_PUBLIC_API_URL` on Vercel with backend URL
- [ ] Update `CORS_ORIGIN` on Render with frontend URL
- [ ] Test login/exam flow end-to-end
- [ ] Monitor logs for errors

---

## 🔗 Useful Links

- [Render Documentation](https://render.com/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [Prisma on Render](https://www.prisma.io/docs/orm/prisma-migrate/deploy/deploy-database-migrations-at-scale)
- [Supabase with Prisma](https://supabase.com/docs/guides/database/prisma)

---

## 📞 Support

Nếu gặp issue:
1. Check Render logs: **Service > Logs**
2. Check Vercel logs: **Deployments > Logs**
3. Check browser console for frontend errors
4. Check network tab cho API calls
