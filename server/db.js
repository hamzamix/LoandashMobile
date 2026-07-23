const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const isDocker = process.env.DOCKER_ENV === 'true' || fs.existsSync('/data');
const DB_PATH = isDocker
  ? '/data/loandash.db'
  : path.join(__dirname, '..', 'data', 'loandash.db');

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS financial_items (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT 'default_user',
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'USD',
    category TEXT NOT NULL,
    direction TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Unpaid',
    due_date TEXT,
    is_archived INTEGER DEFAULT 0,
    is_recurring INTEGER DEFAULT 0,
    recurrence TEXT,
    recurring_payment_amount REAL,
    recurrence_periods INTEGER,
    provider TEXT,
    service_category TEXT,
    end_date TEXT,
    icon TEXT,
    start_date TEXT,
    debt_loan_type TEXT,
    payment_method_type TEXT,
    phone TEXT,
    interest_enabled INTEGER DEFAULT 0,
    interest_rate REAL,
    enable_reminders INTEGER DEFAULT 0,
    reminder_days INTEGER,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL REFERENCES financial_items(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL DEFAULT 'default_user',
    date TEXT NOT NULL,
    amount REAL NOT NULL,
    method TEXT NOT NULL,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS user_settings (
    user_id TEXT PRIMARY KEY DEFAULT 'default_user',
    theme TEXT DEFAULT 'system',
    currency TEXT DEFAULT 'USD',
    notifications_enabled INTEGER DEFAULT 0,
    card_orders TEXT DEFAULT '{}'
  );

  CREATE INDEX IF NOT EXISTS idx_items_user ON financial_items(user_id);
  CREATE INDEX IF NOT EXISTS idx_items_archived ON financial_items(is_archived);
  CREATE INDEX IF NOT EXISTS idx_payments_item ON payments(item_id);
  CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
`);

module.exports = db;
