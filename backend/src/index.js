require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const productsRouter = require('./routes/products');
const billsRouter = require('./routes/bills');
const authRouter = require('./routes/auth');
const analyticsRouter = require('./routes/analytics');
const uploadRouter = require('./routes/upload');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Register routes
app.use('/api/auth', authRouter);
app.use('/api/products', productsRouter);
app.use('/api/bills', billsRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/upload', uploadRouter);

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`);
});