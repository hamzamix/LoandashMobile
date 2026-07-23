import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { FinancialItem, FinancialItemCategory, FinancialItemDirection, FinancialItemStatus, LifeEvent, RoadmapItem, Payment, FinancialItemRecurrence } from '../types.ts';
import { FinanceIcon, PlusCircleIcon } from './Icons.tsx';
import Modal from './Modal.tsx';
import FinancialItemForm from './FinancialItemForm.tsx';
import AddServiceForm, { ServiceFormData } from './AddServiceForm.tsx';
import FinancialItemCard from './FinancialItemCard.tsx';

// --- HELPER FUNCTIONS ---

const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
};

const ORDER_STORAGE_PREFIX = 'cardOrder_';

const loadOrder = (tab: string): string[] => {
    try {
        return JSON.parse(localStorage.getItem(`${ORDER_STORAGE_PREFIX}${tab}`) || '[]');
    } catch { return []; }
};

const saveOrder = (tab: string, ids: string[]) => {
    localStorage.setItem(`${ORDER_STORAGE_PREFIX}${tab}`, JSON.stringify(ids));
};

// --- COMPONENT DEFINITION ---

interface FinanceTrackerViewProps {
  items: FinancialItem[];
  roadmapItems: RoadmapItem[];
  lifeEvents: LifeEvent[];
  onAddItem: (item: Omit<FinancialItem, 'id'>) => void;
  onUpdateItem: (item: FinancialItem) => void;
  onDeleteItem: (id: string) => void;
  onAddPayment: (itemId: string, paymentData: Omit<Payment, 'id'>) => void;
  onAddPayments: (itemId: string, payments: Omit<Payment, 'id'>[]) => void;
  onUpdatePayment: (itemId: string, paymentId: string, paymentData: Omit<Payment, 'id'>) => void;
  onDeletePayment: (itemId: string, paymentId: string) => void;
  onArchiveItem: (id: string) => void;
  onUnarchiveItem: (id: string) => void;
  onEditItem: (item: FinancialItem) => void;
  appCurrency: string;
  activeTab?: FinanceTab;
  onTabChange?: (tab: FinanceTab) => void;
  searchQuery?: string;
  onSearchQueryChange?: (q: string) => void;
  onOpenAdd?: () => void;
}

type FinanceTab = 'All' | 'Services' | 'Debts' | 'Loans' | 'Archive';

const SummaryStat: React.FC<{ label: string; value: string; valueColor?: string }> = ({ label, value, valueColor = 'text-slate-800 dark:text-white' }) => (
    <div className="text-center">
        <div className="text-sm text-slate-500 dark:text-gray-400">{label}</div>
        <div className={`text-xl font-bold ${valueColor}`}>{value}</div>
    </div>
);


