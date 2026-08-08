<p align="center">
  <img src="docs/images/icon_circle.png" width="120" alt="Dropline icon" />
</p>

<h1 align="center">Dropline API</h1>

<p align="center">
  Backend for <a href="https://github.com/yigitesmen/dropline-mobile">Dropline</a>, a real-time messaging app.<br/>
  REST for standard operations, Socket.IO for real-time updates.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/status-in%20development-8F00FF?style=for-the-badge" alt="Status" />
  <img src="https://img.shields.io/badge/node.js-Runtime-8F00FF?style=for-the-badge" alt="Node.js" />
  <img src="https://img.shields.io/badge/express-Framework-8F00FF?style=for-the-badge" alt="Express" />
  <img src="https://img.shields.io/badge/typescript-Language-8F00FF?style=for-the-badge" alt="TypeScript" />
  <img src="https://img.shields.io/badge/mysql-Database-8F00FF?style=for-the-badge" alt="MySQL" />
  <img src="https://img.shields.io/badge/prisma-ORM-8F00FF?style=for-the-badge" alt="Prisma" />
</p>

<p align="center">
  ⭐ If you like this project, consider giving it a star.
</p>

<br/>

## Project Overview

Dropline API is the backend for [Dropline Mobile](https://github.com/yigitesmen/dropline-mobile), a real-time messaging app built with Flutter. It serves REST endpoints for standard operations and will push real-time updates over Socket.IO.

## Status

Implemented so far:

- Express app with security middleware (helmet, cors) and request logging (morgan)
- User model in MySQL via Prisma, matching Dropline Mobile's profile fields (first/last name, username, status, photo)
- Signup, login, and password-change endpoints with JWT authentication
- User listing with search, filtering, sorting, pagination, and field selection (`APIFeatures`)
- Sensitive fields (password, email, role, timestamps) excluded from API responses by default
- Profile photo upload (Multer), served through host-agnostic URLs resolved per-request, with the old photo removed on replacement
- Role-based access control, with admin-only routes for managing users
- Request validation with Zod on every mutating route
- Centralized error handling, including Prisma, JWT, and upload error mapping
- Seed script for reproducible dev data (22 sample users with profile photos)

### Roadmap

- [ ] Chats, messages, and contacts REST endpoints
- [ ] Real-time updates over Socket.IO

## Tech Stack

<table>
<tr>
<td width="50%" valign="top">

**Backend**
- Node.js + Express
- TypeScript
- MySQL + Prisma (ORM)
- JWT (authentication)
- bcryptjs (password hashing)
- Zod (schema validation)
- Multer (file uploads)
- Socket.IO (real-time messaging, planned)

</td>
<td width="50%" valign="top">

**Mobile** — [`dropline-mobile`](https://github.com/yigitesmen/dropline-mobile) ↗
- Flutter / Dart
- Go Router (routing)
- Riverpod (state management)
- Socket.IO client (real-time messaging)
- Dio (REST API integration)
- Shared Preferences (local settings persistence)
- Flutter Secure Storage (secure token storage)
- Firebase Cloud Messaging (push notifications)

</td>
</tr>
</table>

## Getting Started

**Prerequisites:** Node.js 20+, a running MySQL server

```bash
# Clone repository
git clone https://github.com/yigitesmen/dropline-api.git
cd dropline-api

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# then edit .env: set DATABASE_URL to your MySQL connection string, and JWT_SECRET

# Apply the database schema
npm run prisma:migrate

# (Optional) Seed the database with sample users and profile photos
npm run dev-data:import

# Run the dev server
npm run dev
```

The server starts on the port set in `.env` (defaults to `3000`). Check it's up:

```bash
curl http://localhost:3000/health
```

### Production

```bash
npm ci
npm run prisma:deploy
npm run build
npm start
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Run the dev server with hot reload (tsx) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled server from `dist/` |
| `npm run prisma:migrate` | Create and apply a new migration (development) |
| `npm run prisma:deploy` | Apply pending migrations (production) |
| `npm run prisma:studio` | Open Prisma Studio to browse the database |
| `npm run dev-data:import` | Wipe and reseed the database and `uploads/profile-images/` with sample users |
| `npm run dev-data:delete` | Delete all users and their profile images |

## Project Structure

```
prisma/
  schema.prisma        # Database schema
dev-data/
  dev.data.ts           # Seed script (npm run dev-data:import / :delete)
  users.json             # Sample user data
  profile-images/        # Sample profile photos, copied into uploads/ on import
src/
  controllers/          # Route handlers
  middleware/            # Express middleware (validation, file uploads, etc.)
  routes/                # Route definitions
  services/              # Business logic (password hashing, etc.)
  validation/             # Zod request schemas
  utils/                  # AppError, catchAsync, StatusCode, APIFeatures
  types/                  # Ambient type declarations (e.g. req.user)
  lib/prisma.ts           # Prisma client instance
  app.ts                  # Express app + middleware
  server.ts               # Entry point, starts the HTTP server
uploads/                # User-uploaded files (created at runtime, gitignored)
  profile-images/       # Profile photos
```

## Mobile Client

Dropline's mobile app is developed independently in its own repository: [dropline-mobile](https://github.com/yigitesmen/dropline-mobile), built with Flutter.

---

<p align="center">
  ⭐ If you enjoy this project, consider giving it a star.
</p>

## Author

**Yigit Esmen**

- GitHub: [@yigitesmen](https://github.com/yigitesmen)
- Portfolio: [yigitesmen.com](https://yigitesmen.com)
