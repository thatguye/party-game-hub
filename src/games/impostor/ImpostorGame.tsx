import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CategoryDeck,
  GamePhase,
  GameSettings,
  OnlineProfile,
  OnlineRoomState,
  OnlineSessionIdentity,
  Player,
  PlayerGroup,
  RoundState,
  UsedHistory,
} from './types/game';
import { BUILT_IN_CATEGORIES, DEFAULT_SELECTED_DECK_IDS } from './data/gameData';
import {
  calculateRoundScoreDeltas,
  callZeroImpostors,
  createRound,
  eliminatePlayer,
  submitPlayerAnswer,
} from './game/engine';
import {
  addOrRejoinRoomPlayer,
  advanceAfterVoteResults,
  backToOnlineDiscussion,
  castOnlineVote,
  createInitialRoomState,
  forceStartOnlineDiscussion,
  generateRoomCode,
  markPlayerReadyWordMode,
  normalizeRoomCode,
  removeRoomPlayer,
  resetOnlineScores,
  resolveOnlineVotes,
  returnRoomToLobby,
  revealAllRolesOnline,
  startOnlineRound,
  startOnlineVoting,
  submitOnlineQuestionAnswer,
  updateOnlineTimer,
  updateRoomLobbyConfig,
} from './game/online';
import {
  loadCustomDecks,
  loadMuted,
  loadOnlineProfile,
  loadOnlineSession,
  loadPlayerGroups,
  loadPlayers,
  loadScores,
  loadSelectedDeckIds,
  loadSettings,
  loadUsedHistory,
  saveCustomDecks,
  saveMuted,
  saveOnlineProfile,
  saveOnlineSession,
  savePlayerGroups,
  savePlayers,
  saveScores,
  saveSelectedDeckIds,
  saveSettings,
  saveUsedHistory,
} from './utils/storage';
import {
  createRoomRow,
  fetchRoomRow,
  getSupabaseClient,
  mutateRoomRow,
  resolveSupabaseCredentials,
  subscribeToRoomRow,
} from './utils/supabaseClient';
import {
  playDramaticRevealSound,
  playTapSound,
  playVictoryFanfare,
  setAudioMuted,
  unlockIOSAudio,
} from './utils/audio';
import { loadHubProfile, saveHubProfile } from '@/lib/profile';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { HeaderBar } from './components/HeaderBar';
import { SetupHub } from './components/SetupHub';
import { HowToPlayModal } from './components/HowToPlayModal';
import { ScoreboardModal } from './components/ScoreboardModal';
import { ChangelogModal } from './components/ChangelogModal';
import { CustomDeckModal } from './components/CustomDeckModal';
import { SupabaseConfigModal } from './components/SupabaseConfigModal';
import { PrivacyPassScreen } from './components/PrivacyPassScreen';
import { DiscussionScreen } from './components/DiscussionScreen';
import { VotingScreen } from './components/VotingScreen';
import { RoundSummaryScreen } from './components/RoundSummaryScreen';
import { OnlineRoomView } from './components/OnlineRoomView';

