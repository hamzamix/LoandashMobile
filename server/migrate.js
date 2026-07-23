const fs = require('fs');
const path = require('path');
const db = require('./db');

const USER_ID = 'default_user';

const OLD_DATA_PATH = '/data/db.json';
const OLD_DATA_BACKUP = '/data/db.json.migrated';

const capitalize = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : null;

const normalizeDate = (d) => {
  if (!d) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return null;
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  } catch { return null; }
};

function migrateOldData() {
  if (fs.existsSync(OLD_DATA_BACKUP)) {
    console.log('Migration already completed (backup exists). Skipping.');
    return;
  }

  if (!fs.existsSync(OLD_DATA_PATH)) {
    console.log('No legacy db.json found. Skipping migration.');
    return;
  }

  const itemCount = db.prepare('SELECT COUNT(*) as c FROM financial_items').get().c;
  if (itemCount > 0) {
    console.log(`Database already has ${itemCount} items. Skipping migration.`);
    fs.renameSync(OLD_DATA_PATH, OLD_DATA_BACKUP);
    console.log('Renamed old db.json to db.json.migrated.');
    return;
  }

  console.log('Migrating legacy data from db.json to SQLite...');

  let oldData;
  try {
    const raw = fs.readFileSync(OLD_DATA_PATH, 'utf-8');
    oldData = JSON.parse(raw);
  } catch (err) {
    console.error('Failed to read/parse old db.json:', err.message);
    return;
  }

  const insertItem = db.prepare(`
    INSERT INTO financial_items (id,user_id,title,description,amount,currency,category,direction,status,due_date,is_archived,is_recurring,recurrence,recurring_payment_amount,recurrence_periods,provider,service_category,end_date,icon,start_date,debt_loan_type,payment_method_type,phone,interest_enabled,interest_rate,enable_reminders,reminder_days,sort_order)
    VALUES (@id,@user_id,@title,@description,@amount,@currency,@category,@direction,@status,@due_date,@is_archived,@is_recurring,@recurrence,@recurring_payment_amount,@recurrence_periods,@provider,@service_category,@end_date,@icon,@start_date,@debt_loan_type,@payment_method_type,@phone,@interest_enabled,@interest_rate,@enable_reminders,@reminder_days,@sort_order)
  `);

  const insertPayment = db.prepare(`
    INSERT INTO payments (id, item_id, user_id, date, amount, method, notes)
    VALUES (@id, @item_id, @user_id, @date, @amount, @method, @notes)
  `);

  let totalItems = 0;
  let totalPayments = 0;

  const tx = db.transaction(() => {
    // Migrate active debts
    const debts = oldData['loandash-debts'] || [];
    for (let i = 0; i < debts.length; i++) {
      const d = debts[i];
      const itemId = d.id || 'migrated_debt_' + Date.now() + '_' + i;
      insertItem.run({
        id: itemId, user_id: USER_ID, title: d.name || 'Untitled Debt',
        description: '', amount: d.totalAmount || 0, currency: d.currency || 'MAD',
        category: 'Debt', direction: 'Outgoing',
        status: d.status === 'active' ? 'Unpaid' : d.status || 'Unpaid', due_date: d.dueDate || null,
        is_archived: 0, is_recurring: d.isRecurring ? 1 : 0,
        recurrence: d.recurrenceSettings ? capitalize(d.recurrenceSettings.type) || null : null,
        recurring_payment_amount: d.recurrenceSettings ? d.recurrenceSettings.paymentAmount || null : null,
        recurrence_periods: null, provider: null, service_category: null,
        end_date: null, icon: null, start_date: d.startDate || null,
        debt_loan_type: d.type || 'Bank Loan', payment_method_type: null, phone: null,
        interest_enabled: d.interestEnabled ? 1 : 0, interest_rate: d.interestRate || null,
        enable_reminders: d.reminderSettings ? (d.reminderSettings.enabled ? 1 : 0) : 0,
        reminder_days: d.reminderSettings ? d.reminderSettings.daysBefore || null : null,
        sort_order: i,
      });
      totalItems++;
      const payments = d.payments || [];
      for (const p of payments) {
        insertPayment.run({
          id: p.id || 'pay_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
          item_id: itemId, user_id: USER_ID, date: normalizeDate(p.date) || normalizeDate(new Date().toISOString()),
          amount: p.amount || 0, method: p.method || 'Unknown',
          notes: p.notes || null,
        });
        totalPayments++;
      }
    }

    // Migrate active loans
    const loans = oldData['loandash-loans'] || [];
    for (let i = 0; i < loans.length; i++) {
      const l = loans[i];
      const itemId = l.id || 'migrated_loan_' + Date.now() + '_' + i;
      insertItem.run({
        id: itemId, user_id: USER_ID, title: l.name || 'Untitled Loan',
        description: '', amount: l.totalAmount || 0, currency: l.currency || 'MAD',
        category: 'Loan', direction: 'Incoming',
        status: l.status === 'active' ? 'Unpaid' : l.status || 'Unpaid', due_date: l.dueDate || null,
        is_archived: 0, is_recurring: l.isRecurring ? 1 : 0,
        recurrence: l.recurrenceSettings ? capitalize(l.recurrenceSettings.type) || null : null,
        recurring_payment_amount: l.recurrenceSettings ? l.recurrenceSettings.paymentAmount || null : null,
        recurrence_periods: null, provider: null, service_category: null,
        end_date: null, icon: null, start_date: l.startDate || null,
        debt_loan_type: l.type || 'Friend/Family', payment_method_type: null, phone: null,
        interest_enabled: l.interestEnabled ? 1 : 0, interest_rate: l.interestRate || null,
        enable_reminders: l.reminderSettings ? (l.reminderSettings.enabled ? 1 : 0) : 0,
        reminder_days: l.reminderSettings ? l.reminderSettings.daysBefore || null : null,
        sort_order: i,
      });
      totalItems++;
      const repayments = l.repayments || l.payments || [];
      for (const p of repayments) {
        insertPayment.run({
          id: p.id || 'pay_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
          item_id: itemId, user_id: USER_ID, date: normalizeDate(p.date) || normalizeDate(new Date().toISOString()),
          amount: p.amount || 0, method: p.method || 'Unknown',
          notes: p.notes || null,
        });
        totalPayments++;
      }
    }

    // Migrate services (bills/subscriptions)
    const services = oldData['loandash-services'] || [];
    for (let i = 0; i < services.length; i++) {
      const s = services[i];
      const itemId = s.id || 'migrated_service_' + Date.now() + '_' + i;
      insertItem.run({
        id: itemId, user_id: USER_ID, title: s.name || 'Untitled Service',
        description: '', amount: s.amount || 0, currency: s.currency || 'MAD',
        category: 'Bill', direction: 'Outgoing',
        status: s.status === 'active' ? 'Unpaid' : s.status || 'Unpaid', due_date: s.startDate || s.nextBillingDate || null,
        is_archived: 0, is_recurring: 1,
        recurrence: capitalize(s.billingCycle) || 'Monthly',
        recurring_payment_amount: s.amount || null,
        recurrence_periods: null, provider: s.provider || null,
        service_category: s.category || null,
        end_date: null, icon: s.icon || null,
        start_date: s.startDate || null,
        debt_loan_type: null, payment_method_type: 'auto', phone: null,
        interest_enabled: 0, interest_rate: null,
        enable_reminders: s.reminderSettings ? (s.reminderSettings.enabled ? 1 : 0) : 0,
        reminder_days: s.reminderSettings ? s.reminderSettings.daysBefore || null : null,
        sort_order: i,
      });
      totalItems++;
      const payments = s.payments || [];
      for (const p of payments) {
        insertPayment.run({
          id: p.id || 'pay_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
          item_id: itemId, user_id: USER_ID, date: normalizeDate(p.date) || normalizeDate(new Date().toISOString()),
          amount: p.amount || 0, method: p.method || 'Unknown',
          notes: p.notes || null,
        });
        totalPayments++;
      }
    }

    // Migrate archived debts
    const archivedDebts = oldData['loandash-archived-debts'] || [];
    for (let i = 0; i < archivedDebts.length; i++) {
      const d = archivedDebts[i];
      const itemId = d.id || 'migrated_adebt_' + Date.now() + '_' + i;
      insertItem.run({
        id: itemId, user_id: USER_ID, title: d.name || 'Untitled Debt',
        description: '', amount: d.totalAmount || 0, currency: d.currency || 'MAD',
        category: 'Debt', direction: 'Outgoing',
        status: 'completed', due_date: d.dueDate || null,
        is_archived: 1, is_recurring: d.isRecurring ? 1 : 0,
        recurrence: d.recurrenceSettings ? capitalize(d.recurrenceSettings.type) || null : null,
        recurring_payment_amount: d.recurrenceSettings ? d.recurrenceSettings.paymentAmount || null : null,
        recurrence_periods: null, provider: null, service_category: null,
        end_date: null, icon: null, start_date: d.startDate || null,
        debt_loan_type: d.type || 'Bank Loan', payment_method_type: null, phone: null,
        interest_enabled: d.interestEnabled ? 1 : 0, interest_rate: d.interestRate || null,
        enable_reminders: 0, reminder_days: null,
        sort_order: i,
      });
      totalItems++;
      const payments = d.payments || [];
      for (const p of payments) {
        insertPayment.run({
          id: p.id || 'pay_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
          item_id: itemId, user_id: USER_ID, date: normalizeDate(p.date) || normalizeDate(new Date().toISOString()),
          amount: p.amount || 0, method: p.method || 'Unknown',
          notes: p.notes || null,
        });
        totalPayments++;
      }
    }

    // Migrate archived loans
    const archivedLoans = oldData['loandash-archived-loans'] || [];
    for (let i = 0; i < archivedLoans.length; i++) {
      const l = archivedLoans[i];
      const itemId = l.id || 'migrated_aloan_' + Date.now() + '_' + i;
      insertItem.run({
        id: itemId, user_id: USER_ID, title: l.name || 'Untitled Loan',
        description: '', amount: l.totalAmount || 0, currency: l.currency || 'MAD',
        category: 'Loan', direction: 'Incoming',
        status: 'completed', due_date: l.dueDate || null,
        is_archived: 1, is_recurring: l.isRecurring ? 1 : 0,
        recurrence: l.recurrenceSettings ? capitalize(l.recurrenceSettings.type) || null : null,
        recurring_payment_amount: l.recurrenceSettings ? l.recurrenceSettings.paymentAmount || null : null,
        recurrence_periods: null, provider: null, service_category: null,
        end_date: null, icon: null, start_date: l.startDate || null,
        debt_loan_type: l.type || 'Friend/Family', payment_method_type: null, phone: null,
        interest_enabled: l.interestEnabled ? 1 : 0, interest_rate: l.interestRate || null,
        enable_reminders: 0, reminder_days: null,
        sort_order: i,
      });
      totalItems++;
      const repayments = l.repayments || l.payments || [];
      for (const p of repayments) {
        insertPayment.run({
          id: p.id || 'pay_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
          item_id: itemId, user_id: USER_ID, date: normalizeDate(p.date) || normalizeDate(new Date().toISOString()),
          amount: p.amount || 0, method: p.method || 'Unknown',
          notes: p.notes || null,
        });
        totalPayments++;
      }
    }

    // Migrate settings
    const currency = oldData['loandash-default-currency'] || 'MAD';
    const notifSettings = oldData['loandash-notification-settings'] || {};
    db.prepare(`
      INSERT INTO user_settings (user_id, theme, currency, notifications_enabled, card_orders)
      VALUES (?, ?, ?, ?, '{}')
      ON CONFLICT(user_id) DO UPDATE SET currency = ?, notifications_enabled = ?
    `).run(USER_ID, 'system', currency, notifSettings.enabled ? 1 : 0, currency, notifSettings.enabled ? 1 : 0);
  });

  tx();

  console.log(`Migration complete: ${totalItems} items, ${totalPayments} payments imported.`);

  fs.renameSync(OLD_DATA_PATH, OLD_DATA_BACKUP);
  console.log('Renamed old db.json to db.json.migrated.');
}

