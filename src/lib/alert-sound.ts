/**
 * Alert Sound Utility
 * Plays notification sounds for new alerts
 */

// Keep a single AudioContext instance to avoid suspension issues
let audioContext: AudioContext | null = null;

/**
 * Initialize audio context (call on user interaction)
 */
export function initAudioContext(): void {
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (error) {
      console.warn('Failed to create audio context:', error);
    }
  }
}

/**
 * Play an alert notification sound
 * Uses Web Audio API to generate a pleasant notification tone
 */
export function playAlertSound(): void {
  try {
    // Initialize audio context if needed
    if (!audioContext) {
      initAudioContext();
    }

    if (!audioContext) {
      console.warn('Audio context not available');
      return;
    }

    // Resume audio context if suspended (browsers require user interaction)
    if (audioContext.state === 'suspended') {
      audioContext.resume().then(() => {
        playTone();
      }).catch((error) => {
        console.warn('Failed to resume audio context:', error);
        // Try fallback method
        playFallbackSound();
      });
    } else {
      playTone();
    }
  } catch (error) {
    console.warn('Failed to play alert sound:', error);
    playFallbackSound();
  }
}

/**
 * Play the actual tone using Web Audio API
 */
function playTone(): void {
  if (!audioContext) return;

  try {
    // Create oscillator for the tone
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Configure tone - more noticeable notification sound
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(600, audioContext.currentTime); // Start at 600Hz
    oscillator.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.15); // Rise to 800Hz
    
    // Configure volume envelope - louder and more noticeable
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.5, audioContext.currentTime + 0.01); // Quick attack, louder
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3); // Longer decay
    
    // Play the tone
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3); // 300ms duration
    
    // Clean up
    oscillator.onended = () => {
      // Don't close the context, keep it for future use
    };
  } catch (error) {
    console.warn('Failed to play tone:', error);
    playFallbackSound();
  }
}

/**
 * Fallback sound using HTML5 Audio
 */
function playFallbackSound(): void {
  try {
    // Create a simple beep using Web Audio API as fallback
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.frequency.value = 800;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
    
    osc.onended = () => ctx.close();
  } catch (error) {
    console.warn('All audio methods failed:', error);
  }
}

/**
 * Custom event name for new alert notifications
 */
export const NEW_ALERT_EVENT = 'new-alert-detected';

