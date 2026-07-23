const express = require('express');
const crypto = require('crypto');
const db = require('../db');

const router = express.Router();
const USER_ID = 'default_user';

function rowToPayment(row) {
  return { id: row.id, date: row.date, amount: row.amount, method: row.method, notes: row.notes };
}

router.post('/:itemId/payments', (req, res) => {
  const item = db.prepare('SELECT id FROM financial_items WHERE id = ?').get(req.params.itemId);
  if (!item) return res.status(404).json({ error: 'Item not found' });

  const { date, amount, method, notes } = req.body;
  if (!date || amount == null || !method) {
    return res.status(400).json({ error: 'date, amount, and method are required' });
  }

  const id = 'pay_' + crypto.randomUUID();
  db.prepare('INSERT INTO payments (id, item_id, user_id, date, amount, method, notes) VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, req.params.itemId, USER_ID, date, amount, method, notes || null);
  const row = db.prepare('SELECT * FROM payments WHERE id = ?').get(id);
  res.status(201).json(rowToPayment(row));
});

router.post('/:itemId/payments/bulk', (req, res) => {
  const item = db.prepare('SELECT id FROM financial_items WHERE id = ?').get(req.params.itemId);
  if (!item) return res.status(404).json({ error: 'Item not found' });

  const { payments } = req.body;
  if (!payments || !Array.isArray(payments)) return res.status(400).json({ error: 'payments array required' });

  const stmt = db.prepare('INSERT INTO payments (id, item_id, user_id, date, amount, method, notes) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const insertAll = db.transaction((rows) => {
    for (const p of rows) {
      stmt.run('pay_' + crypto.randomUUID(), req.params.itemId, USER_ID, p.date, p.amount, p.method || 'Bulk Record', p.notes || null);
    }
  });
  insertAll(payments);

  const saved = db.prepare('SELECT * FROM payments WHERE item_id = ? ORDER BY date DESC').all(req.params.itemId);
  res.status(201).json(saved.map(rowToPayment));
});

router.put('/:itemId/payments/:paymentId', (req, res) => {
  const existing = db.prepare('SELECT id FROM payments WHERE id = ? AND item_id = ?').get(req.params.paymentId, req.params.itemId);
  if (!existing) return res.status(404).json({ error: 'Payment not found' });

  const { date, amount, method, notes } = req.body;
  db.prepare('UPDATE payments SET date = ?, amount = ?, method = ?, notes = ? WHERE id = ?').run(date, amount, method, notes || null, req.params.paymentId);
  const row = db.prepare('SELECT * FROM payments WHERE id = ?').get(req.params.paymentId);
  res.json(rowToPayment(row));
});

router.delete('/:itemId/payments/:paymentId', (req, res) => {
  const result = db.prepare('DELETE FROM payments WHERE id = ? AND item_id = ?').run(req.params.paymentId, req.params.itemId);
  if (result.changes === 0) return res.status(404).json({ error: 'Payment not found' });
  res.json({ success: true });
});

module.exports = router;
