const express = require('express');
const { pool } = require('../db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get stock update history
router.get('/', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        su.id,
        su.product_id,
        p.name as product_name,
        su.old_stock,
        su.new_stock,
        su.updated_by,
        su.created_at
      FROM stock_updates su
      JOIN products p ON su.product_id = p.id
      ORDER BY su.created_at DESC
      LIMIT 100
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Failed to fetch stock updates', error);
    res.status(500).json({ error: 'Failed to fetch stock updates' });
  }
});

// Get stock update history for a specific product
router.get('/product/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await pool.query(`
      SELECT 
        su.id,
        su.product_id,
        p.name as product_name,
        su.old_stock,
        su.new_stock,
        su.updated_by,
        su.created_at
      FROM stock_updates su
      JOIN products p ON su.product_id = p.id
      WHERE su.product_id = $1
      ORDER BY su.created_at DESC
    `, [id]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Failed to fetch product stock updates', error);
    res.status(500).json({ error: 'Failed to fetch product stock updates' });
  }
});

module.exports = router;