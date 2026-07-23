const express = require('express');
const cors = require('cors');
const path = require('path');
const { migrateOldData, fixupData } = require('./migrate');

const app = express();
const PORT = process.env.PORT || 3000;

migrateOldData();
fixupData();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

app.use('/api/items', require('./routes/items'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/data', require('./routes/data'));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`LoanDash server running on http://localhost:${PORT}`);
});
