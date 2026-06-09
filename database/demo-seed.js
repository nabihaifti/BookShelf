require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../backend/db');

const bookIds = [
  '9DG3GwHcc3cC', '3QkbAQAAIAAJ', 'ZYQcdGKV9psC', 'H5pyUIY4THYC',
  'RItPAQAAIAAJ', 'czJ-qu4ZisoC', 'D-9NAAAAMAAJ', 'hB9feN_sbx4C',
  'OShhkoZC_9wC', 'ZaBBAAAAQBAJ', 'CWDoCNRjGkAC', 'bWapDAAAQBAJ',
  'fALQDAAAQBAJ', 'WDy2DAAAQBAJ', 'EZSBRfS9t98C', 'zHYO1Fh9_JMC',
  'FD72ekYZqIkC', 'mNL40AEACAAJ', '00rsK2Y98gQC', '0gKBEAAAQBAJ',
  '0olaAAAAMAAJ', '1OwnSZjW-L8C', '3sMB0QEACAAJ', 'A1-oFf4E1tAC',
  'KKjaAQAACAAJ', 'peS7AAAAIAAJ', 'rM3XzgEACAAJ', 'WHhmDwAAQBAJ',
  'zgKBEAAAQBAJ', 'cL2kzwEACAAJ'
];

const users = [
  { name: 'Sara Khan',    email: 'sara@demo.com',    password: 'demo1234' },
  { name: 'Ali Raza',     email: 'ali@demo.com',     password: 'demo1234' },
  { name: 'Maryam Tariq', email: 'maryam@demo.com',  password: 'demo1234' },
  { name: 'Hamza Malik',  email: 'hamza@demo.com',   password: 'demo1234' },
  { name: 'Zara Ahmed',   email: 'zara@demo.com',    password: 'demo1234' },
];

const reviews = [
  'absolutely loved this one, could not put it down.',
  'solid read, though a bit slow in the middle.',
  'one of the best books i have read this year.',
  'interesting concept but the ending felt rushed.',
  'beautifully written, highly recommend.',
  'not my usual genre but i really enjoyed it.',
  'the characters felt very real and relatable.',
  'a bit overrated in my opinion, but still good.',
  'could not stop reading, finished it in one sitting.',
  'thought provoking and deeply moving.',
];

async function main() {
  try {
    console.log('Creating demo users...');
    const userIds = [];
    for (const u of users) {
      const hash = await bcrypt.hash(u.password, 10);
      try {
        const [result] = await db.execute(
          'INSERT INTO User (Name, Email, PasswordHash) VALUES (?, ?, ?)',
          [u.name, u.email, hash]
        );
        userIds.push(result.insertId);
        console.log(`  created: ${u.name} (id ${result.insertId})`);
      } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          const [rows] = await db.execute('SELECT User_ID FROM User WHERE Email = ?', [u.email]);
          userIds.push(rows[0].User_ID);
          console.log(`  already exists: ${u.name}`);
        } else throw err;
      }
    }

    console.log('Adding shelf entries...');
    const statuses = ['want_to_read', 'currently_reading', 'read'];
    for (let i = 0; i < userIds.length; i++) {
      const slice = bookIds.slice(i * 4, i * 4 + 6);
      for (let j = 0; j < slice.length; j++) {
        await db.execute(
          `INSERT IGNORE INTO Reading_Log (User_ID, Book_ID, Status) VALUES (?, ?, ?)`,
          [userIds[i], slice[j], statuses[j % 3]]
        );
      }
    }

    console.log('Adding reviews...');
    let reviewCount = 0;
    for (let i = 0; i < userIds.length; i++) {
      const slice = bookIds.slice(i * 3, i * 3 + 6);
      for (let j = 0; j < slice.length; j++) {
        const rating = (reviewCount % 5) + 1;
        const text = reviews[(reviewCount) % reviews.length];
        await db.execute(
          `INSERT IGNORE INTO Review (User_ID, Book_ID, Rating, Text) VALUES (?, ?, ?, ?)`,
          [userIds[i], slice[j], rating, text]
        );
        reviewCount++;
      }
    }
    console.log(`  inserted ${reviewCount} reviews`);

    console.log('Adding friendships...');
    const pairs = [
      [0, 1, 'accepted'], [0, 2, 'accepted'], [1, 2, 'accepted'],
      [3, 4, 'accepted'], [0, 3, 'pending'],  [1, 4, 'pending'],
    ];
    for (const [a, b, status] of pairs) {
      await db.execute(
        `INSERT IGNORE INTO Friendship (User_ID_1, User_ID_2, Status) VALUES (?, ?, ?)`,
        [userIds[a], userIds[b], status]
      );
    }

    console.log('Done! Demo data inserted.');
    process.exit(0);
  } catch (err) {
    console.error('Demo seed error:', err);
    process.exit(1);
  }
}

main();