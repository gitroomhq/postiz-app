# Postiz Custom Frontend

Custom frontend untuk Postiz menggunakan React + Vite + Tailwind CSS.

## 🚀 Tech Stack

- **React 18** - UI Library
- **TypeScript** - Type Safety
- **Vite** - Build Tool & Dev Server
- **Tailwind CSS** - Styling
- **React Router** - Routing
- **Lucide React** - Icons
- **Date-fns** - Date formatting

## 📁 Project Structure

```
custom-frontend/
├── src/
│   ├── components/        # Reusable components
│   │   ├── DashboardLayout.tsx
│   │   └── PrivateRoute.tsx
│   ├── contexts/          # React contexts
│   │   └── AuthContext.tsx
│   ├── hooks/             # Custom hooks
│   │   ├── usePosts.ts
│   │   └── useIntegrations.ts
│   ├── lib/               # Utilities & API client
│   │   └── api.ts
│   ├── pages/             # Page components
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Posts.tsx
│   │   ├── Integrations.tsx
│   │   ├── Analytics.tsx
│   │   └── Settings.tsx
│   ├── styles/            # Global styles
│   │   └── index.css
│   ├── types/             # TypeScript types
│   │   └── index.ts
│   ├── App.tsx            # Main app component
│   └── main.tsx           # Entry point
├── .env                   # Environment variables
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

## 🛠️ Setup & Installation

### Prerequisites

- Node.js 18+ dan npm/pnpm
- Postiz backend sudah running di `http://localhost:3000`

### Installation Steps

1. **Navigate ke directory custom-frontend:**

```bash
cd custom-frontend
```

2. **Install dependencies:**

```bash
npm install
# atau
pnpm install
```

3. **Configure environment variables:**

File `.env` sudah dibuat dengan konfigurasi default:

```env
VITE_API_URL=http://localhost:3000
VITE_APP_NAME=Postiz Custom Frontend
VITE_APP_VERSION=1.0.0
```

Sesuaikan jika backend berjalan di port/URL yang berbeda.

4. **Start development server:**

```bash
npm run dev
# atau
pnpm dev
```

Frontend akan berjalan di: `http://localhost:5173`

## 🔧 Available Scripts

```bash
# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type check
tsc --noEmit

# Lint
npm run lint
```

## 🔐 Authentication

Frontend menggunakan cookie-based authentication dengan JWT:

- Login/Register akan menyimpan JWT di HTTP-only cookie
- Semua API requests otomatis include cookies (`credentials: 'include'`)
- Protected routes menggunakan `PrivateRoute` component
- Auto-redirect ke `/login` jika tidak authenticated

## 📡 API Integration

### API Client (`src/lib/api.ts`)

Custom API client dengan methods:

**Authentication:**
- `login(data)` - Login user
- `register(data)` - Register new user
- `logout()` - Logout user
- `getCurrentUser()` - Get current user data
- `forgotPassword(email)` - Request password reset

**Posts:**
- `getPosts(page, limit)` - Get all posts
- `getPost(id)` - Get single post
- `createPost(data)` - Create new post
- `updatePost(id, data)` - Update post
- `deletePost(id)` - Delete post

**Integrations:**
- `getIntegrations()` - Get all integrations
- `getIntegration(id)` - Get single integration
- `deleteIntegration(id)` - Delete integration

**Media:**
- `uploadMedia(file)` - Upload media file

### Custom Hooks

**`useAuth()`** - Access authentication context:
```tsx
const { user, login, logout, isAuthenticated, loading } = useAuth();
```

**`usePosts()`** - Manage posts:
```tsx
const { posts, loading, error, createPost, deletePost, fetchPosts } = usePosts();
```

**`useIntegrations()`** - Manage integrations:
```tsx
const { integrations, loading, error, deleteIntegration, fetchIntegrations } = useIntegrations();
```

## 🎨 Styling

### Tailwind Configuration

Custom colors yang match dengan Postiz theme:

```javascript
colors: {
  primary: '#612bd3',      // Purple
  secondary: '#d82d7e',    // Pink
  background: '#0c0a09',   // Dark mode background
  foreground: '#ffffff',   // Dark mode text
}
```

### Custom CSS Classes

