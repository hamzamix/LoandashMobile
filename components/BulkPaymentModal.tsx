import React, { useState, useMemo } from 'react';
import { FinancialItem, Payment } from '../types.ts';
import { CheckCircle2Icon, XIcon } from './Icons.tsx';

interface MissingMonth {
  date: Date;
  label: string;
  amount: number;
}

interface BulkPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: FinancialItem;
  missingMonths: MissingMonth[];
  onRecordPayments: (payments: Omit<Payment, 'id'>[]) => void;
  currency: string;
}

const formatCurrency = (amount: number, currency: string = 'USD') => {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(amount);
  } catch {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  }
};

const BulkPaymentModal: React.FC<BulkPaymentModalProps> = ({
  isOpen,
  onClose,
  item,
  missingMonths,
  onRecordPayments,
  currency,
}) => {
  const [selected, setSelected] = useState<Set<number>>(new Set(missingMonths.map((_, i) => i)));
  const [method, setMethod] = useState('Bulk Record');

  const paymentAmount = (item.isRecurring && item.recurringPaymentAmount) ? item.recurringPaymentAmount : item.amount;

  const toggleMonth = (index: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === missingMonths.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(missingMonths.map((_, i) => i)));
    }
  };

  const totalAmount = useMemo(() => {
    return Array.from(selected).reduce((sum, i) => sum + (missingMonths[i]?.amount || paymentAmount), 0);
  }, [selected, missingMonths, paymentAmount]);

  const handleRecord = () => {
    const payments: Omit<Payment, 'id'>[] = Array.from(selected).sort((a, b) => a - b).map(i => {
      const m = missingMonths[i];
      const dateStr = `${m.date.getFullYear()}-${String(m.date.getMonth() + 1).padStart(2, '0')}-${String(m.date.getDate()).padStart(2, '0')}`;
      return {
        date: dateStr,
        amount: m.amount || paymentAmount,
        method,
        notes: `Bulk recorded — ${m.label}`,
      };
    });
    onRecordPayments(payments);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-[#0E1324] rounded-2xl shadow-2xl border border-slate-200 dark:border-gray-800 w-full max-w-md max-h-[85vh] flex flex-col animate-fade-in">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-gray-800 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Record Earlier Payments</h3>
            <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">{item.title} — {missingMonths.length} missing month{missingMonths.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-800 text-slate-400 transition">
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Select All */}
        <div className="px-4 py-3 border-b border-slate-200 dark:border-gray-800 shrink-0">
          <button
            onClick={toggleAll}
            className="flex items-center gap-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition ${
              selected.size === missingMonths.length
                ? 'bg-indigo-600 border-indigo-600'
                : selected.size > 0
                ? 'bg-indigo-600/20 border-indigo-600'
                : 'border-slate-300 dark:border-gray-600'
            }`}>
              {selected.size === missingMonths.length && <CheckCircle2Icon className="w-4 h-4 text-white" />}
              {selected.size > 0 && selected.size < missingMonths.length && (
                <div className="w-2 h-0.5 bg-indigo-600 rounded" />
              )}
            </div>
            {selected.size === missingMonths.length ? 'Deselect All' : 'Select All'}
          </button>
        </div>

        {/* Month List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {missingMonths.map((m, i) => (
            <button
              key={i}
              onClick={() => toggleMonth(i)}
              className={`w-full flex items-center justify-between p-3 rounded-xl border transition text-left ${
                selected.has(i)
                  ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700'
                  : 'bg-white dark:bg-gray-800 border-slate-200 dark:border-gray-700 hover:border-slate-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition ${
                  selected.has(i)
                    ? 'bg-indigo-600 border-indigo-600'
                    : 'border-slate-300 dark:border-gray-600'
                }`}>
                  {selected.has(i) && <CheckCircle2Icon className="w-4 h-4 text-white" />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-white">{m.label}</p>
                </div>
              </div>
              <p className="text-sm font-bold text-slate-700 dark:text-gray-200">{formatCurrency(m.amount || paymentAmount, currency)}</p>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-gray-800 shrink-0">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm text-slate-500 dark:text-gray-400">{selected.size} of {missingMonths.length} selected</span>
            <span className="text-lg font-bold text-slate-900 dark:text-white">{formatCurrency(totalAmount, currency)}</span>
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-gray-300 bg-slate-100 dark:bg-gray-800 rounded-xl hover:bg-slate-200 dark:hover:bg-gray-700 transition">
              Cancel
            </button>
            <button
              onClick={handleRecord}
              disabled={selected.size === 0}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Record {selected.size} Payment{selected.size !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkPaymentModal;
