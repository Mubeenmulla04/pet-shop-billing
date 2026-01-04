const express = require("express");
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');

router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ error: 'Username and password are required.' });
  }

  try {
    const adminResult = await pool.query(
      'SELECT id, username, password_hash FROM admins WHERE username = $1',
      [username.trim()]
    );

    if (adminResult.rowCount === 0) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const admin = adminResult.rows[0];
    const passwordMatches = await bcrypt.compare(
      password,
      admin.password_hash
    );

    if (!passwordMatches) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('JWT_SECRET is not configured.');
      return res.status(500).json({ error: 'Authentication misconfigured.' });
    }

    const token = jwt.sign(
      { id: admin.id, username: admin.username },
      secret,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      admin: {
        id: admin.id,
        username: admin.username,
      },
    });
  } catch (error) {
    console.error('Failed to authenticate admin', error);
    res.status(500).json({ error: 'Failed to authenticate admin.' });
  }
});

module.exports = router;

