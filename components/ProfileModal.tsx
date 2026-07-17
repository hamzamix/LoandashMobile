import React from 'react';
import Modal from './Modal.tsx';
import { GitHubIcon, ExternalLinkIcon } from './Icons.tsx';

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const socialLinks = [
    { name: 'GitHub', url: 'https://github.com/hamzamix', handle: '@hamzamix', color: 'bg-gray-800 dark:bg-gray-700' },
    { name: 'X / Twitter', url: 'https://x.com/hamzamix', handle: '@hamzamix', color: 'bg-black dark:bg-gray-800' },
    { name: 'LinkedIn', url: 'https://linkedin.com/in/hamzamix', handle: '@hamzamix', color: 'bg-blue-600' },
    { name: 'Instagram', url: 'https://instagram.com/hamzamix', handle: '@hamzamix', color: 'bg-gradient-to-br from-purple-600 to-pink-500' },
    { name: 'Facebook', url: 'https://facebook.com/hamzamix', handle: '@hamzamix', color: 'bg-blue-500' },
    { name: 'Reddit', url: 'https://reddit.com/u/hamzamix', handle: 'u/hamzamix', color: 'bg-orange-500' },
    { name: 'YouTube', url: 'https://youtube.com/@hamzamribti', handle: '@hamzamribti', color: 'bg-red-600' },
];

const SocialIcon: React.FC<{ name: string; className?: string }> = ({ name, className = 'w-5 h-5' }) => {
    const paths: Record<string, JSX.Element> = {
        'GitHub': <GitHubIcon className={className} />,
        'X / Twitter': (
            <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
        ),
        'LinkedIn': (
            <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
        ),
        'Instagram': (
            <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
            </svg>
        ),
        'Facebook': (
            <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
        ),
        'Reddit': (
            <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
                <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
            </svg>
        ),
        'YouTube': (
            <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
        ),
    };
    return paths[name] || <ExternalLinkIcon className={className} />;
};

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="">
            <div className="flex flex-col items-center py-2">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-3xl font-black mb-3 shadow-lg shadow-indigo-500/30">
                    HM
                </div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">Hamza Mribti</h2>
                <a
                    href="https://hamzamix.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm text-indigo-600 dark:text-indigo-400 hover:underline mt-1"
                >
                    hamzamix.com
                    <ExternalLinkIcon className="w-3.5 h-3.5" />
                </a>

                <div className="w-full mt-6 space-y-2">
                    {socialLinks.map((link) => (
                        <a
                            key={link.name}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 dark:bg-[#1D2029] hover:bg-slate-100 dark:hover:bg-[#242832] transition-colors group"
                        >
                            <div className={`w-9 h-9 ${link.color} rounded-lg flex items-center justify-center text-white shrink-0`}>
                                <SocialIcon name={link.name} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-900 dark:text-white">{link.name}</p>
                                <p className="text-xs text-slate-500 dark:text-gray-400 truncate">{link.handle}</p>
                            </div>
                            <ExternalLinkIcon className="w-4 h-4 text-slate-400 dark:text-gray-500 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 shrink-0" />
                        </a>
                    ))}
                </div>
            </div>
        </Modal>
    );
};

export default ProfileModal;
