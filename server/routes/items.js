const express = require('express');
const crypto = require('crypto');
const db = require('../db');

const router = express.Router();
const USER_ID = 'default_user';

const ITEM_COLS = [
  'id','user_id','title','description','amount','currency','category','direction',
  'status','due_date','is_archived','is_recurring','recurrence','recurring_payment_amount',
  'recurrence_periods','provider','service_category','end_date','icon','start_date',
  'debt_loan_type','payment_method_type','phone','interest_enabled','interest_rate',
  'enable_reminders','reminder_days','sort_order'
];

function rowToItem(row, payments) {
  return {
    id: row.id, userId: row.user_id, title: row.title, description: row.description || '',
    amount: row.amount, currency: row.currency, category: row.category, direction: row.direction,
    status: row.status, dueDate: row.due_date, paymentHistory: payments || [],
    isArchived: !!row.is_archived, isRecurring: !!row.is_recurring, recurrence: row.recurrence,
    recurringPaymentAmount: row.recurring_payment_amount, recurrencePeriods: row.recurrence_periods,
    provider: row.provider, serviceCategory: row.service_category, endDate: row.end_date,
    icon: row.icon, startDate: row.start_date, debtLoanType: row.debt_loan_type,
    paymentMethodType: row.payment_method_type, phone: row.phone,
    interestEnabled: !!row.interest_enabled, interestRate: row.interest_rate,
    enableReminders: !!row.enable_reminders, reminderDays: row.reminder_days,
  };
}

function itemToRow(item) {
  return {
    id: item.id, user_id: USER_ID, title: item.title, description: item.description || '',
    amount: item.amount, currency: item.currency || 'USD', category: item.category,
    direction: item.direction, status: item.status || 'Unpaid', due_date: item.dueDate,
    is_archived: item.isArchived ? 1 : 0, is_recurring: item.isRecurring ? 1 : 0,
    recurrence: item.recurrence || null, recurring_payment_amount: item.recurringPaymentAmount || null,
    recurrence_periods: item.recurrencePeriods || null, provider: item.provider || null,
    service_category: item.serviceCategory || null, end_date: item.endDate || null,
    icon: item.icon || null, start_date: item.startDate || null, debt_loan_type: item.debtLoanType || null,
    payment_method_type: item.paymentMethodType || null, phone: item.phone || null,
    interest_enabled: item.interestEnabled ? 1 : 0, interest_rate: item.interestRate || null,
    enable_reminders: item.enableReminders ? 1 : 0, reminder_days: item.reminderDays || null,
    sort_order: item.sortOrder || 0,
  };
}

function rowToPayment(row) {
  return { id: row.id, date: row.date, amount: row.amount, method: row.method, notes: row.notes };
}

const UPSERT_ITEM = `
  INSERT INTO financial_items (${ITEM_COLS.join(',')})
  VALUES (${ITEM_COLS.map(c => ':' + c).join(',')})
  ON CONFLICT(id) DO UPDATE SET
    title=excluded.title, description=excluded.description, amount=excluded.amount,
    currency=excluded.currency, category=excluded.category, direction=excluded.direction,
    status=excluded.status, due_date=excluded.due_date, is_archived=excluded.is_archived,
    is_recurring=excluded.is_recurring, recurrence=excluded.recurrence,
    recurring_payment_amount=excluded.recurring_payment_amount,
    recurrence_periods=excluded.recurrence_periods, provider=excluded.provider,
    service_category=excluded.service_category, end_date=excluded.end_date,
    icon=excluded.icon, start_date=excluded.start_date, debt_loan_type=excluded.debt_loan_type,
    payment_method_type=excluded.payment_method_type, phone=excluded.phone,
    interest_enabled=excluded.interest_enabled, interest_rate=excluded.interest_rate,
    enable_reminders=excluded.enable_reminders, reminder_days=excluded.reminder_days,
    sort_order=excluded.sort_order, updated_at=datetime('now')
`;

const SELECT_PAYMENTS = 'SELECT * FROM payments WHERE item_id = ? AND user_id = ? ORDER BY date DESC';

// === ITEMS ===

router.get('/', (req, res) => {
  const items = db.prepare('SELECT * FROM financial_items WHERE user_id = ? ORDER BY sort_order, created_at').all(USER_ID);
  const paymentStmt = db.prepare(SELECT_PAYMENTS);
  const result = items.map(item => rowToItem(item, paymentStmt.all(item.id, USER_ID).map(rowToPayment)));
  res.json(result);
});

router.post('/', (req, res) => {
  const item = req.body;
  const id = item.id || 'fin_' + Date.now();
  const row = itemToRow({ ...item, id });
  db.prepare(UPSERT_ITEM).run(row);
  const saved = db.prepare('SELECT * FROM financial_items WHERE id = ?').get(id);
  res.status(201).json(rowToItem(saved, []));
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM financial_items WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Item not found' });
  const row = itemToRow({ ...req.body, id: req.params.id });
  db.prepare(UPSERT_ITEM).run(row);
  const payments = db.prepare(SELECT_PAYMENTS).all(req.params.id, USER_ID);
  const saved = db.prepare('SELECT * FROM financial_items WHERE id = ?').get(req.params.id);
  res.json(rowToItem(saved, payments.map(rowToPayment)));
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM financial_items WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Item not found' });
  res.json({ success: true });
});

router.put('/reorder', (req, res) => {
  const { orders } = req.body;
  if (!orders || !Array.isArray(orders)) return res.status(400).json({ error: 'orders array required' });
  const stmt = db.prepare('UPDATE financial_items SET sort_order = ? WHERE id = ?');
  const tx = db.transaction(() => { orders.forEach((id, i) => stmt.run(i, id)); });
  tx();
  res.json({ success: true });
});

// === PAYMENTS (nested under items) ===

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
