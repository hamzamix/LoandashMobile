import React, { useMemo, useState, useRef, useCallback } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis } from 'recharts';
import { FinancialItem } from '../types.ts';

interface StatisticsViewProps {
    financialItems: FinancialItem[];
    appCurrency: string;
}

const DEBT_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#fb923c', '#fdba74'];
const LOAN_COLORS = ['#22c55e', '#14b8a6', '#06b6d4', '#2dd4bf', '#34d399', '#6ee7b7'];
const SERVICE_COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c084fc', '#e879f9', '#d946ef'];

const formatCurrency = (val: number, currency: string) => {
    try {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(val);
    } catch {
        return `${currency} ${val.toFixed(0)}`;
    }
};

const CustomTooltip = ({ active, payload, currency }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white dark:bg-[#1D2029] border border-slate-200 dark:border-gray-700 rounded-lg px-3 py-2 shadow-lg">
            <p className="text-xs font-semibold text-slate-900 dark:text-white">{payload[0].name}</p>
            <p className="text-xs text-slate-500 dark:text-gray-400">{formatCurrency(payload[0].value, currency)}</p>
        </div>
    );
};

interface BreakdownCardProps {
    title: string;
    data: Array<{ name: string; value: number }>;
    colors: string[];
    appCurrency: string;
}

