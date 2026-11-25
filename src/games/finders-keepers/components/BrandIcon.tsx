import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Download, Share, X } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';

export const BrandIcon: React.FC<{ className?: string }> = ({ className = 'w-10 h-10' }) => {
  const uid = React.useId().replace(/:/g, '');
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      className={`${className} border border-white/15 overflow-hidden`}
      role="img"
      aria-label="Finders Keepers icon"
    >
      <defs>
        <radialGradient id={`${uid}-bg`} cx="50%" cy="44%" r="74%">
          <stop offset="0%" stopColor="#1E1D1C" />
          <stop offset="56%" stopColor="#0D0D0F" />
          <stop offset="100%" stopColor="#030304" />
        </radialGradient>
        <radialGradient id={`${uid}-glow`} cx="64%" cy="44%" r="50%">
          <stop offset="0%" stopColor="#EA3419" stopOpacity="0.34" />
          <stop offset="50%" stopColor="#EA3419" stopOpacity="0.10" />
          <stop offset="100%" stopColor="#EA3419" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${uid}-sweep`} x1="88%" y1="10%" x2="26%" y2="80%">
          <stop offset="0%" stopColor="#FF5436" stopOpacity="0.46" />
          <stop offset="52%" stopColor="#EA3419" stopOpacity="0.14" />
          <stop offset="100%" stopColor="#EA3419" stopOpacity="0" />
        </linearGradient>
      </defs>

      <rect width="512" height="512" fill={`url(#${uid}-bg)`} />
      <rect width="512" height="512" fill={`url(#${uid}-glow)`} />

      <g fill="none" strokeLinecap="round">
        <circle cx="256" cy="256" r="212" stroke="#FFFFFF" strokeOpacity="0.12" strokeWidth="3" />
        <circle cx="256" cy="256" r="154" stroke="#FFFFFF" strokeOpacity="0.12" strokeWidth="3" strokeDasharray="8 12" />
        <circle cx="256" cy="256" r="94" stroke="#EA3419" strokeOpacity="0.30" strokeWidth="3" />
        <path d="M 256 256 L 372 80 A 212 212 0 0 1 464 294 Z" fill={`url(#${uid}-sweep)`} />
      </g>

      <g
        transform="translate(256 256) scale(0.94) translate(-266 -253)"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="17"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Escaping Runner (Front / Left, sprinting left) */}
        <circle cx="132" cy="176" r="26" />
        <path d="M 148 206 Q 162 238 176 270" />
        <path d="M 148 206 L 114 238 L 86 202" />
        <path d="M 148 206 L 188 214 L 218 236" />
        <path d="M 176 270 L 134 312 L 102 360 L 86 350" />
        <path d="M 176 270 L 210 314 L 244 286 L 250 299" />

        {/* Pursuing Chaser (Back / Right, sprinting left, separated) */}
        <circle cx="326" cy="174" r="26" />
        <path d="M 342 204 Q 358 238 374 268" />
        <path d="M 342 204 L 304 228 L 274 200" />
        <path d="M 342 204 L 382 214 L 414 236" />
        <path d="M 374 268 L 328 308 L 298 358 L 282 349" />
        <path d="M 374 268 L 408 312 L 442 284 L 448 297" />
      </g>

      <circle cx="362" cy="96" r="12" fill="#EA3419" />
    </svg>
  );
};

export const PWAInstallButton: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) return null;

  const handleClick = () => {
    if (isInstallable) {
      void install();
    } else {
      setShowGuide(true);
    }
  };

  return (
    <>
      <motion.button
        whileTap={{ scale: 0.96 }}
        type="button"
        onClick={handleClick}
        aria-label="Install App"
        className={`inline-flex items-center justify-center gap-1.5 sm:gap-2 min-h-[44px] px-3 sm:px-3.5 py-2 rounded-xl bg-[#151824] hover:bg-[#1D2131] border border-white/10 text-xs font-semibold text-[#F4F5F9] transition-colors whitespace-nowrap shrink-0 ${className}`}
      >
        <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0" />
        <span className="sm:hidden">Install</span>
        <span className="hidden sm:inline">Install App</span>
      </motion.button>

      <AnimatePresence>
        {showGuide && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Install Finders Keepers on your phone"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-sm rounded-2xl bg-[#12141E] border border-white/12 p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <BrandIcon className="w-10 h-10 rounded-xl shrink-0" />
                  <div>
                    <h3 className="text-base font-bold text-white">Install Finders Keepers</h3>
                    <p className="text-xs text-slate-400">Full-screen GPS &amp; offline map tiles</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGuide(false)}
                  aria-label="Close install instructions"
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-white/5"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {isIOS ? (
                <ol className="space-y-3 text-sm text-slate-300">
                  <li className="flex items-start gap-2.5">
                    <span className="font-mono text-emerald-400 font-bold">1.</span>
                    <span>
                      Tap the <Share className="inline w-4 h-4 mx-0.5 text-cyan-400" />{' '}
                      <strong className="text-white">Share</strong> button in Safari&apos;s toolbar.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="font-mono text-emerald-400 font-bold">2.</span>
                    <span>
                      Scroll down and tap <strong className="text-white">Add to Home Screen</strong>.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="font-mono text-emerald-400 font-bold">3.</span>
                    <span>Launch from your Home Screen for full-screen tracking and Wake Lock.</span>
                  </li>
                </ol>
              ) : (
                <ol className="space-y-3 text-sm text-slate-300">
                  <li className="flex items-start gap-2.5">
                    <span className="font-mono text-emerald-400 font-bold">1.</span>
                    <span>Open your browser menu (three dots or Share icon).</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="font-mono text-emerald-400 font-bold">2.</span>
                    <span>
                      Select <strong className="text-white">Install app</strong> or{' '}
                      <strong className="text-white">Add to Home screen</strong>.
                    </span>
                  </li>
                </ol>
              )}

              <motion.button
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={() => setShowGuide(false)}
                className="mt-6 w-full min-h-[44px] rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#09090E] font-bold text-sm transition-colors"
              >
                Got It
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
