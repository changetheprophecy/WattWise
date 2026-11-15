import React, { createContext, useContext, useState, ReactNode } from 'react';

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
  updateProfile: (data: { displayName: string; email?: string }) => void;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

/**
 * Shared in-memory profile provider.
 * Note: Profile changes persist across screen navigation for the active app session.
 * State resets to defaults upon a complete application restart (until backend profile sync is connected).
 */
export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<ProfileData>({
    displayName: 'WattWise User',
    email: '',
  });

  const updateProfile = ({ displayName, email }: { displayName: string; email?: string }) => {
    setProfile((prev) => ({
      displayName: displayName.trim() || prev.displayName,
      email: email !== undefined ? email.trim() : prev.email,
    }));
  };

  const initials = getInitials(profile.displayName);

  return (
    <ProfileContext.Provider
      value={{
        displayName: profile.displayName,
        email: profile.email,
        initials,
        updateProfile,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile(): ProfileContextType {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
}