```css
.btn              - Base button
.btn-primary      - Primary button (purple)
.btn-secondary    - Secondary button (pink)
.btn-outline      - Outlined button
.input            - Form input
.card             - Card container
```

## 🧩 Features

### ✅ Implemented

- ✅ User Authentication (Login/Register/Logout)
- ✅ Protected Routes
- ✅ Dashboard Overview
- ✅ Posts Management (CRUD)
- ✅ Integrations List
- ✅ Responsive Design
- ✅ Error Handling
- ✅ Loading States

### 🚧 Coming Soon

- Analytics Dashboard
- Settings Page
- Post Scheduling UI
- Media Upload UI
- Real-time Updates
- Advanced Filters

## 🔒 Backend Setup

Pastikan backend Postiz sudah running dengan konfigurasi berikut:

### Backend `.env` Configuration

```bash
# Frontend URL untuk CORS
FRONTEND_URL=http://localhost:5173

# Backend URLs
BACKEND_INTERNAL_URL=http://localhost:3000
NEXT_PUBLIC_BACKEND_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/postiz

# Redis
REDIS_URL=redis://localhost:6379

# JWT Secret
JWT_SECRET=your-secret-key

# Optional: Disable registration
DISABLE_REGISTRATION=false
```

### Start Backend

```bash
# Dari root directory postiz-app
cd /home/user/postiz-app
pnpm install
pnpm backend:dev
```

Backend akan berjalan di: `http://localhost:3000`

## 🌐 CORS Configuration

Backend sudah dikonfigurasi untuk accept requests dari custom frontend:

```typescript
cors: {
  credentials: true,
  origin: [
    process.env.FRONTEND_URL,  // http://localhost:5173
    'http://localhost:6274',
  ],
}
```

## 📝 Example Usage

### Login Flow

```tsx
import { useAuth } from '@/contexts/AuthContext';

function LoginComponent() {
  const { login } = useAuth();

  const handleLogin = async () => {
    try {
      await login({ email: 'user@example.com', password: 'password' });
      // Redirect to dashboard
    } catch (error) {
      console.error('Login failed:', error);
    }
  };
}
```

### Create Post

```tsx
import { usePosts } from '@/hooks/usePosts';

function CreatePostComponent() {
  const { createPost } = usePosts();

  const handleCreate = async () => {
    try {
      await createPost({
        content: 'My first post!',
        status: 'draft',
      });
    } catch (error) {
      console.error('Create failed:', error);
    }
  };
}
```

## 🐛 Troubleshooting

### CORS Errors

Pastikan:
1. Backend running di `http://localhost:3000`
2. `FRONTEND_URL` di backend `.env` sesuai dengan frontend URL
3. Request menggunakan `credentials: 'include'`

### Authentication Issues

Jika tidak bisa login:
1. Cek browser console untuk error messages
2. Verify backend JWT_SECRET sudah diset
3. Clear browser cookies
4. Check network tab untuk response headers

### Build Errors

```bash
# Clear node_modules dan reinstall
rm -rf node_modules
npm install

# Clear Vite cache
rm -rf node_modules/.vite
```

## 📚 API Documentation

Akses Swagger documentation di backend:

```
http://localhost:3000/docs
```

Swagger akan menampilkan semua available endpoints dengan request/response schemas.

## 🤝 Contributing

Struktur project sudah setup untuk development. Untuk menambah fitur:

1. Create new component di `src/components/` atau `src/pages/`
2. Add API methods di `src/lib/api.ts`
3. Create custom hooks di `src/hooks/` jika perlu
4. Add types di `src/types/index.ts`
5. Update routes di `src/App.tsx`

## 📄 License

Same as Postiz main project.

## 🎯 Next Steps

1. **Customize Branding:**
   - Update colors di `tailwind.config.js`
   - Modify components styling
   - Add logo and favicon

2. **Add Features:**
   - Implement Analytics page
   - Add Settings page
   - Create Post Scheduling UI
   - Add Media Upload

3. **Deploy:**
   - Build for production: `npm run build`
   - Serve `dist/` folder
   - Configure environment variables for production

---

**Happy Coding! 🚀**

Untuk pertanyaan atau issues, silakan check dokumentasi Postiz di repository utama.
