const express = require('express');
const { pool } = require('../db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.id,
              b.customer_name,
              b.total,
              b.payment_mode,
              b.created_at,
              json_agg(
                json_build_object(
                  'id', bi.id,
                  'productId', bi.product_id,
                  'quantity', bi.quantity,
                  'price', bi.price,
                  'productName', p.name
                )
              ) AS items
       FROM bills b
       LEFT JOIN bill_items bi ON bi.bill_id = b.id
       LEFT JOIN products p ON p.id = bi.product_id
       GROUP BY b.id
       ORDER BY b.created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Failed to fetch bills', error);
    res.status(500).json({ error: 'Failed to fetch bills' });
  }
});

router.post('/', async (req, res) => {
  let { customerName, items, paymentMode, customTotal } = req.body;

  // Make customer name optional
  if (!customerName || customerName.trim() === '') {
    customerName = 'Anonymous Customer';
  }

  if (!Array.isArray(items) || items.length === 0) {
    return res
      .status(400)
      .json({ error: 'At least one item is required.' });
  }

  const validPaymentModes = ['cash', 'online'];
  const payment_mode = validPaymentModes.includes(paymentMode) ? paymentMode : 'cash';

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const billResult = await client.query(
      'INSERT INTO bills (customer_name, total, payment_mode) VALUES ($1, 0, $2) RETURNING *',
      [customerName.trim(), payment_mode]
    );

    const bill = billResult.rows[0];
    let total = 0;
    const createdItems = [];

    for (const item of items) {
      const { productId, quantity } = item;
      if (!productId || typeof quantity !== 'number' || quantity <= 0) {
        throw new Error('Each item must have a valid productId and quantity.');
      }

      const productResult = await client.query(
        'SELECT id, name, price, stock FROM products WHERE id = $1 FOR UPDATE',
        [productId]
      );

      if (productResult.rowCount === 0) {
        throw new Error('Product not found');
      }

      const product = productResult.rows[0];

      if (product.stock < quantity) {
        throw new Error(
          `Insufficient stock for ${product.name}. Only ${product.stock} left.`
        );
      }

      const lineTotal = product.price * quantity;
      total += lineTotal;

      await client.query('UPDATE products SET stock = stock - $1 WHERE id = $2', [
        quantity,
        product.id,
      ]);

      const billItemResult = await client.query(
        `INSERT INTO bill_items (bill_id, product_id, quantity, price)
         VALUES ($1, $2, $3, $4) RETURNING id, bill_id, product_id, quantity, price`,
        [bill.id, product.id, quantity, product.price]
      );

      createdItems.push({
        ...billItemResult.rows[0],
        productName: product.name,
      });
    }

    await client.query('UPDATE bills SET total = $1 WHERE id = $2', [
      customTotal !== null && customTotal !== undefined ? customTotal : total,
      bill.id,
    ]);
    await client.query('COMMIT');

    res.status(201).json({
      bill: { ...bill, total: customTotal !== null && customTotal !== undefined ? customTotal : total },
      items: createdItems,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Failed to create bill', error);
    res.status(400).json({ error: error.message || 'Failed to create bill' });
  } finally {
    client.release();
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Delete bill items first
    await client.query('DELETE FROM bill_items WHERE bill_id = $1', [id]);

    // Delete the bill
    const result = await client.query(
      'DELETE FROM bills WHERE id = $1 RETURNING id, customer_name, total',
      [id]
    );

    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Bill not found' });
    }

    await client.query('COMMIT');
    res.json({ message: 'Bill deleted successfully', bill: result.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Failed to delete bill', error);
    res.status(500).json({ error: 'Failed to delete bill' });
  } finally {
    client.release();
  }
});

module.exports = router;

