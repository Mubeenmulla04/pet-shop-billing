const express = require("express");
const { pool } = require("../db");
const router = express.Router();

router.get("/reset-admin-password", async (req, res) => {
  try {
    const username = "admin";
    const hash =
      "$2a$10$gWm4K9Rk1Uo7R3A6m0HqUOFq0iVph5GZkq7gQvYFq0Xl7H2u4O3nS"; // password: admin123

    await pool.query(
      `
      UPDATE admins
      SET password_hash = $1
      WHERE username = $2
    `,
      [hash, username]
    );

    res.json({
      ok: true,
      username,
      password: "admin123",
      message: "Password reset successfully",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
