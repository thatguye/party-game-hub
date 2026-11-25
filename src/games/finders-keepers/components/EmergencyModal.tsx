import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, MapPin, PhoneCall, ShieldAlert, X } from 'lucide-react';
import type { LatLng } from '../types/game';
import { reverseGeocodeAddress } from '../services/hardware';

interface EmergencyModalProps {
  position: LatLng;
  inActiveRoom: boolean;
  onTriggerRoomEmergency?: (address: string) => void;
  onClose: () => void;
}

const HOLD_MS = 2000;

export const EmergencyModal: React.FC<EmergencyModalProps> = ({
  position,
  inActiveRoom,
  onTriggerRoomEmergency,
  onClose,
}) => {
  const [address, setAddress] = useState<string>('Locating street address...');
  const [holdProgress, setHoldProgress] = useState<number>(0);
  const [holding, setHolding] = useState(false);
  const startRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const triggeredRef = useRef(false);

  useEffect(() => {
    let active = true;
    void reverseGeocodeAddress(position.lat, position.lng).then((resolved) => {
      if (active) setAddress(resolved);
    });
    return () => {
      active = false;
    };
  }, [position.lat, position.lng]);

  const cancelHold = () => {
    setHolding(false);
    setHoldProgress(0);
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  const startHold = () => {
    if (!inActiveRoom || !onTriggerRoomEmergency) return;
    triggeredRef.current = false;
    setHolding(true);
    startRef.current = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startRef.current;
      const pct = Math.min(100, (elapsed / HOLD_MS) * 100);
      setHoldProgress(pct);
      if (elapsed >= HOLD_MS && !triggeredRef.current) {
        triggeredRef.current = true;
        cancelHold();
        onTriggerRoomEmergency(address);
        onClose();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.16 }}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Get Help Emergency Screen"
    >
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 420, damping: 30 }}
        className="w-full max-w-md rounded-2xl bg-[#121015] border border-red-500/40 p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white leading-tight">Get Help</h2>
              <p className="text-xs text-red-200/80">Emergency dial &amp; GPS location</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Get Help screen"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-white/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* One-tap Emergency Call Button (US 911 primary) */}
        <div className="mt-5 space-y-2">
          <a
            href="tel:911"
            className="w-full min-h-[56px] flex items-center justify-center gap-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-base shadow-lg shadow-red-600/25 transition-colors"
          >
            <PhoneCall className="w-5 h-5" />
            <span>Call 911</span>
          </a>
          <div className="text-center">
            <a
              href="tel:112"
              className="text-xs font-medium text-slate-400 hover:text-red-200 underline underline-offset-2"
            >
              Outside the US? Call 112
            </a>
          </div>
        </div>

        {/* Exact Street Address & Raw Coordinates */}
        <div className="mt-5 rounded-xl bg-[#0B0A0F] border border-[#2B2533] p-4 space-y-3">
          <div className="flex items-start gap-2.5">
            <MapPin className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-semibold text-slate-400">Nearest Street Address</div>
              <div className="mt-1 text-base font-semibold text-white leading-snug">{address}</div>
            </div>
          </div>

          <div className="pt-3 border-t border-white/10">
            <div className="text-xs font-semibold text-slate-400">Exact GPS Coordinates</div>
            <div className="mt-1 font-mono text-xl font-bold text-amber-300 tabular-nums tracking-tight">
              {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
            </div>
          </div>
        </div>

        {/* 2-Second Hold Emergency Pause */}
        {inActiveRoom && onTriggerRoomEmergency && (
          <div className="mt-5">
            <button
              type="button"
              onMouseDown={startHold}
              onMouseUp={cancelHold}
              onMouseLeave={cancelHold}
              onTouchStart={(e) => {
                e.preventDefault();
                startHold();
              }}
              onTouchEnd={cancelHold}
              onTouchCancel={cancelHold}
              className="relative overflow-hidden w-full min-h-[56px] rounded-xl bg-[#2A1418] border-2 border-red-500/70 text-white font-bold text-sm flex items-center justify-center gap-2 select-none"
            >
              <div
                className="absolute inset-y-0 left-0 bg-red-600/80 transition-none"
                style={{ width: `${holdProgress}%` }}
              />
              <span className="relative z-10 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                {holding
                  ? `Hold to Pause Game (${Math.ceil(((100 - holdProgress) / 100) * 2)}s)...`
                  : 'Hold 2s: Tell Everyone in the Game'}
              </span>
            </button>
            <p className="mt-2 text-xs text-slate-400 text-center">
              Freezes the round for all players and broadcasts your exact live GPS pin until you tap
              &quot;I&apos;m OK&quot;.
            </p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};
