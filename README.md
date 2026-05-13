# ⚡ TaskFlow — Team Task Manager

A full-stack team task management app with role-based access control, Kanban boards, and real-time dashboards.

---

## 🚀 Features

- **Authentication** — Signup/Login with JWT, role-based (Admin / Member)
- **Projects** — Create, edit, delete projects; manage team members
- **Tasks** — Kanban board + list view, priority, status, assignee, due dates, tags, comments
- **Dashboard** — Task stats, progress bars, overdue alerts, activity feed
- **RBAC** — Admins manage everything; members access only their projects
- **REST API** — Fully documented endpoints with validation

---

## 🛠 Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18, Vite, Tailwind CSS, React Router v6 |
| Backend | Node.js, Express.js |
| Database | SQLite (better-sqlite3) |
| Auth | JWT (jsonwebtoken), bcryptjs |
| Validation | express-validator |
| Deployment | Railway |

---

## 📁 Project Structure

```
taskflow/
├── backend/
│   ├── models/
│   │   └── database.js       # SQLite schema & connection
│   ├── middleware/
│   │   └── auth.js           # JWT auth, RBAC middleware
│   ├── routes/
│   │   ├── auth.js           # /api/auth/*
│   │   ├── projects.js       # /api/projects/*
│   │   ├── tasks.js          # /api/projects/:id/tasks/*
│   │   └── dashboard.js      # /api/dashboard
│   ├── server.js             # Express app entry point
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Layout.jsx    # Sidebar + navigation
│   │   │   └── TaskModal.jsx # Task create/edit/view modal
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── SignupPage.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── ProjectsPage.jsx
│   │   │   ├── ProjectDetailPage.jsx
│   │   │   └── ProfilePage.jsx
│   │   ├── api.js            # Axios client
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
├── railway.toml
├── nixpacks.toml
└── package.json
```

---

## 🗄 Database Schema

```sql
users           — id, name, email, password, role, avatar
projects        — id, name, description, status, owner_id, due_date
project_members — project_id, user_id, role (admin/member)
tasks           — id, title, description, status, priority, project_id, assignee_id, due_date, tags
comments        — id, task_id, user_id, content
activity_log    — user_id, entity_type, entity_id, action, details
```

---

## 🔌 API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |
| PUT | `/api/auth/profile` | Update name/password |
| GET | `/api/auth/users` | List all users |

### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | List projects |
| POST | `/api/projects` | Create project |
| GET | `/api/projects/:id` | Project details + members + stats |
| PUT | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Delete project |
| POST | `/api/projects/:id/members` | Add member by email |
| DELETE | `/api/projects/:id/members/:userId` | Remove member |
| PUT | `/api/projects/:id/members/:userId/role` | Change member role |

### Tasks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/:id/tasks` | List tasks (filterable) |
| POST | `/api/projects/:id/tasks` | Create task |
| PUT | `/api/projects/:id/tasks/:taskId` | Update task |
| DELETE | `/api/projects/:id/tasks/:taskId` | Delete task |
| GET | `/api/projects/:id/tasks/:taskId/comments` | Get comments |
| POST | `/api/projects/:id/tasks/:taskId/comments` | Add comment |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard` | Stats, my tasks, overdue, activity |

---

## 🚀 Deploy to Railway (Step-by-Step)

### Prerequisites
- [Railway account](https://railway.app) (free tier works)
- [Git](https://git-scm.com) installed
- [GitHub account](https://github.com)

### Step 1: Push to GitHub

```bash
cd taskflow
git init
git add .
git commit -m "Initial commit: TaskFlow Team Task Manager"
# Create a repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/taskflow.git
git push -u origin main
```

### Step 2: Deploy on Railway

1. Go to [railway.app](https://railway.app) → **New Project**
2. Select **Deploy from GitHub repo**
3. Connect your GitHub account and select `taskflow`
4. Railway auto-detects the config from `railway.toml` and `nixpacks.toml`

### Step 3: Add Environment Variables

In Railway dashboard → your service → **Variables**, add:

```
NODE_ENV=production
JWT_SECRET=<generate a 64-char random string>
PORT=5000
```

To generate a JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Step 4: Add a Volume (Persistent DB)

1. Railway dashboard → **Add Service** → **Volume**
2. Mount path: `/data`
3. Set `DB_PATH=/data/taskflow.db` in Variables

> Without a volume, the SQLite DB resets on each deploy. The volume persists data.

### Step 5: Get Your URL

Railway gives you a public URL like `https://taskflow-production-xxxx.up.railway.app`

That's it! Your app is live. 🎉

---

## 💻 Local Development

```bash
# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Start backend (port 5000)
cd backend && npm run dev

# Start frontend (port 5173) — in a new terminal
cd frontend && npm run dev
```

Visit `http://localhost:5173`

---

## 👤 Role Permissions

| Action | Member | Project Admin | Global Admin |
|--------|--------|---------------|--------------|
| Create project | ✅ | ✅ | ✅ |
| View own projects | ✅ | ✅ | ✅ |
| View all projects | ❌ | ❌ | ✅ |
| Edit project | ❌ | ✅ | ✅ |
| Delete project | ❌ | ✅ | ✅ |
| Add/remove members | ❌ | ✅ | ✅ |
| Create task | ✅ | ✅ | ✅ |
| Edit own task | ✅ | ✅ | ✅ |
| Edit any task | ❌ | ✅ | ✅ |
| Delete task | ❌ | ✅ | ✅ |

---

## 📝 Notes

- SQLite is used for simplicity and Railway compatibility. For production scale, swap for PostgreSQL using Railway's Postgres plugin (update `database.js` to use `pg`).
- JWT tokens expire in 7 days.
- Avatars are auto-generated using DiceBear initials API.
