import React, { useState, useRef, useEffect } from 'react';
import { FinancialItem, ServiceCategory, FinancialItemRecurrence, RoadmapItem, LifeEvent } from '../types.ts';
import { XIcon } from './Icons.tsx';
import { cacheIcon } from '../utils/iconCache.ts';

export type ServiceFormData = {
    title: string;
    description: string;
    amount: number | string;
    provider: string;
    recurrence: keyof typeof FinancialItemRecurrence;
    serviceCategory: keyof typeof ServiceCategory;
    dueDate: string | null;
    endDate: string | null;
    enableReminders: boolean;
    reminderDays: number | string;
    icon: string | null;
    isRecurring?: boolean;
    paymentMethodType?: 'manual' | 'auto';
};

interface AddServiceFormProps {
    onSubmit: (data: ServiceFormData) => void;
    onCancel: () => void;
    initialData?: FinancialItem | null;
    roadmapItems: RoadmapItem[];
    lifeEvents: LifeEvent[];
    financialItems: FinancialItem[];
}

interface IconResult {
    name: string;
    url: string;
    source: string;
}

const useDebounce = (value: string, delay: number) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
};

const AddServiceForm: React.FC<AddServiceFormProps> = ({ onSubmit, onCancel, initialData, roadmapItems, lifeEvents, financialItems }) => {
    const isEditMode = !!initialData;

    const [serviceName, setServiceName] = useState('');
    const [icon, setIcon] = useState<string | null>(null);
    const [provider, setProvider] = useState('');
    const [amount, setAmount] = useState<number | string>('');
    const [billingCycle, setBillingCycle] = useState<keyof typeof FinancialItemRecurrence>('Monthly');
    const [category, setCategory] = useState<keyof typeof ServiceCategory>('Entertainment');
    const [startDate, setStartDate] = useState<string | null>(null);
    const [endDate, setEndDate] = useState<string | null>(null);
    const [description, setDescription] = useState('');
    const [enableReminders, setEnableReminders] = useState(true);
    const [remindMe, setRemindMe] = useState<number | string>(3);
    const [paymentMethodType, setPaymentMethodType] = useState<'manual' | 'auto'>(initialData?.paymentMethodType || 'manual');

    const [iconSuggestions, setIconSuggestions] = useState<IconResult[]>([]);
    const debouncedServiceName = useDebounce(serviceName, 300);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const selectingIcon = useRef(false);

    useEffect(() => {
        if (initialData) {
            setServiceName(initialData.title || '');
            setIcon(initialData.icon || null);
            setProvider(initialData.provider || '');
            setAmount(initialData.amount || '');
            setBillingCycle(initialData.recurrence || 'Monthly');
            setCategory(initialData.serviceCategory || 'Entertainment');
            setStartDate(initialData.dueDate || null);
            setEndDate(initialData.endDate || null);
            setDescription(initialData.description || '');
            setEnableReminders(initialData.enableReminders ?? true);
            setRemindMe(initialData.reminderDays ?? 3);
            setPaymentMethodType(initialData.paymentMethodType || 'manual');
        }
    }, [initialData]);

    useEffect(() => {
        if (!debouncedServiceName || debouncedServiceName.length < 2 || icon) {
            setIconSuggestions([]);
            return;
        }

        const key = debouncedServiceName.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        const variants = [...new Set([key, key.replace(/-/g, ''), key.split('-')[0]])].filter(Boolean);

        const suggestions: IconResult[] = variants.map((v) => ({
            name: v,
            url: `https://cdn.jsdelivr.net/gh/selfhst/icons/png/${v}.png`,
            source: 'selfhst/icons',
        }));

        setIconSuggestions(suggestions);
    }, [debouncedServiceName, icon]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setIcon(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveIcon = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIcon(null);
        setIconSuggestions([]);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleIconSelect = (iconResult: IconResult) => {
        selectingIcon.current = true;
        setIcon(iconResult.url);
        setIconSuggestions([]);
        setTimeout(() => { selectingIcon.current = false; }, 100);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (serviceName.trim() && amount && startDate) {
            if (icon) cacheIcon(icon);
            onSubmit({
                title: serviceName,
                description,
                amount: amount,
                provider,
                recurrence: billingCycle,
                serviceCategory: category,
                dueDate: startDate,
                endDate,
                enableReminders,
                reminderDays: remindMe,
                icon,
                isRecurring: true,
                paymentMethodType,
            });
        }
    };

    const inputClass = "w-full bg-slate-50/50 dark:bg-[#1D2029]/50 border border-slate-200 dark:border-[#2F3441] rounded-xl px-3.5 py-2.5 md:px-4 md:py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all duration-200 outline-none";

    return (
        <form onSubmit={handleSubmit} className="space-y-3.5 md:space-y-4">
            {/* Service Name and Icon Upload */}
            <div className="flex items-start gap-3 md:gap-4">
                <div className="flex-grow relative">
                    <label htmlFor="service-name" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Service Name *</label>
                    <input
                        type="text"
                        id="service-name"
                        value={serviceName}
                        onChange={(e) => { setServiceName(e.target.value); if (icon) setIcon(null); }}
                        onBlur={() => { setTimeout(() => { if (!selectingIcon.current) setIconSuggestions([]); }, 200); }}
                        required
                        className={inputClass}
                        placeholder="e.g., Netflix, Spotify"
                        autoComplete="off"
                    />
                    {iconSuggestions.length > 0 && !icon && (
                        <div ref={dropdownRef}>
                            <ul className="absolute z-20 mt-1 w-full bg-white dark:bg-[#1D2029] border border-slate-200 dark:border-[#2F3441] rounded-xl shadow-lg max-h-60 overflow-y-auto">
                                {iconSuggestions.map((s) => (
                                    <li
                                        key={s.url}
                                        className="p-2 hover:bg-slate-100 dark:hover:bg-[#242832] cursor-pointer flex items-center gap-2 transition-colors"
                                        onMouseDown={(e) => { e.preventDefault(); handleIconSelect(s); }}
                                        onTouchStart={(e) => { e.preventDefault(); handleIconSelect(s); }}
                                    >
                                        <img
                                            src={s.url}
                                            alt={s.name}
                                            className="w-6 h-6 rounded"
                                            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                                        />
                                        <span className="text-sm text-slate-700 dark:text-gray-300">{s.name}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
                <div className="flex-shrink-0">
                    <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1 invisible">Icon</label>
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="px-4 py-2.5 text-sm font-bold text-slate-700 dark:text-gray-300 bg-slate-100 dark:bg-[#1D2029] rounded-xl hover:bg-slate-200 dark:hover:bg-[#242832] transition-colors">Upload</button>
                        <input id="icon-upload" name="icon-upload" type="file" accept="image/*" className="sr-only" ref={fileInputRef} onChange={handleFileChange} />
                        {icon ? (
                            <div className="relative group">
                                <img src={icon} alt="Service icon" className="w-10 h-10 object-contain rounded-xl bg-white p-1 shadow-sm" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                                <button type="button" onClick={handleRemoveIcon} className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5 text-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Remove icon">
                                    <XIcon className="w-3 h-3" />
                                </button>
                            </div>
                        ) : <div className="w-10 h-10 bg-slate-100 dark:bg-[#1D2029] rounded-xl border border-slate-200 dark:border-[#2F3441] border-dashed"></div>}
                    </div>
                </div>
            </div>

            {/* Provider */}
            <div>
                <label htmlFor="provider" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Provider (Optional)</label>
                <input type="text" id="provider" value={provider} onChange={(e) => setProvider(e.target.value)} className={inputClass} placeholder="e.g., Netflix Inc., Google" />
            </div>

            {/* Amount and Billing Cycle */}
            <div className="grid grid-cols-2 gap-3 md:gap-4">
                <div>
                    <label htmlFor="amount" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Amount *</label>
                    <input type="number" id="amount" value={amount} onChange={(e) => setAmount(e.target.value)} required className={inputClass} placeholder="0.00" step="0.01" />
                </div>
                <div>
                    <label htmlFor="billing-cycle" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Billing Cycle</label>
                    <select id="billing-cycle" value={billingCycle} onChange={(e) => setBillingCycle(e.target.value as keyof typeof FinancialItemRecurrence)} className={inputClass}>
                        {Object.values(FinancialItemRecurrence).map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                </div>
            </div>

            {/* Category */}
            <div>
                <label htmlFor="service-category" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Category</label>
                <select id="service-category" value={category} onChange={(e) => setCategory(e.target.value as keyof typeof ServiceCategory)} className={inputClass}>
                    {Object.values(ServiceCategory).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>

            {/* Start and End Dates */}
            <div className="grid grid-cols-2 gap-3 md:gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Start Date *</label>
                    <input type="date" value={startDate || ''} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">End Date (Optional)</label>
                    <input type="date" value={endDate || ''} onChange={(e) => setEndDate(e.target.value)} className={inputClass} />
                </div>
            </div>

            {/* Description */}
            <div>
                <label htmlFor="description" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Description (Optional)</label>
                <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={inputClass} placeholder="e.g., Premium subscription with family plan" />
            </div>

            {/* Payment Method */}
            <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">Payment Method</label>
                <div className="flex gap-3">
                    <label className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border cursor-pointer transition-all ${paymentMethodType === 'manual' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40' : 'border-slate-200 dark:border-gray-700 bg-white dark:bg-[#1D2029]'}`}>
                        <input type="radio" name="paymentMethod" value="manual" checked={paymentMethodType === 'manual'} onChange={() => setPaymentMethodType('manual')} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 dark:bg-slate-800" />
                        <div>
                            <span className="text-sm font-semibold text-slate-700 dark:text-gray-200">Manual</span>
                            <p className="text-xs text-slate-500 dark:text-gray-400">Record each payment yourself</p>
                        </div>
                    </label>
                    <label className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border cursor-pointer transition-all ${paymentMethodType === 'auto' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40' : 'border-slate-200 dark:border-gray-700 bg-white dark:bg-[#1D2029]'}`}>
                        <input type="radio" name="paymentMethod" value="auto" checked={paymentMethodType === 'auto'} onChange={() => setPaymentMethodType('auto')} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 dark:bg-slate-800" />
                        <div>
                            <span className="text-sm font-semibold text-slate-700 dark:text-gray-200">Auto</span>
                            <p className="text-xs text-slate-500 dark:text-gray-400">Auto-record on due date</p>
                        </div>
                    </label>
                </div>
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-2.5 md:gap-3 pt-4 md:pt-6 border-t border-slate-200/60 dark:border-gray-800/60 mt-4 md:mt-6 -mx-4 sm:-mx-6 px-4 sm:px-6 pb-1 md:pb-2">
                <button type="button" onClick={onCancel} className="px-5 py-2.5 text-sm font-bold text-slate-700 dark:text-gray-300 bg-slate-100 dark:bg-[#1D2029] rounded-xl hover:bg-slate-200 dark:hover:bg-[#242832] transition-colors border border-transparent dark:border-gray-800">Cancel</button>
                <button type="submit" className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-500 transition-colors shadow-md shadow-indigo-500/20 active:scale-95">{isEditMode ? 'Save Changes' : 'Add Service'}</button>
            </div>
        </form>
    );
};

export default AddServiceForm;
