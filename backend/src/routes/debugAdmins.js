const express = require("express");
const { pool } = require("../db");
const router = express.Router();

router.get("/debug/admins", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, username FROM admins ORDER BY id"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
