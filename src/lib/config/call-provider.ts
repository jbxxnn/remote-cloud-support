export type CallProvider = 'google_meet' | 'custom_webrtc';

/**
 * Gets the configured call provider from environment variables.
 * Defaults to 'google_meet' if not set or invalid.
 */
export function getCallProvider(): CallProvider {
  // Try NEXT_PUBLIC first (available on both client and server)
  // Then try CALL_PROVIDER (available only on server)
  const provider = process.env.NEXT_PUBLIC_CALL_PROVIDER || process.env.CALL_PROVIDER;
  
  if (provider === 'custom_webrtc') {
    return 'custom_webrtc';
  }
  
  return 'google_meet';
}

/**
 * Helper to check if custom WebRTC is enabled.
 */
export const isWebRTCEnabled = () => getCallProvider() === 'custom_webrtc';

/**
 * Helper to check if Google Meet is enabled.
 */
export const isGoogleMeetEnabled = () => getCallProvider() === 'google_meet';
