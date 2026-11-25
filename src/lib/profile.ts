import { useCallback, useEffect, useState } from 'react';

export interface HubPlayerProfile {
  displayName: string;
  avatarColor: string;
}

export const HUB_PROFILE_STORAGE_KEY = 'party_hub_profile_v1';
const PROFILE_UPDATED_EVENT = 'party-hub:profile-updated';

export const HUB_AVATAR_COLORS = [
  '#22D3EE', // Electric Cyan
  '#F43F5E', // Neon Rose
  '#A855F7', // Arcade Violet
  '#10B981', // Tactical Emerald
  '#FBBF24', // Party Gold
  '#FB923C', // Tangerine
  '#60A5FA', // Sky Blue
  '#E879F9', // Hot Fuchsia
] as const;

const DEFAULT_PROFILE: HubPlayerProfile = {
  displayName: '',
  avatarColor: HUB_AVATAR_COLORS[0],
};

export function loadHubProfile(): HubPlayerProfile {
  if (typeof window === 'undefined') return { ...DEFAULT_PROFILE };
  try {
    const raw = window.localStorage.getItem(HUB_PROFILE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<HubPlayerProfile>;
      return {
        displayName: typeof parsed.displayName === 'string' ? parsed.displayName.slice(0, 22) : '',
        avatarColor:
          typeof parsed.avatarColor === 'string' && parsed.avatarColor.startsWith('#')
            ? parsed.avatarColor
            : DEFAULT_PROFILE.avatarColor,
      };
    }

    // Migrate existing callsign/name from Impostor or Finders Keepers if first run on unified Hub
    const impRaw = window.localStorage.getItem('impostor_online_profile_v1');
    if (impRaw) {
      const imp = JSON.parse(impRaw) as { name?: string; color?: string };
      if (imp?.name) {
        return {
          displayName: imp.name.slice(0, 22),
          avatarColor: imp.color || DEFAULT_PROFILE.avatarColor,
        };
      }
    }
    const fkRaw = window.localStorage.getItem('fk_career_profile_v1');
    if (fkRaw) {
      const fk = JSON.parse(fkRaw) as { name?: string };
      if (fk?.name) {
        return {
          displayName: fk.name.slice(0, 22),
          avatarColor: DEFAULT_PROFILE.avatarColor,
        };
      }
    }
  } catch {
    // Ignore storage parse failures
  }
  return { ...DEFAULT_PROFILE };
}

export function saveHubProfile(patch: Partial<HubPlayerProfile>): HubPlayerProfile {
  const current = loadHubProfile();
  const next: HubPlayerProfile = {
    displayName:
      patch.displayName !== undefined ? patch.displayName.slice(0, 22) : current.displayName,
    avatarColor:
      patch.avatarColor !== undefined && patch.avatarColor.startsWith('#')
        ? patch.avatarColor
        : current.avatarColor,
  };

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(HUB_PROFILE_STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent<HubPlayerProfile>(PROFILE_UPDATED_EVENT, { detail: next }));
    } catch {
      // Ignore storage quota errors
    }
  }

  return next;
}

export function getProfileInitial(name: string): string {
  const clean = name.trim();
  if (!clean) return 'P';
  return clean[0].toUpperCase();
}

export function useHubProfile() {
  const [profile, setProfile] = useState<HubPlayerProfile>(() => loadHubProfile());

  useEffect(() => {
    const handleLocalUpdate = (e: Event) => {
      const detail = (e as CustomEvent<HubPlayerProfile>).detail;
      if (detail) {
        setProfile(detail);
      } else {
        setProfile(loadHubProfile());
      }
    };
    const handleStorage = (e: StorageEvent) => {
      if (e.key === HUB_PROFILE_STORAGE_KEY) {
        setProfile(loadHubProfile());
      }
    };

    window.addEventListener(PROFILE_UPDATED_EVENT, handleLocalUpdate);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(PROFILE_UPDATED_EVENT, handleLocalUpdate);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const updateProfile = useCallback((patch: Partial<HubPlayerProfile>) => {
    const saved = saveHubProfile(patch);
    setProfile(saved);
  }, []);

  return { profile, updateProfile };
}
