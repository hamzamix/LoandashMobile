import React, { useMemo, useState, useEffect } from 'react';
import { FinancialItem, FinancialItemRecurrence } from '../types.ts';
import { ServiceIcon } from './FinancialItemCard.tsx';
import StatisticsView from './StatisticsView.tsx';
import { 
  TrendingDownIcon, 
  TrendingUpIcon, 
  CreditCardIcon, 
  CalendarIcon, 
  AlertCircleIcon, 
  CheckCircle2Icon, 
  ClockIcon, 
  ChevronRightIcon,
  ShieldAlertIcon
} from './Icons.tsx';

interface DashboardViewProps {
  financialItems: FinancialItem[];
  appCurrency: string;
  onSelectTab: (tab: any) => void;
}

// Helper to format currency
const formatCurrency = (amount: number, currency: string) => {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  } catch {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  }
};

// Helper for relative date string
const getRelativeDateString = (dateStr: string): string => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDate = dateStr.includes('T') ? new Date(dateStr) : new Date(`${dateStr}T00:00:00`);

  if (isNaN(targetDate.getTime())) {
    return 'Invalid Date';
  }
  
  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays > 1 && diffDays <= 3) return `In ${diffDays} days`;
  if (diffDays < 0) {
    const days = Math.abs(diffDays);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }

  return targetDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

// Add recurrence logic
const addRecurrence = (date: Date, recurrence: string, startDate: Date): Date => {
  const newDate = new Date(date);
  if (recurrence === 'Daily') {
    newDate.setDate(newDate.getDate() + 1);
  } else if (recurrence === 'Weekly') {
    newDate.setDate(newDate.getDate() + 7);
  } else if (recurrence === 'Monthly') {
    const originalDay = startDate.getDate();
    newDate.setMonth(newDate.getMonth() + 1);
    newDate.setDate(originalDay);
    const expectedMonth = (new Date(date).getMonth() + 1) % 12;
    if (newDate.getMonth() !== expectedMonth) {
      newDate.setDate(0);
    }
  } else if (recurrence === 'Yearly') {
    newDate.setFullYear(newDate.getFullYear() + 1);
  }
  return newDate;
};

// Calculate next due date
const calculateNextDueDate = (item: FinancialItem): Date | null => {
  const totalPaid = (item.paymentHistory || []).reduce((sum, p) => sum + p.amount, 0);
  const intAmt = (item.interestEnabled && item.interestRate && item.interestRate > 0) ? item.amount * (item.interestRate / 100) : 0;
  const totalOwed = item.amount + intAmt;

  if (item.isRecurring && (item.category === 'Debt' || item.category === 'Loan')) {
    if (totalOwed > 0 && totalPaid >= totalOwed) {
      return null;
    }
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

  const sortedPayments = (item.paymentHistory || [])
    .slice()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (sortedPayments.length === 0) {
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
      const lastPaymentDate = new Date(`${sortedPayments[0].date}T00:00:00`);
      if (nextDueDate.getTime() > lastPaymentDate.getTime()) {
        break;
      }
      periodHasPayment = true;
    }

    if (!periodHasPayment) {
      break;
    }

    const prevDate = new Date(nextDueDate);
    nextDueDate = addRecurrence(nextDueDate, item.recurrence || 'None', startDate);
    if (nextDueDate.getTime() === prevDate.getTime()) break;
  }

  if (endDate && nextDueDate > endDate) {
    return null;
  }

  return nextDueDate;
};

const getColorFromString = (str: string) => {
  const bgColors = [
    'bg-red-500', 'bg-orange-500', 'bg-amber-500', 
    'bg-lime-500', 'bg-green-500', 'bg-emerald-500', 'bg-teal-500',
    'bg-cyan-500', 'bg-sky-500', 'bg-blue-500', 'bg-indigo-500',
    'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500', 'bg-rose-500'
  ];
  let hash = 0;
  if (!str || str.length === 0) return bgColors[0];
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const index = Math.abs(hash % bgColors.length);
  return bgColors[index];
};

const getRelativeDueDateInfo = (diffDays: number) => {
  if (diffDays < 0) {
    const days = Math.abs(diffDays);
    return { text: `${days} day${days !== 1 ? 's' : ''} overdue`, icon: '⚠️', color: 'text-red-500 dark:text-red-400' };
  }
  if (diffDays === 0) {
    return { text: 'Due today', icon: '🔥', color: 'text-red-500 dark:text-red-400 font-bold' };
  }
  if (diffDays === 1) {
    return { text: 'Due in 1 day', icon: '⏳', color: 'text-orange-500 dark:text-orange-400' };
  }
  return { text: `Due in ${diffDays} days`, icon: '⏳', color: 'text-slate-500 dark:text-gray-400' };
};

