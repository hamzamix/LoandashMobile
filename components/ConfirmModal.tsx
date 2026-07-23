import React from 'react';
import { XIcon } from './Icons';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'default';
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
}) => {
  if (!isOpen) return null;

  const confirmButtonClass =
    variant === 'danger'
      ? 'bg-red-600 hover:bg-red-500 text-white'
      : 'bg-indigo-600 hover:bg-indigo-500 text-white';

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-end sm:items-center p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#0E1324] rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-sm border border-slate-200/60 dark:border-gray-800/60 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center px-4 py-3.5 sm:px-5 sm:py-4 border-b border-slate-200/60 dark:border-gray-800/60">
          <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">{title}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 dark:text-gray-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full p-2 transition-colors duration-200"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 sm:p-5">
          <p className="text-sm text-slate-600 dark:text-gray-300 leading-relaxed mb-5">{message}</p>
          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-gray-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
            >
              {cancelText}
            </button>
            <button
              onClick={() => { onConfirm(); onClose(); }}
              className={`px-4 py-2 text-sm font-bold rounded-xl transition-colors shadow-lg ${confirmButtonClass}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;