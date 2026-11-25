import React from 'react';
import { motion } from 'motion/react';
import { Compass, LocateFixed, MapPinOff, RefreshCw, ShieldCheck } from 'lucide-react';
import type { LocationAccessStatus } from '../game/rules';
import { BrandIcon } from './BrandIcon';

interface LocationGateOverlayProps {
  status: LocationAccessStatus;
  errorMessage: string | null;
  onRequestLocation: () => void;
}

export const LocationGateOverlay: React.FC<LocationGateOverlayProps> = ({
  status,
  errorMessage,
  onRequestLocation,
}) => {
  const isChecking = status === 'checking';
  const isDenied = status === 'denied';

  const headline = isChecking
    ? 'Locating Your Position'
    : isDenied
    ? 'Location Access Required'
    : 'GPS Signal Unavailable';

  const subtitle = isChecking
    ? 'Allow location access so Finders Keepers can place you accurately on the live radar map.'
    : isDenied
    ? 'Finders Keepers is a real-world GPS game and cannot be played without your real location.'
    : 'We could not lock onto your device GPS. Make sure Location Services are turned on and try again.';

  return (
    <div
      data-testid="location-gate-overlay"
      data-location-status={status}
      role="dialog"
      aria-modal="true"
      aria-label="Location access required"
      className="fixed inset-0 z-[90] bg-[#08090E] text-[#F4F5F9] flex flex-col justify-between overflow-y-auto px-5 sm:px-6 pt-safe pb-safe select-none"
    >
      {/* Ambient Emerald Radar Backdrop */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-emerald-500/10 blur-[110px]" />
        <div className="absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2 w-[360px] h-[360px] rounded-full border border-emerald-500/15" />
        <div className="absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2 w-[230px] h-[230px] rounded-full border border-emerald-400/15" />
      </div>

      {/* Top Brand Header */}
      <header className="relative z-10 w-full max-w-md mx-auto pt-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <BrandIcon className="w-9 h-9 rounded-xl shrink-0" />
          <div className="min-w-0">
            <div className="font-display text-xl font-extrabold tracking-wide text-white uppercase leading-none truncate">
              FINDERS KEEPERS
            </div>
            <div className="text-[11px] text-emerald-400/90 font-medium mt-0.5">
              Live GPS Required
            </div>
          </div>
        </div>
        <span
          className={`px-2.5 py-1 rounded-full text-[11px] font-bold border whitespace-nowrap shrink-0 ${
            isChecking
              ? 'bg-emerald-500/12 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/15 border-red-500/35 text-red-300'
          }`}
        >
          {isChecking ? 'Requesting GPS' : isDenied ? 'Blocked' : 'No Signal'}
        </span>
      </header>

      {/* Center Lock Card */}
      <main className="relative z-10 w-full max-w-md mx-auto my-auto py-3 sm:py-6">
        <motion.div
          initial={{ opacity: 0, y: 14, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-3xl bg-[#0D111C]/95 border border-emerald-500/20 p-4 sm:p-6 shadow-2xl space-y-3.5 sm:space-y-5"
        >
          {/* Icon Beacon */}
          <div className="flex justify-center">
            <div className="relative w-14 h-14 sm:w-18 sm:h-18 flex items-center justify-center">
              {isChecking && (
                <motion.span
                  aria-hidden="true"
                  animate={{ scale: [1, 1.45], opacity: [0.55, 0] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
                  className="absolute inset-0 rounded-full border-2 border-emerald-400/60"
                />
              )}
              <div
                className={`w-13 h-13 sm:w-16 sm:h-16 rounded-2xl border flex items-center justify-center ${
                  isChecking
                    ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300'
                    : 'bg-red-500/15 border-red-400/40 text-red-300'
                }`}
              >
                {isChecking ? (
                  <LocateFixed className="w-6 h-6 sm:w-8 sm:h-8" />
                ) : (
                  <MapPinOff className="w-6 h-6 sm:w-8 sm:h-8" />
                )}
              </div>
            </div>
          </div>

          <div className="text-center space-y-1.5">
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
              {headline}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-snug sm:leading-relaxed">
              {subtitle}
            </p>
          </div>

          {errorMessage && !isChecking && (
            <div
              role="alert"
              className="rounded-xl bg-red-500/10 border border-red-500/30 px-3 py-2 text-[11px] sm:text-xs text-red-200 leading-snug"
            >
              {errorMessage}
            </div>
          )}

          {isDenied && (
            <div className="rounded-2xl bg-[#080B12] border border-white/[0.08] p-3 space-y-1.5 text-xs text-slate-300">
              <div className="font-bold text-emerald-300 flex items-center gap-1.5 text-[11px] sm:text-xs">
                <Compass className="w-3.5 h-3.5 shrink-0" />
                <span>How to enable location</span>
              </div>
              <ul className="space-y-1 leading-snug text-[11px] sm:text-xs text-slate-300">
                <li>
                  <strong className="text-white">iPhone / iPad:</strong>{' '}
                  <span className="text-white">Settings → Privacy &amp; Security → Location Services → Safari Websites</span>{' '}
                  → <span className="text-emerald-300 font-semibold">While Using</span>.
                </li>
                <li>
                  <strong className="text-white">Android / Desktop:</strong> Tap the{' '}
                  <span className="text-white">lock / site icon</span> in your address bar →{' '}
                  <span className="text-emerald-300 font-semibold">Location → Allow</span>.
                </li>
              </ul>
            </div>
          )}

          <motion.button
            whileTap={{ scale: 0.98 }}
            type="button"
            data-testid="location-gate-retry-btn"
            onClick={onRequestLocation}
            className="w-full min-h-[48px] sm:min-h-[52px] px-5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-[#08090E] font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-colors"
          >
            {isChecking ? (
              <>
                <LocateFixed className="w-5 h-5" />
                <span>Allow Location Access</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                <span>Enable Location &amp; Retry</span>
              </>
            )}
          </motion.button>
        </motion.div>
      </main>

      {/* Privacy Footnote */}
      <footer className="relative z-10 w-full max-w-md mx-auto pb-2.5 sm:pb-4 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 text-center">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <span>Your GPS is only shared inside rooms you join during active matches.</span>
      </footer>
    </div>
  );
};
