import React from 'react';
import { Check, Siren, SkipForward, UserX } from 'lucide-react';
import type { ImposterMeeting, PlayerState } from '../types/game';
import { formatCountdown } from '../game/geo';

interface ImposterMeetingModalProps {
  meeting: ImposterMeeting;
  players: PlayerState[];
  viewerId: string;
  nowMs: number;
  isHost: boolean;
  onCastVote: (targetId: string) => void;
  onResolveMeeting: () => void;
}

export const ImposterMeetingModal: React.FC<ImposterMeetingModalProps> = ({
  meeting,
  players,
  viewerId,
  nowMs,
  isHost,
  onCastVote,
  onResolveMeeting,
}) => {
  const remainingMs = Math.max(0, meeting.endsAt - nowMs);
  const alivePlayers = players.filter((p) => !p.eliminated);
  const myVote = meeting.votes[viewerId];
  const voteCounts = new Map<string, number>();

  Object.values(meeting.votes).forEach((target) => {
    voteCounts.set(target, (voteCounts.get(target) ?? 0) + 1);
  });

  const totalVotes = Object.keys(meeting.votes).length;

  return (
    <div
      className="fixed inset-0 z-[65] flex items-center justify-center bg-black/85 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Imposter Emergency Meeting"
    >
      <div className="w-full max-w-md max-h-[88dvh] overflow-y-auto rounded-2xl bg-[#12131E] border border-amber-500/50 p-5 shadow-2xl">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
              <Siren className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Emergency Meeting</h2>
              <p className="text-xs text-slate-400">
                Called by {meeting.calledByName} · Movement paused
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono text-2xl font-bold text-amber-400 tabular-nums">
              {formatCountdown(remainingMs)}
            </div>
            <div className="text-[11px] text-slate-400 tabular-nums">
              {totalVotes}/{alivePlayers.length} voted
            </div>
          </div>
        </div>

        <p className="mt-4 text-xs text-slate-300">
          Vote to eliminate a suspect or skip.
        </p>

        <div className="mt-4 space-y-2">
          {alivePlayers.map((player) => {
            const count = voteCounts.get(player.id) ?? 0;
            const selected = myVote === player.id;
            return (
              <button
                key={player.id}
                type="button"
                onClick={() => onCastVote(player.id)}
                className={`w-full min-h-[52px] px-4 py-2.5 rounded-xl border flex items-center justify-between transition-colors ${
                  selected
                    ? 'bg-amber-500/20 border-amber-400 text-white'
                    : 'bg-[#181B29] border-[#292E42] text-slate-200 hover:bg-[#1E2233]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: player.color }}
                  />
                  <span className="font-semibold text-sm truncate">
                    {player.name}
                    {player.id === viewerId ? ' (You)' : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono text-xs text-slate-400 tabular-nums">
                    {count} {count === 1 ? 'vote' : 'votes'}
                  </span>
                  {selected ? (
                    <Check className="w-4 h-4 text-amber-400" />
                  ) : (
                    <UserX className="w-4 h-4 text-slate-500" />
                  )}
                </div>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => onCastVote('skip')}
            className={`w-full min-h-[48px] px-4 py-2 rounded-xl border flex items-center justify-between transition-colors ${
              myVote === 'skip'
                ? 'bg-slate-700/60 border-slate-400 text-white'
                : 'bg-[#141622] border-[#262A3B] text-slate-300 hover:bg-[#1A1D2C]'
            }`}
          >
            <span className="inline-flex items-center gap-2 text-sm font-semibold">
              <SkipForward className="w-4 h-4" />
              Skip Vote
            </span>
            <span className="font-mono text-xs text-slate-400 tabular-nums">
              {voteCounts.get('skip') ?? 0} votes
            </span>
          </button>
        </div>

        {(isHost || remainingMs === 0) && (
          <button
            type="button"
            onClick={onResolveMeeting}
            className="mt-5 w-full min-h-[48px] rounded-xl bg-amber-500 hover:bg-amber-400 text-[#09090E] font-bold text-sm transition-colors"
          >
            Tally Votes & Resume Hunt
          </button>
        )}
      </div>
    </div>
  );
};
