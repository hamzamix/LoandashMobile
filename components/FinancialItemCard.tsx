import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { FinancialItem, FinancialItemRecurrence, Payment } from '../types.ts';
import { FinanceIcon, EditIcon, ArchiveIcon, ChevronUpIcon, ChevronDownIcon, CalendarIcon, RepeatIcon, TrashIcon, UnarchiveIcon, PlusIcon, PhoneIcon, GripVerticalIcon } from './Icons.tsx';
import { getCachedIcon } from '../utils/iconCache.ts';
import Modal from './Modal.tsx';
import BulkPaymentModal from './BulkPaymentModal.tsx';
import ConfirmModal from './ConfirmModal.tsx';

// --- HELPER COMPONENTS & FUNCTIONS ---

const formatCurrency = (amount: number, currency: string = 'USD') => {
    // Fallback for potentially undefined currency
    const displayCurrency = currency || 'USD';
    try {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: displayCurrency }).format(amount);
    } catch (e) {
        // Handle cases where currency code is invalid
        console.warn(`Invalid currency code: ${displayCurrency}. Falling back to USD.`);
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    }
};

const formatDate = (date: Date | null) => {
    if (!date) return 'N/A';
    return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

const toYyyyMmDd = (date: Date | null): string | null => {
    if (!date) return null;
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const addRecurrence = (date: Date, recurrence: keyof typeof FinancialItemRecurrence, startDate: Date): Date => {
    const newDate = new Date(date);
    switch (recurrence) {
        case 'Daily':
            newDate.setDate(newDate.getDate() + 1);
            break;
        case 'Weekly':
            newDate.setDate(newDate.getDate() + 7);
            break;
        case 'Monthly': {
            const originalDay = startDate.getDate();
            newDate.setMonth(newDate.getMonth() + 1);
            newDate.setDate(originalDay);
            const expectedMonth = (new Date(date).getMonth() + 1) % 12;
            if (newDate.getMonth() !== expectedMonth) {
                newDate.setDate(0);
            }
            break;
        }
        case 'Yearly':
            newDate.setFullYear(newDate.getFullYear() + 1);
            break;
    }
    return newDate;
};


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
        return item.dueDate ? new Date(`${item.dueDate}T00:00:00`) : null;
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
            // Fallback for unknown recurrence
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
        // Prevent infinite loop if addRecurrence fails to advance
        if (nextDueDate.getTime() === prevDate.getTime()) break;
    }

    if (endDate && nextDueDate > endDate) {
        return null; // No more due dates
    }

    return nextDueDate;
};

