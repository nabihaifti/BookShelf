// JWT helpers for authentication
// signs tokens when users log in, verifies them on protected routes

const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET;

// create a JWT token for a user (called on login/register)
function sign(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
}

// verify a JWT and return the payload, or null if invalid
function verify(token) {
  try {
    return jwt.verify(token, SECRET);
  } catch {
    return null;
  }
}

// middleware: blocks the request if user is not logged in
function requireAuth(req, res, next) {
  const token = req.cookies?.token;
  const payload = token && verify(token);
  if (!payload) {
    return res.redirect('/login');
  }
  req.user = payload; // make user info available to the route handler
  next();
}

// middleware: sets req.user if logged in, but never blocks
// used app-wide so every page knows who is logged in (or no one)
function maybeAuth(req, res, next) {
  const token = req.cookies?.token;
  const payload = token && verify(token);
  if (payload) req.user = payload;
  next();
}

module.exports = { sign, verify, requireAuth, maybeAuth };