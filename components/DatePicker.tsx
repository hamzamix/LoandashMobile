import React, { useState, useMemo, useRef, useEffect } from 'react';
import { RoadmapItem, LifeEvent, FinancialItem } from '../types.ts';
import { ChevronLeftIcon, ChevronRightIcon, CalendarIcon } from './Icons.tsx';

// A unified event type for the picker
type DatePickerEvent = {
  id: string;
  date: string;
  title: string;
  type: 'roadmap' | 'life' | 'finance';
};

interface DatePickerProps {
  value: string | null;
  onChange: (date: string) => void;
  roadmapItems: RoadmapItem[];
  lifeEvents: LifeEvent[];
  financialItems: FinancialItem[];
}

const DatePicker: React.FC<DatePickerProps> = ({ value, onChange, roadmapItems, lifeEvents, financialItems }) => {
  const [isOpen, setIsOpen] = useState(false);
  // Default to showing the month of the selected value, or today's month
  const initialDate = value ? new Date(`${value}T00:00:00`) : new Date();
  const [viewDate, setViewDate] = useState(initialDate);
  const datePickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, DatePickerEvent[]>();
    
    roadmapItems.forEach(item => {
      if (item.dueDate && !item.isArchived) {
        const dateKey = item.dueDate;
        if (!map.has(dateKey)) map.set(dateKey, []);
        map.get(dateKey)?.push({ id: item.id, date: item.dueDate, title: item.title, type: 'roadmap' });
      }
    });

    lifeEvents.forEach(event => {
      const dateKey = event.date;
      if (!map.has(dateKey)) map.set(dateKey, []);
      map.get(dateKey)?.push({ id: event.id, date: event.date, title: event.title, type: 'life' });
    });

    financialItems.forEach(item => {
        const dateKey = item.dueDate;
        if (!map.has(dateKey)) map.set(dateKey, []);
        map.get(dateKey)?.push({ id: item.id, date: item.dueDate, title: item.title, type: 'finance' });
    });

    return map;
  }, [roadmapItems, lifeEvents, financialItems]);
  
  const firstDayOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const lastDayOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);
  
  const daysInMonth = [];
  for (let i = 0; i < firstDayOfMonth.getDay(); i++) {
    daysInMonth.push({ date: null });
  }
  for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
    daysInMonth.push({ date: new Date(viewDate.getFullYear(), viewDate.getMonth(), i) });
  }
  // Add next month's padding days to complete the grid
  const remainingCells = 7 - (daysInMonth.length % 7);
  if(remainingCells < 7) {
    for (let i = 0; i < remainingCells; i++) {
        daysInMonth.push({ date: null });
    }
  }


  const handlePrevMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  const handleNextMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  
  const handleDateSelect = (date: Date) => {
    // Format to YYYY-MM-DD using local date parts to avoid timezone conversion errors.
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    const dateString = `${year}-${month}-${day}`;
    onChange(dateString);
    setIsOpen(false);
  };
  
  const getDotColor = (type: 'roadmap' | 'life' | 'finance') => {
    switch (type) {
        case 'roadmap': return 'bg-indigo-400';
        case 'life': return 'bg-pink-400';
        case 'finance': return 'bg-green-400';
        default: return 'bg-gray-400';
    }
  }

  return (
    <div className="relative" ref={datePickerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-slate-50/50 dark:bg-[#1D2029]/50 border border-slate-200 dark:border-[#2F3441] rounded-xl px-3.5 py-2.5 md:px-4 md:py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all duration-200 outline-none flex items-center justify-between text-left"
      >
        <span>{value ? new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'Select a date'}</span>
        <CalendarIcon className="w-5 h-5 text-slate-400" />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 w-full bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-md shadow-lg z-10 p-2 animate-scale-in-fast">
            <div className="flex justify-between items-center mb-2 px-2">
                <button type="button" onClick={handlePrevMonth} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors"><ChevronLeftIcon className="w-5 h-5"/></button>
                <span className="font-semibold text-sm">{viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
                <button type="button" onClick={handleNextMonth} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors"><ChevronRightIcon className="w-5 h-5"/></button>
            </div>
            <div className="grid grid-cols-7 text-center">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => (
                    <div key={day} className="text-xs font-medium text-slate-500 dark:text-gray-400 py-1">{day}</div>
                ))}
                {daysInMonth.map((day, index) => {
                    if (!day.date) return <div key={`pad-${index}`} className="h-8"></div>;
                    
                    const year = day.date.getFullYear();
                    const month = (day.date.getMonth() + 1).toString().padStart(2, '0');
                    const dayOfMonth = day.date.getDate().toString().padStart(2, '0');
                    const dateKey = `${year}-${month}-${dayOfMonth}`;
                    
                    const dayEvents = eventsByDate.get(dateKey);
                    const isSelected = value === dateKey;
                    const isToday = new Date().toDateString() === day.date.toDateString();

                    return (
                        <div key={dateKey} className="relative group flex items-center justify-center h-8">
                            <button
                                type="button"
                                onClick={() => handleDateSelect(day.date!)}
                                className={`w-8 h-8 flex items-center justify-center rounded-full text-sm transition-colors ${isSelected ? 'bg-indigo-600 text-white font-semibold' : isToday ? 'bg-slate-200 dark:bg-gray-700' : 'hover:bg-slate-100 dark:hover:bg-gray-700'}`}
                            >
                                {day.date.getDate()}
                            </button>
                            {dayEvents && <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-red-500 rounded-full"></div>}
                            {dayEvents && (
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-800 dark:bg-gray-950 text-white text-xs rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                                    <h4 className="font-bold mb-1 border-b border-gray-600 pb-1">{new Date(`${dateKey}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</h4>
                                    <ul className="space-y-1 mt-1 max-h-24 overflow-y-auto">
                                        {dayEvents.map(e => (
                                            <li key={e.id} className="flex items-start gap-1.5">
                                                <div className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${getDotColor(e.type)}`}></div>
                                                <span className="truncate">{e.title}</span>
                                            </li>
                                        ))}
                                    </ul>
                                     <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 dark:bg-gray-950 transform rotate-45"></div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
      )}
    </div>
  );
};

export default DatePicker;
