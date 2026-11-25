import React, { useState } from 'react';
import {
  AlertCircle,
  Check,
  Copy,
  Database,
  KeyRound,
  Link2,
  Loader2,
  Trash2,
  X,
} from 'lucide-react';
import { SupabaseCredentials } from '../types/game';
import {
  ROOMS_TABLE_SQL,
  resetCachedSupabaseClient,
  testSupabaseConnection,
} from '../utils/supabaseClient';
import { loadSupabaseCredentials, saveSupabaseCredentials } from '../utils/storage';
import { playTapSound } from '../utils/audio';

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  const existing = loadSupabaseCredentials();
  const [url, setUrl] = useState(existing?.url ?? '');
  const [anonKey, setAnonKey] = useState(existing?.anonKey ?? '');
  const [testing, setTesting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [needsSql, setNeedsSql] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  if (!isOpen) return null;

  const handleSaveAndTest = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = url.trim().replace(/\/+$/, '');
    const cleanKey = anonKey.trim();

    if (!cleanUrl || !cleanKey) {
      setErrorMsg('Enter both your Supabase Project URL and Anon Key.');
      return;
    }
    if (!/^https?:\/\/.+/.test(cleanUrl)) {
      setErrorMsg('Supabase URL must start with https://');
      return;
    }

    playTapSound();
    setTesting(true);
    setErrorMsg(null);
    setNeedsSql(false);

    const creds: SupabaseCredentials = { url: cleanUrl, anonKey: cleanKey };
    const res = await testSupabaseConnection(creds);
    setTesting(false);

    if (!res.ok) {
      // Still allow saving credentials if only table setup SQL hasn't been run yet
      if (res.needsTable) {
        saveSupabaseCredentials(creds);
        resetCachedSupabaseClient();
        setNeedsSql(true);
      }
      setErrorMsg(res.error ?? 'Could not connect to Supabase.');
      return;
    }

    saveSupabaseCredentials(creds);
    resetCachedSupabaseClient();
    onSaved();
    onClose();
  };

  const handleCopySql = async () => {
    playTapSound();
    try {
      await navigator.clipboard.writeText(ROOMS_TABLE_SQL);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2000);
    } catch {
      // Ignore clipboard failures
    }
  };

  const handleClear = () => {
    playTapSound();
    saveSupabaseCredentials(null);
    resetCachedSupabaseClient();
    setUrl('');
    setAnonKey('');
    setErrorMsg(null);
    setNeedsSql(false);
    onSaved();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="supabase-modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm sm:p-4"
    >
      <div className="flex max-h-[90dvh] w-full max-w-lg flex-col rounded-t-3xl sm:rounded-3xl bg-[#14141F] border border-white/10 shadow-2xl overflow-hidden">
        <div className="sm:hidden pt-3 pb-1 flex justify-center">
          <div className="h-1.5 w-10 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-4 pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <Database className="h-5 w-5 text-cyan-400" aria-hidden="true" />
            <h2 id="supabase-modal-title" className="font-display text-lg font-bold text-[#F4F4F8]">
              Connect Free Supabase Project
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Supabase setup"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-[#9898B0] hover:bg-white/[0.08] hover:text-white cursor-pointer"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSaveAndTest} className="flex flex-1 min-h-0 flex-col">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <p className="text-xs text-[#9898B0] leading-relaxed">
              Online rooms sync in real time through a free{' '}
              <strong className="text-[#F4F4F8]">Supabase</strong> project. Paste your Project URL
              and public Anon Key from{' '}
              <span className="font-mono text-cyan-300">Project Settings → API</span>.
            </p>

            <div className="space-y-3">
              <div>
                <label
                  htmlFor="supabase-url-input"
                  className="flex items-center gap-1.5 text-xs font-semibold text-[#D6D6E6] mb-1.5"
                >
                  <Link2 className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
                  <span>Supabase Project URL</span>
                </label>
                <input
                  id="supabase-url-input"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://xyzcompany.supabase.co"
                  required
                  className="w-full min-h-[46px] rounded-2xl bg-[#09090E] border border-white/10 px-4 font-mono text-xs text-[#F4F4F8] placeholder:text-[#666680] focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="supabase-key-input"
                  className="flex items-center gap-1.5 text-xs font-semibold text-[#D6D6E6] mb-1.5"
                >
                  <KeyRound className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
                  <span>Supabase Anon Key</span>
                </label>
                <input
                  id="supabase-key-input"
                  type="text"
                  value={anonKey}
                  onChange={(e) => setAnonKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                  required
                  className="w-full min-h-[46px] rounded-2xl bg-[#09090E] border border-white/10 px-4 font-mono text-xs text-[#F4F4F8] placeholder:text-[#666680] focus:border-cyan-400 focus:outline-none"
                />
              </div>
            </div>

            {errorMsg && (
              <div className="flex items-start gap-2.5 rounded-2xl bg-rose-500/12 border border-rose-500/35 p-3.5 text-xs text-rose-200 leading-relaxed">
                <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Copyable SQL Snippet */}
            <div
              className={`rounded-2xl border p-3.5 space-y-2 ${
                needsSql
                  ? 'bg-[#1D161A] border-amber-400/45'
                  : 'bg-[#09090E] border-white/[0.08]'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[#F4F4F8]">
                  One-Time SQL Setup (rooms table)
                </span>
                <button
                  type="button"
                  onClick={handleCopySql}
                  className="flex min-h-[32px] items-center gap-1.5 rounded-lg bg-white/[0.08] px-2.5 text-[11px] font-semibold text-cyan-300 hover:bg-white/[0.14] cursor-pointer"
                >
                  {copiedSql ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-400" aria-hidden="true" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" aria-hidden="true" />
                      <span>Copy SQL</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="overflow-x-auto rounded-xl bg-black/50 p-2.5 font-mono text-[10px] leading-relaxed text-[#B8B8CE]">
                {ROOMS_TABLE_SQL}
              </pre>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2.5 px-6 py-4 border-t border-white/[0.08] bg-[#14141F] pb-safe">
            {existing && (
              <button
                type="button"
                onClick={handleClear}
                aria-label="Clear saved credentials"
                className="flex min-h-[48px] items-center justify-center gap-1.5 rounded-2xl bg-white/[0.06] px-4 text-xs font-semibold text-rose-300 hover:bg-rose-500/15 cursor-pointer"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                <span>Clear</span>
              </button>
            )}
            <button
              type="submit"
              disabled={testing}
              className="flex flex-1 min-h-[50px] items-center justify-center gap-2 rounded-2xl bg-cyan-400 font-display text-sm font-extrabold text-[#061318] hover:bg-cyan-300 disabled:opacity-50 transition-all cursor-pointer"
            >
              {testing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  <span>Testing Connection...</span>
                </>
              ) : (
                <span>Test & Save Supabase</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
