import React from 'react';

interface ThemeToggleProps {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ theme, setTheme }) => {
  const isDark = theme === 'dark';

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="relative w-12 h-6 rounded-full overflow-hidden focus:outline-none transition-shadow hover:shadow-lg active:scale-95 transform cursor-pointer shrink-0 border border-slate-200/20 dark:border-gray-700/20"
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {/* Background Gradient */}
      <div
        className="absolute inset-0 transition-all duration-500 ease-in-out"
        style={{
          background: isDark
            ? 'linear-gradient(to bottom, #1e1b4b, #312e81)'
            : 'linear-gradient(to bottom, #38bdf8, #bae6fd)'
        }}
      />

      {/* Night Elements: Stars */}
      {isDark && (
        <div className="absolute inset-0 pointer-events-none animate-fade-in">
          {[
            { w: 1.2, h: 1.2, top: '15%', left: '20%', o: 0.7 },
            { w: 0.8, h: 0.8, top: '35%', left: '60%', o: 0.5 },
            { w: 1.5, h: 1.5, top: '50%', left: '80%', o: 0.8 },
            { w: 0.6, h: 0.6, top: '25%', left: '45%', o: 0.6 },
            { w: 1.0, h: 1.0, top: '55%', left: '30%', o: 0.4 },
            { w: 0.7, h: 0.7, top: '10%', left: '70%', o: 0.9 },
          ].map((star, i) => (
            <div
              key={i}
              className="absolute bg-white rounded-full twinkle"
              style={{
                width: star.w + 'px',
                height: star.h + 'px',
                top: star.top,
                left: star.left,
                opacity: star.o,
                animationDelay: `${i * 0.3}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Clouds Layer */}
      <div
        className="absolute bottom-[-6px] w-[150%] flex gap-0 pointer-events-none transition-all duration-800 ease-in-out"
        style={{ transform: isDark ? 'translateX(5%)' : 'translateX(-20%)' }}
      >
        <div className="flex" style={{ gap: '-3px' }}>
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="w-6 h-6 rounded-full transition-colors duration-500"
              style={{
                backgroundColor: isDark ? 'rgba(49, 46, 129, 0.4)' : 'rgba(255, 255, 255, 0.4)',
                marginLeft: i === 0 ? 0 : '-10px'
              }}
            />
          ))}
        </div>
      </div>

      {/* Secondary Clouds Layer */}
      <div
        className="absolute bottom-[-3px] w-[150%] flex pointer-events-none transition-all duration-1000 ease-in-out"
        style={{ transform: isDark ? 'translateX(0%)' : 'translateX(-15%)' }}
      >
        <div className="flex">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="w-5 h-5 rounded-full transition-colors duration-500"
              style={{
                backgroundColor: isDark ? 'rgba(79, 70, 229, 0.3)' : 'rgba(255, 255, 255, 0.7)',
                marginLeft: i === 0 ? 0 : '-8px'
              }}
            />
          ))}
        </div>
      </div>

      {/* Handle: Sun/Moon */}
      <div
        className="absolute top-1 left-1 w-4 h-4 rounded-full flex items-center justify-center z-10 shadow-sm transition-transform duration-300 ease-spring"
        style={{
          transform: isDark ? 'translateX(0px) rotate(0deg)' : 'translateX(24px) rotate(360deg)'
        }}
      >
        {isDark ? (
          <div className="w-full h-full bg-[#e2e8f0] rounded-full relative overflow-hidden shadow-inner">
            <div className="absolute top-[20%] left-[20%] w-1 h-1 bg-[#94a3b8] rounded-full opacity-60" />
            <div className="absolute top-[50%] left-[60%] w-1.2 h-1.2 bg-[#94a3b8] rounded-full opacity-40" />
            <div className="absolute bottom-[10%] left-[30%] w-0.8 h-0.8 bg-[#94a3b8] rounded-full opacity-50" />
          </div>
        ) : (
          <div className="w-full h-full bg-amber-400 rounded-full relative shadow-[0_0_6px_rgba(251,191,36,0.6)]">
            <div className="absolute inset-0 bg-orange-400 rounded-full opacity-20 scale-90" />
          </div>
        )}
      </div>
    </button>
  );
};

export default ThemeToggle;
