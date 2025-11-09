# 🚀 Quick Start Guide

Panduan cepat untuk menjalankan Postiz Custom Frontend dalam 5 menit!

## ⚡ Quick Setup

### 1. Start Backend

```bash
# Terminal 1 - From postiz-app root directory
cd /home/user/postiz-app
pnpm install
pnpm backend:dev
```

Tunggu sampai backend running di `http://localhost:3000`

### 2. Start Frontend

```bash
# Terminal 2 - From custom-frontend directory
cd /home/user/postiz-app/custom-frontend
npm install
npm run dev
```

Frontend akan running di `http://localhost:5173`

### 3. Access Application

Buka browser: **http://localhost:5173**

## 📋 First Time Setup Checklist

### Backend Requirements

Pastikan file `.env` di root `/home/user/postiz-app/.env` berisi:

```bash
FRONTEND_URL=http://localhost:5173
BACKEND_INTERNAL_URL=http://localhost:3000
NEXT_PUBLIC_BACKEND_URL=http://localhost:3000

DATABASE_URL=postgresql://user:pass@localhost:5432/postiz
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-long-secret-key-here

DISABLE_REGISTRATION=false
```

### Frontend Configuration

File `.env` di `/home/user/postiz-app/custom-frontend/.env` sudah dibuat:

```bash
VITE_API_URL=http://localhost:3000
```

## 🎯 Test Your Setup

### 1. Register Account

- Buka http://localhost:5173
- Klik "Sign up"
- Isi form registration
- Submit

### 2. Login

- Login dengan credentials yang baru dibuat
- Akan redirect ke Dashboard

### 3. Create Post

- Klik menu "Posts" di sidebar
- Klik "Create Post" button
- Tulis content
- Submit

### 4. View Integrations

- Klik menu "Integrations"
- List akan kosong (belum ada integrations)

## 🔧 Troubleshooting

### Backend tidak bisa start?

```bash
# Check PostgreSQL
sudo systemctl status postgresql

# Check Redis
sudo systemctl status redis

# Start services if needed
sudo systemctl start postgresql
sudo systemctl start redis
```

### CORS Error?

Pastikan `FRONTEND_URL` di backend `.env` adalah `http://localhost:5173`

### Login tidak berfungsi?

1. Check browser console untuk error
2. Check Network tab untuk API response
3. Verify backend running di port 3000
4. Clear browser cookies dan refresh

### Port sudah digunakan?

```bash
# Change Vite port (edit vite.config.ts):
server: {
  port: 5174,  // Change this
}

# Update FRONTEND_URL di backend .env juga!
```

## 📦 Production Build

```bash
# Build frontend
cd custom-frontend
npm run build

# Preview production build
npm run preview
```

Dist folder akan ada di `custom-frontend/dist/`

## 🎨 Customization Tips

### Change Colors

Edit `custom-frontend/tailwind.config.js`:

```javascript
colors: {
  primary: '#your-color',
  secondary: '#your-color',
}
```

### Add New Page

1. Create file di `src/pages/YourPage.tsx`
2. Add route di `src/App.tsx`
3. Add menu item di `src/components/DashboardLayout.tsx`

### Add API Endpoint

1. Add method di `src/lib/api.ts`
2. Create custom hook di `src/hooks/useYourHook.ts`
3. Use in component

## 📚 Resources

- **Swagger API Docs:** http://localhost:3000/docs
- **Tailwind Docs:** https://tailwindcss.com
- **React Router:** https://reactrouter.com
- **Vite Docs:** https://vitejs.dev

## ✅ What's Included

- ✅ Authentication (Login/Register/Logout)
- ✅ Dashboard Overview
- ✅ Posts Management (Create/Delete)
- ✅ Integrations List
- ✅ Protected Routes
- ✅ Responsive Design
- ✅ Error Handling
- ✅ Type Safety (TypeScript)

## 🚀 Next Steps

1. Explore the codebase
2. Customize styling
3. Add new features
4. Deploy to production

**Happy coding! 🎉**
