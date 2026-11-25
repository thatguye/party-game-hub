import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, LayoutGrid } from 'lucide-react';
import chooserIcon from '@/assets/game-icons/chooser-icon.svg';
import impostorIcon from '@/assets/game-icons/impostor-icon.png';
import findersKeepersIcon from '@/assets/game-icons/finders-keepers-icon.svg';

interface QuickSwitchMenuProps {
  currentGame: 'chooser' | 'impostor' | 'finders-keepers';
  onBeforeNavigate?: () => void;
  compact?: boolean;
}

const GAMES = [
  {
    id: 'chooser' as const,
    name: 'Chooser',
    path: '/chooser',
    badge: '100% Offline',
    icon: chooserIcon,
  },
  {
    id: 'impostor' as const,
    name: 'Impostor',
    path: '/impostor',
    badge: 'Offline + Online',
    icon: impostorIcon,
  },
  {
    id: 'finders-keepers' as const,
    name: 'Finders Keepers',
    path: '/finders-keepers',
    badge: 'Online Manhunt',
    icon: findersKeepersIcon,
  },
];

export const QuickSwitchMenu: React.FC<QuickSwitchMenuProps> = ({
  currentGame,
  onBeforeNavigate,
  compact = false,
}) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const goTo = (path: string) => {
    setOpen(false);
    onBeforeNavigate?.();
    navigate(path);
  };

  return (
    <div ref={containerRef} className="relative shrink-0">
      <div className="inline-flex items-center rounded-xl bg-white/[0.06] border border-white/12 overflow-hidden">
        <button
          type="button"
          onClick={() => goTo('/')}
          data-testid="back-to-hub-btn"
          aria-label="Back to Party Game Hub"
          className={`inline-flex items-center gap-1.5 ${
            compact ? 'min-h-[38px] px-2.5' : 'min-h-[40px] px-3'
          } text-xs font-bold text-[#F4F5FA] hover:bg-white/[0.09] transition-colors whitespace-nowrap cursor-pointer`}
        >
          <LayoutGrid className="w-3.5 h-3.5 text-fuchsia-400 shrink-0" aria-hidden="true" />
          <span>Hub</span>
        </button>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Quick switch game"
          aria-expanded={open}
          className={`inline-flex items-center justify-center ${
            compact ? 'min-h-[38px] px-2' : 'min-h-[40px] px-2'
          } border-l border-white/10 text-slate-300 hover:bg-white/[0.09] hover:text-white transition-colors cursor-pointer`}
        >
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>
      </div>

      {open && (
        <div
          role="menu"
          aria-label="Switch party game"
          className="absolute left-0 mt-2 w-60 rounded-2xl bg-[#131222]/98 border border-white/15 p-1.5 shadow-2xl backdrop-blur-xl z-50"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => goTo('/')}
            className="w-full flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-xs font-bold text-fuchsia-300 hover:bg-white/[0.07] transition-colors cursor-pointer"
          >
            <img
              src="/icons/hub-icon.svg"
              alt=""
              className="w-7 h-7 rounded-lg border border-white/15 shrink-0"
            />
            <div className="min-w-0">
              <div className="text-white truncate">Party Game Hub</div>
              <div className="text-[10px] text-slate-400 font-medium">All Games &amp; Profile</div>
            </div>
          </button>

          <div className="my-1 border-t border-white/[0.08]" />

          {GAMES.map((game) => {
            const active = game.id === currentGame;
            return (
              <button
                key={game.id}
                type="button"
                role="menuitem"
                disabled={active}
                onClick={() => goTo(game.path)}
                className={`w-full flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors ${
                  active
                    ? 'bg-white/[0.08] cursor-default'
                    : 'hover:bg-white/[0.07] cursor-pointer'
                }`}
              >
                <img
                  src={game.icon}
                  alt={`${game.name} icon`}
                  className="w-7 h-7 rounded-lg border border-white/15 object-cover shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                    <span>{game.name}</span>
                    {active && (
                      <span className="text-[10px] font-semibold text-cyan-300">Active</span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400">{game.badge}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
