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


**Course:** CS220 — Database Systems

<img width="1854" height="907" alt="image" src="https://github.com/user-attachments/assets/32a409f5-cb56-46c8-b61f-b4d3b2fb415a" />
<img width="2624" height="1266" alt="image" src="https://github.com/user-attachments/assets/0bf70718-380a-431a-943d-5c8eb33b98c2" />
<img width="2698" height="1299" alt="image" src="https://github.com/user-attachments/assets/1937ae63-6eb0-4564-9c94-0be61e38bbcd" />
<img width="2690" height="1305" alt="image" src="https://github.com/user-attachments/assets/19cd3cd7-9dc2-4267-9029-fff2c0590f69" />
<img width="2662" height="1275" alt="image" src="https://github.com/user-attachments/assets/c2297c07-9d92-4f73-8702-eb16ffdae8b4" />
<img width="2662" height="1298" alt="image" src="https://github.com/user-attachments/assets/49f846d7-31f5-4811-b2a2-d9305237a2d3" />
<img width="2889" height="1376" alt="image" src="https://github.com/user-attachments/assets/3ce5de7b-7008-4e15-b200-0c8df8f94879" />
<img width="2879" height="1350" alt="image" src="https://github.com/user-attachments/assets/ef9412ff-d178-43f9-8b73-20ee59cb56bc" />
<img width="2870" height="1399" alt="image" src="https://github.com/user-attachments/assets/686094da-8449-4d1a-94eb-c8dbf72491a2" />
<img width="2834" height="1310" alt="image" src="https://github.com/user-attachments/assets/9940a678-0afb-46a5-a343-3547900a05a6" />
<img width="2868" height="1311" alt="image" src="https://github.com/user-attachments/assets/9220fe86-afbf-4634-a0be-af382d2e281e" />
<img width="2824" height="1305" alt="image" src="https://github.com/user-attachments/assets/4ba22765-2dca-4692-93a7-e93dd9ca0345" />











