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
</p>

<p align="center">
  ⭐ If you like this project, consider giving it a star.
</p>

<br/>

## Project Overview

Dropline API is the backend for [Dropline Mobile](https://github.com/yigitesmen/dropline-mobile), a real-time messaging app built with Flutter. It serves REST endpoints for standard operations and will push real-time updates over Socket.IO.

## Status

This project is just getting started. Implemented so far:

- Express app scaffold with a `/health` endpoint
- TypeScript build (`tsc`) and dev workflow (`tsx` with hot reload)
- Environment config via `.env`

### Roadmap

- [ ] MySQL + Prisma ORM
- [ ] Authentication (JWT, bcrypt password hashing)
- [ ] Request validation (Zod)
- [ ] Chats, messages, and contacts REST endpoints
- [ ] Real-time updates over Socket.IO

## Tech Stack

<table>
<tr>
<td width="50%" valign="top">

**Backend**
- Node.js + Express
- TypeScript
- MySQL (planned)
- Prisma (ORM, planned)
- Socket.IO (real-time messaging, planned)
- JWT (authentication, planned)
- bcrypt (password hashing, planned)
- Zod (schema validation, planned)

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

**Prerequisites:** Node.js 20+

```bash
# Clone repository
git clone https://github.com/yigitesmen/dropline-api.git
cd dropline-api

# Install dependencies
npm install

# Configure environment
cp .env.example .env

# Run the dev server
npm run dev
```

The server starts on the port set in `.env` (defaults to `3000`). Check it's up:

```bash
curl http://localhost:3000/health
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Run the dev server with hot reload (tsx) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled server from `dist/` |

## Project Structure

```
src/
  app.ts     # Express app + routes
  server.ts  # Entry point, starts the HTTP server
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