const findFirstUnpaidPeriod = (item: FinancialItem): { month: string; year: number } | null => {
    if (!item.isRecurring || !item.dueDate || !['Monthly', 'Yearly'].includes(item.recurrence || '')) {
        return null;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(`${item.dueDate}T00:00:00`);
    const payments = item.paymentHistory || [];
    const paymentAmount = item.recurringPaymentAmount || item.amount;

    let periodDate = new Date(startDate);
    let totalScheduled = 0;

    while (periodDate < today) {
        const year = periodDate.getFullYear();
        const month = periodDate.getMonth();

        totalScheduled += paymentAmount;

        let periodHasPayment = false;

        if (item.recurrence === 'Monthly') {
            periodHasPayment = payments.some(p => {
                const paymentDate = new Date(`${p.date}T00:00:00`);
                return paymentDate.getFullYear() === year && paymentDate.getMonth() === month;
            });
        } else if (item.recurrence === 'Yearly') {
            periodHasPayment = payments.some(p => {
                const paymentDate = new Date(`${p.date}T00:00:00`);
                return paymentDate.getFullYear() === year;
            });
        }

        if (!periodHasPayment) {
            if (item.amount > 0 && totalScheduled > item.amount) break;
            return {
                month: periodDate.toLocaleString('default', { month: 'long' }),
                year: year
            };
        }
        
        periodDate = addRecurrence(periodDate, item.recurrence || 'None', startDate);
    }

    return null;
};

interface MissingMonth {
    date: Date;
    label: string;
    amount: number;
}

const calculateMissingMonths = (item: FinancialItem): MissingMonth[] => {
    if (!item.isRecurring) return [];
    if (!['Monthly', 'Yearly'].includes(item.recurrence || '')) return [];

    const startDate = new Date(`${item.dueDate}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const payments = item.paymentHistory || [];
    const paymentAmount = item.recurringPaymentAmount || item.amount;
    const missing: MissingMonth[] = [];
    const isSubscription = item.category === 'Subscription' || item.category === 'Bill';
    const intAmt = (item.interestEnabled && item.interestRate && item.interestRate > 0) ? item.amount * (item.interestRate / 100) : 0;
    const totalOwed = item.amount + intAmt;

    let currentDate = new Date(startDate);
    let totalScheduled = 0;
    let failsafe = 0;

    while (currentDate <= today && failsafe < 1000) {
        failsafe++;
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        let hasPayment = false;
        if (item.recurrence === 'Monthly') {
            hasPayment = payments.some(p => {
                const pd = new Date(`${p.date}T00:00:00`);
                return pd.getFullYear() === year && pd.getMonth() === month;
            });
        } else if (item.recurrence === 'Yearly') {
            hasPayment = payments.some(p => {
                const pd = new Date(`${p.date}T00:00:00`);
                return pd.getFullYear() === year;
            });
        }

        totalScheduled += paymentAmount;

        if (!hasPayment) {
            if (!isSubscription && totalOwed > 0 && totalScheduled > totalOwed) break;
            const label = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            missing.push({
                date: new Date(currentDate),
                label,
                amount: paymentAmount,
            });
        }

        currentDate = addRecurrence(currentDate, item.recurrence || 'None', startDate);
    }

    return missing;
};

// Generates a consistent tailwind background color class from a string
const getColorFromString = (str: string) => {
    const colors = [
        'bg-red-500', 'bg-orange-500', 'bg-amber-500', 
        'bg-lime-500', 'bg-green-500', 'bg-emerald-500', 'bg-teal-500',
        'bg-cyan-500', 'bg-sky-500', 'bg-blue-500', 'bg-indigo-500',
        'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500', 'bg-rose-500'
    ];
    let hash = 0;
    if (str.length === 0) return colors[0];
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    const index = Math.abs(hash % colors.length);
    return colors[index];
};


export const ServiceIcon: React.FC<{
  initialIconUrl: string | null | undefined;
  serviceName: string;
  className?: string;
}> = ({ initialIconUrl, serviceName, className }) => {
  const [imgError, setImgError] = useState(false);

  if (!initialIconUrl || imgError) {
    return (
      <div className={`flex items-center justify-center bg-slate-100 dark:bg-gray-700 rounded-md ${className}`}>
        <FinanceIcon className="w-4/5 h-4/5 text-slate-400 dark:text-gray-400" />
      </div>
    );
  }

  const cached = getCachedIcon(initialIconUrl);
  const src = cached || initialIconUrl;

  return (
    <img
      src={src}
      alt={`${serviceName} icon`}
      className={className}
      onError={() => setImgError(true)}
    />
  );
};


const PaymentForm: React.FC<{
    onSubmit: (data: Omit<Payment, 'id'>) => void;
    onCancel: () => void;
    itemName: string;
    itemAmount: number;
    currency: string;
    initialData?: Payment | null;
    initialDate?: string | null;
}> = ({ onSubmit, onCancel, itemName, itemAmount, currency, initialData, initialDate }) => {
    const [amount, setAmount] = useState<number | string>(initialData?.amount || itemAmount);
    const [date, setDate] = useState(initialData?.date || initialDate || toYyyyMmDd(new Date()));
    const [method, setMethod] = useState(initialData?.method || 'Credit Card');
    const [notes, setNotes] = useState(initialData?.notes || '');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const finalAmount = parseFloat(String(amount));
        if (!isNaN(finalAmount) && finalAmount > 0 && date) {
            onSubmit({ date, amount: finalAmount, method, notes });
        }
    };
    
    const inputClass = "w-full bg-slate-50/50 dark:bg-[#1D2029]/50 border border-slate-200 dark:border-[#2F3441] rounded-xl px-3.5 py-2.5 md:px-4 md:py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all duration-200 outline-none";

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="p-4 bg-slate-100 dark:bg-[#1D2029] border border-slate-200 dark:border-[#2F3441] rounded-xl text-sm">
                <p>Item: <span className="font-semibold text-slate-800 dark:text-white">{itemName}</span></p>
                {!initialData && <p className="mt-1">Default amount: <span className="font-semibold text-slate-800 dark:text-white">{formatCurrency(itemAmount, currency)}</span></p>}
            </div>
            
            <div>
                <label htmlFor="payment-amount" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">Payment Amount *</label>
                <div className="relative">
                    <input type="number" id="payment-amount" value={amount} onChange={(e) => setAmount(e.target.value)} required className={`${inputClass} pr-12`} step="0.01" />
                    <span className="absolute inset-y-0 right-4 flex items-center text-sm font-semibold text-slate-500 dark:text-gray-400">{currency}</span>
                </div>
            </div>

            <div>
                <label htmlFor="payment-date" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">Payment Date *</label>
                <input type="date" id="payment-date" value={date || ''} onChange={(e) => setDate(e.target.value)} required className={inputClass} />
            </div>

            <div>
                <label htmlFor="payment-method" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">Payment Method *</label>
                <select id="payment-method" value={method} onChange={(e) => setMethod(e.target.value)} required className={inputClass}>
                    <option>Cash</option>
                    <option>Bank Transfer</option>
                    <option>Credit Card</option>
                    <option>Debit Card</option>
                    <option>Check</option>
                    <option>Mobile Payment</option>
                    <option>Online Banking</option>
                    <option>Other</option>
                </select>
            </div>

            <div>
                <label htmlFor="payment-notes" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">Notes (Optional)</label>
                <textarea id="payment-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={inputClass} placeholder="e.g., Paid for October bill" />
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-slate-200/60 dark:border-gray-800/60 mt-6 -mx-6 px-6 pb-2">
                <button type="button" onClick={onCancel} className="px-5 py-2.5 text-sm font-bold text-slate-700 dark:text-gray-300 bg-slate-100 dark:bg-[#1D2029] rounded-xl hover:bg-slate-200 dark:hover:bg-[#242832] transition-colors border border-transparent dark:border-gray-800">Cancel</button>
                <button type="submit" className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-500 transition-colors shadow-md shadow-indigo-500/20 active:scale-95">{initialData ? 'Update Payment' : 'Record Payment'}</button>
            </div>
        </form>
    );
};

const FullHistoryView: React.FC<{ 
    payments: Payment[]; 
    currency: string;
    onEditPayment: (payment: Payment) => void;
    onDeletePayment: (paymentId: string) => void;
}> = ({ payments, currency, onEditPayment, onDeletePayment }) => {
    
    const groupedByYear = useMemo(() => {
        return payments.reduce((acc, p) => {
            const year = new Date(p.date).getFullYear();
            if (!acc[year]) acc[year] = [];
            acc[year].push(p);
            return acc;
        }, {} as Record<string, Payment[]>);
    }, [payments]);

    const sortedYears = useMemo(() => Object.keys(groupedByYear).sort((a,b) => parseInt(b) - parseInt(a)), [groupedByYear]);
    const [expandedYears, setExpandedYears] = useState(() => new Set<string>(sortedYears.length > 0 ? [sortedYears[0]] : []));

    const toggleYear = (year: string) => {
        setExpandedYears(prev => {
            const newSet = new Set(prev);
            if (newSet.has(year)) {
                newSet.delete(year);
            } else {
                newSet.add(year);
            }
            return newSet;
        });
    };

    return (
        <div className="space-y-3 max-h-[60vh] overflow-y-auto -mr-2 pr-2">
            {sortedYears.map(year => (
                <div key={year}>
                    <button onClick={() => toggleYear(year)} className="w-full flex justify-between items-center p-2 rounded-md bg-slate-100 dark:bg-gray-700/50 hover:bg-slate-200 dark:hover:bg-gray-600/50">
                        <h4 className="font-semibold text-slate-800 dark:text-white">{year} Payments</h4>
                        {expandedYears.has(year) ? <ChevronUpIcon className="w-5 h-5 text-slate-500" /> : <ChevronDownIcon className="w-5 h-5 text-slate-500" />}
                    </button>
                    {expandedYears.has(year) && (
                        <div className="mt-2 space-y-1 pl-2 border-l-2 border-slate-200 dark:border-gray-700">
                             {groupedByYear[year].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(p => (
                                <div key={p.id} className="group text-sm p-2 rounded-md hover:bg-slate-50 dark:hover:bg-gray-800/50 flex justify-between items-center">
                                    <div>
                                        <p className="font-medium text-slate-700 dark:text-gray-300">{formatDate(new Date(`${p.date}T00:00:00`))}</p>
                                        <p className="text-xs text-slate-500 dark:text-gray-400">{p.method}</p>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <p className="font-semibold text-slate-800 dark:text-white mr-2">{formatCurrency(p.amount, currency)}</p>
                                         <div className="flex items-center gap-1">
                                            <button onClick={() => onEditPayment(p)} className="p-1 text-slate-500 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-gray-600 rounded" title="Edit Payment"><EditIcon className="w-3.5 h-3.5" /></button>
                                            <button onClick={() => onDeletePayment(p.id)} className="p-1 text-red-500 hover:bg-red-500/10 rounded" title="Delete Payment"><TrashIcon className="w-3.5 h-3.5" /></button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};


// --- MAIN CARD COMPONENT ---

interface FinancialItemCardProps { 
    item: FinancialItem; 
    activeTab: 'All' | 'Services' | 'Debts' | 'Loans' | 'Archive';
    isGridView: boolean;
    isExpanded: boolean;
    onToggleExpand: () => void;
    onEdit: (item: FinancialItem) => void; 
    onDelete: (id: string) => void; 
    onAddPayment: (itemId: string, paymentData: Omit<Payment, 'id'>) => void;
    onAddPayments: (itemId: string, payments: Omit<Payment, 'id'>[]) => void;
    onUpdatePayment: (itemId: string, paymentId: string, paymentData: Omit<Payment, 'id'>) => void;
    onDeletePayment: (itemId: string, paymentId: string) => void;
    onArchive: (id: string) => void;
    onUnarchive: (id: string) => void;
    appCurrency: string;
    isDragging?: boolean;
    isDragOver?: boolean;
    onDragStart?: (e: React.DragEvent, itemId: string) => void;
    onDragOver?: (e: React.DragEvent, itemId: string) => void;
    onDragEnd?: () => void;
    onDrop?: (e: React.DragEvent, itemId: string) => void;
}

const FinancialItemCard: React.FC<FinancialItemCardProps> = ({ item, activeTab, isGridView, isExpanded, onToggleExpand, onEdit, onDelete, onAddPayment, onAddPayments, onUpdatePayment, onDeletePayment, onArchive, onUnarchive, appCurrency, isDragging, isDragOver, onDragStart, onDragOver, onDragEnd, onDrop }) => {
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [isBulkPaymentModalOpen, setIsBulkPaymentModalOpen] = useState(false);
    const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
    const [paymentModalDefaultDate, setPaymentModalDefaultDate] = useState<string | null>(null);
    const [deleteItemConfirmOpen, setDeleteItemConfirmOpen] = useState(false);
    const [deletePaymentConfirmOpen, setDeletePaymentConfirmOpen] = useState(false);
    const [deletePaymentId, setDeletePaymentId] = useState<string | null>(null);
    const [detailModalOpen, setDetailModalOpen] = useState(false);

    const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 768);
    useEffect(() => {
        const mq = window.matchMedia('(min-width: 768px)');
        const handler = (e: MediaQueryListEvent | MediaQueryList) => setIsDesktop(e.matches);
        mq.addEventListener('change', handler);
        setIsDesktop(mq.matches);
        return () => mq.removeEventListener('change', handler);
    }, []);
    
    const totalPaid = useMemo(() => (item.paymentHistory || []).reduce((sum, p) => sum + p.amount, 0), [item.paymentHistory]);
    const nextDueDate = useMemo(() => calculateNextDueDate(item), [item]);
    const firstUnpaidPeriod = useMemo(() => findFirstUnpaidPeriod(item), [item]);
    const missingMonths = useMemo(() => calculateMissingMonths(item), [item]);
    const displayCurrency = appCurrency;

    const diffDays = useMemo(() => {
        if (!nextDueDate) return null;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dueDate = new Date(nextDueDate);
        dueDate.setHours(0, 0, 0, 0);
        const diffTime = dueDate.getTime() - today.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }, [nextDueDate]);

    const justPaidToday = useMemo(() => {
        if (!item.paymentHistory || item.paymentHistory.length === 0) {
            return false;
        }
        const todayStr = toYyyyMmDd(new Date());
        return item.paymentHistory.some(p => p.date === todayStr);
    }, [item.paymentHistory]);

    const interestAmount = useMemo(() => {
        if (!item.interestEnabled || !item.interestRate || item.interestRate <= 0) return 0;
        return item.amount * (item.interestRate / 100);
    }, [item.amount, item.interestRate, item.interestEnabled]);

    const totalWithInterest = useMemo(() => item.amount + interestAmount, [item.amount, interestAmount]);
    const progressDenominator = (item.interestEnabled && interestAmount > 0) ? totalWithInterest : item.amount;
    const remainingAmount = progressDenominator - totalPaid;

    const cardStatus = useMemo(() => {
        const isDebtOrLoan = item.category === 'Debt' || item.category === 'Loan';
        
        if (isDebtOrLoan) {
            if (progressDenominator > 0 && totalPaid >= progressDenominator) {
                return 'paid';
            }
        } else {
            if (justPaidToday) {
                return 'paid';
            }
            if (item.status === 'Paid' && !item.isRecurring) {
                return 'paid';
            }
        }

        if (diffDays !== null) {
            if (diffDays < 0) return 'overdue';
            if (diffDays === 0) return 'dueToday';
        }

        if (firstUnpaidPeriod) {
            return 'missingPayment';
        }

        if (diffDays !== null && diffDays <= 3) {
            return 'dueSoon';
        }
        
        return 'normal';
    }, [item.status, item.isRecurring, item.category, progressDenominator, totalPaid, diffDays, firstUnpaidPeriod, justPaidToday]);
    
    const cardClasses = useMemo(() => {
        const baseClass = 'p-3 md:p-4 rounded-xl border transition-all flex flex-col h-full';
        
        if (item.isArchived) {
            return `${baseClass} bg-slate-50 dark:bg-[#242832]/50 border-slate-200/60 dark:border-gray-800/60 opacity-70`;
        }

        switch (cardStatus) {
            case 'paid':
                return `${baseClass} bg-white dark:bg-[#0E1324] border-green-500 dark:border-green-400 hover:border-green-600 dark:hover:border-green-300`;
            case 'overdue':
                return `${baseClass} bg-white dark:bg-[#0E1324] border-red-500 dark:border-red-500 hover:border-red-600 dark:hover:border-red-400`;
            case 'dueToday':
                return `${baseClass} bg-white dark:bg-[#0E1324] border-red-500 dark:border-red-500 hover:border-red-600 dark:hover:border-red-400`;
            case 'missingPayment':
                return `${baseClass} bg-white dark:bg-[#0E1324] border-amber-400 dark:border-amber-500 hover:border-amber-500 dark:hover:border-amber-400`;
            case 'dueSoon':
                return `${baseClass} bg-white dark:bg-[#0E1324] border-orange-400 dark:border-orange-400 hover:border-orange-500 dark:hover:border-orange-300`;
            case 'normal':
            default:
                return `${baseClass} bg-white dark:bg-[#0E1324] border-slate-200/60 dark:border-gray-800/60 hover:border-slate-300 dark:hover:border-gray-700`;
        }
    }, [cardStatus, item.isArchived]);

    const dueDateText = useMemo(() => {
        if (cardStatus === 'paid') {
            return 'Paid';
        }
        return formatDate(nextDueDate);
    }, [cardStatus, nextDueDate]);

    const handleOpenPaymentModal = (payment: Payment | null = null, defaultDate: string | null = null) => {
        setEditingPayment(payment);
        setPaymentModalDefaultDate(defaultDate);
        setIsPaymentModalOpen(true);
    };

    const handleClosePaymentModal = () => {
        setEditingPayment(null);
        setIsPaymentModalOpen(false);
    };

    const handlePaymentFormSubmit = (paymentData: Omit<Payment, 'id'>) => {
        if (editingPayment) {
            onUpdatePayment(item.id, editingPayment.id, paymentData);
        } else {
            onAddPayment(item.id, paymentData);
        }
        handleClosePaymentModal();
    };

    const handleBulkPaymentSubmit = (payments: Omit<Payment, 'id'>[]) => {
        onAddPayments(item.id, payments);
        setIsBulkPaymentModalOpen(false);
    };

    const handleDelete = () => {
        setDeleteItemConfirmOpen(true);
    };

    const handleDeletePaymentConfirm = (paymentId: string) => {
        setDeletePaymentId(paymentId);
        setDeletePaymentConfirmOpen(true);
    };

    const sortedPayments = useMemo(() => 
        (item.paymentHistory || []).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        [item.paymentHistory]
    );
    
    const isSimpleDebtOrLoan = (item.category === 'Debt' || item.category === 'Loan') && !item.isRecurring;
    const paymentAmount = (item.isRecurring && item.recurringPaymentAmount) ? item.recurringPaymentAmount : item.amount;
    
    const isRecurringDebtOrLoan = item.isRecurring && (item.category === 'Debt' || item.category === 'Loan');

    const renderIcon = () => {
        if ((item.category === 'Debt' || item.category === 'Loan') && !item.icon) {
            const firstLetter = item.title ? item.title.charAt(0).toUpperCase() : '?';
            const bgColor = getColorFromString(item.title);
            return (
                <div className={`w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-md text-white font-bold text-lg md:text-xl ${bgColor} shrink-0`}>
                    {firstLetter}
                </div>
            );
        }
        return (
            <ServiceIcon 
                initialIconUrl={item.icon} 
                serviceName={item.title} 
                className="w-9 h-9 md:w-10 md:h-10 rounded-lg object-contain bg-white/90 dark:bg-slate-800 p-0.5 ring-1 ring-slate-200 dark:ring-slate-700 shadow-sm shrink-0" 
            />
        );
    };

    const progressPercentage = useMemo(() => progressDenominator > 0 ? (totalPaid / progressDenominator) * 100 : 0, [totalPaid, progressDenominator]);
    const progressColor = useMemo(() => {
        if (progressPercentage >= 90) return 'bg-green-500';
        if (progressPercentage >= 40) return 'bg-orange-500';
        return 'bg-red-500';
    }, [progressPercentage]);


    return (
        <>
            <div 
                className={`${cardClasses} ${isGridView ? 'cursor-pointer' : ''} ${isDragging ? 'opacity-40 scale-[0.98]' : ''} ${isDragOver ? 'ring-2 ring-indigo-500 dark:ring-indigo-400' : ''}`}
                onClick={isGridView ? (isDesktop ? () => setDetailModalOpen(true) : onToggleExpand) : undefined}
                draggable={isGridView && !!onDragStart}
                onDragStart={(e) => onDragStart?.(e, item.id)}
                onDragOver={(e) => onDragOver?.(e, item.id)}
                onDragEnd={onDragEnd}
                onDrop={(e) => onDrop?.(e, item.id)}
            >
                {/* Always Visible Header */}
                <div className="flex justify-between items-start gap-2">
                    <div className="flex items-center gap-2.5 md:gap-3 min-w-0">
                        {renderIcon()}
                        <div className="truncate">
                            <h3 className="font-semibold text-base md:text-lg text-slate-800 dark:text-gray-100 truncate">{item.title}</h3>
                            <div className="flex items-center gap-2">
                                <p className="text-xs md:text-sm text-slate-500 dark:text-gray-400 truncate">{item.provider || item.serviceCategory || item.debtLoanType}</p>
                                {(activeTab === 'All' || activeTab === 'Archive') && (item.category === 'Debt' || item.category === 'Loan') && (
                                    <span className={`px-1.5 py-0.5 text-xs font-semibold rounded-md ${
                                        item.category === 'Debt' 
                                        ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300' 
                                        : 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
                                    }`}>
                                        {item.category}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="text-right shrink-0 ml-2 md:ml-4">
                        {item.isArchived ? (
                            <p className="font-semibold text-sm text-slate-500 dark:text-gray-400">Archived</p>
                        ) : (item.category === 'Debt' || item.category === 'Loan') ? (
                            <>
                                <p className="font-bold text-base md:text-lg text-slate-800 dark:text-white">
                                    {item.interestEnabled && interestAmount > 0 ? formatCurrency(totalWithInterest, displayCurrency) : formatCurrency(remainingAmount, displayCurrency)}
                                </p>
                                <p className="text-xs md:text-sm text-slate-500 dark:text-gray-400">
                                    {item.interestEnabled && interestAmount > 0 ? (
                                        <>+{item.interestRate}% interest</>
                                    ) : (
                                        <>of {formatCurrency(item.amount, displayCurrency)}</>
                                    )}
                                </p>
                            </>
                        ) : (
                            <>
                                <p className="font-bold text-base md:text-lg text-slate-800 dark:text-white">{formatCurrency(item.amount, displayCurrency)}</p>
                                <p className="text-xs md:text-sm text-slate-500 dark:text-gray-400 capitalize">{item.recurrence?.toLowerCase()}</p>
                            </>
                        )}
                    </div>
                </div>

                {(item.category === 'Debt' || item.category === 'Loan') && totalPaid > 0 && !item.isArchived && (
                    <div className="mt-3">
                        <div className="flex justify-between items-end text-xs mb-1">
                            <span className="font-semibold text-slate-700 dark:text-gray-300">Payment Progress</span>
                            <span className="font-semibold text-slate-600 dark:text-gray-300">{progressPercentage.toFixed(0)}%</span>
                        </div>
                        <div className="relative">
                            <div className="w-full bg-slate-100 dark:bg-[#242832]/80 rounded-full h-5 overflow-hidden border border-slate-200/60 dark:border-gray-800/60">
                                <div 
                                    className={`h-5 rounded-full ${progressColor} transition-all duration-500`} 
                                    style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                                ></div>
                            </div>
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <span className="text-xs font-bold text-white" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}>
                                    {formatCurrency(totalPaid, displayCurrency)} / {formatCurrency(progressDenominator, displayCurrency)}
                                </span>
                            </div>
                        </div>
                    </div>
                )}


                {/* Expanded Content — inline for mobile */}
                {isExpanded && !isDesktop && (
                    <div className="mt-3 md:mt-4 pt-3 md:pt-4 border-t border-slate-200/60 dark:border-gray-800/60 animate-fade-in-fast flex-grow flex flex-col" onClick={e => e.stopPropagation()}>
                        
                        {!item.isArchived && (
                            <>
                                {cardStatus === 'dueToday' && (
                                    <div className="mb-3 p-3 bg-red-100 dark:bg-red-900/50 border-l-4 border-red-500 text-red-800 dark:text-red-300 text-sm rounded-r-md">
                                        <p className="font-semibold">Payment is due today!</p>
                                    </div>
                                )}
                                {cardStatus === 'dueSoon' && diffDays !== null && diffDays > 0 && (
                                    <div className="mb-3 p-3 bg-orange-100 dark:bg-orange-900/50 border-l-4 border-orange-500 text-orange-800 dark:text-orange-300 text-sm rounded-r-md">
                                        <p className="font-semibold">Payment is due in {diffDays} day{diffDays > 1 ? 's' : ''}.</p>
                                    </div>
                                )}
                                {firstUnpaidPeriod && (
                                    <div className="my-3 p-3 bg-amber-100 dark:bg-amber-900/50 border-l-4 border-amber-500 text-amber-800 dark:text-amber-300 text-sm rounded-r-md">
                                        <p className="font-semibold">Attention Needed</p>
                                        <p>{firstUnpaidPeriod.month} {firstUnpaidPeriod.year} has not been marked as paid.</p>
                                    </div>
                                )}
                                {missingMonths.length >= 1 && !item.isArchived && (
                                    <button
                                        onClick={() => setIsBulkPaymentModalOpen(true)}
                                        className="my-3 w-full p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-300 dark:border-indigo-700 rounded-xl text-sm font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-950/60 transition flex items-center justify-center gap-2"
                                    >
                                        <PlusIcon className="w-4 h-4" />
                                        Record {missingMonths.length} Earlier Missing Payment{missingMonths.length !== 1 ? 's' : ''}
                                    </button>
                                )}
                            </>
                        )}
                        
                        <div className="space-y-2">
                            {isSimpleDebtOrLoan ? (
                                <>
                                    <DetailItem icon={CalendarIcon} label="Return Date" value={dueDateText} isBold={true} />
                                    <DetailItem icon={CalendarIcon} label="Date Taken" value={formatDate(item.startDate ? new Date(`${item.startDate}T00:00:00`) : null)} />
                                    <DetailItem icon={FinanceIcon} label="Total Amount" value={formatCurrency(item.amount, displayCurrency)} />
                                    {item.interestEnabled && interestAmount > 0 && (
                                        <>
                                            <DetailItem icon={FinanceIcon} label={`Interest (${item.interestRate}%)`} value={formatCurrency(interestAmount, displayCurrency)} />
                                            <DetailItem icon={FinanceIcon} label="Total with Interest" value={formatCurrency(totalWithInterest, displayCurrency)} isBold={true} />
                                        </>
                                    )}
                                    {item.phone && <DetailItem icon={PhoneIcon} label="Phone" value={item.phone} />}
                                </>
                            ) : (
                                <>
                                    <DetailItem icon={CalendarIcon} label="Due" value={dueDateText} isBold={true} />
                                    {cardStatus !== 'paid' && nextDueDate && (
                                        <DetailItem icon={CalendarIcon} label="Next Payment" value={`${formatDate(nextDueDate)} (${formatCurrency(paymentAmount, displayCurrency)})`} />
                                    )}
                                    <DetailItem icon={RepeatIcon} label="Recurring" value={item.recurrence === 'None' ? 'No' : `Yes (${item.recurrence?.toLowerCase()})`} />
                                    <DetailItem icon={CalendarIcon} label="Started" value={formatDate(item.startDate ? new Date(`${item.startDate}T00:00:00`) : null)} />
                                    <DetailItem icon={FinanceIcon} label="Amount" value={`${formatCurrency(paymentAmount, displayCurrency)} per payment`} />
                                    {item.interestEnabled && item.interestRate && item.interestRate > 0 && (
                                        <DetailItem icon={FinanceIcon} label={`Interest Rate`} value={`${item.interestRate}%`} />
                                    )}
                                    {item.phone && <DetailItem icon={PhoneIcon} label="Phone" value={item.phone} />}
                                </>
                            )}
                            {!item.isArchived && (
                                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-gray-300 pt-1">
                                    <EditIcon className="w-4 h-4 text-slate-400 dark:text-gray-500" />
                                    <button onClick={() => onEdit(item)} className="hover:underline">Edit Details</button>
                                </div>
                            )}
                        </div>

                        {(item.description || sortedPayments.length > 0) && (
                            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-gray-700 space-y-4">
                                {item.description && (
                                    <div>
                                        <h4 className="text-sm font-semibold mb-2 text-slate-700 dark:text-gray-200">Description / Notes</h4>
                                        <p className="text-sm text-slate-600 dark:text-gray-400 whitespace-pre-wrap">{item.description}</p>
                                    </div>
                                )}
                                {sortedPayments.length > 0 && (
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <h4 className="text-sm font-semibold text-slate-700 dark:text-gray-200">Payment History</h4>
                                            <span className="text-sm font-semibold text-slate-600 dark:text-gray-300">
                                                Total Paid: {formatCurrency(totalPaid, displayCurrency)}
                                            </span>
                                        </div>
                                        <div className="space-y-1">
                                            {sortedPayments.slice(0, 3).map(p => (
                                                <div key={p.id} className="group text-sm p-2 rounded-md bg-slate-50 dark:bg-gray-700/50 flex justify-between items-center">
                                                    <div>
                                                        <p className="font-medium text-slate-700 dark:text-gray-300">{formatDate(new Date(`${p.date}T00:00:00`))} ({p.method})</p>
                                                        {p.notes && <p className="text-xs text-slate-500 dark:text-gray-400 mt-1 italic">"{p.notes}"</p>}
                                                    </div>
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        <p className="font-semibold text-slate-800 dark:text-white mr-2">{formatCurrency(p.amount, displayCurrency)}</p>
                                                         <div className="flex items-center gap-1">
                                                            <button onClick={() => handleOpenPaymentModal(p)} className="p-1 text-slate-500 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-gray-600 rounded" title="Edit Payment"><EditIcon className="w-3.5 h-3.5" /></button>
                                                            <button onClick={() => handleDeletePaymentConfirm(p.id)} className="p-1 text-red-500 hover:bg-red-500/10 rounded" title="Delete Payment"><TrashIcon className="w-3.5 h-3.5" /></button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        {sortedPayments.length > 3 && (
                                            <button onClick={() => setIsHistoryModalOpen(true)} className="w-full text-center mt-2 p-1.5 text-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/50 rounded-md">
                                                Show More Logs...
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                        <div className="mt-auto pt-4 border-t border-slate-200 dark:border-gray-700 flex justify-end items-center gap-3">
                            {item.isArchived ? (
                                <>
                                    <button onClick={() => onUnarchive(item.id)} className="px-4 py-2 text-sm font-semibold text-slate-700 dark:text-gray-300 bg-slate-100 dark:bg-gray-700 rounded-md hover:bg-slate-200 dark:hover:bg-gray-600 transition flex items-center gap-2"><UnarchiveIcon className="w-4 h-4" /> Unarchive</button>
                                    <button onClick={handleDelete} className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-md hover:bg-red-500 transition flex items-center gap-2"><TrashIcon className="w-4 h-4" /> Delete</button>
                                </>
                            ) : (
                                <>
                                    <button onClick={() => onArchive(item.id)} className="px-4 py-2 text-sm font-semibold text-slate-700 dark:text-gray-300 bg-slate-100 dark:bg-gray-700 rounded-md hover:bg-slate-200 dark:hover:bg-gray-600 transition">Archive</button>
                                    <button onClick={() => handleOpenPaymentModal(null, toYyyyMmDd(nextDueDate))} className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-500 transition" disabled={cardStatus === 'paid'}>Record Payment</button>
                                </>
                            )}
                        </div>
                    </div>
                )}
                
                {/* Footer (for expand/collapse) */}
                {isGridView && !isExpanded && (
                    <div className="mt-auto pt-4 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <DetailItem icon={CalendarIcon} label="Due" value={dueDateText} isBold={false} />
                        </div>
                        <div className="flex items-center gap-1.5">
                            {!item.isArchived && cardStatus !== 'paid' && item.paymentMethodType !== 'auto' && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleOpenPaymentModal(null, toYyyyMmDd(nextDueDate)); }}
                                    className="px-2 py-1 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold transition-colors shadow-sm shadow-indigo-500/20 active:scale-95"
                                >
                                    Pay
                                </button>
                            )}
                            {!item.isArchived && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onEdit(); }}
                                    className="p-2 rounded-lg text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors"
                                    title="Edit"
                                >
                                    <EditIcon className="w-4 h-4" />
                                </button>
                            )}
                            <button
                                onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
                                className="p-2 rounded-lg text-slate-400 dark:text-gray-500 hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors"
                            >
                                <ChevronDownIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
                
                {isGridView && isExpanded && (
                    <div className="w-full flex justify-center mt-auto pt-4 cursor-pointer" onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}>
                        <ChevronUpIcon className="w-5 h-5 text-slate-400 dark:text-gray-500" />
                    </div>
                )}
            </div>

            <Modal isOpen={isPaymentModalOpen} onClose={handleClosePaymentModal} title={editingPayment ? 'Edit Payment' : 'Record Payment'}>
                <PaymentForm 
                    onSubmit={handlePaymentFormSubmit}
                    onCancel={handleClosePaymentModal}
                    itemName={item.title}
                    itemAmount={paymentAmount}
                    currency={displayCurrency}
                    initialData={editingPayment}
                    initialDate={editingPayment ? null : paymentModalDefaultDate}
                />
            </Modal>
            
            <Modal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} title={`Payment History for ${item.title}`}>
                <FullHistoryView 
                    payments={sortedPayments} 
                    currency={displayCurrency}
                    onEditPayment={handleOpenPaymentModal}
                    onDeletePayment={handleDeletePaymentConfirm}
                />
            </Modal>

            <BulkPaymentModal
                isOpen={isBulkPaymentModalOpen}
                onClose={() => setIsBulkPaymentModalOpen(false)}
                item={item}
                missingMonths={missingMonths}
                onRecordPayments={handleBulkPaymentSubmit}
                currency={displayCurrency}
            />

            <ConfirmModal
                isOpen={deleteItemConfirmOpen}
                onClose={() => setDeleteItemConfirmOpen(false)}
                onConfirm={() => onDelete(item.id)}
                title="Delete Item"
                message={`Are you sure you want to permanently delete "${item.title}"? This action cannot be undone.`}
                confirmText="Delete"
                variant="danger"
            />

            <ConfirmModal
                isOpen={deletePaymentConfirmOpen}
                onClose={() => { setDeletePaymentConfirmOpen(false); setDeletePaymentId(null); }}
                onConfirm={() => { if (deletePaymentId) onDeletePayment(item.id, deletePaymentId); }}
                title="Delete Payment"
                message="Are you sure you want to delete this payment record? This action cannot be undone."
                confirmText="Delete"
                variant="danger"
            />

            <Modal isOpen={detailModalOpen} onClose={() => setDetailModalOpen(false)} title={item.title}>
                <div className="space-y-4 -mt-2">
                    <div className="flex items-center gap-3">
                        {renderIcon()}
                        <div>
                            <h3 className="font-bold text-base text-slate-800 dark:text-gray-100">{item.title}</h3>
                            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-gray-400">
                                <span className="font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-gray-800">{item.category}</span>
                                <span>·</span>
                                <span>{item.direction}</span>
                            </div>
                        </div>
                    </div>

                    {!item.isArchived && (
                        <>
                            {cardStatus === 'dueToday' && (
                                <div className="p-3 bg-red-100 dark:bg-red-900/50 border-l-4 border-red-500 text-red-800 dark:text-red-300 text-sm rounded-r-md">
                                    <p className="font-semibold">Payment is due today!</p>
                                </div>
                            )}
                            {cardStatus === 'dueSoon' && diffDays !== null && diffDays > 0 && (
                                <div className="p-3 bg-orange-100 dark:bg-orange-900/50 border-l-4 border-orange-500 text-orange-800 dark:text-orange-300 text-sm rounded-r-md">
                                    <p className="font-semibold">Payment is due in {diffDays} day{diffDays > 1 ? 's' : ''}.</p>
                                </div>
                            )}
                            {firstUnpaidPeriod && (
                                <div className="p-3 bg-amber-100 dark:bg-amber-900/50 border-l-4 border-amber-500 text-amber-800 dark:text-amber-300 text-sm rounded-r-md">
                                    <p className="font-semibold">Attention Needed</p>
                                    <p>{firstUnpaidPeriod.month} {firstUnpaidPeriod.year} has not been marked as paid.</p>
                                </div>
                            )}
                            {missingMonths.length >= 1 && (
                                <button
                                    onClick={() => { setDetailModalOpen(false); setIsBulkPaymentModalOpen(true); }}
                                    className="w-full p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-300 dark:border-indigo-700 rounded-xl text-sm font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-950/60 transition flex items-center justify-center gap-2"
                                >
                                    <PlusIcon className="w-4 h-4" />
                                    Record {missingMonths.length} Earlier Missing Payment{missingMonths.length !== 1 ? 's' : ''}
                                </button>
                            )}
                        </>
                    )}

                    <div className="space-y-2">
                        {isSimpleDebtOrLoan ? (
                            <>
                                <DetailItem icon={CalendarIcon} label="Return Date" value={dueDateText} isBold={true} />
                                <DetailItem icon={CalendarIcon} label="Date Taken" value={formatDate(item.startDate ? new Date(`${item.startDate}T00:00:00`) : null)} />
                                <DetailItem icon={FinanceIcon} label="Total Amount" value={formatCurrency(item.amount, displayCurrency)} />
                                {item.interestEnabled && interestAmount > 0 && (
                                    <>
                                        <DetailItem icon={FinanceIcon} label={`Interest (${item.interestRate}%)`} value={formatCurrency(interestAmount, displayCurrency)} />
                                        <DetailItem icon={FinanceIcon} label="Total with Interest" value={formatCurrency(totalWithInterest, displayCurrency)} isBold={true} />
                                    </>
                                )}
                                {item.phone && <DetailItem icon={PhoneIcon} label="Phone" value={item.phone} />}
                            </>
                        ) : (
                            <>
                                <DetailItem icon={CalendarIcon} label="Due" value={dueDateText} isBold={true} />
                                {cardStatus !== 'paid' && nextDueDate && (
                                    <DetailItem icon={CalendarIcon} label="Next Payment" value={`${formatDate(nextDueDate)} (${formatCurrency(paymentAmount, displayCurrency)})`} />
                                )}
                                <DetailItem icon={RepeatIcon} label="Recurring" value={item.recurrence === 'None' ? 'No' : `Yes (${item.recurrence?.toLowerCase()})`} />
                                <DetailItem icon={CalendarIcon} label="Started" value={formatDate(item.startDate ? new Date(`${item.startDate}T00:00:00`) : null)} />
                                <DetailItem icon={FinanceIcon} label="Amount" value={`${formatCurrency(paymentAmount, displayCurrency)} per payment`} />
                                {item.interestEnabled && item.interestRate && item.interestRate > 0 && (
                                    <DetailItem icon={FinanceIcon} label={`Interest Rate`} value={`${item.interestRate}%`} />
                                )}
                                {item.phone && <DetailItem icon={PhoneIcon} label="Phone" value={item.phone} />}
                            </>
                        )}
                        {!item.isArchived && (
                            <button onClick={() => { setDetailModalOpen(false); onEdit(item); }} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium">Edit Details</button>
                        )}
                    </div>

                    {(item.description || sortedPayments.length > 0) && (
                        <div className="pt-4 border-t border-slate-200 dark:border-gray-700 space-y-4">
                            {item.description && (
                                <div>
                                    <h4 className="text-sm font-semibold mb-2 text-slate-700 dark:text-gray-200">Description / Notes</h4>
                                    <p className="text-sm text-slate-600 dark:text-gray-400 whitespace-pre-wrap">{item.description}</p>
                                </div>
                            )}
                            {sortedPayments.length > 0 && (
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="text-sm font-semibold text-slate-700 dark:text-gray-200">Payment History</h4>
                                        <span className="text-sm font-semibold text-slate-600 dark:text-gray-300">
                                            Total Paid: {formatCurrency(totalPaid, displayCurrency)}
                                        </span>
                                    </div>
                                    <div className="space-y-1">
                                        {sortedPayments.slice(0, 3).map(p => (
                                            <div key={p.id} className="group text-sm p-2 rounded-md bg-slate-50 dark:bg-gray-700/50 flex justify-between items-center">
                                                <div>
                                                    <p className="font-medium text-slate-700 dark:text-gray-300">{formatDate(new Date(`${p.date}T00:00:00`))} ({p.method})</p>
                                                    {p.notes && <p className="text-xs text-slate-500 dark:text-gray-400 mt-1 italic">"{p.notes}"</p>}
                                                </div>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <p className="font-semibold text-slate-800 dark:text-white mr-2">{formatCurrency(p.amount, displayCurrency)}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {sortedPayments.length > 3 && (
                                        <button onClick={() => { setDetailModalOpen(false); setIsHistoryModalOpen(true); }} className="w-full text-center mt-2 p-1.5 text-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/50 rounded-md">
                                            Show All Payments...
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="pt-4 border-t border-slate-200 dark:border-gray-700 flex justify-end items-center gap-3">
                        {item.isArchived ? (
                            <>
                                <button onClick={() => { setDetailModalOpen(false); onUnarchive(item.id); }} className="px-4 py-2 text-sm font-semibold text-slate-700 dark:text-gray-300 bg-slate-100 dark:bg-gray-700 rounded-md hover:bg-slate-200 dark:hover:bg-gray-600 transition flex items-center gap-2"><UnarchiveIcon className="w-4 h-4" /> Unarchive</button>
                                <button onClick={() => { setDetailModalOpen(false); onDelete(item.id); }} className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-md hover:bg-red-500 transition flex items-center gap-2"><TrashIcon className="w-4 h-4" /> Delete</button>
                            </>
                        ) : (
                            <>
                                <button onClick={() => { setDetailModalOpen(false); onArchive(item.id); }} className="px-4 py-2 text-sm font-semibold text-slate-700 dark:text-gray-300 bg-slate-100 dark:bg-gray-700 rounded-md hover:bg-slate-200 dark:hover:bg-gray-600 transition">Archive</button>
                                <button onClick={() => { setDetailModalOpen(false); handleOpenPaymentModal(null, toYyyyMmDd(nextDueDate)); }} className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-500 transition" disabled={cardStatus === 'paid'}>Record Payment</button>
                            </>
                        )}
                    </div>
                </div>
            </Modal>
        </>
    );
};

const DetailItem: React.FC<{icon: React.FC<any>, label: string, value: string, isBold?: boolean}> = ({ icon: Icon, label, value, isBold }) => (
    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-gray-300">
        <Icon className="w-4 h-4 text-slate-400 dark:text-gray-500" />
        <span className="font-medium">{label}:</span>
        <span className={isBold ? 'font-semibold text-slate-800 dark:text-white' : ''}>{value}</span>
    </div>
);


export default FinancialItemCard;
