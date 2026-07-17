import { useEffect, useRef, useCallback } from 'react';
import { LocalNotifications, ScheduleOptions } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { FinancialItem } from '../types.ts';

const NOTIFICATION_CHANNEL_ID = 'loandash-reminders';
const NOTIFICATION_CHANNEL_NAME = 'LoanDash Reminders';

export const useNotifications = (
  financialItems: FinancialItem[],
  enabled: boolean,
  appCurrency: string
) => {
  const hasInitialized = useRef(false);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!Capacitor.isNativePlatform()) return false;
    if (!enabled) return false;

    try {
      const perm = await LocalNotifications.requestPermissions();
      return perm.display === 'granted';
    } catch {
      return false;
    }
  }, [enabled]);

  const scheduleNotifications = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) return;
    if (!enabled) return;

    const granted = await requestPermission();
    if (!granted) return;

    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayStr = now.toISOString().split('T')[0];
    const notifications: ScheduleOptions['notifications'] = [];

    const active = financialItems.filter(i => !i.isArchived);

    for (const item of active) {
      if (!item.dueDate) continue;

      const dueDate = new Date(`${item.dueDate}T09:00:00`);
      const diffMs = dueDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      const formatAmt = (a: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: appCurrency }).format(a);

      // Due today
      if (diffDays === 0 && item.status !== 'Paid') {
        notifications.push({
          id: item.id.charCodeAt(0) * 1000 + 1,
          title: `${item.title} is due today!`,
          body: `Amount: ${formatAmt(item.recurringPaymentAmount || item.amount)}`,
          schedule: { at: new Date(now.getTime() + 60_000) },
          smallIcon: 'ic_launcher',
          largeIcon: 'ic_launcher',
          channelId: NOTIFICATION_CHANNEL_ID,
        });
      }

      // Due tomorrow
      if (diffDays === 1 && item.status !== 'Paid') {
        notifications.push({
          id: item.id.charCodeAt(0) * 1000 + 2,
          title: `${item.title} is due tomorrow`,
          body: `Amount: ${formatAmt(item.recurringPaymentAmount || item.amount)}`,
          schedule: { at: new Date(now.getTime() + 60_000) },
          smallIcon: 'ic_launcher',
          largeIcon: 'ic_launcher',
          channelId: NOTIFICATION_CHANNEL_ID,
        });
      }

      // Due in 3 days
      if (diffDays === 3 && item.status !== 'Paid') {
        notifications.push({
          id: item.id.charCodeAt(0) * 1000 + 3,
          title: `${item.title} due in 3 days`,
          body: `Amount: ${formatAmt(item.recurringPaymentAmount || item.amount)}`,
          schedule: { at: new Date(now.getTime() + 60_000) },
          smallIcon: 'ic_launcher',
          largeIcon: 'ic_launcher',
          channelId: NOTIFICATION_CHANNEL_ID,
        });
      }

      // Overdue
      if (diffDays < 0 && item.status !== 'Paid') {
        const daysOverdue = Math.abs(diffDays);
        notifications.push({
          id: item.id.charCodeAt(0) * 1000 + 4,
          title: `${item.title} is overdue!`,
          body: `${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue — ${formatAmt(item.recurringPaymentAmount || item.amount)}`,
          schedule: { at: new Date(now.getTime() + 60_000) },
          smallIcon: 'ic_launcher',
          largeIcon: 'ic_launcher',
          channelId: NOTIFICATION_CHANNEL_ID,
        });
      }
    }

    // Cancel old notifications and schedule new ones
    try {
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length > 0) {
        await LocalNotifications.cancel(pending);
      }
    } catch {}

    if (notifications.length > 0) {
      // Cap at 20 notifications (Android limit)
      await LocalNotifications.schedule({
        notifications: notifications.slice(0, 20),
      });
    }
  }, [financialItems, enabled, appCurrency, requestPermission]);

  // Schedule on mount and when items change
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      scheduleNotifications();
      return;
    }
    scheduleNotifications();
  }, [financialItems, scheduleNotifications]);

  // Re-schedule daily at midnight
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    if (!enabled) return;

    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    const msUntilMidnight = tomorrow.getTime() - now.getTime();

    const timer = setTimeout(() => {
      scheduleNotifications();
    }, msUntilMidnight);

    return () => clearTimeout(timer);
  }, [enabled, scheduleNotifications]);

  return { requestPermission, scheduleNotifications };
};
