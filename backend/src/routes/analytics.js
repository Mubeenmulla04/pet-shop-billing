const express = require('express');
const { pool } = require('../db');

const router = express.Router();

// Get today's collections
router.get('/today', async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        COALESCE(SUM(total), 0) as total_amount,
        COUNT(*) as total_bills,
        COALESCE(SUM(CASE WHEN payment_mode = 'cash' THEN total ELSE 0 END), 0) as cash_amount,
        COALESCE(SUM(CASE WHEN payment_mode = 'online' THEN total ELSE 0 END), 0) as online_amount
      FROM bills
      WHERE DATE(created_at) = CURRENT_DATE`
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Failed to fetch today collections', error);
    res.status(500).json({ error: 'Failed to fetch today collections' });
  }
});

// Get monthly collections
router.get('/monthly', async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        COALESCE(SUM(total), 0) as total_amount,
        COUNT(*) as total_bills,
        COALESCE(SUM(CASE WHEN payment_mode = 'cash' THEN total ELSE 0 END), 0) as cash_amount,
        COALESCE(SUM(CASE WHEN payment_mode = 'online' THEN total ELSE 0 END), 0) as online_amount
      FROM bills
      WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)`
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Failed to fetch monthly collections', error);
    res.status(500).json({ error: 'Failed to fetch monthly collections' });
  }
});

// Get best selling products
router.get('/best-selling', async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        p.id,
        p.name,
        p.image_url,
        p.price,
        COALESCE(SUM(bi.quantity), 0) as total_quantity,
        COALESCE(SUM(bi.quantity * bi.price), 0) as total_revenue,
        COUNT(DISTINCT bi.bill_id) as times_sold
      FROM products p
      LEFT JOIN bill_items bi ON bi.product_id = p.id
      GROUP BY p.id, p.name, p.image_url, p.price
      HAVING COALESCE(SUM(bi.quantity), 0) > 0
      ORDER BY total_quantity DESC
      LIMIT 10`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Failed to fetch best selling products', error);
    res.status(500).json({ error: 'Failed to fetch best selling products' });
  }
});

module.exports = router;
