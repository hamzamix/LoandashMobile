import React from 'react';
import { XIcon } from './Icons';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-end sm:items-center p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#0E1324] rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md border border-slate-200/60 dark:border-gray-800/60 animate-scale-in flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center px-4 py-3.5 sm:p-5 border-b border-slate-200/60 dark:border-gray-800/60 shrink-0">
          <h2 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 dark:text-white">{title}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 dark:text-gray-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full p-2 transition-colors duration-200"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 sm:p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
