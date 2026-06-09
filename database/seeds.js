require('dotenv').config();
const mysql = require('mysql2/promise');

const SEARCH_QUERIES = [
  'subject:fiction', 'subject:fantasy', 'subject:science+fiction',
  'subject:mystery', 'subject:biography', 'subject:history',
  'subject:philosophy', 'subject:young+adult', 'subject:romance',
  'subject:thriller'
];
const BOOKS_PER_QUERY = 20;
const API_BASE = 'https://www.googleapis.com/books/v1/volumes';

async function fetchBooks(query) {
  const params = new URLSearchParams({
    q: query, maxResults: String(BOOKS_PER_QUERY),
    printType: 'books', langRestrict: 'en'
  });
  const res = await fetch(`${API_BASE}?${params}`);
  if (!res.ok) throw new Error(`API error ${res.status}`);
  const data = await res.json();
  return data.items || [];
}

function normalizeBook(item) {
  const v = item.volumeInfo || {};
  const year = v.publishedDate ? parseInt(v.publishedDate.slice(0, 4), 10) : null;
  return {
    book_id: item.id,
    title: v.title || 'Untitled',
    synopsis: v.description || null,
    year: Number.isFinite(year) ? year : null,
    language: v.language || null,
    cover_url: v.imageLinks?.thumbnail?.replace('http://', 'https://') || null,
    authors: Array.isArray(v.authors) ? v.authors : [],
    genres: Array.isArray(v.categories) ? v.categories : []
  };
}

async function upsertAuthor(conn, name) {
  await conn.execute('INSERT IGNORE INTO Author (Name) VALUES (?)', [name]);
  const [rows] = await conn.execute('SELECT Author_ID FROM Author WHERE Name = ?', [name]);
  return rows[0].Author_ID;
}

async function upsertGenre(conn, name) {
  await conn.execute('INSERT IGNORE INTO Genre (Name) VALUES (?)', [name]);
  const [rows] = await conn.execute('SELECT Genre_ID FROM Genre WHERE Name = ?', [name]);
  return rows[0].Genre_ID;
}

async function insertBook(conn, book) {
  const [result] = await conn.execute(
    `INSERT IGNORE INTO Book (Book_ID, Title, Synopsis, Year, Language, Cover_URL)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [book.book_id, book.title, book.synopsis, book.year, book.language, book.cover_url]
  );
  if (result.affectedRows === 0) return false;

  for (const name of book.authors) {
    const id = await upsertAuthor(conn, name);
    await conn.execute('INSERT IGNORE INTO Book_Author (Book_ID, Author_ID) VALUES (?, ?)', [book.book_id, id]);
  }
  for (const name of book.genres) {
    const id = await upsertGenre(conn, name);
    await conn.execute('INSERT IGNORE INTO Book_Genre (Book_ID, Genre_ID) VALUES (?, ?)', [book.book_id, id]);
  }
  return true;
}

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST, user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, database: process.env.DB_NAME
  });

  let inserted = 0, skipped = 0;
  for (const q of SEARCH_QUERIES) {
    try {
      const items = await fetchBooks(q);
      console.log(`  "${q}" -> ${items.length} results`);
      for (const item of items) {
        const wasNew = await insertBook(conn, normalizeBook(item));
        wasNew ? inserted++ : skipped++;
      }
    } catch (err) {
      console.error(`  Error for "${q}":`, err.message);
    }
  }

  console.log(`\nDone. Inserted ${inserted}, skipped ${skipped}.`);
  await conn.end();
}

module.exports = { fetchBooks, normalizeBook, insertBook, upsertAuthor, upsertGenre };

if (require.main === module) {
  main().catch(err => { console.error('Fatal:', err); process.exit(1); });
}