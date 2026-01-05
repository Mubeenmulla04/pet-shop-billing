const express = require('express');
const { pool } = require('../db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', async (_req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, price, stock, image_url FROM products ORDER BY name ASC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Failed to fetch products', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  const { name, price, stock, image_url } = req.body;

  if (!name || typeof price !== 'number' || typeof stock !== 'number') {
    return res
      .status(400)
      .json({ error: 'Name, price, and stock are required numeric values.' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO products (name, price, stock, image_url) VALUES ($1, $2, $3, $4) RETURNING id, name, price, stock, image_url',
      [name.trim(), price, stock, image_url || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Failed to create product', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

router.patch('/:id/stock', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { stock } = req.body;

  if (typeof stock !== 'number' || stock < 0) {
    return res.status(400).json({ error: 'Stock must be a non-negative number' });
  }

  try {
    // First, get the current stock level
    const currentProduct = await pool.query(
      'SELECT stock FROM products WHERE id = $1',
      [id]
    );

    if (currentProduct.rowCount === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const oldStock = currentProduct.rows[0].stock;

    // Update the product stock
    const result = await pool.query(
      'UPDATE products SET stock = $1 WHERE id = $2 RETURNING id, name, price, stock, image_url',
      [stock, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Log the stock update
    const adminUsername = req.user ? req.user.username : 'admin';
    await pool.query(
      'INSERT INTO stock_updates (product_id, old_stock, new_stock, updated_by) VALUES ($1, $2, $3, $4)',
      [id, oldStock, stock, adminUsername]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Failed to update stock', error);
    res.status(500).json({ error: 'Failed to update stock' });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    // Check if product has been used in any bills
    const billItemsCheck = await pool.query(
      'SELECT COUNT(*) as count FROM bill_items WHERE product_id = $1',
      [id]
    );

    if (parseInt(billItemsCheck.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete product that has been used in bills. This product has sales history.' 
      });
    }

    const result = await pool.query(
      'DELETE FROM products WHERE id = $1 RETURNING id, name, price, stock, image_url',
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check if this was the last product, and reset sequence if needed
    const countResult = await pool.query('SELECT COUNT(*) as count FROM products');
    if (parseInt(countResult.rows[0].count) === 0) {
      await pool.query('ALTER SEQUENCE products_id_seq RESTART WITH 1');
    }

    res.json({
      message: `${result.rows[0].name} removed from inventory.`,
      product: result.rows[0],
    });
  } catch (error) {
    console.error('Failed to delete product', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

module.exports = router;