function createClientPlayerId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `op-${crypto.randomUUID().slice(0, 10)}`;
  }
  return `op-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function loadMergedOnlineProfile(): OnlineProfile {
  const stored = loadOnlineProfile();
  const hub = loadHubProfile();
  return {
    name: hub.displayName.trim() ? hub.displayName : stored.name,
    emoji: stored.emoji || '🦊',
    color: hub.avatarColor || stored.color || '#22D3EE',
  };
}

export default function ImpostorGame() {
  const isOnline = useOnlineStatus();

  const [players, setPlayers] = useState<Player[]>(() => loadPlayers());
  const [groups, setGroups] = useState<PlayerGroup[]>(() => loadPlayerGroups());
  const [settings, setSettings] = useState<GameSettings>(() => loadSettings());
  const [customDecks, setCustomDecks] = useState<CategoryDeck[]>(() => loadCustomDecks());
  const [selectedDeckIds, setSelectedDeckIds] = useState<string[]>(() =>
    loadSelectedDeckIds(DEFAULT_SELECTED_DECK_IDS)
  );
  const [usedHistory, setUsedHistory] = useState<UsedHistory>(() => loadUsedHistory());
  const [scores, setScores] = useState<Record<string, number>>(() => loadScores());
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    const m = loadMuted();
    setAudioMuted(m);
    return m;
  });

  // Pass & Play Active Game State
  const [phase, setPhase] = useState<GamePhase>('lobby');
  const [round, setRound] = useState<RoundState | null>(null);
  const [roundCount, setRoundCount] = useState<number>(0);
  const [roundScoreDeltas, setRoundScoreDeltas] = useState<Record<string, number>>({});
  const [noticeBanner, setNoticeBanner] = useState<string | null>(null);

  // Online Multiplayer State (auto pre-filled from Shared Hub Profile)
  const [playStyle, setPlayStyle] = useState<'pass_and_play' | 'online'>('pass_and_play');
  const [onlineActionTab, setOnlineActionTab] = useState<'host' | 'join'>('host');
  const [onlineProfile, setOnlineProfile] = useState<OnlineProfile>(() => loadMergedOnlineProfile());
  const [joinCodeDraft, setJoinCodeDraft] = useState('');
  const [onlineError, setOnlineError] = useState<string | null>(null);
  const [onlineLoading, setOnlineLoading] = useState(false);
  const [isSyncingOnline, setIsSyncingOnline] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState<string>('CLOSED');
  const [onlineSession, setOnlineSession] = useState<OnlineSessionIdentity | null>(() =>
    loadOnlineSession()
  );
  const [onlineRoom, setOnlineRoom] = useState<OnlineRoomState | null>(null);
  const [showSupabaseConfig, setShowSupabaseConfig] = useState(false);
  const [supabaseConfigTick, setSupabaseConfigTick] = useState(0);
  const [reconnectTick, setReconnectTick] = useState(0);

  // Modals
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showScoreboard, setShowScoreboard] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const [showCustomDeckModal, setShowCustomDeckModal] = useState(false);
  const [editingDeck, setEditingDeck] = useState<CategoryDeck | null>(null);

  const onlineSessionRef = useRef(onlineSession);
  onlineSessionRef.current = onlineSession;
  const realtimeStatusRef = useRef(realtimeStatus);
  realtimeStatusRef.current = realtimeStatus;
  const prevOnlinePhaseRef = useRef<string | null>(null);

  const supabaseInfo = useMemo(() => {
    void supabaseConfigTick;
    return resolveSupabaseCredentials();
  }, [supabaseConfigTick]);

  // Ensure shared Supabase client is initialized when configured
  useEffect(() => {
    getSupabaseClient();
  }, [supabaseConfigTick]);

  // Unlock iOS silent-switch audio on first user interaction
  useEffect(() => {
    const handleFirstGesture = () => {
      unlockIOSAudio();
    };
    window.addEventListener('pointerdown', handleFirstGesture, { once: true, passive: true });
    window.addEventListener('keydown', handleFirstGesture, { once: true });
    return () => {
      window.removeEventListener('pointerdown', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
    };
  }, []);

  // Persist local preferences
  useEffect(() => savePlayers(players), [players]);
  useEffect(() => savePlayerGroups(groups), [groups]);
  useEffect(() => saveSettings(settings), [settings]);
  useEffect(() => saveCustomDecks(customDecks), [customDecks]);
  useEffect(() => saveSelectedDeckIds(selectedDeckIds), [selectedDeckIds]);
  useEffect(() => saveUsedHistory(usedHistory), [usedHistory]);
  useEffect(() => saveScores(scores), [scores]);
  useEffect(() => saveOnlineProfile(onlineProfile), [onlineProfile]);

  const handleChangeOnlineProfile = useCallback((nextProfile: OnlineProfile) => {
    setOnlineError(null);
    setOnlineProfile(nextProfile);
    saveHubProfile({
      displayName: nextProfile.name,
      avatarColor: nextProfile.color,
    });
  }, []);

  // Lock page scrolling during Word/Question card reveals (offline & online)
  const isPassLocked = phase === 'privacy_pass' || onlineRoom?.phase === 'role_reveal';
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    if (isPassLocked) {
      window.scrollTo(0, 0);
      html.classList.add('scroll-locked');
      body.classList.add('scroll-locked');
    } else {
      html.classList.remove('scroll-locked');
      body.classList.remove('scroll-locked');
    }
    return () => {
      html.classList.remove('scroll-locked');
      body.classList.remove('scroll-locked');
    };
  }, [isPassLocked]);

  const allDecks = useMemo(
    () => [...customDecks, ...BUILT_IN_CATEGORIES],
    [customDecks]
  );

  const selectedDecksForMode = useMemo(() => {
    const selectedSet = new Set(selectedDeckIds);
    return allDecks.filter((d) => {
      if (!selectedSet.has(d.id)) return false;
      return settings.mode === 'word' ? d.words.length > 0 : d.questions.length > 0;
    });
  }, [allDecks, selectedDeckIds, settings.mode]);

  const canStartError = useMemo(() => {
    if (players.length < 3) return 'Add at least 3 players to start.';
    if (selectedDecksForMode.length === 0) {
      return `Select at least one deck with ${
        settings.mode === 'word' ? 'words' : 'questions'
      }.`;
    }
    return null;
  }, [players.length, selectedDecksForMode.length, settings.mode]);

  const showNotice = useCallback((msg: string) => {
    setNoticeBanner(msg);
    window.setTimeout(() => {
      setNoticeBanner((curr) => (curr === msg ? null : curr));
    }, 3200);
  }, []);

  // Auto-rejoin saved online session OR prefill ?room=XXXX invite link
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const roomParam = normalizeRoomCode(params.get('room') ?? '');
    const saved = loadOnlineSession();

    if (roomParam.length === 4 && (!saved || saved.roomCode !== roomParam)) {
      setPlayStyle('online');
      setOnlineActionTab('join');
      setJoinCodeDraft(roomParam);
      if (saved) {
        saveOnlineSession(null);
        setOnlineSession(null);
      }
      return;
    }

    if (!saved || (typeof navigator !== 'undefined' && !navigator.onLine)) return;
    const { creds } = resolveSupabaseCredentials();
    if (!creds) {
      setPlayStyle('online');
      return;
    }

    let cancelled = false;
    setPlayStyle('online');
    setOnlineLoading(true);

    fetchRoomRow(saved.roomCode)
      .then((fetched) => {
        if (cancelled) return;
        if (!fetched || !fetched.players.some((p) => p.id === saved.playerId)) {
          saveOnlineSession(null);
          setOnlineSession(null);
          setOnlineRoom(null);
          return;
        }
        setOnlineRoom(fetched);
        const me = fetched.players.find((p) => p.id === saved.playerId);
        if (me) {
          void mutateRoomRow(saved.roomCode, (curr) =>
            addOrRejoinRoomPlayer(curr, {
              id: me.id,
              name: me.name,
              emoji: me.emoji,
              color: me.color,
            })
          )
            .then((refreshed) => {
              if (!cancelled && refreshed) setOnlineRoom(refreshed);
            })
            .catch(() => {
              // Ignore background heartbeat failure
            });
        }
      })
      .catch(() => {
        // Keep session saved so user can retry sync
      })
      .finally(() => {
        if (!cancelled) setOnlineLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [supabaseConfigTick]);

  // Force state sync whenever returning from Discord/FaceTime, unlocking phone, or regaining network
  const forceSyncOnlineRoom = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    const session = onlineSessionRef.current;
    if (!session) return;
    const { creds } = resolveSupabaseCredentials();
    if (!creds) return;

    setIsSyncingOnline(true);
    try {
      const latest = await fetchRoomRow(session.roomCode);
      if (!latest || !latest.players.some((p) => p.id === session.playerId)) {
        saveOnlineSession(null);
        setOnlineSession(null);
        setOnlineRoom(null);
        showNotice('You left or the online room closed.');
        return;
      }
      setOnlineRoom(latest);
      if (realtimeStatusRef.current !== 'SUBSCRIBED') {
        setReconnectTick((t) => t + 1);
      }
    } catch {
      // Ignore transient offline sync error; next visibilitychange/sync will recover
    } finally {
      setIsSyncingOnline(false);
    }
  }, [showNotice]);

  // Subscribe to isolated Supabase Realtime topic (`impostor:room:${code}`) & tear down strictly on unmount
  useEffect(() => {
    if (!onlineSession || !onlineRoom) {
      setRealtimeStatus('CLOSED');
      return;
    }
    const { creds } = resolveSupabaseCredentials();
    if (!creds) return;

    const unsubscribe = subscribeToRoomRow(
      onlineSession.roomCode,
      (updatedRoom) => {
        setOnlineRoom((prev) => {
          if (prev && updatedRoom.version < prev.version) return prev;
          return updatedRoom;
        });
      },
      (status) => {
        setRealtimeStatus(status);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [onlineSession?.roomCode, !!onlineRoom, supabaseConfigTick, reconnectTick]);

  // Listen for visibilitychange / focus / online events for mobile call resilience
  useEffect(() => {
    if (!onlineSession || !onlineRoom) return;

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void forceSyncOnlineRoom();
      }
    };
    const handleFocus = () => {
      void forceSyncOnlineRoom();
    };
    const handleOnline = () => {
      void forceSyncOnlineRoom();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleOnline);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleOnline);
    };
  }, [onlineSession, !!onlineRoom, forceSyncOnlineRoom]);

  // Subtle sound cues when online phase transitions into reveals/summaries
  useEffect(() => {
    if (!onlineRoom) {
      prevOnlinePhaseRef.current = null;
      return;
    }
    const prev = prevOnlinePhaseRef.current;
    const curr = onlineRoom.phase;
    prevOnlinePhaseRef.current = curr;
    if (!prev || prev === curr) return;

    if (curr === 'vote_results' && onlineRoom.voteOutcome?.eliminatedPlayerId && onlineRoom.round) {
      const wasImpostor =
        !!onlineRoom.round.assignments[onlineRoom.voteOutcome.eliminatedPlayerId]?.isImpostor;
      playDramaticRevealSound(wasImpostor);
    } else if (curr === 'round_summary' && onlineRoom.round) {
      if (onlineRoom.round.winner === 'civilians' || onlineRoom.round.winner === 'impostors') {
        playVictoryFanfare(onlineRoom.round.winner === 'civilians');
      }
    }
  }, [onlineRoom]);

  const applyOnlineMutation = useCallback(
    async (mutator: (current: OnlineRoomState) => OnlineRoomState) => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        showNotice('Offline Mode — reconnect to sync room actions.');
        return;
      }
      const session = onlineSessionRef.current;
      if (!session) return;
      try {
        const updated = await mutateRoomRow(session.roomCode, mutator);
        if (updated) {
          setOnlineRoom(updated);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Sync failed — tap Sync to retry.';
        showNotice(msg);
      }
    },
    [showNotice]
  );

  const handleToggleMute = () => {
    unlockIOSAudio();
    const next = !isMuted;
    setIsMuted(next);
    setAudioMuted(next);
    saveMuted(next);
    if (!next) {
      playTapSound();
    }
  };

  const handleUpdateSettings = (patch: Partial<GameSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  };

  const handleSaveGroup = (name: string) => {
    const newGroup: PlayerGroup = {
      id: `grp-${Date.now()}`,
      name,
      players: players.map((p) => ({ ...p })),
      updatedAt: Date.now(),
    };
    setGroups((prev) => [newGroup, ...prev]);
  };

  const handleLoadGroup = (group: PlayerGroup) => {
    if (group.players.length >= 3) {
      setPlayers(group.players.map((p) => ({ ...p })));
      showNotice(`Loaded "${group.name}" (${group.players.length} players)`);
    }
  };

  const handleDeleteGroup = (groupId: string) => {
    setGroups((prev) => prev.filter((g) => g.id !== groupId));
  };

  const handleToggleDeck = (deckId: string) => {
    setSelectedDeckIds((prev) =>
      prev.includes(deckId) ? prev.filter((id) => id !== deckId) : [...prev, deckId]
    );
  };

  const handleSelectAllDecks = () => {
    const validIds = allDecks
      .filter((d) => (settings.mode === 'word' ? d.words.length > 0 : d.questions.length > 0))
      .map((d) => d.id);
    setSelectedDeckIds(validIds);
  };

  const handleDeselectAllDecks = () => {
    setSelectedDeckIds([]);
  };

  const handleResetHistory = () => {
    if (onlineRoom && onlineSession) {
      void applyOnlineMutation((curr) => ({
        ...curr,
        version: curr.version + 1,
        usedHistory:
          curr.settings.mode === 'word'
            ? { ...curr.usedHistory, word: [] }
            : { ...curr.usedHistory, question: [] },
        updatedAt: Date.now(),
      }));
      showNotice(
        `Reset room ${onlineRoom.settings.mode === 'word' ? 'words' : 'questions'} history.`
      );
      return;
    }

    setUsedHistory((prev) =>
      settings.mode === 'word' ? { ...prev, word: [] } : { ...prev, question: [] }
    );
    showNotice(`Reset played ${settings.mode === 'word' ? 'words' : 'questions'} history.`);
  };

  const handleSaveCustomDeck = (deck: CategoryDeck) => {
    const nextDecks = customDecks.some((d) => d.id === deck.id)
      ? customDecks.map((d) => (d.id === deck.id ? deck : d))
      : [deck, ...customDecks];
    setCustomDecks(nextDecks);
    setSelectedDeckIds((prev) => (prev.includes(deck.id) ? prev : [...prev, deck.id]));

    if (onlineRoom && onlineSession && onlineRoom.hostId === onlineSession.playerId) {
      const nextSelected = onlineRoom.selectedDeckIds.includes(deck.id)
        ? onlineRoom.selectedDeckIds
        : [...onlineRoom.selectedDeckIds, deck.id];
      void applyOnlineMutation((curr) =>
        updateRoomLobbyConfig(curr, {
          customDecks: nextDecks,
          selectedDeckIds: nextSelected,
        })
      );
    }

    showNotice(`Saved custom deck "${deck.name}"`);
  };

  const handleDeleteCustomDeck = (deckId: string) => {
    const nextDecks = customDecks.filter((d) => d.id !== deckId);
    setCustomDecks(nextDecks);
    setSelectedDeckIds((prev) => prev.filter((id) => id !== deckId));

    if (onlineRoom && onlineSession && onlineRoom.hostId === onlineSession.playerId) {
      void applyOnlineMutation((curr) =>
        updateRoomLobbyConfig(curr, {
          customDecks: nextDecks,
          selectedDeckIds: curr.selectedDeckIds.filter((id) => id !== deckId),
        })
      );
    }
  };

  const handleResetScores = () => {
    if (onlineRoom && onlineSession) {
      if (onlineRoom.hostId !== onlineSession.playerId) {
        showNotice('Only the room host can reset room scores.');
        return;
      }
      void applyOnlineMutation((curr) => resetOnlineScores(curr));
      showNotice('Room scoreboard reset to 0.');
      return;
    }

    setScores({});
    setRoundScoreDeltas({});
    showNotice('Scoreboard reset to 0.');
  };

  // Online Multiplayer Host / Join / Leave
  const handleHostOnlineRoom = async () => {
    if (!isOnline) {
      setOnlineError('Offline Mode — reconnect to host an online room.');
      return;
    }
    unlockIOSAudio();
    setOnlineError(null);
    getSupabaseClient();

    const hostName = onlineProfile.name.trim() || 'Host';
    if (!onlineProfile.name.trim()) {
      setOnlineProfile((prev) => ({ ...prev, name: hostName }));
    }

    setOnlineLoading(true);
    try {
      const playerId = onlineSession?.playerId || createClientPlayerId();
      let createdRoom: OnlineRoomState | null = null;
      let lastErr: unknown = null;

      for (let attempt = 0; attempt < 4; attempt++) {
        const code = generateRoomCode();
        const initial = createInitialRoomState({
          code,
          host: {
            id: playerId,
            name: hostName.slice(0, 22),
            emoji: onlineProfile.emoji || '🦊',
            color: onlineProfile.color || '#22D3EE',
          },
          settings,
          selectedDeckIds,
          customDecks,
        });
        try {
          createdRoom = await createRoomRow(initial);
          break;
        } catch (err) {
          lastErr = err;
          const msg = err instanceof Error ? err.message : '';
          if (msg.includes('duplicate') || msg.includes('23505')) {
            continue;
          }
          throw err;
        }
      }

      if (!createdRoom) {
        throw lastErr instanceof Error ? lastErr : new Error('Failed to create room.');
      }

      const session: OnlineSessionIdentity = { roomCode: createdRoom.code, playerId };
      saveOnlineSession(session);
      setOnlineSession(session);
      setOnlineRoom(createdRoom);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to host room.';
      setOnlineError(msg);
    } finally {
      setOnlineLoading(false);
    }
  };

  const handleJoinOnlineRoom = async () => {
    if (!isOnline) {
      setOnlineError('Offline Mode — reconnect to join an online room.');
      return;
    }
    unlockIOSAudio();
    setOnlineError(null);
    getSupabaseClient();

    const code = normalizeRoomCode(joinCodeDraft);
    if (code.length < 4) {
      setOnlineError('Enter a 4-letter room code.');
      return;
    }

    const cleanName = onlineProfile.name.trim();
    if (!cleanName) {
      setOnlineError('Enter your name before joining.');
      return;
    }

    setOnlineLoading(true);
    try {
      const existing = await fetchRoomRow(code);
      if (!existing) {
        setOnlineError(`No active room found with code "${code}".`);
        return;
      }

      const savedId =
        onlineSession?.roomCode === code ? onlineSession.playerId : createClientPlayerId();
      const alreadyInRoom = existing.players.some((p) => p.id === savedId);

      if (existing.phase !== 'lobby' && !alreadyInRoom) {
        setOnlineError('That round is already in progress. Wait for the next lobby.');
        return;
      }

      const updated = await mutateRoomRow(code, (curr) =>
        addOrRejoinRoomPlayer(curr, {
          id: savedId,
          name: cleanName.slice(0, 22),
          emoji: onlineProfile.emoji || '🦊',
          color: onlineProfile.color || '#22D3EE',
        })
      );

      if (!updated) {
        setOnlineError('Could not join room. Check the code and try again.');
        return;
      }

      const session: OnlineSessionIdentity = { roomCode: updated.code, playerId: savedId };
      saveOnlineSession(session);
      setOnlineSession(session);
      setOnlineRoom(updated);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to join room.';
      setOnlineError(msg);
    } finally {
      setOnlineLoading(false);
    }
  };

  const handleLeaveOnlineRoom = async () => {
    const currentSession = onlineSession;
    const currentRoom = onlineRoom;

    saveOnlineSession(null);
    setOnlineSession(null);
    setOnlineRoom(null);

    if (currentSession && currentRoom && currentRoom.phase === 'lobby' && isOnline) {
      try {
        await mutateRoomRow(currentSession.roomCode, (curr) =>
          removeRoomPlayer(curr, currentSession.playerId)
        );
      } catch {
        // Ignore network errors while leaving
      }
    }
  };

  const applyRoundScores = useCallback(
    (finishedRound: RoundState) => {
      if (!settings.scoreboardEnabled) {
        setRoundScoreDeltas({});
        return;
      }
      const deltas = calculateRoundScoreDeltas(finishedRound);
      setRoundScoreDeltas(deltas);
      if (Object.keys(deltas).length > 0) {
        setScores((prev) => {
          const next = { ...prev };
          for (const [pid, pts] of Object.entries(deltas)) {
            next[pid] = (next[pid] ?? 0) + pts;
          }
          return next;
        });
      }
    },
    [settings.scoreboardEnabled]
  );

  const startNewRound = useCallback(() => {
    unlockIOSAudio();
    playTapSound();
    if (canStartError) return;

    const nextRoundNumber = roundCount + 1;
    const created = createRound(
      players,
      selectedDecksForMode,
      settings,
      usedHistory,
      nextRoundNumber
    );
    if (!created) return;

    setRound(created.round);
    setRoundCount(nextRoundNumber);
    setUsedHistory(created.updatedHistory);
    setRoundScoreDeltas({});
    setPhase('privacy_pass');

    if (created.deckHistoryReset) {
      showNotice('All prompts played in selected decks — reshuffled fresh!');
    }
  }, [canStartError, players, roundCount, selectedDecksForMode, settings, showNotice, usedHistory]);

  // Support ?autostart=1 for automated testing / quick launch
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1' && phase === 'lobby' && !round && !onlineRoom) {
      startNewRound();
    }
  }, [phase, round, onlineRoom, startNewRound]);

  const handleEliminatePlayer = (targetPlayerId: string) => {
    if (!round) return;
    const updated = eliminatePlayer(round, targetPlayerId, settings.survivalMode);
    const wasImpostor = !!updated.assignments[targetPlayerId]?.isImpostor;
    playDramaticRevealSound(wasImpostor);
    setRound(updated);
    setPhase('elimination_reveal');

    if (updated.winner) {
      applyRoundScores(updated);
    }
  };

  const handleCallZeroImpostors = () => {
    if (!round) return;
    const updated = callZeroImpostors(round);
    setRound(updated);
    applyRoundScores(updated);
    playVictoryFanfare(updated.winner === 'civilians');
    setPhase('round_summary');
  };

  const handleRevealAllRoles = () => {
    if (!round) return;
    const revealedRound: RoundState = {
      ...round,
      winner: 'chaos_draw',
      winReason: 'All roles were revealed early.',
    };
    setRound(revealedRound);
    setRoundScoreDeltas({});
    setPhase('round_summary');
  };

  const handleGoToSummary = () => {
    if (round?.winner === 'civilians' || round?.winner === 'impostors') {
      playVictoryFanfare(round.winner === 'civilians');
    }
    setPhase('round_summary');
  };

  const activePlayersForScoreboard: Player[] = onlineRoom ? onlineRoom.players : players;
  const activeScoresForModal = onlineRoom ? onlineRoom.scores : scores;
  const activeScoreboardEnabled = onlineRoom
    ? onlineRoom.settings.scoreboardEnabled
    : settings.scoreboardEnabled;
  const hasAnyScores = Object.values(activeScoresForModal).some((v) => v > 0);

  return (
    <div
      className={`game-impostor ${
        isPassLocked ? 'h-[100dvh] overflow-hidden overscroll-none' : 'min-h-[100dvh]'
      } bg-[#09090E] text-[#F4F4F8] flex flex-col`}
      data-game-phase={onlineRoom ? `online:${onlineRoom.phase}` : phase}
    >
      <HeaderBar
        phase={phase}
        isOnlineRoom={!!onlineRoom}
        isMuted={isMuted}
        scoreboardEnabled={activeScoreboardEnabled}
        hasScores={hasAnyScores}
        onToggleMute={handleToggleMute}
        onOpenScoreboard={() => setShowScoreboard(true)}
        onOpenChangelog={() => setShowChangelog(true)}
        onReturnToLobby={() => {
          setPhase('lobby');
          setRound(null);
        }}
      />

      {/* Subtle transient notice banner */}
      {noticeBanner && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 left-1/2 z-40 -translate-x-1/2 rounded-2xl bg-[#1C1C2B] border border-cyan-400/35 px-4 py-2.5 text-xs font-semibold text-cyan-200 shadow-xl whitespace-nowrap"
        >
          {noticeBanner}
        </div>
      )}

      {/* Screens */}
      {onlineRoom && onlineSession ? (
        <OnlineRoomView
          room={onlineRoom}
          myPlayerId={onlineSession.playerId}
          allDecks={allDecks}
          isSyncing={isSyncingOnline}
          realtimeStatus={realtimeStatus}
          onForceSync={() => void forceSyncOnlineRoom()}
          onLeaveRoom={() => void handleLeaveOnlineRoom()}
          onUpdateLobbyConfig={(patch) =>
            void applyOnlineMutation((curr) => updateRoomLobbyConfig(curr, patch))
          }
          onKickPlayer={(playerId) =>
            void applyOnlineMutation((curr) => removeRoomPlayer(curr, playerId))
          }
          onCreateCustomDeck={() => {
            setEditingDeck(null);
            setShowCustomDeckModal(true);
          }}
          onEditCustomDeck={(deck) => {
            setEditingDeck(deck);
            setShowCustomDeckModal(true);
          }}
          onResetHistory={handleResetHistory}
          onStartRound={() => {
            unlockIOSAudio();
            void applyOnlineMutation((curr) => startOnlineRound(curr, allDecks));
          }}
          onWordReady={() =>
            void applyOnlineMutation((curr) =>
              markPlayerReadyWordMode(curr, onlineSession.playerId)
            )
          }
          onForceDiscussion={() =>
            void applyOnlineMutation((curr) => forceStartOnlineDiscussion(curr))
          }
          onSubmitAnswer={(answer) =>
            void applyOnlineMutation((curr) =>
              submitOnlineQuestionAnswer(curr, onlineSession.playerId, answer)
            )
          }
          onTimerAction={(action) =>
            void applyOnlineMutation((curr) => updateOnlineTimer(curr, action))
          }
          onStartVoting={() =>
            void applyOnlineMutation((curr) => startOnlineVoting(curr))
          }
          onBackToDiscussion={() =>
            void applyOnlineMutation((curr) => backToOnlineDiscussion(curr))
          }
          onCastVote={(targetId) =>
            void applyOnlineMutation((curr) =>
              castOnlineVote(curr, onlineSession.playerId, targetId)
            )
          }
          onForceRevealVotes={() =>
            void applyOnlineMutation((curr) => resolveOnlineVotes(curr))
          }
          onAdvanceAfterVote={() =>
            void applyOnlineMutation((curr) => advanceAfterVoteResults(curr))
          }
          onRevealAllRoles={() =>
            void applyOnlineMutation((curr) => revealAllRolesOnline(curr))
          }
          onResetScores={handleResetScores}
          onReturnToLobby={() =>
            void applyOnlineMutation((curr) => returnRoomToLobby(curr))
          }
        />
      ) : (
        <>
          {phase === 'lobby' && (
            <SetupHub
              players={players}
              groups={groups}
              decks={allDecks}
              selectedDeckIds={selectedDeckIds}
              settings={settings}
              usedHistory={usedHistory}
              canStartError={canStartError}
              playStyle={playStyle}
              onlineActionTab={onlineActionTab}
              onlineProfile={onlineProfile}
              joinCodeDraft={joinCodeDraft}
              onlineError={onlineError}
              onlineLoading={onlineLoading}
              isOnline={isOnline}
              supabaseSource={supabaseInfo.source}
              onChangePlayStyle={(style) => {
                setOnlineError(null);
                setPlayStyle(style);
              }}
              onChangeOnlineActionTab={(tab) => {
                setOnlineError(null);
                setOnlineActionTab(tab);
              }}
              onChangeOnlineProfile={handleChangeOnlineProfile}
              onChangeJoinCodeDraft={(code) => {
                setOnlineError(null);
                setJoinCodeDraft(code);
              }}
              onHostOnlineRoom={() => void handleHostOnlineRoom()}
              onJoinOnlineRoom={() => void handleJoinOnlineRoom()}
              onOpenSupabaseConfig={() => setShowSupabaseConfig(true)}
              onChangePlayers={setPlayers}
              onSaveGroup={handleSaveGroup}
              onLoadGroup={handleLoadGroup}
              onDeleteGroup={handleDeleteGroup}
              onToggleDeck={handleToggleDeck}
              onSelectAllDecks={handleSelectAllDecks}
              onDeselectAllDecks={handleDeselectAllDecks}
              onResetHistory={handleResetHistory}
              onCreateCustomDeck={() => {
                setEditingDeck(null);
                setShowCustomDeckModal(true);
              }}
              onEditCustomDeck={(deck) => {
                setEditingDeck(deck);
                setShowCustomDeckModal(true);
              }}
              onUpdateSettings={handleUpdateSettings}
              onStartGame={startNewRound}
              onOpenHowToPlay={() => setShowHowToPlay(true)}
            />
          )}

          {phase === 'privacy_pass' && round && (
            <PrivacyPassScreen
              round={round}
              players={players}
              onSubmitAnswer={(playerId, answer) =>
                setRound((prev) => (prev ? submitPlayerAnswer(prev, playerId, answer) : prev))
              }
              onCompletePassLoop={() => setPhase('discussion')}
            />
          )}

          {phase === 'discussion' && round && (
            <DiscussionScreen
              round={round}
              players={players}
              initialTimerSeconds={settings.discussionTimer}
              onStartVoting={() => setPhase('voting')}
              onRevealAllRoles={handleRevealAllRoles}
            />
          )}

          {(phase === 'voting' || phase === 'elimination_reveal') && round && (
            <VotingScreen
              round={round}
              players={players}
              showEliminationReveal={phase === 'elimination_reveal'}
              onEliminatePlayer={handleEliminatePlayer}
              onCallZeroImpostors={handleCallZeroImpostors}
              onBackToDiscussion={() => setPhase('discussion')}
              onContinueSurvival={() => setPhase('discussion')}
              onGoToSummary={handleGoToSummary}
            />
          )}

          {phase === 'round_summary' && round && (
            <RoundSummaryScreen
              round={round}
              players={players}
              scores={scores}
              roundScoreDeltas={roundScoreDeltas}
              scoreboardEnabled={settings.scoreboardEnabled}
              onResetScores={handleResetScores}
              onPlayAgain={startNewRound}
              onBackToLobby={() => {
                setPhase('lobby');
                setRound(null);
              }}
            />
          )}
        </>
      )}

      {/* Modals */}
      <HowToPlayModal
        isOpen={showHowToPlay}
        initialMode={onlineRoom ? onlineRoom.settings.mode : settings.mode}
        onClose={() => setShowHowToPlay(false)}
      />

      <ScoreboardModal
        isOpen={showScoreboard}
        players={activePlayersForScoreboard}
        scores={activeScoresForModal}
        onResetScores={handleResetScores}
        onClose={() => setShowScoreboard(false)}
      />

      <ChangelogModal
        isOpen={showChangelog}
        onClose={() => setShowChangelog(false)}
      />

      <CustomDeckModal
        isOpen={showCustomDeckModal}
        initialMode={onlineRoom ? onlineRoom.settings.mode : settings.mode}
        editingDeck={editingDeck}
        onSave={handleSaveCustomDeck}
        onDelete={handleDeleteCustomDeck}
        onClose={() => {
          setShowCustomDeckModal(false);
          setEditingDeck(null);
        }}
      />

      <SupabaseConfigModal
        isOpen={showSupabaseConfig}
        onClose={() => setShowSupabaseConfig(false)}
        onSaved={() => {
          setSupabaseConfigTick((t) => t + 1);
          setOnlineError(null);
          showNotice('Supabase connection updated!');
        }}
      />
    </div>
  );
}
