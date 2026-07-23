const express = require('express');
const db = require('../db');

const router = express.Router();
const USER_ID = 'default_user';

router.get('/export', (req, res) => {
  const items = db.prepare('SELECT * FROM financial_items WHERE user_id = ?').all(USER_ID);
  const payments = db.prepare('SELECT * FROM payments WHERE user_id = ?').all(USER_ID);
  const settings = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(USER_ID);

  const paymentsByItem = {};
  for (const p of payments) {
    if (!paymentsByItem[p.item_id]) paymentsByItem[p.item_id] = [];
    paymentsByItem[p.item_id].push({ id: p.id, date: p.date, amount: p.amount, method: p.method, notes: p.notes });
  }

  const financialItems = items.map(item => ({
    id: item.id,
    userId: item.user_id,
    title: item.title,
    description: item.description || '',
    amount: item.amount,
    currency: item.currency,
    category: item.category,
    direction: item.direction,
    status: item.status,
    dueDate: item.due_date,
    paymentHistory: paymentsByItem[item.id] || [],
    isArchived: !!item.is_archived,
    isRecurring: !!item.is_recurring,
    recurrence: item.recurrence,
    recurringPaymentAmount: item.recurring_payment_amount,
    recurrencePeriods: item.recurrence_periods,
    provider: item.provider,
    serviceCategory: item.service_category,
    endDate: item.end_date,
    icon: item.icon,
    startDate: item.start_date,
    debtLoanType: item.debt_loan_type,
    paymentMethodType: item.payment_method_type,
    phone: item.phone,
    interestEnabled: !!item.interest_enabled,
    interestRate: item.interest_rate,
    enableReminders: !!item.enable_reminders,
    reminderDays: item.reminder_days,
  }));

  res.json({
    financialItems,
    settings: settings ? {
      theme: settings.theme,
      currency: settings.currency,
      cardOrders: JSON.parse(settings.card_orders || '{}'),
    } : null,
    exportedAt: new Date().toISOString(),
  });
});

router.post('/import', (req, res) => {
  const { financialItems, settings } = req.body;
  if (!financialItems || !Array.isArray(financialItems)) {
    return res.status(400).json({ error: 'financialItems array required' });
  }

  const deleteItems = db.prepare('DELETE FROM financial_items WHERE user_id = ?');
  const insertItem = db.prepare(`
    INSERT INTO financial_items (id,user_id,title,description,amount,currency,category,direction,status,due_date,is_archived,is_recurring,recurrence,recurring_payment_amount,recurrence_periods,provider,service_category,end_date,icon,start_date,debt_loan_type,payment_method_type,phone,interest_enabled,interest_rate,enable_reminders,reminder_days)
    VALUES (@id,@user_id,@title,@description,@amount,@currency,@category,@direction,@status,@due_date,@is_archived,@is_recurring,@recurrence,@recurring_payment_amount,@recurrence_periods,@provider,@service_category,@end_date,@icon,@start_date,@debt_loan_type,@payment_method_type,@phone,@interest_enabled,@interest_rate,@enable_reminders,@reminder_days)
  `);
  const insertPayment = db.prepare(`
    INSERT INTO payments (id, item_id, user_id, date, amount, method, notes)
    VALUES (@id, @item_id, @user_id, @date, @amount, @method, @notes)
  `);

  const tx = db.transaction(() => {
    deleteItems.run(USER_ID);

    for (const item of financialItems) {
      insertItem.run({
        id: item.id, user_id: USER_ID, title: item.title, description: item.description || '',
        amount: item.amount, currency: item.currency || 'USD', category: item.category,
        direction: item.direction, status: item.status || 'Unpaid', due_date: item.dueDate || null,
        is_archived: item.isArchived ? 1 : 0, is_recurring: item.isRecurring ? 1 : 0,
        recurrence: item.recurrence || null, recurring_payment_amount: item.recurringPaymentAmount || null,
        recurrence_periods: item.recurrencePeriods || null, provider: item.provider || null,
        service_category: item.serviceCategory || null, end_date: item.endDate || null,
        icon: item.icon || null, start_date: item.startDate || null, debt_loan_type: item.debtLoanType || null,
        payment_method_type: item.paymentMethodType || null, phone: item.phone || null,
        interest_enabled: item.interestEnabled ? 1 : 0, interest_rate: item.interestRate || null,
        enable_reminders: item.enableReminders ? 1 : 0, reminder_days: item.reminderDays || null,
      });

      for (const p of (item.paymentHistory || [])) {
        insertPayment.run({
          id: p.id, item_id: item.id, user_id: USER_ID, date: p.date,
          amount: p.amount, method: p.method, notes: p.notes || null,
        });
      }
    }

    if (settings) {
      db.prepare('UPDATE user_settings SET theme = ?, currency = ?, card_orders = ? WHERE user_id = ?')
        .run(settings.theme || 'system', settings.currency || 'USD', JSON.stringify(settings.cardOrders || {}), USER_ID);
    }
  });

  tx();
  res.json({ success: true, count: financialItems.length });
});

