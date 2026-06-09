// Entry point for the BookApp server
// This is the first file that runs when we start the app
require('dotenv').config(); // load .env variables (DB password, JWT secret etc.)

const { maybeAuth } = require('./middleware/auth');
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// set up EJS as our template engine so we can render .ejs files as HTML
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views')); // views folder is one level up

// middleware to parse incoming data
app.use(express.json()); // for JSON request bodies
app.use(express.urlencoded({ extended: true })); // for HTML form submissions
app.use(cookieParser()); // so we can read req.cookies for auth
// figures out who is logged in (or sets nothing if not) for every request
app.use(maybeAuth);

// makes currentUser available to every EJS template automatically
const db = require('./db');
app.use(async (req, res, next) => {
  res.locals.currentUser = req.user || null;
  res.locals.unreadCount = 0;
  if (req.user) {
    try {
      const [[row]] = await db.execute(
        'SELECT COUNT(*) AS n FROM Notification WHERE User_ID = ? AND Is_Read = FALSE',
        [req.user.id]
      );
      res.locals.unreadCount = row.n;
    } catch (err) {
      console.error('Notification count error:', err);
    }
  }
  next();
});
// serve static files (CSS, images) from the frontend folder
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// test route just to check that the server boots correctly
// we will replace this once we add real routes
// page routes (login, register, home, etc)
app.use('/', require('./routes/pages'));
// 404 handler
app.use((req, res) => {
  res.status(404).render('error', { status: '404', message: 'Page not found.', error: 'Not Found' });
});

// 500 handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('error', { status: '500', message: 'Something went wrong on our end.', error: 'Server Error' });
});
// start the server
app.listen(PORT, () => {
  console.log('BookApp running on http://localhost:' + PORT);
});