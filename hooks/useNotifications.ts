import { useEffect, useRef, useCallback } from 'react';
import { LocalNotifications, ScheduleOptions } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { FinancialItem } from '../types.ts';

const NOTIFICATION_CHANNEL_ID = 'loandash-reminders';
const NOTIFICATION_CHANNEL_NAME = 'LoanDash Reminders';

const addRecurrence = (date: Date, recurrence: string, startDate: Date): Date => {
    const nd = new Date(date);
    if (recurrence === 'Daily') nd.setDate(nd.getDate() + 1);
    else if (recurrence === 'Weekly') nd.setDate(nd.getDate() + 7);
    else if (recurrence === 'Monthly') {
        const od = startDate.getDate();
        nd.setMonth(nd.getMonth() + 1);
        nd.setDate(od);
        if (nd.getMonth() !== ((new Date(date).getMonth() + 1) % 12)) nd.setDate(0);
    } else if (recurrence === 'Yearly') nd.setFullYear(nd.getFullYear() + 1);
    return nd;
};

const calculateNextDueDate = (item: FinancialItem): Date | null => {
    const totalPaid = (item.paymentHistory || []).reduce((sum, p) => sum + p.amount, 0);
    const intAmt = (item.interestEnabled && item.interestRate && item.interestRate > 0) ? item.amount * (item.interestRate / 100) : 0;
    const totalOwed = item.amount + intAmt;

    if (item.isRecurring && (item.category === 'Debt' || item.category === 'Loan')) {
        if (totalOwed > 0 && totalPaid >= totalOwed) return null;
    }

    if (!item.isRecurring || item.recurrence === 'None' || !item.dueDate) {
        const isDebtOrLoan = item.category === 'Debt' || item.category === 'Loan';
        if (isDebtOrLoan) {
            if (totalOwed > 0 && totalPaid >= totalOwed) return null;
        } else {
            if (item.status === 'Paid') return null;
        }
        return new Date(`${item.dueDate}T00:00:00`);
    }

    const startDate = new Date(`${item.dueDate}T00:00:00`);
    const endDate = item.endDate ? new Date(`${item.endDate}T00:00:00`) : null;
    const payments = (item.paymentHistory || []).slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (payments.length === 0) {
        if (endDate && startDate > endDate) return null;
        return startDate;
    }

    let nextDueDate = new Date(startDate);
    let failsafe = 0;
    while (failsafe < 1000) {
        failsafe++;
        const year = nextDueDate.getFullYear();
        const month = nextDueDate.getMonth();
        const day = nextDueDate.getDate();
        let periodHasPayment = false;

        if (item.recurrence === 'Monthly') {
            periodHasPayment = (item.paymentHistory || []).some(p => {
                const pd = new Date(`${p.date}T00:00:00`);
                return pd.getFullYear() === year && pd.getMonth() === month;
            });
        } else if (item.recurrence === 'Yearly') {
            periodHasPayment = (item.paymentHistory || []).some(p => {
                const pd = new Date(`${p.date}T00:00:00`);
                return pd.getFullYear() === year;
            });
        } else if (item.recurrence === 'Weekly' || item.recurrence === 'Daily') {
            periodHasPayment = (item.paymentHistory || []).some(p => {
                const pd = new Date(`${p.date}T00:00:00`);
                return pd.getFullYear() === year && pd.getMonth() === month && pd.getDate() === day;
            });
        } else {
            const lastPaymentDate = new Date(`${payments[0].date}T00:00:00`);
            if (nextDueDate.getTime() > lastPaymentDate.getTime()) break;
            periodHasPayment = true;
        }

        if (!periodHasPayment) break;
        const prevDate = new Date(nextDueDate);
        nextDueDate = addRecurrence(nextDueDate, item.recurrence || 'None', startDate);
        if (nextDueDate.getTime() === prevDate.getTime()) break;
    }

    if (endDate && nextDueDate > endDate) return null;
    return nextDueDate;
};

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
    now.setHours(0, 0, 0, 0);
    const notifications: ScheduleOptions['notifications'] = [];
    const active = financialItems.filter(i => !i.isArchived);

    const formatAmt = (a: number) =>
      new Intl.NumberFormat('en-US', { style: 'currency', currency: appCurrency }).format(a);

    for (const item of active) {
      if (!item.dueDate) continue;
      if (item.category !== 'Debt' && item.category !== 'Loan' && item.category !== 'Subscription' && item.category !== 'Bill') continue;

      const nextDueDate = calculateNextDueDate(item);
      if (!nextDueDate) continue;

      nextDueDate.setHours(0, 0, 0, 0);
      const diffMs = nextDueDate.getTime() - now.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      const amt = item.recurringPaymentAmount || item.amount;

      // Due today
      if (diffDays === 0) {
        notifications.push({
          id: (item.id.charCodeAt(0) * 1000 + item.id.charCodeAt(Math.min(1, item.id.length - 1))) * 10 + 1,
          title: `${item.title} is due today!`,
          body: `Amount: ${formatAmt(amt)}`,
          schedule: { at: new Date(now.getTime() + 60_000) },
          smallIcon: 'ic_launcher',
          largeIcon: 'ic_launcher',
          channelId: NOTIFICATION_CHANNEL_ID,
        });
      }

      // Due tomorrow
      if (diffDays === 1) {
        notifications.push({
          id: (item.id.charCodeAt(0) * 1000 + item.id.charCodeAt(Math.min(1, item.id.length - 1))) * 10 + 2,
          title: `${item.title} is due tomorrow`,
          body: `Amount: ${formatAmt(amt)}`,
          schedule: { at: new Date(now.getTime() + 60_000) },
          smallIcon: 'ic_launcher',
          largeIcon: 'ic_launcher',
          channelId: NOTIFICATION_CHANNEL_ID,
        });
      }

      // Due in 3 days
      if (diffDays === 3) {
        notifications.push({
          id: (item.id.charCodeAt(0) * 1000 + item.id.charCodeAt(Math.min(1, item.id.length - 1))) * 10 + 3,
          title: `${item.title} due in 3 days`,
          body: `Amount: ${formatAmt(amt)}`,
          schedule: { at: new Date(now.getTime() + 60_000) },
          smallIcon: 'ic_launcher',
          largeIcon: 'ic_launcher',
          channelId: NOTIFICATION_CHANNEL_ID,
        });
      }

      // Overdue
      if (diffDays < 0) {
        const daysOverdue = Math.abs(diffDays);
        notifications.push({
          id: (item.id.charCodeAt(0) * 1000 + item.id.charCodeAt(Math.min(1, item.id.length - 1))) * 10 + 4,
          title: `${item.title} is overdue!`,
          body: `${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue — ${formatAmt(amt)}`,
          schedule: { at: new Date(now.getTime() + 60_000) },
          smallIcon: 'ic_launcher',
          largeIcon: 'ic_launcher',
          channelId: NOTIFICATION_CHANNEL_ID,
        });
      }
    }

    try {
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length > 0) {
        await LocalNotifications.cancel(pending);
      }
    } catch {}

    if (notifications.length > 0) {
      await LocalNotifications.schedule({
        notifications: notifications.slice(0, 20),
      });
    }
  }, [financialItems, enabled, appCurrency, requestPermission]);

  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      scheduleNotifications();
      return;
    }
    scheduleNotifications();
  }, [financialItems, scheduleNotifications]);

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