const DashboardView: React.FC<DashboardViewProps> = ({ financialItems, appCurrency, onSelectTab }) => {
  
  // Calculate top cards metrics
  const stats = useMemo(() => {
    const active = financialItems.filter(i => !i.isArchived);
    
    // Subscriptions/Bills
    const subscriptions = active.filter(i => i.category === 'Subscription' || i.category === 'Bill');
    const monthlySubscriptionsCost = subscriptions.reduce((sum, s) => {
      const amt = s.recurringPaymentAmount || s.amount;
      if (s.recurrence === 'Daily') return sum + amt * 30;
      if (s.recurrence === 'Weekly') return sum + amt * 4.3;
      if (s.recurrence === 'Yearly') return sum + amt / 12;
      return sum + amt; // Default to Monthly
    }, 0);

    // Debts (Owed to others)
    const debts = active.filter(i => i.category === 'Debt');
    const totalDebts = debts.reduce((sum, d) => sum + d.amount, 0);
    const totalPaidDebts = debts.reduce((sum, d) => {
      const paid = (d.paymentHistory || []).reduce((s, p) => s + p.amount, 0);
      return sum + paid;
    }, 0);
    const remainingDebts = totalDebts - totalPaidDebts;

    // Loans (Owed to me)
    const loans = active.filter(i => i.category === 'Loan');
    const totalLoans = loans.reduce((sum, l) => sum + l.amount, 0);
    const totalPaidLoans = loans.reduce((sum, l) => {
      const paid = (l.paymentHistory || []).reduce((s, p) => s + p.amount, 0);
      return sum + paid;
    }, 0);
    const remainingLoans = totalLoans - totalPaidLoans;

    // Overdue count — use calculateNextDueDate for recurring items
    const overdueCount = active.filter(i => {
      if (i.status === 'Paid') return false;
      const nextDue = calculateNextDueDate(i);
      if (!nextDue) return false;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return nextDue < today;
    }).length;

    return {
      monthlySubscriptionsCost,
      remainingDebts,
      remainingLoans,
      overdueCount
    };
  }, [financialItems]);

  // Calculate upcoming payments
  const upcomingPaymentsData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = new Date().toISOString().split('T')[0];

    const itemsWithDates = financialItems
      .filter(item => !item.isArchived)
      .map(item => {
        const nextDueDate = calculateNextDueDate(item);
        const isDebtOrLoan = item.category === 'Debt' || item.category === 'Loan';
        const totalPaid = (item.paymentHistory || []).reduce((sum, p) => sum + p.amount, 0);
        const recordedToday = (item.paymentHistory || []).some(p => p.date === todayStr);
        const justPaidToday = isDebtOrLoan && !item.isRecurring
          ? (item.amount > 0 && totalPaid >= item.amount && recordedToday)
          : recordedToday;
        const diffDays = nextDueDate ? Math.ceil((new Date(nextDueDate).setHours(0, 0, 0, 0) - today.getTime()) / (1000 * 60 * 60 * 24)) : null;
        return { item, nextDueDate, justPaidToday, diffDays };
      });

    // We filter for items that are overdue OR due in the next 7 days to give a robust picture
    const itemsToDisplay = itemsWithDates
      .filter(p => {
        if (p.justPaidToday) return true;
        return p.diffDays !== null && p.diffDays <= 7;
      })
      .sort((a, b) => {
        if (a.justPaidToday && !b.justPaidToday) return 1;
        if (!a.justPaidToday && b.justPaidToday) return -1;
        return (a.nextDueDate?.getTime() ?? Infinity) - (b.nextDueDate?.getTime() ?? Infinity);
      });

    const overdueCount = itemsToDisplay.filter(p => p.diffDays !== null && p.diffDays < 0 && !p.justPaidToday).length;
    const dueTodayCount = itemsToDisplay.filter(p => p.diffDays === 0 && !p.justPaidToday).length;
    const totalDue = itemsToDisplay.filter(p => !p.justPaidToday).reduce((sum, p) => {
      const amount = p.item.isRecurring && p.item.recurringPaymentAmount ? p.item.recurringPaymentAmount : p.item.amount;
      return sum + amount;
    }, 0);

    return {
      itemsToDisplay,
      scheduledCount: itemsToDisplay.length,
      overdueCount,
      dueTodayCount,
      totalDue,
    };
  }, [financialItems]);

  const renderItemIcon = (item: FinancialItem) => {
    const firstLetter = item.title ? item.title.charAt(0).toUpperCase() : '?';
    const bgColor = getColorFromString(item.title);

    if (item.icon) {
      return (
        <ServiceIcon
          initialIconUrl={item.icon}
          serviceName={item.title}
          className="w-9 h-9 md:w-10 md:h-10 rounded-lg object-contain bg-white/90 dark:bg-slate-800 p-0.5 ring-1 ring-slate-200 dark:ring-slate-700 shadow-sm shrink-0"
        />
      );
    }

    return (
      <div className={`w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-xl text-white font-extrabold text-sm md:text-base shadow-md ${bgColor} shrink-0`}>
        {firstLetter}
      </div>
    );
  };

  return (
    <div className="space-y-4 md:space-y-8 animate-fade-in">
      
      {/* 4 Premium Stat Cards - Grid Layout */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-4">
        
        {/* Debts you owe */}
        <button 
          onClick={() => onSelectTab('Debts')}
          className="p-2.5 md:p-3 rounded-xl md:rounded-2xl bg-white dark:bg-[#0E1324] border border-slate-200/60 dark:border-gray-800/60 shadow-sm flex flex-col justify-between hover:scale-[1.02] active:scale-95 transition-all duration-200 text-left cursor-pointer group"
        >
          <div className="flex items-center justify-between w-full mb-2">
            <div className="w-7 h-7 rounded-lg bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center">
              <TrendingDownIcon className="w-4 h-4" />
            </div>
            <ChevronRightIcon className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
          <div>
            <span className="text-[8.5px] md:text-[9px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider block">Debts (You Owe)</span>
            <span className="text-sm md:text-base font-black text-slate-900 dark:text-white mt-0.5 block leading-tight">{formatCurrency(stats.remainingDebts, appCurrency)}</span>
          </div>
        </button>

        {/* Loans Owed to me */}
        <button 
          onClick={() => onSelectTab('Loans')}
          className="p-2.5 md:p-3 rounded-xl md:rounded-2xl bg-white dark:bg-[#0E1324] border border-slate-200/60 dark:border-gray-800/60 shadow-sm flex flex-col justify-between hover:scale-[1.02] active:scale-95 transition-all duration-200 text-left cursor-pointer group"
        >
          <div className="flex items-center justify-between w-full mb-2">
            <div className="w-7 h-7 rounded-lg bg-green-100 dark:bg-green-950/40 text-green-600 dark:text-green-400 flex items-center justify-center">
              <TrendingUpIcon className="w-4 h-4" />
            </div>
            <ChevronRightIcon className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
          <div>
            <span className="text-[8.5px] md:text-[9px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider block">Loans (Owed to Me)</span>
            <span className="text-sm md:text-base font-black text-slate-900 dark:text-white mt-0.5 block leading-tight">{formatCurrency(stats.remainingLoans, appCurrency)}</span>
          </div>
        </button>

        {/* Monthly bills */}
        <button 
          onClick={() => onSelectTab('Services')}
          className="p-2.5 md:p-3 rounded-xl md:rounded-2xl bg-white dark:bg-[#0E1324] border border-slate-200/60 dark:border-gray-800/60 shadow-sm flex flex-col justify-between hover:scale-[1.02] active:scale-95 transition-all duration-200 text-left cursor-pointer group"
        >
          <div className="flex items-center justify-between w-full mb-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <CreditCardIcon className="w-4 h-4" />
            </div>
            <ChevronRightIcon className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
          <div>
            <span className="text-[8.5px] md:text-[9px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider block">Monthly Bills / Subs</span>
            <span className="text-sm md:text-base font-black text-slate-900 dark:text-white mt-0.5 block leading-tight">{formatCurrency(stats.monthlySubscriptionsCost, appCurrency)}</span>
          </div>
        </button>

        {/* Overdue */}
        <button 
          onClick={() => onSelectTab('Services')}
          className="p-2.5 md:p-3 rounded-xl md:rounded-2xl bg-white dark:bg-[#0E1324] border border-slate-200/60 dark:border-gray-800/60 shadow-sm flex flex-col justify-between hover:scale-[1.02] active:scale-95 transition-all duration-200 text-left cursor-pointer group"
        >
          <div className="flex items-center justify-between w-full mb-2">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${stats.overdueCount > 0 ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400' : 'bg-slate-100 dark:bg-gray-800 text-slate-500'}`}>
              <ShieldAlertIcon className="w-4 h-4" />
            </div>
            <ChevronRightIcon className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
          <div>
            <span className="text-[8.5px] md:text-[9px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider block">Overdue Payments</span>
            <span className={`text-sm md:text-base font-black mt-0.5 block leading-tight ${stats.overdueCount > 0 ? 'text-amber-500 animate-pulse' : 'text-slate-700 dark:text-gray-300'}`}>
              {stats.overdueCount} {stats.overdueCount === 1 ? 'Alert' : 'Alerts'}
            </span>
          </div>
        </button>

      </div>

      {/* Premium "Upcoming Payments" Panel - Styled with app design colors */}
      <div className="bg-white dark:bg-[#0E1324] text-slate-800 dark:text-gray-200 rounded-2xl md:rounded-3xl border border-slate-200/60 dark:border-gray-800/60 shadow-xl overflow-hidden flex flex-col">
        
        {/* Header Block */}
        <div className="p-3 md:p-4 border-b border-slate-200/60 dark:border-gray-800/60 flex justify-between items-center bg-slate-50/50 dark:bg-[#242832]/30">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <CalendarIcon className="w-3.5 h-3.5" />
            </div>
            <h2 className="text-sm font-black tracking-tight text-slate-900 dark:text-white">Upcoming Payments</h2>
          </div>
          <span className="text-[10px] font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider">
            {upcomingPaymentsData.scheduledCount} scheduled
          </span>
        </div>

        {/* Payments List */}
        <div className="p-3 md:p-4">
          <ul className="space-y-2">
            {upcomingPaymentsData.itemsToDisplay.length > 0 ? (
              upcomingPaymentsData.itemsToDisplay.map(({ item, diffDays, nextDueDate, justPaidToday }) => {
                if (!nextDueDate && !justPaidToday) return null;

                const status = justPaidToday ? 'paid' : diffDays === null ? 'normal' : diffDays < 0 ? 'overdue' : diffDays === 0 ? 'dueToday' : diffDays <= 3 ? 'dueSoon' : 'normal';

                const borderAccentColor = {
                  paid: '#22c55e',
                  overdue: '#ef4444',
                  dueToday: '#ef4444',
                  dueSoon: '#fb923c',
                  normal: '#4b5563'
                }[status];

                const relativeDue = diffDays !== null ? getRelativeDueDateInfo(diffDays) : null;
                const amount = item.isRecurring && item.recurringPaymentAmount ? item.recurringPaymentAmount : item.amount;
                const isDebtOrLoan = item.category === 'Debt' || item.category === 'Loan';
                const totalPaid = (item.paymentHistory || []).reduce((sum, p) => sum + p.amount, 0);
                const interestAmt = (item.interestEnabled && item.interestRate && item.interestRate > 0) ? item.amount * (item.interestRate / 100) : 0;
                const totalWithInt = item.amount + interestAmt;
                const progressDenom = interestAmt > 0 ? totalWithInt : item.amount;
                const progressPercentage = progressDenom > 0 ? (totalPaid / progressDenom) * 100 : 0;
                const progressColor = progressPercentage >= 90 ? 'bg-green-500' : progressPercentage >= 40 ? 'bg-orange-500' : 'bg-red-500';

                return (
                  <li 
                    key={`${item.id}-${nextDueDate?.toISOString()}`} 
                    className="p-2.5 md:p-3 rounded-xl bg-slate-50/30 dark:bg-[#242832]/50 border border-slate-200/60 dark:border-gray-800/60 transition-all duration-200 hover:border-indigo-500/30 relative pl-6 md:pl-7 flex flex-col"
                  >
                    {/* Beautiful rounded vertical capsule accent bar offset from edge */}
                    <div 
                      className="absolute left-2 top-3 bottom-3 md:left-2.5 md:top-4 md:bottom-4 w-1 md:w-[5px] rounded-full"
                      style={{ backgroundColor: borderAccentColor }}
                    />

                    <div className="flex items-start justify-between gap-3">
                      
                      {/* Left: icon, title, details */}
                      <div className="flex items-center gap-2.5 md:gap-3 min-w-0">
                        {renderItemIcon(item)}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-slate-900 dark:text-white text-[13px] md:text-sm truncate leading-snug">{item.title}</p>
                            <span className="text-[9px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-[#2F3441] text-slate-500 dark:text-[#9FA6B8] px-1.5 py-0.5 rounded shrink-0 border border-slate-200 dark:border-[#414755]/50">
                              {item.category}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-gray-400 flex items-center gap-1.5 mt-1 font-medium">
                            <CalendarIcon className="w-3 h-3 text-indigo-500 dark:text-indigo-400" />
                            {nextDueDate ? (
                              <span>{nextDueDate.getMonth() + 1}/{nextDueDate.getDate()}/{nextDueDate.getFullYear()}</span>
                            ) : justPaidToday ? (
                              <span className="font-semibold text-green-500">Paid Today</span>
                            ) : null}
                            {item.paymentMethodType === 'auto' && (
                              <span className="text-green-600 dark:text-green-400 font-semibold bg-green-500/10 px-1 py-0.5 rounded flex items-center gap-1 text-[9px] tracking-wide uppercase">Auto</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Price / Relative Status */}
                      <div className="text-right shrink-0">
                        <p className="font-black text-slate-900 dark:text-white text-[13px] md:text-sm">{formatCurrency(amount, appCurrency)}</p>
                        {justPaidToday ? (
                          <p className="text-[10px] font-bold text-green-400 flex items-center justify-end gap-1 mt-0.5">
                            <CheckCircle2Icon className="w-3 h-3" />
                            Paid Today
                          </p>
                        ) : relativeDue ? (
                          <p className={`text-[10px] font-semibold flex items-center justify-end gap-1 mt-0.5 ${relativeDue.color}`}>
                            <span className="text-[9px]">{relativeDue.icon}</span>
                            {relativeDue.text}
                          </p>
                        ) : null}
                      </div>

                    </div>

                    {/* Progress Bar for Owed/Loan items */}
                    {isDebtOrLoan && totalPaid > 0 && (
                      <div className="mt-3 md:mt-4 pl-10 md:pl-12">
                        <div className="flex justify-between text-[11px] text-slate-500 dark:text-gray-400 mb-1.5 font-medium">
                          <span>Progress: {formatCurrency(totalPaid, appCurrency)} / {formatCurrency(progressDenom, appCurrency)}</span>
                          <span className="font-bold">{progressPercentage.toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-[#242832]/80 rounded-full h-1.5 border border-slate-200/60 dark:border-gray-800/60">
                          <div 
                            className={`h-1.5 rounded-full ${progressColor} transition-all duration-300`} 
                            style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })
            ) : (
              <div className="text-center py-12 bg-slate-50/30 dark:bg-[#242832]/30 rounded-2xl border border-dashed border-slate-200 dark:border-gray-800 flex flex-col items-center justify-center">
                <CheckCircle2Icon className="w-10 h-10 text-green-500/80 mb-3" />
                <p className="text-sm font-semibold text-slate-500 dark:text-gray-400">No upcoming payments due in the next 7 days.</p>
                <p className="text-xs text-slate-400 dark:text-gray-500 mt-1">You are fully caught up with your financial schedule!</p>
              </div>
            )}
          </ul>
        </div>

        {/* Footer Metrics Panel */}
        <div className="border-t border-slate-200/60 dark:border-gray-800/60 bg-slate-50/50 dark:bg-[#242832]/50 p-3 md:p-4 mt-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            
            {/* Quick Summary Totals */}
            <div className="flex items-center gap-6 text-center w-full md:w-auto justify-around md:justify-end ml-auto">
              <div>
                <div className="font-black text-base md:text-lg text-red-500">{upcomingPaymentsData.overdueCount}</div>
                <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-gray-500">Overdue</div>
              </div>
              <div className="border-l border-slate-200 dark:border-gray-800 h-6 hidden md:block"></div>
              <div>
                <div className="font-black text-base md:text-lg text-orange-400">{upcomingPaymentsData.dueTodayCount}</div>
                <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-gray-500">Due Today</div>
              </div>
              <div className="border-l border-slate-200 dark:border-gray-800 h-6 hidden md:block"></div>
              <div className="text-right">
                <div className="font-black text-base md:text-xl text-indigo-600 dark:text-indigo-400">{formatCurrency(upcomingPaymentsData.totalDue, appCurrency)}</div>
                <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-gray-500">Total Due</div>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Statistics Section */}
      <div className="mt-4 md:mt-6">
        <StatisticsView financialItems={financialItems} appCurrency={appCurrency} />
      </div>

    </div>
  );
};

export default DashboardView;
