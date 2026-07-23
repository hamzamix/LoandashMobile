const express = require('express');
const db = require('../db');

const router = express.Router();
const USER_ID = 'default_user';

router.get('/', (req, res) => {
  let settings = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(USER_ID);
  if (!settings) {
    db.prepare('INSERT INTO user_settings (user_id) VALUES (?)').run(USER_ID);
    settings = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(USER_ID);
  }
  res.json({
    theme: settings.theme,
    currency: settings.currency,
    notificationsEnabled: !!settings.notifications_enabled,
    cardOrders: JSON.parse(settings.card_orders || '{}'),
  });
});

router.put('/', (req, res) => {
  const { theme, currency, notificationsEnabled, cardOrders } = req.body;

  let settings = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(USER_ID);
  if (!settings) {
    db.prepare('INSERT INTO user_settings (user_id) VALUES (?)').run(USER_ID);
  }

  db.prepare(`
    UPDATE user_settings SET
      theme = COALESCE(?, theme),
      currency = COALESCE(?, currency),
      notifications_enabled = COALESCE(?, notifications_enabled),
      card_orders = COALESCE(?, card_orders)
    WHERE user_id = ?
  `).run(
    theme ?? null,
    currency ?? null,
    notificationsEnabled != null ? (notificationsEnabled ? 1 : 0) : null,
    cardOrders ? JSON.stringify(cardOrders) : null,
    USER_ID
  );

  const updated = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(USER_ID);
  res.json({
    theme: updated.theme,
    currency: updated.currency,
    notificationsEnabled: !!updated.notifications_enabled,
    cardOrders: JSON.parse(updated.card_orders || '{}'),
  });
});

module.exports = router;
