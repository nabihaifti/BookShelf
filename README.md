# 📚 BookApp

A book social app built as a Database Systems semester project 

Users can search books, track their reading, write reviews, create custom lists, and connect with friends.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | EJS templates + plain CSS + vanilla JS |
| Backend | Node.js + Express |
| Database | MySQL 8+ |
| Auth | JWT (HttpOnly cookies) + bcryptjs |
| External API | Google Books API |
| DB Driver | mysql2/promise (connection pool) |

---

## Features

- 🔍 **Search** — search by title or author; lazy-fetches from Google Books API if not in DB
- 📖 **Shelves** — track books as *want to read*, *currently reading*, or *read*
- ⭐ **Reviews** — write and rate books (1–5 stars); friends get notified
- 📋 **Lists** — create custom book lists and add any book to them
- 👥 **Friends** — send/accept/decline friend requests
- 🔔 **Notifications** — real-time badge for friend requests, acceptances, and reviews
- 👤 **Profiles** — view stats, recent reviews, and lists for any user

---

## Database Design Highlights

- Normalized schema — 11 tables, no redundancy
- Many-to-many relationships via junction tables (`Book_Author`, `Book_Genre`, `List_Entry`)
- Self-referencing table (`Friendship`) with composite primary key and CHECK constraint
- ENUM columns for controlled values (`Status`, `NotificationType`)
- Computed averages on the fly with `AVG(Rating)` — no denormalized columns
- `INSERT ... ON DUPLICATE KEY UPDATE` for idempotent shelf and review updates
- `INSERT IGNORE` for safe re-seeding

---

## Setup Instructions

### Prerequisites

- Node.js 18+
- MySQL Server 8+
- MySQL Workbench
- Git

### 1. Clone the repo

```bash
git clone <repo-url>
cd BookApp
git checkout shayan
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up the database

Open MySQL Workbench, connect to localhost, and run:

```sql
CREATE DATABASE IF NOT EXISTS BookApp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE BookApp;
```

Then open `database/schema.sql` and execute it (File → Open SQL Script → ⚡).

### 4. Create `.env` file

Create a `.env` file in the project root:

```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=BookApp
JWT_SECRET=any_long_random_string
JWT_EXPIRES_IN=7d
PORT=3000
```

### 5. Seed the database

```bash
node database/seeds.js
```

Pulls ~200 books from Google Books API. Takes ~30 seconds.

### 6. (Optional) Load demo data

```bash
node database/demo-seed.js
```

Creates 5 demo accounts with reviews, shelves, and friendships for demo day.

### 7. Start the server

```bash
nodemon backend/app.js
```

Open [http://localhost:3000](http://localhost:3000)

---

## Project Structure

```
BookApp/
├── backend/
│   ├── app.js          ← Express entry point
│   ├── db.js           ← MySQL connection pool
│   ├── middleware/
│   │   └── auth.js     ← JWT helpers
│   └── routes/
│       └── pages.js    ← All routes
├── views/              ← EJS templates
├── frontend/
│   └── css/
│       └── styles.css  ← Matcha + pink palette
├── database/
│   ├── schema.sql      ← DB schema
│   ├── seeds.js        ← Google Books seed
│   └── demo-seed.js    ← Demo data
└── .env                ← Not in git
```

---

## Team

| Name | Role |
|------|------|
| M. Uzair Nadeem | Backend, DB, Frontend |
| Shayan Ahmed Siddiqui | Backend, DB, Frontend |
| Nabiha Iftikhar | Backend, DB, Frontend |

**Course:** CS220 — Database Systems
**Institution:** NUST
**Semester:** Spring 2026
