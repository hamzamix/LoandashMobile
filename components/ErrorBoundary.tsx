import React from 'react';
import { AlertCircleIcon, TrashIcon } from './Icons.tsx';

interface Props { children: React.ReactNode; }
interface State { hasError: boolean; error: Error | null; }

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error('LoanDash render error:', error);
  }

  handleClearData = () => {
    try {
      localStorage.clear();
    } catch {}
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#F8FAFC] dark:bg-[#0B0F1A] text-slate-800 dark:text-gray-200 p-6 text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mb-4">
            <AlertCircleIcon className="w-9 h-9 text-red-500 dark:text-red-400" />
          </div>
          <h1 className="text-lg font-bold mb-2">Something went wrong</h1>
          <p className="text-sm text-slate-500 dark:text-gray-400 mb-6 max-w-xs">
            The app encountered an error, likely due to corrupted data from a previous version.
          </p>
          <button
            onClick={this.handleClearData}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors shadow-md active:scale-95"
          >
            <TrashIcon className="w-4 h-4" />
            Clear Data & Reload
          </button>
          <p className="mt-3 text-xs text-slate-400 dark:text-gray-500">
            You can re-import your data from the backup JSON file after reloading.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
