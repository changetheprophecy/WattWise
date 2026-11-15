import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Storage keys used for WattWise mobile persistent local storage.
 */
export const STORAGE_KEYS = {
  USER_PROFILE: '@wattwise:user_profile',
  USERNAME: '@wattwise:username',
} as const;

export interface StoredUserProfile {
  displayName: string;
  email: string;
  updatedAt?: string;
}

export const DEFAULT_FALLBACK_USERNAME = 'WattWise User';

/**
 * Retrieves the persisted user profile from AsyncStorage.
 * Checks both the primary profile object and standalone username fallback.
 * Returns null if no valid profile has ever been saved.
 */
export async function getStoredProfile(): Promise<StoredUserProfile | null> {
  try {
    // 1. Primary lookup: Structured profile object
    const rawProfile = await AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE);
    if (rawProfile) {
      try {
        const parsed = JSON.parse(rawProfile);
        if (parsed && typeof parsed.displayName === 'string' && parsed.displayName.trim().length > 0) {
          return {
            displayName: parsed.displayName.trim(),
            email: typeof parsed.email === 'string' ? parsed.email.trim() : '',
            updatedAt: parsed.updatedAt,
          };
        }
      } catch {
        // Fall through to standalone username if JSON parsing fails
      }
    }

    // 2. Secondary fallback lookup: Standalone username string
    const rawUsername = await AsyncStorage.getItem(STORAGE_KEYS.USERNAME);
    if (rawUsername && rawUsername.trim().length > 0) {
      return {
        displayName: rawUsername.trim(),
        email: '',
      };
    }

    return null;
  } catch (error) {
    console.warn('[Storage] Failed to read stored user profile from AsyncStorage:', error);
    return null;
  }
}

/**
 * Saves the user profile to AsyncStorage.
 * Persists both structured profile data and mirrored standalone username.
 * Guards against empty or invalid names.
 */
export async function saveStoredProfile(profile: {
  displayName: string;
  email?: string;
}): Promise<boolean> {
  const trimmedName = profile.displayName.trim();
  if (!trimmedName) {
    console.warn('[Storage] Attempted to save empty displayName. Aborting write to protect existing data.');
    return false;
  }

  try {
    // Fetch existing profile to preserve other fields if email is not provided
    const existing = await getStoredProfile();
    const updatedProfile: StoredUserProfile = {
      displayName: trimmedName,
      email: profile.email !== undefined ? profile.email.trim() : (existing?.email || ''),
      updatedAt: new Date().toISOString(),
    };

    // Store primary structured profile and mirrored username key
    await Promise.all([
      AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(updatedProfile)),
      AsyncStorage.setItem(STORAGE_KEYS.USERNAME, trimmedName),
    ]);

    return true;
  } catch (error) {
    console.warn('[Storage] Failed to save user profile to AsyncStorage:', error);
    return false;
  }
}

/**
 * Clears the stored user profile and username from AsyncStorage.
 * Used exclusively for explicit user logout/reset.
 */
export async function clearStoredProfile(): Promise<void> {
  try {
    await Promise.all([
      AsyncStorage.removeItem(STORAGE_KEYS.USER_PROFILE),
      AsyncStorage.removeItem(STORAGE_KEYS.USERNAME),
    ]);
  } catch (error) {
    console.warn('[Storage] Failed to clear user profile from AsyncStorage:', error);
  }
}

/**
 * Convenience helper to retrieve just the stored display name.
 */
export async function getStoredUsername(): Promise<string | null> {
  const profile = await getStoredProfile();
  return profile ? profile.displayName : null;
}
