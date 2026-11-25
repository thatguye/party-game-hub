import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Check, Copy, X } from 'lucide-react';

interface QrCodeModalProps {
  roomCode: string;
  inviteUrl: string;
  onClose: () => void;
}

export const QrCodeModal: React.FC<QrCodeModalProps> = ({ roomCode, inviteUrl, onClose }) => {
  const [svgMarkup, setSvgMarkup] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    QRCode.toString(inviteUrl, {
      type: 'svg',
      margin: 2,
      width: 240,
      color: {
        dark: '#09090E',
        light: '#F8FAFC',
      },
    })
      .then((svg) => {
        if (active) setSvgMarkup(svg);
      })
      .catch(() => {
        if (active) setSvgMarkup('');
      });
    return () => {
      active = false;
    };
  }, [inviteUrl]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Room Invite QR Code"
    >
      <div className="w-full max-w-sm rounded-2xl bg-[#12141E] border border-[#282D40] p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-white">Scan to Join</h3>
            <p className="text-xs text-slate-400">Room code {roomCode}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close QR code dialog"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-white/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex justify-center p-4 rounded-2xl bg-[#F8FAFC]">
          {svgMarkup ? (
            <div
              className="w-56 h-56 [&>svg]:w-full [&>svg]:h-full"
              dangerouslySetInnerHTML={{ __html: svgMarkup }}
            />
          ) : (
            <div className="w-56 h-56 flex items-center justify-center text-slate-900 font-mono text-sm">
              Generating QR...
            </div>
          )}
        </div>

        <div className="mt-4 text-center">
          <p className="font-mono text-2xl font-bold tracking-[0.22em] text-emerald-400 tabular-nums">
            {roomCode}
          </p>
          <p className="mt-1 text-xs text-slate-400 truncate">{inviteUrl}</p>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="mt-5 w-full min-h-[48px] flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#09090E] font-bold text-sm transition-colors"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          <span>{copied ? 'Invite Link Copied' : 'Copy Invite Link'}</span>
        </button>
      </div>
    </div>
  );
};
