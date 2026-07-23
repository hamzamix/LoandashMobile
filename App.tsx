import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import useLocalStorage from './hooks/useLocalStorage.ts';
import { useNotifications } from './hooks/useNotifications.ts';
import { FinancialItem, Payment, AppUser } from './types.ts';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { cacheIcons } from './utils/iconCache.ts';
import FinanceTrackerView from './components/FinanceTrackerView.tsx';
import SettingsView from './components/SettingsView.tsx';
import DashboardView from './components/DashboardView.tsx';
import Modal from './components/Modal.tsx';
import FinancialItemForm from './components/FinancialItemForm.tsx';
import AddServiceForm from './components/AddServiceForm.tsx';
import {
  apiGetItems,
  isOnlineMode, getApiBase
} from './src/api/client.ts';

import { FinanceIcon, SettingsIcon, ThemeIcon, CalendarIcon, DashboardIcon, SunIcon, MoonIcon, CreditCardIcon, LandmarkIcon, CoinsIcon, TrendingUpIcon, PlusIcon, SearchIcon, XIcon } from './components/Icons.tsx';

export type LoanDashTab = 'All' | 'Services' | 'Debts' | 'Loans' | 'Archive' | 'Settings';

const canUseServerSync = () => {
  if (typeof window === 'undefined') return false;
  if (!window.location.protocol.startsWith('http')) return false;
  const port = window.location.port;
  if (port === '5173' || port === '5183') return false;
  return true;
};

