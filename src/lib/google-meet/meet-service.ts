/**
 * Google Meet Service
 * 
 * Handles Google Meet integration for alert resolution calls
 */

import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

export interface GoogleMeetOptions {
  alertId?: string;
  clientId: string;
  staffId: string;
  sopResponseId?: string;
  title?: string;
  description?: string;
  startTime?: Date;
  endTime?: Date;
}

export interface GoogleMeetLink {
  meetingUrl: string;
  meetingId: string;
  calendarEventId?: string;
}

/**
 * Initialize Google Calendar API client
 */
function initializeCalendarClient(): OAuth2Client {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/google-meet/callback';

  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set for Calendar API');
  }

  const oauth2Client = new OAuth2Client(clientId, clientSecret, redirectUri);

  const refreshToken = process.env.GOOGLE_CALENDAR_REFRESH_TOKEN;
  if (refreshToken) {
    oauth2Client.setCredentials({ refresh_token: refreshToken });
  }

  return oauth2Client;
}

/**
 * Generate Google Meet link
 * 
 * If Calendar API credentials are available, creates a Calendar event with Meet link.
 * Otherwise, generates a simple instant meeting link.
 */
export async function generateGoogleMeetLink(options: GoogleMeetOptions): Promise<GoogleMeetLink> {
  // Try to use Calendar API if credentials are available
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    try {
      return await createMeetingWithCalendar(options);
    } catch (error) {
      console.warn('Failed to create Calendar event, falling back to instant meeting:', error);
      // Fall through to instant meeting
    }
  }

  // Fallback: Generate instant meeting link
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  const meetingId = `meet-${timestamp}-${random}`;

  return {
    meetingUrl: `https://meet.google.com/new`,
    meetingId,
  };
}

/**
 * Create Google Calendar event with Meet link
 * This enables automatic recording setup and better tracking
 */
async function createMeetingWithCalendar(options: GoogleMeetOptions): Promise<GoogleMeetLink> {
  const auth = initializeCalendarClient();
  const calendar = google.calendar({ version: 'v3', auth });

  const startTime = options.startTime || new Date();
  const endTime = options.endTime || new Date(startTime.getTime() + 60 * 60 * 1000); // Default 1 hour

  const event = {
    summary: options.title || `Support Call - Alert ${options.alertId || 'N/A'}`,
    description: `${options.description || `Support call for client ${options.clientId}`}\n\n📝 IMPORTANT: Please enable "Use Gemini to take notes" in the meeting to automatically generate transcripts.`,
    start: {
      dateTime: startTime.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    end: {
      dateTime: endTime.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    conferenceData: {
      createRequest: {
        requestId: `meet-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        conferenceSolutionKey: {
          type: 'hangoutsMeet',
        },
      },
    },
    // Enable recording (requires Google Workspace)
    guestsCanModify: false,
    guestsCanInviteOthers: false,
  };

  const response = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: event,
    conferenceDataVersion: 1,
  });

  const meetLink = response.data.conferenceData?.entryPoints?.find(
    (entry: any) => entry.entryPointType === 'video'
  );

  if (!meetLink || !response.data.id) {
    throw new Error('Failed to create meeting with Calendar API');
  }

  return {
    meetingUrl: meetLink.uri || '',
    meetingId: response.data.conferenceData?.conferenceId || response.data.id,
    calendarEventId: response.data.id,
  };
}

/**
 * Create a pending recording record for Google Meet
 * 
 * This creates a recording record that will be updated when the recording is available
 */
export async function createPendingGoogleMeetRecording(
  options: GoogleMeetOptions & { meetingId: string; meetingUrl: string }
): Promise<{ recordingId: string }> {
  // This will be called from the API route
  // For now, return the structure
  return {
    recordingId: 'pending', // Will be set by API route
  };
}

/**
 * Handle Google Meet recording webhook
 * 
 * This will be called when Google Meet notifies us that a recording is ready
 * For MVP, this is a placeholder
 */
export async function handleGoogleMeetRecordingWebhook(
  webhookData: any
): Promise<{ success: boolean; recordingId?: string }> {
  // TODO: Implement webhook handler
  // This will:
  // 1. Verify webhook signature
  // 2. Extract recording URL from Google Drive
  // 3. Download recording
  // 4. Update Recording record
  // 5. Trigger Gemini processing

  console.log('[Google Meet] Webhook received:', webhookData);
  
  return {
    success: false,
  };
}

