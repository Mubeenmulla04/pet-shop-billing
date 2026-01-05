require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const productsRouter = require('./routes/products');
const billsRouter = require('./routes/bills');
const authRouter = require('./routes/auth');
const analyticsRouter = require('./routes/analytics');
const stockUpdatesRouter = require('./routes/stockUpdates');

const app = express();

app.use(cors());
app.use(express.json());

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../public')));
  
  // Serve index.html for any non-API routes
  app.get(/^(?!\/api\/).*$/, (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
  });
}

// Removed static serving of uploads directory as we're now using direct image URLs

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Register routes
app.use('/api/auth', authRouter);
app.use('/api/products', productsRouter);
app.use('/api/bills', billsRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/stock-updates', stockUpdatesRouter);

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`);
});
if (process.env.NODE_ENV !== 'production') {
  app.use("/api/utils", require("./routes/debugAdmins"));
  app.use("/api/utils", require("./routes/resetAdminPassword"));
}


console.log("DB URL in server:", process.env.DATABASE_URL);
console.log("👉 USING DATABASE:", process.env.DATABASE_URL);
