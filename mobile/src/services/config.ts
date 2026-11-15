import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Resolves the backend API base URL with the following precedence:
 * 1. Explicit EXPO_PUBLIC_API_URL environment variable
 * 2. Metro Bundler host IP in Expo development (Constants.expoConfig?.hostUri)
 * 3. Local machine LAN IP fallback (192.168.0.105:5000)
 * 4. Localhost for Web (Platform.OS === 'web')
 */
export function getApiBaseUrl(): string {
  // 1. Preferred: Environment variable
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/+$/, '');
  }

  // 2. Web fallback
  if (Platform.OS === 'web') {
    return 'http://localhost:5000';
  }

  // 3. Expo development host (derives the dev machine IP dynamically)
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return `http://${host}:5000`;
    }
  }

  // 4. Temporary local development LAN fallback
  return 'http://192.168.0.105:5000';
}

export const API_BASE_URL = getApiBaseUrl();