function fixupData() {
  let total = 0;

  const fixCategory = (from, to) => {
    const r = db.prepare('UPDATE financial_items SET category = ? WHERE category = ?').run(to, from);
    if (r.changes > 0) { console.log(`Fixed ${r.changes} category '${from}' → '${to}'`); total += r.changes; }
  };
  const fixDirection = (from, to) => {
    const r = db.prepare('UPDATE financial_items SET direction = ? WHERE direction = ?').run(to, from);
    if (r.changes > 0) { console.log(`Fixed ${r.changes} direction '${from}' → '${to}'`); total += r.changes; }
  };
  const fixRecurrence = (from, to) => {
    const r = db.prepare('UPDATE financial_items SET recurrence = ? WHERE recurrence = ?').run(to, from);
    if (r.changes > 0) { console.log(`Fixed ${r.changes} recurrence '${from}' → '${to}'`); total += r.changes; }
  };
  const fixStatus = (from, to) => {
    const r = db.prepare('UPDATE financial_items SET status = ? WHERE status = ?').run(to, from);
    if (r.changes > 0) { console.log(`Fixed ${r.changes} status '${from}' → '${to}'`); total += r.changes; }
  };

  fixCategory('debt', 'Debt');
  fixCategory('loan', 'Loan');
  fixCategory('bill', 'Bill');
  fixDirection('borrowing', 'Outgoing');
  fixDirection('lending', 'Incoming');
  fixRecurrence('daily', 'Daily');
  fixRecurrence('weekly', 'Weekly');
  fixRecurrence('monthly', 'Monthly');
  fixRecurrence('yearly', 'Yearly');
  fixStatus('active', 'Unpaid');

  const fixAutoPay = db.prepare("UPDATE financial_items SET payment_method_type = 'auto' WHERE payment_method_type IS NULL AND category IN ('Bill','Subscription') AND is_recurring = 1");
  const autoPayResult = fixAutoPay.run();
  if (autoPayResult.changes > 0) { console.log(`Fixed ${autoPayResult.changes} items: set payment_method_type='auto' for recurring bills/subscriptions`); total += autoPayResult.changes; }

  if (total > 0) console.log(`Data fixup complete: ${total} rows updated.`);
}

module.exports = { migrateOldData, fixupData };