router.get('/', (req, res) => {
  const items = db.prepare('SELECT * FROM financial_items WHERE user_id = ?').all(USER_ID);
  const payments = db.prepare('SELECT * FROM payments WHERE user_id = ?').all(USER_ID);
  const settings = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(USER_ID);

  const paymentsByItem = {};
  for (const p of payments) {
    if (!paymentsByItem[p.item_id]) paymentsByItem[p.item_id] = [];
    paymentsByItem[p.item_id].push({ id: p.id, date: p.date, amount: p.amount, method: p.method, notes: p.notes });
  }

  const financialItems = items.map(item => ({
    id: item.id,
    userId: item.user_id,
    title: item.title,
    description: item.description || '',
    amount: item.amount,
    currency: item.currency,
    category: item.category,
    direction: item.direction,
    status: item.status,
    dueDate: item.due_date,
    paymentHistory: paymentsByItem[item.id] || [],
    isArchived: !!item.is_archived,
    isRecurring: !!item.is_recurring,
    recurrence: item.recurrence,
    recurringPaymentAmount: item.recurring_payment_amount,
    recurrencePeriods: item.recurrence_periods,
    provider: item.provider,
    serviceCategory: item.service_category,
    endDate: item.end_date,
    icon: item.icon,
    startDate: item.start_date,
    debtLoanType: item.debt_loan_type,
    paymentMethodType: item.payment_method_type,
    phone: item.phone,
    interestEnabled: !!item.interest_enabled,
    interestRate: item.interest_rate,
    enableReminders: !!item.enable_reminders,
    reminderDays: item.reminder_days,
  }));

  res.json({ financialItems });
});

router.post('/', (req, res) => {
  try {
    const { financialItems, settings } = req.body;
    if (!financialItems || !Array.isArray(financialItems)) {
      return res.status(400).json({ error: 'financialItems array required' });
    }
    const deleteItems = db.prepare('DELETE FROM financial_items WHERE user_id = ?');
    const insertItem = db.prepare(`
      INSERT INTO financial_items (id,user_id,title,description,amount,currency,category,direction,status,due_date,is_archived,is_recurring,recurrence,recurring_payment_amount,recurrence_periods,provider,service_category,end_date,icon,start_date,debt_loan_type,payment_method_type,phone,interest_enabled,interest_rate,enable_reminders,reminder_days,sort_order)
      VALUES (@id,@user_id,@title,@description,@amount,@currency,@category,@direction,@status,@due_date,@is_archived,@is_recurring,@recurrence,@recurring_payment_amount,@recurrence_periods,@provider,@service_category,@end_date,@icon,@start_date,@debt_loan_type,@payment_method_type,@phone,@interest_enabled,@interest_rate,@enable_reminders,@reminder_days,@sort_order)
    `);
    const insertPayment = db.prepare(`
      INSERT INTO payments (id, item_id, user_id, date, amount, method, notes)
      VALUES (@id, @item_id, @user_id, @date, @amount, @method, @notes)
    `);

    const tx = db.transaction(() => {
      deleteItems.run(USER_ID);
      for (const item of financialItems) {
        insertItem.run({
          id: item.id, user_id: USER_ID, title: item.title, description: item.description || '',
          amount: item.amount, currency: item.currency || 'USD', category: item.category,
          direction: item.direction, status: item.status || 'Unpaid', due_date: item.dueDate || null,
          is_archived: item.isArchived ? 1 : 0, is_recurring: item.isRecurring ? 1 : 0,
          recurrence: item.recurrence || null, recurring_payment_amount: item.recurringPaymentAmount || null,
          recurrence_periods: item.recurrencePeriods || null, provider: item.provider || null,
          service_category: item.serviceCategory || null, end_date: item.endDate || null,
          icon: item.icon || null, start_date: item.startDate || null, debt_loan_type: item.debtLoanType || null,
          payment_method_type: item.paymentMethodType || null, phone: item.phone || null,
          interest_enabled: item.interestEnabled ? 1 : 0, interest_rate: item.interestRate || null,
          enable_reminders: item.enableReminders ? 1 : 0, reminder_days: item.reminderDays || null,
          sort_order: 0,
        });
        for (const p of (item.paymentHistory || [])) {
          insertPayment.run({
            id: p.id || ('pay_' + Date.now() + '_' + Math.random().toString(36).slice(2,8)),
            item_id: item.id, user_id: USER_ID, date: p.date,
            amount: p.amount, method: p.method, notes: p.notes || null,
          });
        }
      }
      if (settings) {
        db.prepare('INSERT OR REPLACE INTO user_settings (user_id, theme, currency, notifications_enabled, card_orders) VALUES (?, ?, ?, ?, ?)')
          .run(USER_ID, settings.theme || 'system', settings.currency || 'USD', 0, JSON.stringify(settings.cardOrders || {}));
      }
    });
    tx();
    res.json({ success: true, count: financialItems.length });
  } catch (err) {
    console.error('Error saving data:', err);
    res.status(500).json({ error: 'Failed to save data' });
  }
});

module.exports = router;
