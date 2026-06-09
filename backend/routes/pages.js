// all the EJS page routes live here

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const { sign } = require('../middleware/auth');
const { fetchBooks, normalizeBook, insertBook } = require('../../database/seeds');

// ─────────────────────────────────────────────
// HOMEPAGE
// ─────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const [recentBooks] = await db.execute(`
      SELECT Book_ID, Title, Cover_URL
      FROM Book
      ORDER BY Book_ID DESC
      LIMIT 10
    `);

    const bookIds = recentBooks.map(b => b.Book_ID);
    let authorMap = {};
    if (bookIds.length > 0) {
      const placeholders = bookIds.map(() => '?').join(',');
      const [authorRows] = await db.execute(
        `SELECT ba.Book_ID, a.Name
         FROM Book_Author ba
         JOIN Author a ON ba.Author_ID = a.Author_ID
         WHERE ba.Book_ID IN (${placeholders})`,
        bookIds
      );
      for (const row of authorRows) {
        if (!authorMap[row.Book_ID]) authorMap[row.Book_ID] = [];
        authorMap[row.Book_ID].push(row.Name);
      }
    }

    const recent = recentBooks.map(b => ({
      id: b.Book_ID,
      title: b.Title,
      coverUrl: b.Cover_URL,
      authors: authorMap[b.Book_ID] || []
    }));

    const [reviewRows] = await db.execute(`
      SELECT r.Review_ID, r.Rating, r.Text, r.Created_On,
             u.User_ID, u.Name AS UserName,
             b.Book_ID, b.Title AS BookTitle
      FROM Review r
      JOIN User u ON r.User_ID = u.User_ID
      JOIN Book b ON r.Book_ID = b.Book_ID
      ORDER BY r.Created_On DESC
      LIMIT 5
    `);

    res.render('index', { recent, reviews: reviewRows });
  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong');
  }
});

// ─────────────────────────────────────────────
// AUTH (register, login, logout)
// ─────────────────────────────────────────────
router.get('/register', (req, res) => {
  res.render('register');
});

router.post('/register', async (req, res) => {
  const { name, email, password, dob } = req.body;
  try {
    const hash = await bcrypt.hash(password, 10);
    const [result] = await db.execute(
      'INSERT INTO User (Name, Email, PasswordHash, DOB) VALUES (?, ?, ?, ?)',
      [name, email, hash, dob || null]
    );
    const token = sign({ id: result.insertId, name });
    res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.redirect('/');
  } catch (err) {
    console.error('REGISTER ERROR:', err);
    let error = 'Something went wrong';
    if (err.code === 'ER_DUP_ENTRY') error = 'Email already registered';
    res.render('register', { error, name, email });
  }
});

router.get('/login', (req, res) => {
  res.render('login');
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const [rows] = await db.execute(
      'SELECT User_ID, Name, PasswordHash FROM User WHERE Email = ?',
      [email]
    );
    if (rows.length === 0) {
      return res.render('login', { error: 'Invalid email or password' });
    }
    const user = rows[0];
    const match = await bcrypt.compare(password, user.PasswordHash);
    if (!match) {
      return res.render('login', { error: 'Invalid email or password' });
    }
    const token = sign({ id: user.User_ID, name: user.Name });
    res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.redirect('/');
  } catch (err) {
    console.error('LOGIN ERROR:', err);
    res.render('login', { error: 'Something went wrong' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/');
});

// ─────────────────────────────────────────────
// SEARCH
// ─────────────────────────────────────────────
router.get('/search', async (req, res) => {
  const q = (req.query.q || '').trim();

  if (!q) {
    return res.render('search', { query: '', results: [], lazyFetched: false });
  }

  try {
    let [localBooks] = await db.execute(`
      SELECT DISTINCT b.Book_ID, b.Title, b.Cover_URL
      FROM Book b
      LEFT JOIN Book_Author ba ON ba.Book_ID = b.Book_ID
      LEFT JOIN Author a ON a.Author_ID = ba.Author_ID
      WHERE b.Title LIKE ? OR a.Name LIKE ?
      LIMIT 20`,
      [`%${q}%`, `%${q}%`]
    );

    let lazyFetched = false;

    if (localBooks.length < 5) {
      lazyFetched = true;
      try {
        const items = await fetchBooks(q);
        const conn = await db.getConnection();
        try {
          for (const item of items) {
            await insertBook(conn, normalizeBook(item));
          }
        } finally {
          conn.release();
        }

        const [refreshed] = await db.execute(`
          SELECT DISTINCT b.Book_ID, b.Title, b.Cover_URL
          FROM Book b
          LEFT JOIN Book_Author ba ON ba.Book_ID = b.Book_ID
          LEFT JOIN Author a ON a.Author_ID = ba.Author_ID
          WHERE b.Title LIKE ? OR a.Name LIKE ?
          LIMIT 20`,
          [`%${q}%`, `%${q}%`]
        );
        localBooks = refreshed;
      } catch (apiErr) {
        console.error('API fetch failed:', apiErr.message);
      }
    }

    const bookIds = localBooks.map(b => b.Book_ID);
    let authorMap = {};
    if (bookIds.length > 0) {
      const placeholders = bookIds.map(() => '?').join(',');
      const [authorRows] = await db.execute(
        `SELECT ba.Book_ID, a.Name FROM Book_Author ba
         JOIN Author a ON ba.Author_ID = a.Author_ID
         WHERE ba.Book_ID IN (${placeholders})`,
        bookIds
      );
      for (const row of authorRows) {
        if (!authorMap[row.Book_ID]) authorMap[row.Book_ID] = [];
        authorMap[row.Book_ID].push(row.Name);
      }
    }

    const results = localBooks.map(b => ({
      id: b.Book_ID,
      title: b.Title,
      coverUrl: b.Cover_URL,
      authors: authorMap[b.Book_ID] || []
    }));

    res.render('search', { query: q, results, lazyFetched });
  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong');
  }
});

// ─────────────────────────────────────────────
// BOOK DETAIL
// ─────────────────────────────────────────────
router.get('/book/:id', async (req, res) => {
  const bookId = req.params.id;

  try {
    const [bookRows] = await db.execute(
      'SELECT Book_ID, Title, Synopsis, Year, Language, Cover_URL FROM Book WHERE Book_ID = ?',
      [bookId]
    );
    if (bookRows.length === 0) {
      return res.status(404).send('Book not found');
    }

    const [authorRows] = await db.execute(`
      SELECT a.Name FROM Author a
      JOIN Book_Author ba ON ba.Author_ID = a.Author_ID
      WHERE ba.Book_ID = ?`,
      [bookId]
    );

    const [genreRows] = await db.execute(`
      SELECT g.Name FROM Genre g
      JOIN Book_Genre bg ON bg.Genre_ID = g.Genre_ID
      WHERE bg.Book_ID = ?`,
      [bookId]
    );

    const [reviewRows] = await db.execute(`
      SELECT r.Review_ID, r.Rating, r.Text, r.Created_On,
             u.User_ID, u.Name AS UserName
      FROM Review r
      JOIN User u ON r.User_ID = u.User_ID
      WHERE r.Book_ID = ?
      ORDER BY r.Created_On DESC`,
      [bookId]
    );

    const [[avg]] = await db.execute(
      'SELECT AVG(Rating) AS avg_rating, COUNT(*) AS rating_count FROM Review WHERE Book_ID = ?',
      [bookId]
    );

    let myLists = [];
    let myShelfStatus = null;
    if (req.user) {
      const [listRows] = await db.execute(
        'SELECT List_ID, List_Name FROM List WHERE User_ID = ? ORDER BY Created_At DESC',
        [req.user.id]
      );
      myLists = listRows;

      const [statusRows] = await db.execute(
        'SELECT Status FROM Reading_Log WHERE User_ID = ? AND Book_ID = ?',
        [req.user.id, bookId]
      );
      if (statusRows.length > 0) myShelfStatus = statusRows[0].Status;
    }

    const book = {
      id: bookRows[0].Book_ID,
      title: bookRows[0].Title,
      synopsis: bookRows[0].Synopsis,
      year: bookRows[0].Year,
      language: bookRows[0].Language,
      coverUrl: bookRows[0].Cover_URL,
      authors: authorRows.map(r => r.Name),
      genres: genreRows.map(r => r.Name),
      avgRating: avg.avg_rating ? Number(avg.avg_rating).toFixed(1) : null,
      ratingCount: avg.rating_count
    };

    res.render('book', { book, reviews: reviewRows, myLists, myShelfStatus });
  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong');
  }
});

router.post('/book/:id/review', async (req, res) => {
  if (!req.user) return res.redirect('/login');

  const bookId = req.params.id;
  const { rating, text } = req.body;

  try {
    await db.execute(
      `INSERT INTO Review (User_ID, Book_ID, Rating, Text)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE Rating = VALUES(Rating), Text = VALUES(Text)`,
      [req.user.id, bookId, rating, text || null]
    );

    // notify friends about the new review
    const [friends] = await db.execute(`
      SELECT
        CASE WHEN User_ID_1 = ? THEN User_ID_2 ELSE User_ID_1 END AS friend_id
      FROM Friendship
      WHERE Status = 'accepted'
        AND (User_ID_1 = ? OR User_ID_2 = ?)`,
      [req.user.id, req.user.id, req.user.id]
    );

    const [bookInfo] = await db.execute('SELECT Title FROM Book WHERE Book_ID = ?', [bookId]);
    const bookTitle = bookInfo[0]?.Title || 'a book';

    for (const f of friends) {
      await db.execute(
        'INSERT INTO Notification (User_ID, NotificationType, Message, ReferenceID) VALUES (?, ?, ?, ?)',
        [f.friend_id, 'review', `${req.user.name} reviewed ${bookTitle}`, bookId]
      );
    }

    res.redirect('/book/' + bookId);
  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong');
  }
});

router.post('/book/:id/review/delete', async (req, res) => {
  if (!req.user) return res.redirect('/login');
  try {
    await db.execute(
      'DELETE FROM Review WHERE User_ID = ? AND Book_ID = ?',
      [req.user.id, req.params.id]
    );
    res.redirect('/book/' + req.params.id);
  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong');
  }
});

router.post('/book/:id/add-to-list', async (req, res) => {
  if (!req.user) return res.redirect('/login');

  const { listId } = req.body;
  const bookId = req.params.id;

  try {
    const [check] = await db.execute(
      'SELECT List_ID FROM List WHERE List_ID = ? AND User_ID = ?',
      [listId, req.user.id]
    );
    if (check.length === 0) return res.redirect('/book/' + bookId);

    await db.execute(
      'INSERT IGNORE INTO List_Entry (List_ID, Book_ID) VALUES (?, ?)',
      [listId, bookId]
    );
    res.redirect('/book/' + bookId);
  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong');
  }
});

router.post('/book/:id/shelf', async (req, res) => {
  if (!req.user) return res.redirect('/login');

  const { status } = req.body;
  const bookId = req.params.id;
  const validStatuses = ['want_to_read', 'currently_reading', 'read'];

  try {
    if (status === 'remove') {
      await db.execute(
        'DELETE FROM Reading_Log WHERE User_ID = ? AND Book_ID = ?',
        [req.user.id, bookId]
      );
    } else if (validStatuses.includes(status)) {
      await db.execute(
        `INSERT INTO Reading_Log (User_ID, Book_ID, Status)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE Status = VALUES(Status)`,
        [req.user.id, bookId, status]
      );
    }
    res.redirect('/book/' + bookId);
  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong');
  }
});

// ─────────────────────────────────────────────
// LISTS
// ─────────────────────────────────────────────
router.get('/lists', async (req, res) => {
  if (!req.user) return res.redirect('/login');
  try {
    const [lists] = await db.execute(`
      SELECT l.List_ID, l.List_Name, l.Description, l.Created_At,
             COUNT(le.ListEntryID) AS book_count
      FROM List l
      LEFT JOIN List_Entry le ON le.List_ID = l.List_ID
      WHERE l.User_ID = ?
      GROUP BY l.List_ID
      ORDER BY l.Created_At DESC`,
      [req.user.id]
    );
    res.render('lists', { lists });
  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong');
  }
});

router.post('/lists', async (req, res) => {
  if (!req.user) return res.redirect('/login');
  const { name, description } = req.body;
  try {
    await db.execute(
      'INSERT INTO List (User_ID, List_Name, Description) VALUES (?, ?, ?)',
      [req.user.id, name, description || null]
    );
    res.redirect('/lists');
  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong');
  }
});

router.post('/lists/:id/delete', async (req, res) => {
  if (!req.user) return res.redirect('/login');
  try {
    await db.execute(
      'DELETE FROM List WHERE List_ID = ? AND User_ID = ?',
      [req.params.id, req.user.id]
    );
    res.redirect('/lists');
  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong');
  }
});

router.get('/list/:id', async (req, res) => {
  const listId = req.params.id;
  try {
    const [listRows] = await db.execute(`
      SELECT l.List_ID, l.List_Name, l.Description, l.Created_At,
             u.User_ID, u.Name AS OwnerName
      FROM List l
      JOIN User u ON l.User_ID = u.User_ID
      WHERE l.List_ID = ?`,
      [listId]
    );
    if (listRows.length === 0) return res.status(404).send('List not found');

    const [bookRows] = await db.execute(`
      SELECT b.Book_ID, b.Title, b.Cover_URL
      FROM List_Entry le
      JOIN Book b ON le.Book_ID = b.Book_ID
      WHERE le.List_ID = ?
      ORDER BY le.DateAdded DESC`,
      [listId]
    );

    const bookIds = bookRows.map(b => b.Book_ID);
    let authorMap = {};
    if (bookIds.length > 0) {
      const placeholders = bookIds.map(() => '?').join(',');
      const [authorRows] = await db.execute(
        `SELECT ba.Book_ID, a.Name FROM Book_Author ba
         JOIN Author a ON ba.Author_ID = a.Author_ID
         WHERE ba.Book_ID IN (${placeholders})`,
        bookIds
      );
      for (const row of authorRows) {
        if (!authorMap[row.Book_ID]) authorMap[row.Book_ID] = [];
        authorMap[row.Book_ID].push(row.Name);
      }
    }

    const books = bookRows.map(b => ({
      id: b.Book_ID,
      title: b.Title,
      coverUrl: b.Cover_URL,
      authors: authorMap[b.Book_ID] || []
    }));

    const list = {
      id: listRows[0].List_ID,
      name: listRows[0].List_Name,
      description: listRows[0].Description,
      ownerId: listRows[0].User_ID,
      ownerName: listRows[0].OwnerName
    };

    res.render('list', { list, books });
  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong');
  }
});

router.post('/list/:id/remove/:bookId', async (req, res) => {
  if (!req.user) return res.redirect('/login');
  try {
    await db.execute(`
      DELETE le FROM List_Entry le
      JOIN List l ON le.List_ID = l.List_ID
      WHERE le.List_ID = ? AND le.Book_ID = ? AND l.User_ID = ?`,
      [req.params.id, req.params.bookId, req.user.id]
    );
    res.redirect('/list/' + req.params.id);
  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong');
  }
});

// ─────────────────────────────────────────────
// SHELVES (Reading_Log)
// ─────────────────────────────────────────────
router.get('/shelves', async (req, res) => {
  if (!req.user) return res.redirect('/login');
  try {
    const [rows] = await db.execute(`
      SELECT rl.Status, b.Book_ID, b.Title, b.Cover_URL
      FROM Reading_Log rl
      JOIN Book b ON rl.Book_ID = b.Book_ID
      WHERE rl.User_ID = ?
      ORDER BY rl.Log_ID DESC`,
      [req.user.id]
    );

    const bookIds = rows.map(r => r.Book_ID);
    let authorMap = {};
    if (bookIds.length > 0) {
      const placeholders = bookIds.map(() => '?').join(',');
      const [authorRows] = await db.execute(
        `SELECT ba.Book_ID, a.Name FROM Book_Author ba
         JOIN Author a ON ba.Author_ID = a.Author_ID
         WHERE ba.Book_ID IN (${placeholders})`,
        bookIds
      );
      for (const row of authorRows) {
        if (!authorMap[row.Book_ID]) authorMap[row.Book_ID] = [];
        authorMap[row.Book_ID].push(row.Name);
      }
    }

    const shelves = { want_to_read: [], currently_reading: [], read: [] };
    for (const r of rows) {
      shelves[r.Status].push({
        id: r.Book_ID,
        title: r.Title,
        coverUrl: r.Cover_URL,
        authors: authorMap[r.Book_ID] || []
      });
    }

    res.render('shelves', { shelves });
  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong');
  }
});

// ─────────────────────────────────────────────
// FRIENDS
// ─────────────────────────────────────────────
router.get('/friends', async (req, res) => {
  if (!req.user) return res.redirect('/login');

  const me = req.user.id;
  const q = (req.query.q || '').trim();

  try {
    const [incoming] = await db.execute(`
      SELECT u.User_ID, u.Name FROM Friendship f
      JOIN User u ON u.User_ID = f.User_ID_1
      WHERE f.User_ID_2 = ? AND f.Status = 'pending'`,
      [me]
    );

    const [outgoing] = await db.execute(`
      SELECT u.User_ID, u.Name FROM Friendship f
      JOIN User u ON u.User_ID = f.User_ID_2
      WHERE f.User_ID_1 = ? AND f.Status = 'pending'`,
      [me]
    );

    const [friends] = await db.execute(`
      SELECT u.User_ID, u.Name FROM User u
      JOIN Friendship f ON
        (f.User_ID_1 = ? AND f.User_ID_2 = u.User_ID)
        OR (f.User_ID_2 = ? AND f.User_ID_1 = u.User_ID)
      WHERE f.Status = 'accepted'`,
      [me, me]
    );

    let searchResults = [];
    if (q) {
      const [rows] = await db.execute(`
        SELECT User_ID, Name FROM User
        WHERE Name LIKE ? AND User_ID != ?
        LIMIT 20`,
        [`%${q}%`, me]
      );
      searchResults = rows;
    }

    res.render('friends', { query: q, searchResults, incoming, outgoing, friends });
  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong');
  }
});

router.post('/friends/:id', async (req, res) => {
  if (!req.user) return res.redirect('/login');
  const targetId = parseInt(req.params.id);
  if (targetId === req.user.id) return res.redirect('/friends');

  try {
    await db.execute(
      'INSERT IGNORE INTO Friendship (User_ID_1, User_ID_2, Status) VALUES (?, ?, ?)',
      [req.user.id, targetId, 'pending']
    );
    await db.execute(
      'INSERT INTO Notification (User_ID, NotificationType, Message, ReferenceID) VALUES (?, ?, ?, ?)',
      [targetId, 'friend_request', `${req.user.name} sent you a friend request`, String(req.user.id)]
    );
    res.redirect('/friends');
  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong');
  }
});

router.post('/friends/:id/accept', async (req, res) => {
  if (!req.user) return res.redirect('/login');
  const requesterId = parseInt(req.params.id);

  try {
    await db.execute(
      `UPDATE Friendship SET Status = 'accepted'
       WHERE User_ID_1 = ? AND User_ID_2 = ? AND Status = 'pending'`,
      [requesterId, req.user.id]
    );
    await db.execute(
      'INSERT INTO Notification (User_ID, NotificationType, Message, ReferenceID) VALUES (?, ?, ?, ?)',
      [requesterId, 'friend_accepted', `${req.user.name} accepted your friend request`, String(req.user.id)]
    );
    res.redirect('/friends');
  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong');
  }
});

router.post('/friends/:id/delete', async (req, res) => {
  if (!req.user) return res.redirect('/login');
  const otherId = parseInt(req.params.id);

  try {
    await db.execute(
      `DELETE FROM Friendship
       WHERE (User_ID_1 = ? AND User_ID_2 = ?)
          OR (User_ID_1 = ? AND User_ID_2 = ?)`,
      [req.user.id, otherId, otherId, req.user.id]
    );
    res.redirect('/friends');
  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong');
  }
});

// ─────────────────────────────────────────────
// PROFILE
// ─────────────────────────────────────────────
// /profile/edit MUST come before /profile/:id
router.get('/profile/edit', (req, res) => {
  if (!req.user) return res.redirect('/login');
  res.render('profile-edit', { name: req.user.name });
});

router.post('/profile/edit', async (req, res) => {
  if (!req.user) return res.redirect('/login');
  const { name } = req.body;
  try {
    await db.execute('UPDATE User SET Name = ? WHERE User_ID = ?', [name, req.user.id]);
const token = sign({ id: req.user.id, name });
res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
res.redirect('/profile/' + req.user.id);
  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong');
  }
});

router.get('/profile/:id', async (req, res) => {
  const targetId = parseInt(req.params.id);
  try {
    const [userRows] = await db.execute(
      'SELECT User_ID, Name, Email, DOB, Registered_At FROM User WHERE User_ID = ?',
      [targetId]
    );
    if (userRows.length === 0) return res.status(404).send('User not found');
    const user = userRows[0];

    const [reviews] = await db.execute(`
      SELECT r.Review_ID, r.Rating, r.Text, r.Created_On,
             b.Book_ID, b.Title AS BookTitle, b.Cover_URL
      FROM Review r
      JOIN Book b ON r.Book_ID = b.Book_ID
      WHERE r.User_ID = ?
      ORDER BY r.Created_On DESC
      LIMIT 6`,
      [targetId]
    );

    const [lists] = await db.execute(`
      SELECT l.List_ID, l.List_Name, l.Description,
             COUNT(le.ListEntryID) AS book_count
      FROM List l
      LEFT JOIN List_Entry le ON le.List_ID = l.List_ID
      WHERE l.User_ID = ?
      GROUP BY l.List_ID
      ORDER BY l.Created_At DESC`,
      [targetId]
    );

    const [[stats]] = await db.execute(`
      SELECT
        (SELECT COUNT(*) FROM Review WHERE User_ID = ?) AS review_count,
        (SELECT COUNT(*) FROM List WHERE User_ID = ?) AS list_count,
        (SELECT COUNT(*) FROM Friendship
         WHERE Status = 'accepted'
           AND (User_ID_1 = ? OR User_ID_2 = ?)) AS friend_count`,
      [targetId, targetId, targetId, targetId]
    );

    let friendStatus = null;
    if (req.user && req.user.id !== targetId) {
      const [rows] = await db.execute(`
        SELECT User_ID_1, User_ID_2, Status FROM Friendship
        WHERE (User_ID_1 = ? AND User_ID_2 = ?)
           OR (User_ID_1 = ? AND User_ID_2 = ?)
        LIMIT 1`,
        [req.user.id, targetId, targetId, req.user.id]
      );
      if (rows.length > 0) {
        const f = rows[0];
        if (f.Status === 'accepted') friendStatus = 'accepted';
        else if (f.User_ID_1 === req.user.id) friendStatus = 'sent';
        else friendStatus = 'received';
      }
    }

    res.render('profile', { user, reviews, lists, stats, friendStatus });
  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong');
  }
});

// ─────────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────────
router.get('/notifications', async (req, res) => {
  if (!req.user) return res.redirect('/login');
  try {
    const [notifications] = await db.execute(`
      SELECT Notification_ID, NotificationType, Message, ReferenceID, Created_At, Is_Read
      FROM Notification
      WHERE User_ID = ?
      ORDER BY Created_At DESC
      LIMIT 50`,
      [req.user.id]
    );

    await db.execute(
      'UPDATE Notification SET Is_Read = TRUE WHERE User_ID = ? AND Is_Read = FALSE',
      [req.user.id]
    );

    res.render('notifications', { notifications });
  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong');
  }
});

module.exports = router;