import React, { useState } from 'react';
import { FinancialItem, LifeEvent, RoadmapItem, DebtLoanType, FinancialItemRecurrence } from '../types.ts';
import { registerPlugin } from '@capacitor/core';

type FinancialItemFormData = Omit<FinancialItem, 'id'>;

interface FinancialItemFormProps {
  onSubmit: (data: FinancialItemFormData) => void;
  onCancel: () => void;
  initialData?: FinancialItem | null;
  mode: 'Debt' | 'Loan';
  roadmapItems: RoadmapItem[];
  lifeEvents: LifeEvent[];
  financialItems: FinancialItem[];
  appCurrency: string;
}

const toYyyyMmDd = (date: Date): string => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const FinancialItemForm: React.FC<FinancialItemFormProps> = ({ onSubmit, onCancel, initialData, mode, roadmapItems, lifeEvents, financialItems, appCurrency }) => {
  const isEditMode = !!initialData;
  
  const [title, setTitle] = useState(initialData?.title || '');
  const [amount, setAmount] = useState<number | string>(initialData?.amount || '');
  const [startDate, setStartDate] = useState<string | null>(initialData?.startDate || toYyyyMmDd(new Date()));
  const [returnDate, setReturnDate] = useState<string | null>(initialData?.dueDate || null);
  const [debtLoanType, setDebtLoanType] = useState<keyof typeof DebtLoanType>(initialData?.debtLoanType || 'FriendFamilyCredit');
  const [description, setDescription] = useState(initialData?.description || '');
  const [isRecurring, setIsRecurring] = useState(initialData?.isRecurring || false);
  const [recurrenceType, setRecurrenceType] = useState<keyof typeof FinancialItemRecurrence>(initialData?.recurrence && initialData.recurrence !== 'None' ? initialData.recurrence : 'Monthly');
  const [recurringPaymentAmount, setRecurringPaymentAmount] = useState<number | string>(initialData?.recurringPaymentAmount || '');
  const [recurrenceMode, setRecurrenceMode] = useState<'byPeriod' | 'byAmount'>(initialData?.recurrencePeriods ? 'byPeriod' : 'byAmount');
  const [recurrencePeriods, setRecurrencePeriods] = useState<number | string>(initialData?.recurrencePeriods || '');
  const [enableReminders, setEnableReminders] = useState(initialData?.enableReminders ?? true);
  const [reminderDays, setReminderDays] = useState<number | string>(initialData?.reminderDays ?? 3);
  const [paymentMethodType, setPaymentMethodType] = useState<'manual' | 'auto'>(initialData?.paymentMethodType || 'manual');
  const [interestEnabled, setInterestEnabled] = useState(initialData?.interestEnabled || false);
  const [interestRate, setInterestRate] = useState<number | string>(initialData?.interestRate || '');
  const [phone, setPhone] = useState(initialData?.phone || '');

  // Auto-calculate based on mode
  const calcPaymentAmt = parseFloat(String(recurringPaymentAmount));
  const calcPeriods = parseInt(String(recurrencePeriods));
  const calcAmount = parseFloat(String(amount));
  const calcInterestRate = interestEnabled ? (parseFloat(String(interestRate)) || 0) : 0;
  const calcTotalWithInterest = (!isNaN(calcAmount) && calcAmount > 0 && calcInterestRate > 0)
    ? calcAmount + (calcAmount * calcInterestRate / 100)
    : calcAmount;

  const computedTotal = (!isNaN(calcPaymentAmt) && !isNaN(calcPeriods) && calcPeriods > 0)
    ? calcPaymentAmt * calcPeriods
    : null;
  const computedPeriods = (!isNaN(calcPaymentAmt) && calcPaymentAmt > 0 && !isNaN(calcTotalWithInterest) && calcTotalWithInterest > 0)
    ? Math.ceil(calcTotalWithInterest / calcPaymentAmt)
    : null;
  const computedPayment = (!isNaN(calcPeriods) && calcPeriods > 0 && !isNaN(calcTotalWithInterest) && calcTotalWithInterest > 0)
    ? calcTotalWithInterest / calcPeriods
    : null;
  const displayTotal = recurrenceMode === 'byPeriod' && computedPayment !== null
    ? Math.round(computedPayment * calcPeriods * 100) / 100
    : computedTotal;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Calculate final amount based on mode — always store the PRINCIPAL, card computes interest from it
    let finalAmount = parseFloat(String(amount));
    
    // Validate required fields
    if (!title.trim() || isNaN(finalAmount) || finalAmount <= 0) return;
    if (isRecurring && !returnDate) return;
    if (isRecurring && recurrenceMode === 'byPeriod') {
      if (isNaN(calcPeriods) || calcPeriods <= 0) return;
      if (computedPayment === null || computedPayment <= 0) return;
    } else if (isRecurring && recurrenceMode === 'byAmount') {
      if (isNaN(calcPaymentAmt) || calcPaymentAmt <= 0) return;
      if (computedPeriods === null || computedPeriods <= 0) return;
    }
    
    const submissionData: FinancialItemFormData = {
        userId: initialData?.userId || 'public_user',
        title,
        description,
        amount: finalAmount,
        category: mode,
        direction: mode === 'Loan' ? 'Incoming' : 'Outgoing',
        status: initialData?.status || 'Unpaid',
        dueDate: returnDate!,
        startDate,
        debtLoanType: mode === 'Loan' ? 'FriendFamilyCredit' : debtLoanType,
        isRecurring,
        recurrence: isRecurring ? recurrenceType : 'None',
        currency: appCurrency,
        enableReminders,
        reminderDays: Number(reminderDays),
        isArchived: initialData?.isArchived || false,
        paymentHistory: initialData?.paymentHistory || [],
    };

    if (isRecurring) {
        if (recurrenceMode === 'byPeriod' && computedPayment !== null && computedPayment > 0) {
          submissionData.recurringPaymentAmount = Math.round(computedPayment * 100) / 100;
          submissionData.recurrencePeriods = calcPeriods;
        } else if (recurrenceMode === 'byAmount' && computedPeriods !== null && computedPeriods > 0) {
          submissionData.recurringPaymentAmount = calcPaymentAmt;
          submissionData.recurrencePeriods = computedPeriods;
        }
    }

    if (debtLoanType === 'BankLoan' && mode === 'Debt') {
        submissionData.paymentMethodType = paymentMethodType;
    }

    if (interestEnabled) {
        const parsedRate = parseFloat(String(interestRate));
        if (!isNaN(parsedRate) && parsedRate > 0) {
          submissionData.interestEnabled = true;
          submissionData.interestRate = parsedRate;
        }
    }

    if (phone.trim()) {
        submissionData.phone = phone.trim();
    }

    onSubmit(submissionData);
  };

  const inputClass = "w-full bg-slate-50/50 dark:bg-[#1D2029]/50 border border-slate-200 dark:border-[#2F3441] rounded-xl px-3.5 py-2.5 md:px-4 md:py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all duration-200 outline-none";

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5 md:space-y-4">
      <div>
        <label htmlFor="fin-title" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
          {mode === 'Loan' ? 'Who are you loaning to?' : 'Who did you borrow from?'}
        </label>
        <input type="text" id="fin-title" value={title} onChange={(e) => setTitle(e.target.value)} required className={inputClass} placeholder={mode === 'Loan' ? "e.g., John Doe" : "e.g., Mom"} />
      </div>

      <div>
        <label htmlFor="fin-phone" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Phone Number (Optional)</label>
        <div className="flex gap-2">
          <input type="tel" id="fin-phone" value={phone} onChange={(e) => setPhone(e.target.value)} className={`${inputClass} flex-1`} placeholder="e.g., +1 234 567 890" />
          <button type="button" onClick={async () => {
            try {
              const ContactPicker = registerPlugin<any>('ContactPicker');
              const result = await ContactPicker.pick();
              if (result.phone) setPhone(result.phone);
              if (result.name && !title) setTitle(result.name);
            } catch (err) {
              console.log('Contact picker cancelled or failed:', err);
            }
          }} className="px-3 py-2.5 text-sm font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors whitespace-nowrap border border-indigo-200 dark:border-indigo-800">
            Pick Contact
          </button>
        </div>
      </div>

      <div>
        <label htmlFor="fin-amount" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
          {mode === 'Loan' ? 'Total Amount Loaned' : 'Total Amount Owed'}
        </label>
        <div className="relative">
          <input type="number" id="fin-amount" value={amount} onChange={(e) => setAmount(e.target.value)} required className={`${inputClass} pr-16`} placeholder="0.00" step="0.01" />
          <span className="absolute inset-y-0 right-3 flex items-center text-sm text-slate-500 dark:text-gray-400">{appCurrency}</span>
        </div>
        {isRecurring && interestEnabled && calcInterestRate > 0 && !isNaN(calcTotalWithInterest) && calcTotalWithInterest > 0 && (
          <p className="mt-1.5 text-xs text-indigo-600 dark:text-indigo-400 font-medium">Total with {calcInterestRate}% interest: {appCurrency} {calcTotalWithInterest.toFixed(2)}</p>
        )}
        {isRecurring && recurrenceMode === 'byPeriod' && displayTotal !== null && displayTotal > 0 && (
          <p className="mt-1 text-xs text-slate-500 dark:text-gray-400">Total to pay: {appCurrency} {displayTotal.toFixed(2)}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 md:gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
            {mode === 'Loan' ? 'Date Loaned' : 'Date Taken'}
          </label>
           <input type="date" value={startDate || ''} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
        </div>
        {!isRecurring && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
                {mode === 'Loan' ? 'Repayment Date' : 'Return Date'}
              </label>
              <input type="date" value={returnDate || ''} onChange={(e) => setReturnDate(e.target.value)} className={inputClass} />
            </div>
        )}
      </div>

      {mode === 'Debt' && (
      <div>
        <label htmlFor="fin-debt-type" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Type</label>
        <select id="fin-debt-type" value={debtLoanType} onChange={(e) => setDebtLoanType(e.target.value as keyof typeof DebtLoanType)} className={inputClass}>
          {Object.entries(DebtLoanType).map(([key, value]) => <option key={key} value={key}>{value}</option>)}
        </select>
      </div>
      )}

      {debtLoanType === 'BankLoan' && mode === 'Debt' && (
          <div className="animate-fade-in-fast">
              <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">Payment Recording</label>
              <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="paymentMethod" value="manual" checked={paymentMethodType === 'manual'} onChange={() => setPaymentMethodType('manual')} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 dark:bg-slate-800" />
                      <span className="text-sm">Manual Payment</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="paymentMethod" value="auto" checked={paymentMethodType === 'auto'} onChange={() => setPaymentMethodType('auto')} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 dark:bg-slate-800" />
                      <span className="text-sm">Auto Payment</span>
                  </label>
              </div>
              <p className="mt-2 text-xs text-slate-500 dark:text-gray-400">
                  {paymentMethodType === 'auto' ? 'Payments will be recorded automatically on their due date.' : 'You will need to record each payment manually.'}
              </p>
          </div>
      )}

      <div>
        <label htmlFor="fin-interest-toggle" className="flex items-center space-x-3 cursor-pointer">
          <input type="checkbox" id="fin-interest-toggle" checked={interestEnabled} onChange={(e) => { setInterestEnabled(e.target.checked); if (!e.target.checked) setInterestRate(''); }} className="h-4 w-4 rounded bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500" />
          <span className="text-sm font-medium text-slate-700 dark:text-gray-300">
            {mode === 'Loan' ? 'Charge interest on this loan' : 'Add interest to this debt'}
          </span>
        </label>
      </div>

      {interestEnabled && (
        <div className="animate-fade-in-fast">
          <label htmlFor="fin-interest-rate" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Interest Rate</label>
          <div className="relative">
            <input type="number" id="fin-interest-rate" value={interestRate} onChange={(e) => setInterestRate(e.target.value)} className={`${inputClass} pr-10`} placeholder="e.g., 5.5" step="0.1" min="0" max="100" />
            <span className="absolute inset-y-0 right-3 flex items-center text-sm text-slate-500 dark:text-gray-400">%</span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-gray-400">
            Annual interest rate. Total with interest: {(() => {
              const principal = parseFloat(String(amount)) || 0;
              const rate = parseFloat(String(interestRate)) || 0;
              const total = principal + (principal * rate / 100);
              return total > 0 ? `${total.toFixed(2)} ${appCurrency}` : '—';
            })()}
          </p>
        </div>
      )}
      
      <div>
        <label htmlFor="fin-description" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Description (Optional)</label>
        <textarea id="fin-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={inputClass} placeholder={mode === 'Loan' ? "e.g., For car repairs, to be paid back monthly." : "e.g., For concert tickets, to be paid back after next payday."} />
      </div>

      <div>
        <label htmlFor="fin-isRecurring" className="flex items-center space-x-3 cursor-pointer">
          <input type="checkbox" id="fin-isRecurring" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} className="h-4 w-4 rounded bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500" />
          <span className="text-sm font-medium text-slate-700 dark:text-gray-300">
            {mode === 'Loan' ? 'This is a recurring loan' : 'This is a recurring debt'}
          </span>
        </label>
      </div>
      
      {isRecurring && (
        <div className="pl-5 md:pl-7 space-y-3.5 md:space-y-4 animate-fade-in-fast border-l-2 border-indigo-500/30">
            <div>
                <label htmlFor="fin-recurrence-type" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Recurrence Type</label>
                <select id="fin-recurrence-type" value={recurrenceType} onChange={(e) => setRecurrenceType(e.target.value as keyof typeof FinancialItemRecurrence)} className={inputClass}>
                  {Object.values(FinancialItemRecurrence)
                    .filter(r => r !== 'None')
                    .map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1).toLowerCase()}</option>)}
                </select>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">First Payment Date</label>
                <p className="text-xs text-slate-500 dark:text-gray-400 mb-1">When will payments start?</p>
                <input type="date" value={returnDate || ''} onChange={(e) => setReturnDate(e.target.value)} className={inputClass} />
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">How do you want to set this up?</label>
                <div className="flex gap-2 mb-3">
                    <button type="button" onClick={() => setRecurrenceMode('byPeriod')} className={`flex-1 px-3 py-2 text-sm font-medium rounded-xl border transition ${recurrenceMode === 'byPeriod' ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-500/20' : 'bg-white dark:bg-gray-800 text-slate-600 dark:text-gray-300 border-slate-200 dark:border-gray-700 hover:border-indigo-400'}`}>
                        By Period
                    </button>
                    <button type="button" onClick={() => setRecurrenceMode('byAmount')} className={`flex-1 px-3 py-2 text-sm font-medium rounded-xl border transition ${recurrenceMode === 'byAmount' ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-500/20' : 'bg-white dark:bg-gray-800 text-slate-600 dark:text-gray-300 border-slate-200 dark:border-gray-700 hover:border-indigo-400'}`}>
                        By Amount
                    </button>
                </div>

                {recurrenceMode === 'byPeriod' ? (
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Number of {recurrenceType.toLowerCase()} payments *</label>
                        <p className="text-xs text-slate-500 dark:text-gray-400 mb-1">How many {recurrenceType.toLowerCase()} payments?</p>
                        <input type="number" value={recurrencePeriods} onChange={(e) => setRecurrencePeriods(e.target.value)} required className={inputClass} placeholder="e.g., 12" min="1" step="1"/>
                        {computedPayment !== null && computedPayment > 0 && (
                            <p className="mt-1.5 text-xs text-indigo-600 dark:text-indigo-400 font-medium">Payment per {recurrenceType.toLowerCase()}: {appCurrency} {computedPayment.toFixed(2)}</p>
                        )}
                        {computedTotal !== null && computedTotal > 0 && (
                            <p className="mt-1 text-xs text-slate-500 dark:text-gray-400">Total amount: {appCurrency} {computedTotal.toFixed(2)}</p>
                        )}
                    </div>
                ) : (
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Payment amount per {recurrenceType.toLowerCase()} *</label>
                        <p className="text-xs text-slate-500 dark:text-gray-400 mb-1">How much per {recurrenceType.toLowerCase()} payment?</p>
                        <input type="number" value={recurringPaymentAmount} onChange={(e) => setRecurringPaymentAmount(e.target.value)} required className={inputClass} placeholder="e.g., 100" step="0.01"/>
                        {computedPeriods !== null && computedPeriods > 0 && (
                            <p className="mt-1.5 text-xs text-indigo-600 dark:text-indigo-400 font-medium">{computedPeriods} {recurrenceType.toLowerCase()} payment{computedPeriods !== 1 ? 's' : ''}</p>
                        )}
                    </div>
                )}
            </div>
        </div>
      )}

      <div className="flex justify-end gap-2.5 md:gap-3 pt-4 md:pt-6 border-t border-slate-200/60 dark:border-gray-800/60 mt-4 md:mt-6 -mx-4 sm:-mx-6 px-4 sm:px-6 pb-1 md:pb-2">
        <button type="button" onClick={onCancel} className="px-5 py-2.5 text-sm font-bold text-slate-700 dark:text-gray-300 bg-slate-100 dark:bg-[#1D2029] rounded-xl hover:bg-slate-200 dark:hover:bg-[#242832] transition-colors border border-transparent dark:border-gray-800">Cancel</button>
        <button type="submit" className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-500 transition-colors shadow-md shadow-indigo-500/20 active:scale-95">
          {isEditMode ? 'Save Changes' : `Add ${mode}`}
        </button>
      </div>
    </form>
  );
};

export default FinancialItemForm;