const App: React.FC = () => {
  const user = { uid: 'public_user', email: 'public@example.com', displayName: 'User' };
  const [currentUserData, setCurrentUserData] = useState<AppUser | null>({
    uid: 'public_user',
    email: 'public@example.com',
    displayName: 'User',
    role: 'client',
    createdAt: new Date().toISOString()
  });
  const [financialItems, setFinancialItems] = useLocalStorage<FinancialItem[]>('loanDashFinancialItems', []);
  const onlineMode = isOnlineMode();
  const isNative = Capacitor.isNativePlatform();
  const isCompanion = isNative && !!getApiBase();
  const isWeb = !isNative;

  // Sanitize financialItems on load — prevents crash from old/corrupted localStorage data
  useEffect(() => {
    if (!Array.isArray(financialItems)) {
      setFinancialItems([]);
      return;
    }

    // One-time migration: fix amounts where interest was baked into the principal by old buggy builds
    if (localStorage.getItem('_v1010_interest_fix') === '1') return;
    let changed = false;
    const fixed = financialItems.map(item => {
      if (!item.interestEnabled || !item.interestRate || item.interestRate <= 0) return item;
      if (!item.isRecurring || !item.recurringPaymentAmount || !item.recurrencePeriods) return item;
      if (item.category !== 'Debt' && item.category !== 'Loan') return item;

      const rate = item.interestRate;
      const totalFromPayments = item.recurringPaymentAmount * item.recurrencePeriods;
      const distAsPrincipal = Math.abs(totalFromPayments - item.amount * (1 + rate / 100));
      const distAsTotal = Math.abs(totalFromPayments - item.amount);

      // If the stored amount is closer to the total (recurringPaymentAmount * periods)
      // than to amount*(1+rate/100), then amount was inflated — divide by (1+rate/100)
      if (distAsTotal < distAsPrincipal && distAsPrincipal > 1) {
        changed = true;
        const corrected = Math.round((item.amount / (1 + rate / 100)) * 100) / 100;
        return { ...item, amount: corrected };
      }
      return item;
    });

    if (changed) {
      setFinancialItems(fixed);
    }
    localStorage.setItem('_v1010_interest_fix', '1');
  }, []);

  const [activeTab, setActiveTab] = useLocalStorage<LoanDashTab>('loanDashActiveTab', 'All');
  const [themeMode, setThemeMode] = useLocalStorage<'system' | 'light' | 'dark'>('theme', 'system');
  const [appCurrency, setAppCurrency] = useLocalStorage<string>('appCurrency', 'USD');
  const [notificationsEnabled, setNotificationsEnabled] = useLocalStorage<boolean>('loanDashNotifications', false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // Changed to false as local storage is sync or near-sync in this context

  useNotifications(financialItems, notificationsEnabled, appCurrency);

  // Modal states moved from FinanceTrackerView
  const [isDebtLoanModalOpen, setIsDebtLoanModalOpen] = useState(false);
  const [isAddServiceModalOpen, setIsAddServiceModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FinancialItem | null>(null);
  const [formMode, setFormMode] = useState<'Debt' | 'Loan' | null>(null);

  useEffect(() => {
    setIsSearchOpen(false);
    setSearchQuery('');
  }, [activeTab]);

  const handleOpenDebtLoanModal = (item: FinancialItem | null = null, mode: 'Debt' | 'Loan' | null = null) => {
    setEditingItem(item);
    setFormMode(mode);
    setIsDebtLoanModalOpen(true);
  };

  const handleOpenServiceModal = (item: FinancialItem | null = null) => {
    setEditingItem(item);
    setIsAddServiceModalOpen(true);
  };

  const handleGlobalAdd = () => {
    if (activeTab === 'Services') handleOpenServiceModal();
    else if (activeTab === 'Debts') handleOpenDebtLoanModal(null, 'Debt');
    else if (activeTab === 'Loans') handleOpenDebtLoanModal(null, 'Loan');
    else {
        // Default to service if on Dashboard or other
        handleOpenServiceModal();
    }
  };

  // System theme detection
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => {
    if (themeMode !== 'system') return themeMode;
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark';
  });

  // Sync theme
  useEffect(() => {
    const applyTheme = (isDark: boolean) => {
      if (isDark) {
        document.documentElement.classList.add('dark');
        StatusBar.setStyle({ style: Style.Dark });
        StatusBar.setBackgroundColor({ color: '#0E1324' });
      } else {
        document.documentElement.classList.remove('dark');
        StatusBar.setStyle({ style: Style.Light });
        StatusBar.setBackgroundColor({ color: '#F8FAFC' });
      }
      StatusBar.setOverlaysWebView({ overlay: false });
    };

    if (themeMode === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const isDark = mq.matches;
      setResolvedTheme(isDark ? 'dark' : 'light');
      applyTheme(isDark);

      const handler = (e: MediaQueryListEvent) => {
        setResolvedTheme(e.matches ? 'dark' : 'light');
        applyTheme(e.matches);
      };
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    } else {
      const isDark = themeMode === 'dark';
      setResolvedTheme(isDark ? 'dark' : 'light');
      applyTheme(isDark);
    }
  }, [themeMode]);

  // Sync user data record - Disabled as login is removed
  useEffect(() => {
      // Logic removed
  }, []);

  const hasLoadedFromServer = useRef(false);
  const dbDataRef = useRef<any>({ financialItems: [], settings: null });

  // Load from the optional local server when running through server.js.
  useEffect(() => {
    if (!canUseServerSync()) {
      hasLoadedFromServer.current = true;
      return;
    }

    setIsLoading(true);
    fetch('/api/data')
      .then(res => {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.json();
      })
      .then(data => {
        dbDataRef.current = data;
        if (data && data.financialItems) {
          setFinancialItems(data.financialItems);
        }
        hasLoadedFromServer.current = true;
        setIsLoading(false);
      })
      .catch(() => {
        hasLoadedFromServer.current = true;
        setIsLoading(false);
      });
  }, []);

  // Load data from API when in online mode
  useEffect(() => {
    if (!onlineMode) return;
    setIsLoading(true);
    apiGetItems()
      .then(items => {
        setFinancialItems(items);
        setIsLoading(false);
      })
      .catch(() => {
        setIsLoading(false);
      });
  }, [onlineMode]);

  // Save to the optional local server. Android and Vite dev use localStorage only.
  useEffect(() => {
    if (!hasLoadedFromServer.current) return;
    if (!canUseServerSync()) return;

    const payload = {
      ...dbDataRef.current,
      financialItems: financialItems
    };

    fetch('/api/data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
    .then(res => {
      if (!res.ok) {
        console.error('Failed to save data to server');
      }
    })
    .catch(() => {});
  }, [financialItems]);

  // Pre-cache all service icons on load for offline use
  useEffect(() => {
    if (financialItems.length === 0) return;
    cacheIcons(financialItems.map(i => i.icon));
  }, [financialItems]);

  // Auto-Payment Processor
  useEffect(() => {
    if (isLoading || financialItems.length === 0) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const updates: Map<string, { payments: Payment[]; status: string }> = new Map();

    financialItems.forEach((item) => {
        if (item.paymentMethodType !== 'auto') return;
        if (!item.isRecurring || item.recurrence === 'None' || !item.dueDate) return;
        if (item.isArchived) return;
        
        const startDate = new Date(`${item.dueDate}T00:00:00`);
        let pDate = new Date(startDate);
        const payments = [...(item.paymentHistory || [])];
        
        const addRecurrence = (d: Date, rec: string) => {
            const nd = new Date(d);
            if(rec === 'Daily') nd.setDate(nd.getDate() + 1);
            else if(rec === 'Weekly') nd.setDate(nd.getDate() + 7);
            else if(rec === 'Monthly') {
                const od = startDate.getDate();
                nd.setMonth(nd.getMonth() + 1);
                nd.setDate(od);
                if (nd.getMonth() !== ((new Date(d).getMonth() + 1) % 12)) nd.setDate(0);
            }
            else if(rec === 'Yearly') nd.setFullYear(nd.getFullYear() + 1);
            return nd;
        };

        if (!['Monthly', 'Yearly', 'Daily', 'Weekly'].includes(item.recurrence || '')) return;

        let shouldUpdate = false;
        let failsafe = 0;
        
        while(pDate <= today && failsafe < 1000) {
            failsafe++;
            const year = pDate.getFullYear();
            const month = pDate.getMonth();
            const day = pDate.getDate();

            let hasPayment = false;
            if (item.recurrence === 'Monthly') {
                hasPayment = payments.some(p => { const pd = new Date(`${p.date}T00:00:00`); return pd.getFullYear() === year && pd.getMonth() === month; });
            } else if (item.recurrence === 'Yearly') {
                hasPayment = payments.some(p => { const pd = new Date(`${p.date}T00:00:00`); return pd.getFullYear() === year; });
            } else if (item.recurrence === 'Weekly' || item.recurrence === 'Daily') {
                hasPayment = payments.some(p => { const pd = new Date(`${p.date}T00:00:00`); return pd.getFullYear() === year && pd.getMonth() === month && pd.getDate() === day; });
            }

            if (!hasPayment) {
                 const nextAmount = item.recurringPaymentAmount || item.amount;
                     if (nextAmount > 0) {
                         let finalAmount = nextAmount;
                         if (item.category === 'Debt' || item.category === 'Loan') {
                             const currentTotalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
                             const intAmt = (item.interestEnabled && item.interestRate && item.interestRate > 0) ? item.amount * (item.interestRate / 100) : 0;
                             const totalOwed = item.amount + intAmt;
                             if (totalOwed > 0 && currentTotalPaid >= totalOwed) {
                                 break;
                             }
                             if (totalOwed > 0 && currentTotalPaid + finalAmount > totalOwed) {
                                 finalAmount = totalOwed - currentTotalPaid;
                             }
                         }

                     payments.push({
                         id: `pay_auto_${item.id}_${year}_${month}_${day}_${Math.random().toString(36).substring(7)}`,
                         date: `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
                         amount: finalAmount,
                         method: 'Auto-Payment',
                         notes: `Auto-recorded payment for ${item.title}`
                     });
                     shouldUpdate = true;
                 }
            }
            pDate = addRecurrence(pDate, item.recurrence as string);
        }
        
        if (shouldUpdate) {
            const intAmt = (item.interestEnabled && item.interestRate && item.interestRate > 0) ? item.amount * (item.interestRate / 100) : 0;
            const totalOwed = item.amount + intAmt;
            const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
            const newStatus = totalOwed > 0 && totalPaid >= totalOwed ? 'Paid' : totalPaid > 0 ? 'Partial' : 'Unpaid';
            updates.set(item.id, { payments, status: newStatus });
        }
    });

    if (updates.size > 0) {
        setFinancialItems(prev => prev.map(i => {
            const update = updates.get(i.id);
            if (!update) return i;
            return { ...i, paymentHistory: update.payments, status: update.status as FinancialItem['status'] };
        }));
    }

  }, [financialItems, isLoading, setFinancialItems]);

  // Financial item operations — dual mode (API or localStorage)
  const handleAddFinancialItem = async (i: any) => {
    const id = `fin_${Date.now()}`;
    const newItem = { ...i, id, userId: user.uid, paymentHistory: [], isArchived: false };
    setFinancialItems(prev => [...prev, newItem]);
  };

  const handleUpdateFinancialItem = async (u: any) => {
    setFinancialItems(prev => prev.map(i => i.id === u.id ? { ...i, ...u } : i));
  };

  const handleDeleteFinancialItem = async (id: string) => {
    setFinancialItems(prev => prev.filter(i => i.id !== id));
  };

  const handleAddPayment = async (itemId: string, p: any) => {
    const paymentId = `pay_${Date.now()}`;
    setFinancialItems(prev => prev.map(item => {
        if (item.id === itemId) {
            const updatedHistory = [...(item.paymentHistory || []), { ...p, id: paymentId }];
            const totalPaid = updatedHistory.reduce((sum, pay) => sum + pay.amount, 0);
            let newStatus = 'Paid';
            if (item.category === 'Debt' || item.category === 'Loan') {
                const intAmt = (item.interestEnabled && item.interestRate && item.interestRate > 0) ? item.amount * (item.interestRate / 100) : 0;
                const totalOwed = item.amount + intAmt;
                if (totalOwed > 0 && totalPaid >= totalOwed) {
                    newStatus = 'Paid';
                } else if (totalPaid > 0) {
                    newStatus = 'Partial';
                } else {
                    newStatus = 'Unpaid';
                }
            }
            return { ...item, paymentHistory: updatedHistory, status: newStatus as FinancialItem['status'] };
        }
        return item;
    }));
  };

  const handleAddPayments = async (itemId: string, payments: any[]) => {
    setFinancialItems(prev => prev.map(item => {
        if (item.id === itemId) {
            let updatedHistory = [...(item.paymentHistory || [])];
            payments.forEach((p, idx) => {
                updatedHistory.push({ ...p, id: `pay_${Date.now()}_${idx}` });
            });
            const totalPaid = updatedHistory.reduce((sum, pay) => sum + pay.amount, 0);
            let newStatus = 'Paid';
            if (item.category === 'Debt' || item.category === 'Loan') {
                const intAmt = (item.interestEnabled && item.interestRate && item.interestRate > 0) ? item.amount * (item.interestRate / 100) : 0;
                const totalOwed = item.amount + intAmt;
                if (totalOwed > 0 && totalPaid >= totalOwed) {
                    newStatus = 'Paid';
                } else if (totalPaid > 0) {
                    newStatus = 'Partial';
                } else {
                    newStatus = 'Unpaid';
                }
            }
            return { ...item, paymentHistory: updatedHistory, status: newStatus as FinancialItem['status'] };
        }
        return item;
    }));
  };

  const handleUpdatePayment = async (itemId: string, paymentId: string, paymentData: any) => {
    setFinancialItems(prev => prev.map(item => {
        if (item.id === itemId) {
            const updatedHistory = (item.paymentHistory || []).map(p => 
                p.id === paymentId ? { ...p, ...paymentData } : p
            );
            const totalPaid = updatedHistory.reduce((sum, pay) => sum + pay.amount, 0);
            let newStatus = 'Paid';
            if (item.category === 'Debt' || item.category === 'Loan') {
                const intAmt = (item.interestEnabled && item.interestRate && item.interestRate > 0) ? item.amount * (item.interestRate / 100) : 0;
                const totalOwed = item.amount + intAmt;
                if (totalOwed > 0 && totalPaid >= totalOwed) {
                    newStatus = 'Paid';
                } else if (totalPaid > 0) {
                    newStatus = 'Partial';
                } else {
                    newStatus = 'Unpaid';
                }
            }
            return { ...item, paymentHistory: updatedHistory, status: newStatus as FinancialItem['status'] };
        }
        return item;
    }));
  };

  const handleDeletePayment = async (itemId: string, paymentId: string) => {
    setFinancialItems(prev => prev.map(item => {
        if (item.id === itemId) {
            const updatedHistory = (item.paymentHistory || []).filter(p => p.id !== paymentId);
            const totalPaid = updatedHistory.reduce((sum, pay) => sum + pay.amount, 0);
            let newStatus = 'Paid';
            if (item.category === 'Debt' || item.category === 'Loan') {
                const intAmt = (item.interestEnabled && item.interestRate && item.interestRate > 0) ? item.amount * (item.interestRate / 100) : 0;
                const totalOwed = item.amount + intAmt;
                if (totalOwed > 0 && totalPaid >= totalOwed) {
                    newStatus = 'Paid';
                } else if (totalPaid > 0) {
                    newStatus = 'Partial';
                } else {
                    newStatus = 'Unpaid';
                }
            } else {
                newStatus = updatedHistory.length > 0 ? 'Paid' : 'Unpaid';
            }
            return { ...item, paymentHistory: updatedHistory, status: newStatus as FinancialItem['status'] };
        }
        return item;
    }));
  };

  const handleArchiveFinancialItem = async (id: string) => {
    setFinancialItems(prev => prev.map(i => i.id === id ? { ...i, isArchived: true } : i));
  };

  const handleUnarchiveFinancialItem = async (id: string) => {
    setFinancialItems(prev => prev.map(i => i.id === id ? { ...i, isArchived: false } : i));
  };
  
  const handleRestoreFromData = async (data: any) => { 
      if (data && data.financialItems) {
          setFinancialItems(data.financialItems);
      }
  };

  // Compute stats for overview cards
  const stats = useMemo(() => {
    const active = financialItems.filter(i => !i.isArchived);
    
    // Subscriptions
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

    // Overdue count
    const todayStr = new Date().toISOString().split('T')[0];
    const overdueCount = active.filter(i => {
        if (i.status === 'Paid') return false;
        return i.dueDate && i.dueDate < todayStr;
    }).length;

    return {
        monthlySubscriptionsCost,
        remainingDebts,
        remainingLoans,
        overdueCount
    };
  }, [financialItems]);

  const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: appCurrency }).format(amount);
  };

  if (isLoading) {
      return (
          <div className="h-screen w-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-[#0B0F1A] text-gray-400">
              <div className="animate-pulse flex flex-col items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                      <CoinsIcon className="w-9 h-9 text-white animate-bounce" />
                  </div>
                  <span className="text-sm font-semibold tracking-wide text-indigo-500/80">Loading LoanDash...</span>
              </div>
          </div>
      );
  }

  const tabs: Array<{ id: LoanDashTab; label: string; icon: JSX.Element }> = [
    { id: 'All', label: 'Overview', icon: <DashboardIcon className="w-5 h-5" /> },
    { id: 'Services', label: 'Bills & Subs', icon: <CreditCardIcon className="w-5 h-5" /> },
    { id: 'Debts', label: 'Debts', icon: <LandmarkIcon className="w-5 h-5" /> },
    { id: 'Loans', label: 'Loans', icon: <TrendingUpIcon className="w-5 h-5" /> },
    { id: 'Archive', label: 'Archive', icon: <CalendarIcon className="w-5 h-5" /> },
    { id: 'Settings', label: 'Settings', icon: <SettingsIcon className="w-5 h-5" /> },
  ];

  const themeBtn = (
      <button 
          onClick={() => {
              const cycle: Array<'system' | 'light' | 'dark'> = ['system', 'light', 'dark'];
              const idx = cycle.indexOf(themeMode);
              setThemeMode(cycle[(idx + 1) % cycle.length]);
          }}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-800 text-slate-500 dark:text-gray-400 transition"
          title={`Theme: ${themeMode}`}
      >
          {themeMode === 'system' ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" /></svg>
          ) : resolvedTheme === 'dark' ? (
              <SunIcon className="w-5 h-5" />
          ) : (
              <MoonIcon className="w-5 h-5" />
          )}
      </button>
  );

  const searchBtn = activeTab !== 'All' && activeTab !== 'Settings' ? (
      <button
          onClick={() => {
              if (isSearchOpen) { setSearchQuery(''); setIsSearchOpen(false); }
              else { setIsSearchOpen(true); }
          }}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-800 text-slate-500 dark:text-gray-400 transition"
          title="Search"
      >
          {isSearchOpen ? <XIcon className="w-5 h-5" /> : <SearchIcon className="w-5 h-5" />}
      </button>
  ) : null;

  const content = (
      <>
          {isLoading ? (
              <div className="text-center p-12 text-slate-400 dark:text-gray-500 flex flex-col items-center gap-2">
                  <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-sm">Fetching your financial history...</p>
              </div>
          ) : activeTab === 'All' ? (
              <DashboardView financialItems={financialItems} appCurrency={appCurrency} onSelectTab={setActiveTab} />
          ) : activeTab === 'Settings' ? (
              <SettingsView
                  appCurrency={appCurrency}
                  onUpdateAppCurrency={setAppCurrency}
                  onRestoreFromData={handleRestoreFromData}
                  notificationsEnabled={notificationsEnabled}
                  onToggleNotifications={setNotificationsEnabled}
                  theme={resolvedTheme}
                  onSetTheme={setThemeMode}
                  isNative={isNative}
                  isCompanion={isCompanion}
              />
          ) : (
              <FinanceTrackerView
                  items={financialItems}
                  roadmapItems={[]}
                  lifeEvents={[]}
                  onAddItem={handleAddFinancialItem}
                  onUpdateItem={handleUpdateFinancialItem}
                  onDeleteItem={handleDeleteFinancialItem}
                  onAddPayment={handleAddPayment}
                  onAddPayments={handleAddPayments}
                  onUpdatePayment={handleUpdatePayment}
                  onDeletePayment={handleDeletePayment}
                  onArchiveItem={handleArchiveFinancialItem}
                  onUnarchiveItem={handleUnarchiveFinancialItem}
                  appCurrency={appCurrency}
                  activeTab={activeTab as any}
                  onTabChange={setActiveTab as any}
                  searchQuery={searchQuery}
                  onSearchQueryChange={setSearchQuery}
                  onOpenAdd={handleGlobalAdd}
                  onEditItem={(item) => {
                      if (item.category === 'Subscription' || item.category === 'Bill') handleOpenServiceModal(item);
                      else handleOpenDebtLoanModal(item);
                  }}
              />
          )}
      </>
  );

  // --- DESKTOP LAYOUT (Web App) ---
  if (isWeb) {
      return (
          <div className="h-screen flex flex-col overflow-hidden bg-[#F8FAFC] dark:bg-[#0B0F1A] text-slate-800 dark:text-gray-200">
              {/* Top Header */}
              <header className="shrink-0 z-40 bg-white/85 dark:bg-[#0E1324]/85 backdrop-blur-md border-b border-slate-200 dark:border-gray-800/60 px-6 py-3 flex items-center gap-6">
                  <img src="/logo.png" alt="LoanDash" className="h-8 w-auto object-contain" />

                  {/* Tab Navigation */}
                  <nav className="flex items-center gap-1">
                      {tabs.map(tab => (
                          <button
                              key={tab.id}
                              onClick={() => setActiveTab(tab.id)}
                              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                  activeTab === tab.id
                                      ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
                                      : 'text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-800'
                              }`}
                          >
                              {tab.icon}
                              <span className="hidden lg:inline">{tab.label}</span>
                          </button>
                      ))}
                  </nav>

                  {/* Right Tools */}
                  <div className="flex items-center gap-2 ml-auto">
                      {isSearchOpen && (
                          <div className="relative">
                              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-gray-500" />
                              <input
                                  type="text"
                                  value={searchQuery}
                                  onChange={(e) => setSearchQuery(e.target.value)}
                                  placeholder="Search..."
                                  className="bg-slate-100/50 dark:bg-[#1D2029]/50 border border-slate-200 dark:border-[#2F3441] rounded-xl pl-9 pr-4 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-indigo-500/50 outline-none w-64"
                                  autoFocus
                              />
                          </div>
                      )}
                      {searchBtn}
                      {themeBtn}
                  </div>
              </header>

              {/* Main Content */}
              <main className="flex-1 overflow-y-auto max-w-7xl w-full mx-auto px-6 py-6 no-scrollbar">
                  {content}
              </main>

              {/* Desktop Modals */}
              <Modal isOpen={isDebtLoanModalOpen} onClose={() => setIsDebtLoanModalOpen(false)} title={editingItem ? `Edit ${editingItem.category}` : `Add New ${formMode}` }>
                  <FinancialItemForm
                      onSubmit={(data) => {
                          if (editingItem) handleUpdateFinancialItem({ ...editingItem, ...data });
                          else handleAddFinancialItem(data);
                          setIsDebtLoanModalOpen(false);
                      }}
                      onCancel={() => setIsDebtLoanModalOpen(false)}
                      initialData={editingItem}
                      mode={editingItem ? editingItem.category as 'Debt' | 'Loan' : formMode!}
                      roadmapItems={[]}
                      lifeEvents={[]}
                      financialItems={financialItems}
                      appCurrency={appCurrency}
                  />
              </Modal>
              <Modal isOpen={isAddServiceModalOpen} onClose={() => setIsAddServiceModalOpen(false)} title={editingItem ? "Edit Service" : "Add New Service"}>
                  <AddServiceForm
                      onSubmit={(data: any) => {
                          if (editingItem) {
                              handleUpdateFinancialItem({
                                  ...editingItem,
                                  title: data.title, description: data.description,
                                  amount: parseFloat(String(data.amount)), provider: data.provider,
                                  currency: appCurrency, recurrence: data.recurrence,
                                  serviceCategory: data.serviceCategory, dueDate: data.dueDate || editingItem.dueDate,
                                  endDate: data.endDate, enableReminders: data.enableReminders,
                                  reminderDays: parseInt(String(data.reminderDays), 10) || 0,
                                  icon: data.icon, isRecurring: true,
                                  paymentMethodType: data.paymentMethodType || 'manual',
                                  category: 'Subscription',
                              });
                          } else {
                              const svcDueDate = data.dueDate || new Date().toISOString().split('T')[0];
                          handleAddFinancialItem({
                                  title: data.title, description: data.description,
                                  amount: parseFloat(String(data.amount)), provider: data.provider,
                                  currency: appCurrency, recurrence: data.recurrence,
                                  serviceCategory: data.serviceCategory,
                                  dueDate: svcDueDate,
                                  startDate: svcDueDate,
                                  endDate: data.endDate, enableReminders: data.enableReminders,
                                  reminderDays: parseInt(String(data.reminderDays), 10) || 0,
                                  icon: data.icon, category: 'Subscription', direction: 'Outgoing',
                                  status: 'Unpaid', isRecurring: true,
                                  paymentMethodType: data.paymentMethodType || 'manual', isArchived: false,
                              });
                          }
                          setIsAddServiceModalOpen(false);
                      }}
                      onCancel={() => setIsAddServiceModalOpen(false)}
                      initialData={editingItem}
                      roadmapItems={[]}
                      lifeEvents={[]}
                      financialItems={financialItems}
                  />
              </Modal>
          </div>
      );
  }

  // --- MOBILE LAYOUT (Native Apps) ---
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#F8FAFC] dark:bg-[#0B0F1A] text-slate-800 dark:text-gray-200">
        
        {/* Top Header Navigation */}
        <header className="shrink-0 z-40 pt-[env(safe-area-inset-top)] bg-white/85 dark:bg-[#0E1324]/85 backdrop-blur-md border-b border-slate-200 dark:border-gray-800/60 px-3 md:px-8 py-2.5 md:py-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 md:gap-3 min-w-0 flex-1">
                {isSearchOpen ? (
                    <div className="relative flex-1 max-w-md">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-gray-500" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by name..."
                            className="w-full bg-slate-100/50 dark:bg-[#1D2029]/50 border border-slate-200 dark:border-[#2F3441] rounded-xl pl-9 pr-4 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all duration-200 outline-none"
                            autoFocus
                        />
                    </div>
                ) : (
                    <img src="/logo.png" alt="LoanDash" className="h-9 md:h-10 w-auto object-contain" />
                )}
            </div>

            <div className="flex items-center gap-2 md:gap-4 shrink-0">
                {onlineMode && (
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-green-50 dark:bg-green-900/30 rounded-lg" title="Connected to server">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-xs font-medium text-green-600 dark:text-green-400 hidden md:inline">Synced</span>
                    </div>
                )}
                {searchBtn}
                {themeBtn}
            </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto max-w-7xl w-full mx-auto p-3 md:p-8 pb-[calc(5.25rem+env(safe-area-inset-bottom))] no-scrollbar">
            {content}
        </main>

        {/* Bottom Tab Bar */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-[#0E1324] border-t border-slate-200 dark:border-gray-800 px-1.5 pt-1.5 pb-[calc(0.35rem+env(safe-area-inset-bottom))] flex justify-around items-center shadow-[0_-4px_12px_rgba(0,0,0,0.05)] overflow-x-auto no-scrollbar scroll-smooth">
            {tabs.map(tab => (
                <TabButton
                    key={tab.id}
                    active={activeTab === tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    label={tab.label}
                    icon={tab.icon}
                />
            ))}
        </nav>

        {/* Global Modals */}
        <Modal isOpen={isDebtLoanModalOpen} onClose={() => setIsDebtLoanModalOpen(false)} title={editingItem ? `Edit ${editingItem.category}` : `Add New ${formMode}` }>
            <FinancialItemForm
                onSubmit={(data) => {
                    if (editingItem) handleUpdateFinancialItem({ ...editingItem, ...data });
                    else handleAddFinancialItem(data);
                    setIsDebtLoanModalOpen(false);
                }}
                onCancel={() => setIsDebtLoanModalOpen(false)}
                initialData={editingItem}
                mode={editingItem ? editingItem.category as 'Debt' | 'Loan' : formMode!}
                roadmapItems={[]}
                lifeEvents={[]}
                financialItems={financialItems}
                appCurrency={appCurrency}
            />
        </Modal>

        <Modal isOpen={isAddServiceModalOpen} onClose={() => setIsAddServiceModalOpen(false)} title={editingItem ? "Edit Service" : "Add New Service"}>
            <AddServiceForm
                onSubmit={(data: any) => {
                    if (editingItem) {
                        handleUpdateFinancialItem({
                            ...editingItem,
                            title: data.title,
                            description: data.description,
                            amount: parseFloat(String(data.amount)),
                            provider: data.provider,
                            currency: appCurrency,
                            recurrence: data.recurrence,
                            serviceCategory: data.serviceCategory,
                            dueDate: data.dueDate || editingItem.dueDate,
                            startDate: editingItem.startDate || data.dueDate || editingItem.dueDate,
                            endDate: data.endDate,
                            enableReminders: data.enableReminders,
                            reminderDays: parseInt(String(data.reminderDays), 10) || 0,
                            icon: data.icon,
                            isRecurring: true,
                            paymentMethodType: data.paymentMethodType || 'manual',
                            category: 'Subscription',
                        });
                    } else {
                        handleAddFinancialItem({
                            title: data.title,
                            description: data.description,
                            amount: parseFloat(String(data.amount)),
                            provider: data.provider,
                            currency: appCurrency,
                            recurrence: data.recurrence,
                            serviceCategory: data.serviceCategory,
                            dueDate: data.dueDate || new Date().toISOString().split('T')[0],
                            startDate: data.dueDate || new Date().toISOString().split('T')[0],
                            endDate: data.endDate,
                            enableReminders: data.enableReminders,
                            reminderDays: parseInt(String(data.reminderDays), 10) || 0,
                            icon: data.icon,
                            category: 'Subscription',
                            direction: 'Outgoing',
                            status: 'Unpaid',
                            isRecurring: true,
                            paymentMethodType: data.paymentMethodType || 'manual',
                            isArchived: false,
                        });
                    }
                    setIsAddServiceModalOpen(false);
                }}
                onCancel={() => setIsAddServiceModalOpen(false)}
                initialData={editingItem}
                roadmapItems={[]}
                lifeEvents={[]}
                financialItems={financialItems}
            />
        </Modal>

    </div>
  );
};

interface TabButtonProps {
    active: boolean;
    onClick: () => void;
    label: string;
    icon: React.ReactNode;
}

const TabButton: React.FC<TabButtonProps> = ({ active, onClick, label, icon }) => (
    <button 
        onClick={onClick}
        className={`flex flex-col items-center justify-center px-1.5 py-1 rounded-xl transition-all duration-200 shrink-0 min-w-[54px] md:min-w-[64px] ${active ? 'text-indigo-600 dark:text-indigo-400 font-bold md:scale-105' : 'text-slate-400 hover:text-slate-600 dark:hover:text-gray-300'}`}
    >
        <div className={`p-0.5 md:p-1 rounded-lg ${active ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-gray-500'}`}>
            {icon}
        </div>
        <span className="text-[9px] md:text-[10px] mt-0.5 md:mt-1 tracking-tight truncate max-w-[58px] md:max-w-[70px]">{label}</span>
    </button>
);

export default App;
