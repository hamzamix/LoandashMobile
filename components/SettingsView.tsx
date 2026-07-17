
import React, { useState, useEffect, useRef } from 'react';
import { DatabaseIcon, ChevronDownIcon, PlusCircleIcon, BellIcon, GitHubIcon, ExternalLinkIcon, ArrowUpIcon, DownloadIcon, CheckCircle2Icon } from './Icons.tsx';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { SUPPORTED_CURRENCIES } from '../utils/currency.ts';
import { checkForUpdate, UpdateInfo, CURRENT_VERSION, GITHUB_REPO } from '../utils/versionCheck.ts';
import ProfileModal from './ProfileModal.tsx';

interface SettingsViewProps {
    appCurrency: string;
    onUpdateAppCurrency: (currency: string) => void;
    onRestoreFromData: (data: any) => void;
    notificationsEnabled: boolean;
    onToggleNotifications: (enabled: boolean) => void;
    theme: 'light' | 'dark';
    onSetTheme: (theme: 'system' | 'light' | 'dark') => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ 
    appCurrency, onUpdateAppCurrency, onRestoreFromData,
    notificationsEnabled, onToggleNotifications,
    theme, onSetTheme
}) => {
    const inputClass = "w-full bg-slate-50/50 dark:bg-[#1D2029]/50 border border-slate-200 dark:border-[#2F3441] rounded-xl px-3.5 py-2.5 md:px-4 md:py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all duration-200 outline-none";
    const isNative = Capacitor.isNativePlatform();
    const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
    const [updateDismissed, setUpdateDismissed] = useState(() => 
        localStorage.getItem('loanDashUpdateDismissed') === 'true'
    );
    const [profileOpen, setProfileOpen] = useState(false);

    // In-app update state
    const [downloadState, setDownloadState] = useState<'idle' | 'downloading' | 'downloaded' | 'error'>('idle');
    const [downloadProgress, setDownloadProgress] = useState(0);
    const [apkUri, setApkUri] = useState<string | null>(null);
    const [apkUrl, setApkUrl] = useState<string | null>(null);

    useEffect(() => {
        checkForUpdate().then(info => {
            if (info?.available) {
                setUpdateInfo(info);
                setApkUrl(info.apkUrl || null);
            }
        });
    }, []);

    const handleNotificationToggle = async () => {
        if (!isNative) return;
        if (notificationsEnabled) {
            await LocalNotifications.cancel({ notifications: [] });
            onToggleNotifications(false);
        } else {
            const perm = await LocalNotifications.requestPermissions();
            if (perm.display === 'granted') {
                onToggleNotifications(true);
            }
        }
    };

    const handleDismissUpdate = () => {
        setUpdateDismissed(true);
        localStorage.setItem('loanDashUpdateDismissed', 'true');
    };

    const handleDownloadApk = async () => {
        if (!apkUrl) {
            window.open(updateInfo?.htmlUrl, '_blank');
            return;
        }

        if (!isNative) {
            window.open(apkUrl, '_blank');
            return;
        }

        setDownloadState('downloading');
        setDownloadProgress(0);

        try {
            const response = await fetch(apkUrl);
            if (!response.ok) throw new Error('Download failed');

            const contentLength = parseInt(response.headers.get('content-length') || '0', 10);
            const reader = response.body?.getReader();
            if (!reader) throw new Error('No reader');

            const chunks: Uint8Array[] = [];
            let received = 0;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                chunks.push(value);
                received += value.length;
                if (contentLength > 0) {
                    setDownloadProgress(Math.round((received / contentLength) * 100));
                }
            }

            const blob = new Blob(chunks, { type: 'application/vnd.android.package-archive' });
            const filename = `loandash_v${updateInfo?.latestVersion}.apk`;

            const FileExport = registerPlugin<any>('FileExport');
            const result = await FileExport.exportJson({ data: await blob.text(), filename });
            setApkUri(result?.uri || null);
            setDownloadState('downloaded');
        } catch {
            setDownloadState('error');
        }
    };

    const handleInstallApk = async () => {
        try {
            const ApkInstaller = registerPlugin<any>('ApkInstaller');
            await ApkInstaller.install({ uri: apkUri });
        } catch {
            if (apkUri) {
                window.open(apkUri, '_blank');
            }
        }
    };

    const themeOptions: Array<{ value: 'system' | 'light' | 'dark'; label: string; icon: JSX.Element }> = [
        { value: 'system', label: 'System', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" /></svg> },
        { value: 'light', label: 'Light', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><circle cx="12" cy="12" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" /></svg> },
        { value: 'dark', label: 'Dark', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg> },
    ];

    return (
        <div className="animate-fade-in">
            <div className="max-w-5xl mx-auto space-y-4 md:space-y-8 pb-12">
                {/* Update Available Banner */}
                {updateInfo?.available && !updateDismissed && (
                    <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 p-4 md:p-5 rounded-2xl md:rounded-3xl text-white shadow-xl shadow-indigo-500/30">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-white/20 rounded-xl shrink-0">
                                <ArrowUpIcon className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-sm md:text-base">Update Available</h3>
                                <p className="text-xs md:text-sm text-indigo-100 mt-0.5">
                                    Version {updateInfo.latestVersion} is now available (you have {updateInfo.currentVersion})
                                </p>

                                {downloadState === 'idle' && (
                                    <div className="flex gap-2 mt-3">
                                        <button
                                            onClick={handleDownloadApk}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-indigo-600 text-xs font-bold rounded-lg hover:bg-indigo-50 transition-colors"
                                        >
                                            <DownloadIcon className="w-3.5 h-3.5" />
                                            {isNative && apkUrl ? 'Download Update' : 'Download'}
                                            {!isNative && <ExternalLinkIcon className="w-3.5 h-3.5" />}
                                        </button>
                                        <button
                                            onClick={handleDismissUpdate}
                                            className="px-3 py-1.5 bg-white/20 text-white text-xs font-bold rounded-lg hover:bg-white/30 transition-colors"
                                        >
                                            Dismiss
                                        </button>
                                    </div>
                                )}

                                {downloadState === 'downloading' && (
                                    <div className="mt-3">
                                        <div className="flex items-center justify-between text-xs text-indigo-100 mb-1">
                                            <span>Downloading...</span>
                                            <span>{downloadProgress}%</span>
                                        </div>
                                        <div className="w-full bg-white/20 rounded-full h-2">
                                            <div
                                                className="bg-white rounded-full h-2 transition-all duration-300"
                                                style={{ width: `${downloadProgress}%` }}
                                            />
                                        </div>
                                    </div>
                                )}

                                {downloadState === 'downloaded' && (
                                    <div className="flex gap-2 mt-3">
                                        <button
                                            onClick={handleInstallApk}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-indigo-600 text-xs font-bold rounded-lg hover:bg-indigo-50 transition-colors"
                                        >
                                            <CheckCircle2Icon className="w-3.5 h-3.5" />
                                            Install Update
                                        </button>
                                    </div>
                                )}

                                {downloadState === 'error' && (
                                    <div className="flex gap-2 mt-3">
                                        <button
                                            onClick={handleDownloadApk}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 text-white text-xs font-bold rounded-lg hover:bg-white/30 transition-colors"
                                        >
                                            Retry Download
                                        </button>
                                        <a
                                            href={updateInfo.htmlUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 text-white text-xs font-bold rounded-lg hover:bg-white/30 transition-colors"
                                        >
                                            Open in Browser
                                            <ExternalLinkIcon className="w-3.5 h-3.5" />
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* General */}
                <div className="bg-white dark:bg-[#0E1324] p-4 md:p-6 rounded-2xl md:rounded-3xl border border-slate-200/60 dark:border-gray-800/60 shadow-xl">
                    <h2 className="text-lg md:text-xl font-black text-slate-900 dark:text-white mb-4 md:mb-6">General Preferences</h2>

                    {/* Theme */}
                    <div className="mb-5">
                        <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-gray-300">Theme</label>
                        <div className="flex gap-2 p-1 bg-slate-100 dark:bg-[#1D2029] rounded-xl">
                            {themeOptions.map(opt => (
                                <button
                                    key={opt.value}
                                    onClick={() => onSetTheme(opt.value)}
                                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                                        theme === opt.value
                                            ? 'bg-white dark:bg-[#242832] text-indigo-600 dark:text-indigo-400 shadow-sm'
                                            : 'text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-300'
                                    }`}
                                >
                                    {opt.icon}
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="max-w-sm">
                        <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-gray-300">Default Currency</label>
                        <div className="relative">
                            <select value={appCurrency} onChange={(e) => onUpdateAppCurrency(e.target.value)} className={`${inputClass} appearance-none pr-10 rounded-xl bg-slate-50/50 dark:bg-[#1D2029]/50 border border-slate-200 dark:border-[#2F3441] text-slate-900 dark:text-white px-3.5 py-2.5 md:px-4 md:py-3 outline-none focus:ring-indigo-500/50`}>
                                {SUPPORTED_CURRENCIES.map(c => (
                                    <option key={c.code} value={c.code}>{c.code} ({c.symbol}) — {c.name}</option>
                                ))}
                            </select>
                            <ChevronDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                </div>

                {/* Notifications */}
                <div className="bg-white dark:bg-[#0E1324] p-4 md:p-6 rounded-2xl md:rounded-3xl border border-slate-200/60 dark:border-gray-800/60 shadow-xl">
                    <h2 className="text-lg md:text-xl font-black text-slate-900 dark:text-white mb-2">Notifications</h2>
                    <p className="text-sm text-slate-500 dark:text-gray-400 mb-6">
                        {isNative
                            ? 'Get reminded about upcoming bills, due dates, and overdue payments.'
                            : 'Notifications are only available on the Android app.'}
                    </p>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl ${notificationsEnabled ? 'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600' : 'bg-slate-100 dark:bg-[#1D2029] text-slate-400'}`}>
                                <BellIcon className="w-5 h-5" />
                            </div>
                            <div>
                                <span className="text-sm font-semibold text-slate-900 dark:text-white">Bill Reminders</span>
                                <span className="text-xs text-slate-400 dark:text-gray-500 block">3 days, 1 day, and due date alerts</span>
                            </div>
                        </div>
                        <button
                            onClick={handleNotificationToggle}
                            disabled={!isNative}
                            className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
                                notificationsEnabled
                                    ? 'bg-indigo-600'
                                    : 'bg-slate-300 dark:bg-gray-700'
                            } ${!isNative ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                            <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                                notificationsEnabled ? 'translate-x-5' : 'translate-x-0'
                            }`} />
                        </button>
                    </div>
                </div>

                {/* Data Management */}
                <div className="bg-white dark:bg-[#0E1324] p-4 md:p-6 rounded-2xl md:rounded-3xl border border-slate-200/60 dark:border-gray-800/60 shadow-xl">
                    <h2 className="text-lg md:text-xl font-black text-slate-900 dark:text-white mb-2">Data Management</h2>
                    <p className="text-sm text-slate-500 dark:text-gray-400 mb-6">All your data is stored locally in your browser. You can export it as a backup or import an existing backup file.</p>
                    
                    <div className="flex flex-wrap gap-4">
                        <button 
                            onClick={async () => {
                                const data = localStorage.getItem('loanDashFinancialItems');
                                if (!data) return alert('No data to export.');
                                const jsonData = JSON.stringify({ financialItems: JSON.parse(data) }, null, 2);
                                const filename = `loandash_backup_${new Date().toISOString().split('T')[0]}.json`;
                                if (isNative) {
                                    try {
                                        const FileExport = registerPlugin<any>('FileExport');
                                        const result = await FileExport.exportJson({ data: jsonData, filename });
                                        alert(`Backup saved to Downloads/${filename}`);
                                    } catch {
                                        alert('Export failed. Please try again.');
                                    }
                                } else {
                                    const blob = new Blob([jsonData], { type: 'application/json' });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = filename;
                                    a.click();
                                }
                            }}
                            className="flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
                        >
                            <DatabaseIcon className="w-5 h-5" />
                            Export Data
                        </button>
                        
                        <label className="flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 bg-slate-100 dark:bg-[#1D2029] hover:bg-slate-200 dark:hover:bg-[#242832] text-slate-700 dark:text-gray-300 font-bold rounded-xl transition-all border border-transparent dark:border-gray-800 cursor-pointer active:scale-95">
                            <PlusCircleIcon className="w-5 h-5" />
                            Import Data
                            <input 
                                type="file" 
                                accept=".json" 
                                className="hidden" 
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        const reader = new FileReader();
                                        reader.onload = (event) => {
                                            try {
                                                const json = JSON.parse(event.target?.result as string);
                                                if (json && json.financialItems) {
                                                    onRestoreFromData(json);
                                                    alert('Data imported successfully!');
                                                } else {
                                                    alert('Invalid backup file format.');
                                                }
                                            } catch (err) {
                                                alert('Failed to parse backup file.');
                                            }
                                        };
                                        reader.readAsText(file);
                                    }
                                }}
                            />
                        </label>
                    </div>
                </div>

                {/* About */}
                <div className="bg-white dark:bg-[#0E1324] p-4 md:p-6 rounded-2xl md:rounded-3xl border border-slate-200/60 dark:border-gray-800/60 shadow-xl">
                    <h2 className="text-lg md:text-xl font-black text-slate-900 dark:text-white mb-4">About</h2>
                    
                    <div className="space-y-3">
                        <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-gray-800/60">
                            <span className="text-sm text-slate-500 dark:text-gray-400">App Name</span>
                            <span className="text-sm font-semibold text-slate-900 dark:text-white">LoanDash</span>
                        </div>
                        <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-gray-800/60">
                            <span className="text-sm text-slate-500 dark:text-gray-400">Version</span>
                            <span className="text-sm font-semibold text-slate-900 dark:text-white">{CURRENT_VERSION}</span>
                        </div>
                        <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-gray-800/60">
                            <span className="text-sm text-slate-500 dark:text-gray-400">Developer</span>
                            <button
                                onClick={() => setProfileOpen(true)}
                                className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                            >
                                Hamza Mribti
                            </button>
                        </div>
                        <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-gray-800/60">
                            <span className="text-sm text-slate-500 dark:text-gray-400">Contact</span>
                            <a href="mailto:hamzamix@hamzamix.com" className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                                hamzamix@hamzamix.com
                            </a>
                        </div>
                        <div className="flex items-center justify-between py-2">
                            <span className="text-sm text-slate-500 dark:text-gray-400">Repository</span>
                            <a 
                                href="https://github.com/hamzamix/LoandashMobile" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                            >
                                <GitHubIcon className="w-4 h-4" />
                                View on GitHub
                                <ExternalLinkIcon className="w-3.5 h-3.5" />
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            <ProfileModal isOpen={profileOpen} onClose={() => setProfileOpen(false)} />
        </div>
    );
};

export default SettingsView;
