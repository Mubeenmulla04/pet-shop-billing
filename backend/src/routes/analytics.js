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

// Get detailed daily sales report
router.get('/daily-sales', async (req, res) => {
  try {
    const { date } = req.query;
    
    // Use provided date or default to today
    const targetDate = date ? new Date(date) : new Date();
    
    // Validate date
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
    }
    
    // Format date for SQL query
    const formattedDate = targetDate.toISOString().split('T')[0];
    
    // Get daily sales summary
    const summaryResult = await pool.query(
      `SELECT 
        COALESCE(SUM(total), 0) as total_amount,
        COUNT(*) as total_bills,
        COALESCE(SUM(CASE WHEN payment_mode = 'cash' THEN total ELSE 0 END), 0) as cash_amount,
        COALESCE(SUM(CASE WHEN payment_mode = 'online' THEN total ELSE 0 END), 0) as online_amount
      FROM bills
      WHERE DATE(created_at) = $1`,
      [formattedDate]
    );
    
    // Get products sold on the specified date with quantities
    const productsResult = await pool.query(
      `SELECT 
        p.id,
        p.name,
        SUM(bi.quantity) as quantity_sold,
        SUM(bi.quantity * bi.price) as revenue
      FROM bills b
      JOIN bill_items bi ON b.id = bi.bill_id
      JOIN products p ON bi.product_id = p.id
      WHERE DATE(b.created_at) = $1
      GROUP BY p.id, p.name
      ORDER BY quantity_sold DESC`,
      [formattedDate]
    );
    
    res.json({
      summary: summaryResult.rows[0],
      products: productsResult.rows,
      date: formattedDate
    });
  } catch (error) {
    console.error('Failed to fetch daily sales report', error);
    res.status(500).json({ error: 'Failed to fetch daily sales report' });
  }
});

// Get detailed monthly sales report
router.get('/monthly-sales', async (req, res) => {
  try {
    const { month, year } = req.query;
    
    // Validate month and year parameters
    const targetMonth = month ? parseInt(month) : new Date().getMonth() + 1;
    const targetYear = year ? parseInt(year) : new Date().getFullYear();
    
    if (isNaN(targetMonth) || targetMonth < 1 || targetMonth > 12) {
      return res.status(400).json({ error: 'Invalid month. Must be between 1 and 12.' });
    }
    
    if (isNaN(targetYear) || targetYear < 2000 || targetYear > 2100) {
      return res.status(400).json({ error: 'Invalid year. Must be between 2000 and 2100.' });
    }
    
    // Get monthly sales summary
    const summaryResult = await pool.query(
      `SELECT 
        COALESCE(SUM(total), 0) as total_amount,
        COUNT(*) as total_bills,
        COALESCE(SUM(CASE WHEN payment_mode = 'cash' THEN total ELSE 0 END), 0) as cash_amount,
        COALESCE(SUM(CASE WHEN payment_mode = 'online' THEN total ELSE 0 END), 0) as online_amount
      FROM bills
      WHERE EXTRACT(YEAR FROM created_at) = $1 AND EXTRACT(MONTH FROM created_at) = $2`,
      [targetYear, targetMonth]
    );
    
    // Get products sold in the specified month with quantities
    const productsResult = await pool.query(
      `SELECT 
        p.id,
        p.name,
        SUM(bi.quantity) as quantity_sold,
        SUM(bi.quantity * bi.price) as revenue
      FROM bills b
      JOIN bill_items bi ON b.id = bi.bill_id
      JOIN products p ON bi.product_id = p.id
      WHERE EXTRACT(YEAR FROM b.created_at) = $1 AND EXTRACT(MONTH FROM b.created_at) = $2
      GROUP BY p.id, p.name
      ORDER BY quantity_sold DESC`,
      [targetYear, targetMonth]
    );
    
    res.json({
      summary: summaryResult.rows[0],
      products: productsResult.rows,
      month: targetMonth,
      year: targetYear
    });
  } catch (error) {
    console.error('Failed to fetch monthly sales report', error);
    res.status(500).json({ error: 'Failed to fetch monthly sales report' });
  }
});

module.exports = router;