const FinanceTrackerView: React.FC<FinanceTrackerViewProps> = ({ items, roadmapItems, lifeEvents, onAddItem, onUpdateItem, onDeleteItem, onAddPayment, onAddPayments, onUpdatePayment, onDeletePayment, onArchiveItem, onUnarchiveItem, onEditItem, appCurrency, activeTab: propActiveTab, onTabChange, searchQuery = '', onSearchQueryChange, onOpenAdd }) => {
  const [internalTab, setInternalTab] = useState<FinanceTab>('All');
  const activeTab = propActiveTab !== undefined ? propActiveTab : internalTab;

  const [statusFilter, setStatusFilter] = useState<FinancialItemStatus | 'All'>('All');
  const [directionFilter, setDirectionFilter] = useState<FinancialItemDirection | 'All'>('All');
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);
  const [orderVersion, setOrderVersion] = useState(0);

  const toggleRowExpansion = (itemId: string) => {
    setExpandedRows(prev => ({
        ...prev,
        [itemId]: !prev[itemId]
    }));
  };
  
  const handleTabChange = (tab: FinanceTab) => {
    if (onTabChange) {
        onTabChange(tab);
    } else {
        setInternalTab(tab);
    }
    if (['Services', 'Debts', 'Loans'].includes(tab)) {
        setDirectionFilter('All');
    }
  };

  const filteredItems = useMemo(() => {
    const source = activeTab === 'Archive' 
        ? items.filter(i => i.isArchived) 
        : items.filter(i => !i.isArchived);

    return source
      .filter(item => {
        if (activeTab === 'All' || activeTab === 'Archive') return true;
        if (activeTab === 'Services') return item.category === 'Subscription' || item.category === 'Bill';
        return item.category === activeTab.slice(0, -1);
      })
      .filter(item => activeTab === 'Archive' ? true : (statusFilter === 'All' || item.status === statusFilter))
      .filter(item => activeTab === 'Archive' ? true : (directionFilter === 'All' || item.direction === directionFilter))
      .filter(item => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return item.title.toLowerCase().includes(q) ||
               (item.description && item.description.toLowerCase().includes(q)) ||
               (item.provider && item.provider.toLowerCase().includes(q));
      });
  }, [items, activeTab, statusFilter, directionFilter, searchQuery]);
  
  useEffect(() => {
    setExpandedRows({});
  }, [filteredItems]);

  // Drag-and-drop ordering
  const isFilterActive = statusFilter !== 'All' || directionFilter !== 'All' || searchQuery.trim() !== '';
  const customOrder = useMemo(() => loadOrder(activeTab), [activeTab, orderVersion]);

  const orderedItems = useMemo(() => {
    if (isFilterActive || customOrder.length === 0) return filteredItems;
    const orderMap = new Map(customOrder.map((id, i) => [id, i]));
    return [...filteredItems].sort((a, b) => {
      const ai = orderMap.has(a.id) ? orderMap.get(a.id)! : 9999;
      const bi = orderMap.has(b.id) ? orderMap.get(b.id)! : 9999;
      return ai - bi;
    });
  }, [filteredItems, customOrder, isFilterActive]);

  const handleDragStart = useCallback((e: React.DragEvent, itemId: string) => {
    setDraggedItemId(itemId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', itemId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, itemId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverItemId(itemId);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedItemId(null);
    setDragOverItemId(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, dropItemId: string) => {
    e.preventDefault();
    if (!draggedItemId || draggedItemId === dropItemId) {
      setDraggedItemId(null);
      setDragOverItemId(null);
      return;
    }

    const currentOrder = orderedItems.map(i => i.id);
    const fromIdx = currentOrder.indexOf(draggedItemId);
    const toIdx = currentOrder.indexOf(dropItemId);
    if (fromIdx === -1 || toIdx === -1) {
      setDraggedItemId(null);
      setDragOverItemId(null);
      return;
    }

    const newOrder = [...currentOrder];
    newOrder.splice(fromIdx, 1);
    newOrder.splice(toIdx, 0, draggedItemId);
    saveOrder(activeTab, newOrder);
    setOrderVersion(v => v + 1);

    setDraggedItemId(null);
    setDragOverItemId(null);
  }, [draggedItemId, orderedItems, activeTab]);

  const itemsInRows = useMemo(() => {
    const chunk = (arr: FinancialItem[], size: number) => 
        arr.reduce((acc: FinancialItem[][], _, i) => 
            (i % size ? acc : [...acc, arr.slice(i, i + size)]), []);
    return chunk(orderedItems, 3);
  }, [orderedItems]);

  const tabs: FinanceTab[] = ['All', 'Services', 'Debts', 'Loans', 'Archive'];
  
  return (
    <>
      <div className="animate-fade-in">
        



        {activeTab !== 'Archive' && (
          <div className="mb-4 flex flex-wrap gap-2 items-center justify-between">
            <div className="flex flex-wrap gap-2 items-center">
              <FilterGroup label="Status" options={['All', 'Partial', 'Overdue']} selected={statusFilter} setSelected={setStatusFilter} />
              {!['Services', 'Debts', 'Loans'].includes(activeTab) && (
                <FilterGroup label="Direction" options={['All', ...Object.values(FinancialItemDirection)]} selected={directionFilter} setSelected={setDirectionFilter} />
              )}
            </div>
            {onOpenAdd && (
              <button
                onClick={onOpenAdd}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors shadow-sm shadow-indigo-500/20 active:scale-95"
              >
                <PlusCircleIcon className="w-4 h-4" />
                Add
              </button>
            )}
          </div>
        )}

        <div className="mt-4">
            {orderedItems.length > 0 ? (
                <div className="space-y-3 md:space-y-6">
                    {itemsInRows.map((row, rowIndex) => (
                        <div key={rowIndex} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-6 items-start">
                            {row.map(item => (
                                <FinancialItemCard 
                                    key={item.id} 
                                    item={item}
                                    activeTab={activeTab}
                                    isGridView={true}
                                    isExpanded={!!expandedRows[item.id]}
                                    onToggleExpand={() => toggleRowExpansion(item.id)}
                                    onEdit={() => onEditItem(item)} 
                                    onDelete={onDeleteItem}
                                    onAddPayment={onAddPayment}
                                    onAddPayments={onAddPayments}
                                    onUpdatePayment={onUpdatePayment}
                                    onDeletePayment={onDeletePayment}
                                    onArchive={onArchiveItem}
                                    onUnarchive={onUnarchiveItem}
                                    appCurrency={appCurrency}
                                    isDragging={draggedItemId === item.id}
                                    isDragOver={dragOverItemId === item.id && draggedItemId !== item.id}
                                    onDragStart={handleDragStart}
                                    onDragOver={handleDragOver}
                                    onDragEnd={handleDragEnd}
                                    onDrop={handleDrop}
                                />
                            ))}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="col-span-full text-center py-12 bg-slate-50 dark:bg-gray-800/50 rounded-lg border border-dashed border-slate-300 dark:border-gray-700">
                    <p className="text-slate-500 dark:text-gray-400">No financial items found for this filter.</p>
                </div>
            )}
        </div>
      </div>
    </>
  );
};

const FilterGroup: React.FC<{ label: string, options: string[], selected: string, setSelected: (val: any) => void }> = ({ label, options, selected, setSelected }) => (
    <div className="flex items-center gap-1.5 bg-white dark:bg-[#0E1324] border border-slate-200/60 dark:border-gray-800/60 rounded-xl p-1 flex-wrap">
        <span className="text-xs font-semibold text-slate-500 dark:text-gray-400 px-2">{label}</span>
        {options.map(opt => (
            <button key={opt} onClick={() => setSelected(opt)} className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${selected === opt ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20' : 'text-slate-500 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-[#242832]/50'}`}>{opt}</button>
        ))}
    </div>
);

export default FinanceTrackerView;
