import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  getStoredProfile,
  saveStoredProfile,
  clearStoredProfile,
  DEFAULT_FALLBACK_USERNAME,
} from '@/services/storage';

/**
 * Derives user initials from a display name.
 * e.g., "WattWise User" -> "WU", "Alex Smith" -> "AS", "Alex" -> "AL", "" -> "WW"
 */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'WW';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export interface ProfileData {
  displayName: string;
  email: string;
}

export interface ProfileContextType {
  displayName: string;
  email: string;
  initials: string;
  isLoaded: boolean;
  updateProfile: (data: { displayName: string; email?: string }) => Promise<void>;
  setUserFromAuth: (user: { name?: string; displayName?: string; email?: string }) => Promise<void>;
  clearProfile: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

/**
 * Centralized, persistent user profile provider.
 * Automatically loads the saved username from AsyncStorage on app startup.
 * Prevents the fallback username from flashing before storage is ready.
 * Ensures username persistence across app reloads, restarts, network changes, and backend downtime.
 */
export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<ProfileData>({
    displayName: DEFAULT_FALLBACK_USERNAME,
    email: '',
  });
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  // Load saved profile on application startup
  useEffect(() => {
    let isMounted = true;

    async function initializeProfile() {
      try {
        const stored = await getStoredProfile();
        if (isMounted && stored && stored.displayName && stored.displayName.trim().length > 0) {
          setProfile({
            displayName: stored.displayName.trim(),
            email: stored.email ? stored.email.trim() : '',
          });
        }
      } catch (error) {
        console.warn('[ProfileProvider] Error loading persisted profile:', error);
      } finally {
        if (isMounted) {
          setIsLoaded(true);
        }
      }
    }

    initializeProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  // Update profile and persist changes to local storage
  const updateProfile = useCallback(
    async ({ displayName, email }: { displayName: string; email?: string }) => {
      const trimmedName = displayName.trim();
      if (!trimmedName) {
        return;
      }

      const updatedEmail = email !== undefined ? email.trim() : profile.email;

      // Optimistic update for instant UI responsiveness
      setProfile({
        displayName: trimmedName,
        email: updatedEmail,
      });

      // Persist to local storage
      await saveStoredProfile({
        displayName: trimmedName,
        email: updatedEmail,
      });
    },
    [profile.email]
  );

  // Sync user from authentication/login/registration flows
  const setUserFromAuth = useCallback(
    async (user: { name?: string; displayName?: string; email?: string }) => {
      const name = (user.displayName || user.name || '').trim();

      // Guard: Never overwrite an existing saved username with an empty or default value
      if (!name) {
        return;
      }

      const updatedEmail = user.email ? user.email.trim() : profile.email;

      setProfile({
        displayName: name,
        email: updatedEmail,
      });

      await saveStoredProfile({
        displayName: name,
        email: updatedEmail,
      });
    },
    [profile.email]
  );

  // Clear profile from memory and storage (for logout/reset)
  const clearProfile = useCallback(async () => {
    setProfile({
      displayName: DEFAULT_FALLBACK_USERNAME,
      email: '',
    });
    await clearStoredProfile();
  }, []);

  const initials = getInitials(profile.displayName);

  // Hold rendering children until persistent storage is loaded to eliminate flash of default username
  if (!isLoaded) {
    return null;
  }

  return (
    <ProfileContext.Provider
      value={{
        displayName: profile.displayName,
        email: profile.email,
        initials,
        isLoaded,
        updateProfile,
        setUserFromAuth,
        clearProfile,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

/**
 * Access the centralized profile and username state.
 */
export function useProfile(): ProfileContextType {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
}

/**
 * Semantic alias for useProfile across authentication and user components.
 */
export const useUser = useProfile;