const BreakdownCard: React.FC<BreakdownCardProps> = ({ title, data, colors, appCurrency }) => {
    const total = data.reduce((s, d) => s + d.value, 0);

    return (
        <div>
            <h3 className="text-sm font-bold text-slate-700 dark:text-gray-300 mb-3">{title}</h3>
            <div className="flex items-center gap-4">
                <div className="shrink-0">
                    <ResponsiveContainer width={160} height={160}>
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={40}
                                outerRadius={70}
                                paddingAngle={2}
                                dataKey="value"
                                labelLine={false}
                            >
                                {data.map((_, i) => (
                                    <Cell key={i} fill={colors[i % colors.length]} />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip currency={appCurrency} />} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="flex-1 overflow-y-auto max-h-[170px] space-y-1.5 pr-1">
                    {data.map((item, i) => {
                        const pct = total > 0 ? ((item.value / total) * 100).toFixed(0) : '0';
                        return (
                            <div key={item.name} className="flex items-center gap-2 min-w-0">
                                <span
                                    className="w-2.5 h-2.5 rounded-full shrink-0"
                                    style={{ backgroundColor: colors[i % colors.length] }}
                                />
                                <span className="text-xs text-slate-700 dark:text-gray-300 truncate flex-1">{item.name}</span>
                                <span className="text-xs font-bold text-slate-900 dark:text-white shrink-0">
                                    {formatCurrency(item.value, appCurrency)}
                                </span>
                                <span className="text-[10px] text-slate-400 dark:text-gray-500 shrink-0">({pct}%)</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

const StatisticsView: React.FC<StatisticsViewProps> = ({ financialItems, appCurrency }) => {
    const [activeLines, setActiveLines] = useState<Record<string, boolean>>({
        debt: true,
        loan: true,
        service: true,
    });

    const [activeSlide, setActiveSlide] = useState(0);
    const touchStartX = useRef(0);
    const touchDeltaX = useRef(0);

    const { debtData, loanData, serviceData } = useMemo(() => {
        const debts = financialItems.filter(i => i.category === 'Debt' && !i.isArchived);
        const loans = financialItems.filter(i => i.category === 'Loan' && !i.isArchived);
        const services = financialItems.filter(i => (i.category === 'Subscription' || i.category === 'Bill') && !i.isArchived);

        const debtData = debts
            .map(d => {
                const intAmt = (d.interestEnabled && d.interestRate && d.interestRate > 0) ? d.amount * (d.interestRate / 100) : 0;
                const totalOwed = d.amount + intAmt;
                const paid = (d.paymentHistory || []).reduce((s, p) => s + p.amount, 0);
                const remaining = Math.max(0, totalOwed - paid);
                return { name: d.title, value: remaining };
            })
            .filter(d => d.value > 0)
            .sort((a, b) => b.value - a.value)
            .slice(0, 6);

        const loanData = loans
            .map(l => {
                const intAmt = (l.interestEnabled && l.interestRate && l.interestRate > 0) ? l.amount * (l.interestRate / 100) : 0;
                const totalOwed = l.amount + intAmt;
                const paid = (l.paymentHistory || []).reduce((s, p) => s + p.amount, 0);
                const remaining = Math.max(0, totalOwed - paid);
                return { name: l.title, value: remaining };
            })
            .filter(l => l.value > 0)
            .sort((a, b) => b.value - a.value)
            .slice(0, 6);

        const serviceData = services
            .map(s => {
                const totalPaid = (s.paymentHistory || []).reduce((sum, p) => sum + p.amount, 0);
                return { name: s.title, value: totalPaid };
            })
            .filter(s => s.value > 0)
            .sort((a, b) => b.value - a.value)
            .slice(0, 6);

        return { debtData, loanData, serviceData };
    }, [financialItems]);

    const breakdowns = useMemo(() => {
        const list: Array<{ title: string; data: Array<{ name: string; value: number }>; colors: string[] }> = [];
        if (debtData.length > 0) list.push({ title: 'Debts You Owe', data: debtData, colors: DEBT_COLORS });
        if (loanData.length > 0) list.push({ title: 'Loans Owed to You', data: loanData, colors: LOAN_COLORS });
        if (serviceData.length > 0) list.push({ title: 'Bills & Subscriptions', data: serviceData, colors: SERVICE_COLORS });
        return list;
    }, [debtData, loanData, serviceData]);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
        touchDeltaX.current = 0;
    }, []);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
    }, []);

    const handleTouchEnd = useCallback(() => {
        const threshold = 50;
        if (touchDeltaX.current < -threshold && activeSlide < breakdowns.length - 1) {
            setActiveSlide(prev => prev + 1);
        } else if (touchDeltaX.current > threshold && activeSlide > 0) {
            setActiveSlide(prev => prev - 1);
        }
    }, [activeSlide, breakdowns.length]);

    const lineData = useMemo(() => {
        const allTransactions: Array<{ date: string; amount: number; type: string }> = [];

        financialItems.forEach(item => {
            (item.paymentHistory || []).forEach(p => {
                let type = 'ServicePayment';
                if (item.category === 'Debt') type = 'DebtPayment';
                else if (item.category === 'Loan') type = 'LoanRepayment';
                allTransactions.push({ date: p.date, amount: p.amount, type });
            });
        });

        const grouped: Record<string, { DebtPayments: number; LoanRepayments: number; ServicePayments: number }> = {};
        allTransactions.forEach(t => {
            const month = t.date.substring(0, 7);
            if (!grouped[month]) grouped[month] = { DebtPayments: 0, LoanRepayments: 0, ServicePayments: 0 };
            if (t.type === 'DebtPayment') grouped[month].DebtPayments += t.amount;
            else if (t.type === 'LoanRepayment') grouped[month].LoanRepayments += t.amount;
            else grouped[month].ServicePayments += t.amount;
        });

        return Object.entries(grouped)
            .map(([month, amounts]) => ({ month, ...amounts }))
            .sort((a, b) => a.month.localeCompare(b.month));
    }, [financialItems]);

    const hasAnyData = breakdowns.length > 0 || lineData.length > 0;

    if (!hasAnyData) return null;

    return (
        <div className="space-y-4 md:space-y-6">
            {/* Breakdown Carousel */}
            {breakdowns.length > 0 && (
                <div className="bg-white dark:bg-[#0E1324] p-4 md:p-6 rounded-2xl md:rounded-3xl border border-slate-200/60 dark:border-gray-800/60 shadow-xl">
                    <h2 className="text-lg md:text-xl font-black text-slate-900 dark:text-white mb-4">Breakdowns</h2>

                    <div
                        className="overflow-hidden"
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                    >
                        <div
                            className="flex transition-transform duration-300 ease-out"
                            style={{ transform: `translateX(-${activeSlide * 100}%)` }}
                        >
                            {breakdowns.map((b, i) => (
                                <div key={i} className="w-full shrink-0 px-1">
                                    <BreakdownCard
                                        title={b.title}
                                        data={b.data}
                                        colors={b.colors}
                                        appCurrency={appCurrency}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {breakdowns.length > 1 && (
                        <div className="flex items-center justify-center gap-2 mt-4">
                            {breakdowns.map((b, i) => (
                                <button
                                    key={i}
                                    onClick={() => setActiveSlide(i)}
                                    className={`h-1.5 rounded-full transition-all duration-200 ${
                                        i === activeSlide
                                            ? 'w-6 bg-indigo-500'
                                            : 'w-1.5 bg-slate-300 dark:bg-gray-600'
                                    }`}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Financial Activity Over Time */}
            {lineData.length > 0 && (
                <div className="bg-white dark:bg-[#0E1324] p-4 md:p-6 rounded-2xl md:rounded-3xl border border-slate-200/60 dark:border-gray-800/60 shadow-xl">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg md:text-xl font-black text-slate-900 dark:text-white">Activity Over Time</h2>
                        <div className="flex gap-1">
                            {[
                                { key: 'debt', label: 'Debts', color: '#ef4444' },
                                { key: 'loan', label: 'Loans', color: '#22c55e' },
                                { key: 'service', label: 'Services', color: '#6366f1' },
                            ].map(l => (
                                <button
                                    key={l.key}
                                    onClick={() => setActiveLines(prev => ({ ...prev, [l.key]: !prev[l.key] }))}
                                    className={`px-2 py-1 rounded-md text-[10px] font-bold transition-colors ${
                                        activeLines[l.key]
                                            ? 'text-white'
                                            : 'bg-slate-100 dark:bg-[#1D2029] text-slate-400 dark:text-gray-500'
                                    }`}
                                    style={activeLines[l.key] ? { backgroundColor: l.color } : undefined}
                                >
                                    {l.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={lineData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-gray-700" />
                            <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                            <YAxis tickFormatter={(val) => formatCurrency(val, appCurrency)} tick={{ fontSize: 10 }} stroke="#94a3b8" width={60} />
                            <Tooltip formatter={(value: number) => formatCurrency(value, appCurrency)} />
                            {activeLines.debt && <Line type="monotone" dataKey="DebtPayments" name="Debt Payments" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 6 }} />}
                            {activeLines.loan && <Line type="monotone" dataKey="LoanRepayments" name="Loan Repayments" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 6 }} />}
                            {activeLines.service && <Line type="monotone" dataKey="ServicePayments" name="Service Payments" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 6 }} />}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
};

export default StatisticsView;
