export type GameMode = 'classic' | 'infection' | 'curfew' | 'imposter';

export type TeamRole = 'hunter' | 'runner' | 'spectator';

export type TeamPreference = 'hunter' | 'runner' | 'random';

export type SpectatorAccess = 'live' | 'delayed_1m' | 'disabled';

export type MapTheme = 'standard' | 'night' | 'satellite' | 'snow';

export type ZoneShape = 'off' | 'circle' | 'polygon';

export type UnitSystem = 'km' | 'mi';

export type RoundPhase = 'lobby' | 'head_start' | 'hunt' | 'emergency_pause' | 'meeting' | 'ended';

export type OobStatus = 'inside' | 'warning' | 'exposed' | 'eliminated';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface GpsPoint extends LatLng {
  ts: number;
}

export interface ActiveZone {
  shape: ZoneShape;
  center: LatLng;
  /** Diameter in meters (200 to 6000) */
  diameterMeters: number;
  /** Custom polygon vertices in order (min 3 when shape === 'polygon') */
  polygon: LatLng[];
}

export interface RoomSettings {
  mode: GameMode;
  /** Round length in minutes (5 to 180) */
  roundLengthMin: number;
  /** Ping interval in minutes (0 = Off, 1 to 30) */
  pingIntervalMin: number;
  /** Head start scatter duration in minutes (0 to 30) */
  headStartMin: number;
  /** Initial play zone */
  zone: ActiveZone;
  /** Whether play zone shrinks / teleports over time */
  zoneShrinkEnabled: boolean;
  /** Final shrink diameter in meters (100 to 3000) */
  finalZoneDiameterMeters: number;
  /** Spectator visibility setting (Classic mode) */
  spectatorAccess: SpectatorAccess;
  /** Preferred measurement units */
  units: UnitSystem;
  /** Map visual theme */
  mapTheme: MapTheme;
}

export interface PlayerState {
  id: string;
  name: string;
  isHost: boolean;
  isBot?: boolean;
  preference: TeamPreference;
  role: TeamRole;
  /** Original role at start of round (useful for Infection scoring) */
  initialRole?: TeamRole;
  /** Hidden imposter flag in Imposter mode */
  isImposter?: boolean;
  eliminated: boolean;
  eliminatedAt?: number;
  taggedBy?: string;
  tagsCount: number;
  color: string;
  lastPos?: GpsPoint;
  /** Full GPS trail recorded during the round */
  trail: GpsPoint[];
  /** Timestamp when player first stepped outside active zone */
  oobStartedAt?: number | null;
  oobStatus: OobStatus;
  connected: boolean;
  lastSeenAt: number;
  careerWins?: number;
  careerTags?: number;
}

export interface RadarPing {
  id: string;
  playerId: string;
  playerName: string;
  lat: number;
  lng: number;
  pingedAt: number;
}

export interface TagEvent {
  id: string;
  taggedId: string;
  taggedName: string;
  taggerId?: string;
  taggerName?: string;
  reason: 'physical' | 'oob_timeout' | 'voted_out';
  ts: number;
  resultingRole: TeamRole;
}

export interface EmergencyAlert {
  active: boolean;
  triggeredById: string;
  triggeredByName: string;
  lat: number;
  lng: number;
  address?: string;
  triggeredAt: number;
}

export interface ImposterMeeting {
  active: boolean;
  calledById: string;
  calledByName: string;
  startedAt: number;
  endsAt: number;
  /** voterId -> targetPlayerId or 'skip' */
  votes: Record<string, string>;
  resolvedSummary?: string;
}

export interface ScoreBreakdown {
  playerId: string;
  playerName: string;
  role: TeamRole;
  initialRole: TeamRole;
  points: number;
  survivalMinutes: number;
  survivedAll: boolean;
  tagsCount: number;
  cleanSweepBonus: boolean;
  distanceMeters: number;
  color: string;
}

export interface RoomState {
  code: string;
  isSoloDemo: boolean;
  hostId: string;
  phase: RoundPhase;
  settings: RoomSettings;
  /** Active zone during round (changes on shrinks or Curfew teleports) */
  currentZone: ActiveZone;
  /** Upcoming shrink/teleport boundary preview */
  nextZonePreview: ActiveZone | null;
  nextZoneTransitionAt: number | null;
  shrinkStep: number;
  players: PlayerState[];
  pings: RadarPing[];
  tags: TagEvent[];
  chatMessages?: ChatMessage[];
  roundStartedAt: number | null;
  headStartEndsAt: number | null;
  roundEndsAt: number | null;
  lastPingAt: number | null;
  nextPingAt: number | null;
  pausedAt: number | null;
  phaseBeforePause?: RoundPhase | null;
  emergency: EmergencyAlert | null;
  meeting: ImposterMeeting | null;
  winner: 'runners' | 'hunters' | 'imposters' | null;
  winReason?: string;
  updatedAt: number;
}

export interface CustomPreset {
  id: string;
  name: string;
  createdAt: number;
  settings: RoomSettings;
}

export type BadgeId =
  | 'first_hunt'
  | 'ghost_runner'
  | 'clean_sweep'
  | 'marathon_5k'
  | 'night_owl'
  | 'imposter_hunter'
  | 'apex_tracker'
  | 'phantom_legend';

export interface BadgeDefinition {
  id: BadgeId;
  name: string;
  description: string;
  tier: 'standard' | 'milestone';
}

export interface LeaderboardEntry {
  playerId: string;
  name: string;
  totalPoints: number;
  wins: number;
  tags: number;
  distanceMeters: number;
}

export interface CareerProfile {
  playerId: string;
  name: string;
  roundsPlayed: number;
  wins: number;
  tags: number;
  cleanSweeps: number;
  totalDistanceMeters: number;
  totalPoints: number;
  badges: BadgeId[];
  leaderboard: LeaderboardEntry[];
}

export type ChatScope = 'team' | 'global';

export interface ChatMessage {
  id: string;
  scope: ChatScope;
  team: TeamRole;
  senderId: string;
  senderName: string;
  senderColor: string;
  kind: 'text' | 'voice';
  text?: string;
  audioBase64?: string;
  mimeType?: string;
  durationSec?: number;
  ts: number;
}
