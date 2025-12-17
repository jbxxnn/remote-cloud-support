/**
 * Google Drive Service
 * 
 * Handles Google Drive API integration for fetching Google Meet recordings and transcripts
 */

import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  createdTime: string;
  modifiedTime: string;
  size?: string;
  webViewLink?: string;
  webContentLink?: string;
}

export interface MeetRecordingFiles {
  videoFile?: DriveFile;
  transcriptFile?: DriveFile;
}

/**
 * Initialize Google Drive API client
 * Supports both service account and OAuth2 authentication
 */
export function initializeDriveClient(): OAuth2Client {
  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/google-drive/callback';

  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_DRIVE_CLIENT_ID and GOOGLE_DRIVE_CLIENT_SECRET must be set in environment variables');
  }

  const oauth2Client = new OAuth2Client(clientId, clientSecret, redirectUri);

  // If refresh token is available, set it
  const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;
  if (refreshToken) {
    oauth2Client.setCredentials({ refresh_token: refreshToken });
  }

  return oauth2Client;
}

/**
 * Get Google Drive API instance
 */
export async function getDriveClient() {
  const auth = initializeDriveClient();
  return google.drive({ version: 'v3', auth });
}

/**
 * List Google Meet recordings in Google Drive
 * Filters for files created by Google Meet (typically in "Meet Recordings" folder)
 */
export async function listMeetRecordings(
  maxResults: number = 50,
  folderName?: string
): Promise<DriveFile[]> {
  try {
    const drive = await getDriveClient();

    // Search for Google Meet recordings
    // Google Meet recordings are typically MP4 files with specific naming patterns
    let query = "mimeType='video/mp4' and (name contains 'Meet Recording' or name contains 'meet.google.com')";
    
    if (folderName) {
      // First, find the folder by name
      const folderResponse = await drive.files.list({
        q: `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`,
        fields: 'files(id, name)',
        pageSize: 1,
      });

      if (folderResponse.data.files && folderResponse.data.files.length > 0) {
        const folderId = folderResponse.data.files[0].id;
        query += ` and '${folderId}' in parents`;
      }
    }

    const response = await drive.files.list({
      q: query + ' and trashed=false',
      orderBy: 'createdTime desc',
      pageSize: maxResults,
      fields: 'files(id, name, mimeType, createdTime, modifiedTime, size, webViewLink, webContentLink)',
    });

    if (!response.data.files) {
      return [];
    }

    return response.data.files.map(file => ({
      id: file.id!,
      name: file.name!,
      mimeType: file.mimeType!,
      createdTime: file.createdTime || file.modifiedTime || '',
      modifiedTime: file.modifiedTime || '',
      size: file.size,
      webViewLink: file.webViewLink,
      webContentLink: file.webContentLink,
    }));
  } catch (error) {
    console.error('Error listing Meet recordings:', error);
    throw new Error(`Failed to list Meet recordings: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Find video and transcript files for a specific meeting
 * Matches files by folder structure, creation time, and naming patterns
 */
export async function findRecordingFiles(
  meetingId: string,
  meetingStartTime?: Date,
  timeWindowMinutes: number = 30,
  alertId?: string,
  recordingId?: string
): Promise<MeetRecordingFiles> {
  try {
    const drive = await getDriveClient();
    const result: MeetRecordingFiles = {};

    // First, try to find the "Meet Recordings" folder
    let meetRecordingsFolderId: string | null = null;
    try {
      const folderResponse = await drive.files.list({
        q: "mimeType='application/vnd.google-apps.folder' and name='Meet Recordings' and trashed=false",
        fields: 'files(id, name)',
        pageSize: 1,
      });

      if (folderResponse.data.files && folderResponse.data.files.length > 0) {
        meetRecordingsFolderId = folderResponse.data.files[0].id!;
        console.log(`[Drive] Found "Meet Recordings" folder: ${meetRecordingsFolderId}`);
      }
    } catch (error) {
      console.warn('[Drive] Could not find "Meet Recordings" folder, searching all files:', error);
    }

    // Calculate time window for searching
    const startTime = meetingStartTime 
      ? new Date(meetingStartTime.getTime() - timeWindowMinutes * 60 * 1000)
      : new Date(Date.now() - 24 * 60 * 60 * 1000); // Default: last 24 hours
    
    const endTime = meetingStartTime
      ? new Date(meetingStartTime.getTime() + timeWindowMinutes * 60 * 1000)
      : new Date();

    const startTimeStr = startTime.toISOString();
    const endTimeStr = endTime.toISOString();

    // Build query with folder constraint if available
    // Files are directly in "Meet Recordings" folder, not in subfolders
    let folderConstraint = '';
    if (meetRecordingsFolderId) {
      folderConstraint = ` and '${meetRecordingsFolderId}' in parents`;
    }

    // Search for video file (MP4)
    const videoQuery = `mimeType='video/mp4' and createdTime >= '${startTimeStr}' and createdTime <= '${endTimeStr}' and trashed=false${folderConstraint}`;
    const videoResponse = await drive.files.list({
      q: videoQuery,
      orderBy: 'createdTime desc',
      pageSize: 10,
      fields: 'files(id, name, mimeType, createdTime, modifiedTime, size, webViewLink, webContentLink)',
    });

    if (videoResponse.data.files && videoResponse.data.files.length > 0) {
      // Find the most recent video file in the time window
      const videoFile = videoResponse.data.files[0];
      result.videoFile = {
        id: videoFile.id!,
        name: videoFile.name!,
        mimeType: videoFile.mimeType!,
        createdTime: videoFile.createdTime || videoFile.modifiedTime || '',
        modifiedTime: videoFile.modifiedTime || '',
        size: videoFile.size,
        webViewLink: videoFile.webViewLink,
        webContentLink: videoFile.webContentLink,
      };
      console.log(`[Drive] Found video file: ${videoFile.name}`);
    }

    // Search for transcript file (Google Doc)
    // Files are now named like: "Support Call - Alert [alertId] - [recordingId] - [date] - Notes by Gemini"
    // Strategy: Use recordingId as primary identifier (most precise), fallback to alertId + time
    // If we have recordingId, it's unique and we can search directly
    // If we only have alertId, use time window to narrow results
    
    let transcriptQuery: string;
    
    if (recordingId && folderConstraint) {
      // Best case: We have recordingId - it's unique, search all files in folder
      transcriptQuery = `mimeType='application/vnd.google-apps.document' and trashed=false${folderConstraint}`;
      console.log(`[Drive] Searching for transcript files in "Meet Recordings" folder (using recordingId: ${recordingId})`);
    } else if (alertId && folderConstraint) {
      // Fallback: Use alertId + time window to narrow results
      const expandedStartTime = meetingStartTime 
        ? new Date(meetingStartTime.getTime() - (timeWindowMinutes + 10) * 60 * 1000)
        : startTime;
      const expandedEndTime = meetingStartTime
        ? new Date(meetingStartTime.getTime() + (timeWindowMinutes + 10) * 60 * 1000)
        : endTime;
      
      const expandedStartTimeStr = expandedStartTime.toISOString();
      const expandedEndTimeStr = expandedEndTime.toISOString();
      
      transcriptQuery = `mimeType='application/vnd.google-apps.document' and createdTime >= '${expandedStartTimeStr}' and createdTime <= '${expandedEndTimeStr}' and trashed=false${folderConstraint}`;
      console.log(`[Drive] Searching for transcript files with alertId: ${alertId} in time window: ${expandedStartTimeStr} to ${expandedEndTimeStr}`);
    } else {
      // Last resort: time window only
      const expandedStartTime = meetingStartTime 
        ? new Date(meetingStartTime.getTime() - (timeWindowMinutes + 10) * 60 * 1000)
        : startTime;
      const expandedEndTime = meetingStartTime
        ? new Date(meetingStartTime.getTime() + (timeWindowMinutes + 10) * 60 * 1000)
        : endTime;
      
      const expandedStartTimeStr = expandedStartTime.toISOString();
      const expandedEndTimeStr = expandedEndTime.toISOString();
      
      transcriptQuery = `mimeType='application/vnd.google-apps.document' and createdTime >= '${expandedStartTimeStr}' and createdTime <= '${expandedEndTimeStr}' and trashed=false${folderConstraint}`;
      console.log(`[Drive] Searching for transcript files in time window: ${expandedStartTimeStr} to ${expandedEndTimeStr}`);
    }
    
    const transcriptResponse = await drive.files.list({
      q: transcriptQuery,
      orderBy: 'createdTime desc',
      pageSize: 50, // Get more results to filter through
      fields: 'files(id, name, mimeType, createdTime, modifiedTime, size, webViewLink)',
    });

    console.log(`[Drive] Found ${transcriptResponse.data.files?.length || 0} Google Docs in time window`);

    if (transcriptResponse.data.files && transcriptResponse.data.files.length > 0) {
      // Log all found files for debugging
      if (transcriptResponse.data.files.length > 0) {
        console.log(`[Drive] Files found:`);
        transcriptResponse.data.files.slice(0, 5).forEach((file, idx) => {
          console.log(`  ${idx + 1}. ${file.name} (created: ${file.createdTime})`);
        });
      }
      
      let transcriptFile: typeof transcriptResponse.data.files[0] | undefined;
      
      // Priority 1: Files with "Notes by Gemini" AND recordingId in name (most precise)
      if (recordingId) {
        transcriptFile = transcriptResponse.data.files.find(
          file => file.name?.includes('Notes by Gemini') && 
                  file.name?.includes(recordingId)
        );
        if (transcriptFile) {
          console.log(`[Drive] Found transcript (Priority 1 - Notes by Gemini + recordingId): ${transcriptFile.name}`);
        }
      }
      
      // Priority 2: Files with "Notes by Gemini" AND alertId in name (fallback for old files)
      if (!transcriptFile && alertId) {
        transcriptFile = transcriptResponse.data.files.find(
          file => file.name?.includes('Notes by Gemini') && 
                  file.name?.toLowerCase().includes(alertId.toLowerCase())
        );
        if (transcriptFile) {
          console.log(`[Drive] Found transcript (Priority 2 - Notes by Gemini + alertId): ${transcriptFile.name}`);
        }
      }
      
      // Priority 3: Files with "Notes by Gemini" in name
      if (!transcriptFile) {
        transcriptFile = transcriptResponse.data.files.find(
          file => file.name?.includes('Notes by Gemini')
        );
        if (transcriptFile) {
          console.log(`[Drive] Found transcript (Priority 3 - Notes by Gemini): ${transcriptFile.name}`);
        }
      }

      // Priority 4: Files with recordingId in name (case-sensitive, exact match)
      if (!transcriptFile && recordingId) {
        transcriptFile = transcriptResponse.data.files.find(
          file => file.name?.includes(recordingId)
        );
        if (transcriptFile) {
          console.log(`[Drive] Found transcript (Priority 4 - recordingId match): ${transcriptFile.name}`);
        }
      }

      // Priority 5: Files with alertId in name (case-insensitive)
      if (!transcriptFile && alertId) {
        transcriptFile = transcriptResponse.data.files.find(
          file => file.name?.toLowerCase().includes(alertId.toLowerCase())
        );
        if (transcriptFile) {
          console.log(`[Drive] Found transcript (Priority 5 - alertId match): ${transcriptFile.name}`);
        }
      }

      // Priority 6: Files with "transcript", "meeting", or "notes" in name
      if (!transcriptFile) {
        transcriptFile = transcriptResponse.data.files.find(
          file => file.name?.toLowerCase().includes('transcript') ||
                  file.name?.toLowerCase().includes('meeting') ||
                  file.name?.toLowerCase().includes('notes')
        );
        if (transcriptFile) {
          console.log(`[Drive] Found transcript (Priority 6 - keyword match): ${transcriptFile.name}`);
        }
      }

      // Priority 7: Most recent file in time window
      if (!transcriptFile) {
        transcriptFile = transcriptResponse.data.files[0];
        if (transcriptFile) {
          console.log(`[Drive] Using most recent file (Priority 7 - fallback): ${transcriptFile.name}`);
        }
      }

      if (transcriptFile) {
        result.transcriptFile = {
          id: transcriptFile.id!,
          name: transcriptFile.name!,
          mimeType: transcriptFile.mimeType!,
          createdTime: transcriptFile.createdTime || transcriptFile.modifiedTime || '',
          modifiedTime: transcriptFile.modifiedTime || '',
          size: transcriptFile.size,
          webViewLink: transcriptFile.webViewLink,
        };
        console.log(`[Drive] ✅ Selected transcript file: ${transcriptFile.name}`);
      }
    } else {
      console.log(`[Drive] ⚠️ No Google Docs found in time window`);
      if (alertId) {
        console.log(`[Drive] ⚠️ AlertId was: ${alertId}`);
      }
    }

    return result;
  } catch (error) {
    console.error('Error finding recording files:', error);
    throw new Error(`Failed to find recording files: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Download file from Google Drive
 */
export async function downloadFile(fileId: string): Promise<Buffer> {
  try {
    const drive = await getDriveClient();
    const response = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'arraybuffer' }
    );

    return Buffer.from(response.data as ArrayBuffer);
  } catch (error) {
    console.error('Error downloading file:', error);
    throw new Error(`Failed to download file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Export Google Doc to plain text
 */
export async function exportGoogleDoc(fileId: string): Promise<string> {
  try {
    const drive = await getDriveClient();
    const response = await drive.files.export(
      { fileId, mimeType: 'text/plain' },
      { responseType: 'text' }
    );

    return response.data as string;
  } catch (error) {
    console.error('Error exporting Google Doc:', error);
    throw new Error(`Failed to export Google Doc: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parse Google Meet transcript and extract Summary and Suggested next steps
 * 
 * If Summary/Suggested steps are empty or placeholder messages, extracts from Transcript section instead.
 * 
 * Google Meet transcripts have this structure:
 * - Summary section (may be empty/placeholder)
 * - Details section (contains detailed notes, we skip this)
 * - Suggested next steps section (may be empty/placeholder)
 * - Full transcript section (fallback if Summary is empty)
 * 
 * This function extracts:
 * 1. Summary (or creates one from transcript if empty)
 * 2. Suggested next steps (or extracts from transcript if empty)
 */
export function parseGoogleMeetTranscript(fullText: string): string {
  try {
    const lines = fullText.split('\n');
    const sections: {
      summary?: string[];
      suggestedSteps?: string[];
      transcript?: string[];
    } = {};
    
    let currentSection: 'summary' | 'suggestedSteps' | 'transcript' | null = null;
    let foundSummaryHeader = false;
    let foundSuggestedStepsHeader = false;
    let foundTranscriptHeader = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      const lowerLine = trimmedLine.toLowerCase();
      
      // Detect "Summary" header
      if ((lowerLine === 'summary' || 
           (lowerLine.startsWith('summary') && lowerLine.length < 15)) && 
          !foundSummaryHeader) {
        foundSummaryHeader = true;
        currentSection = 'summary';
        sections.summary = [];
        continue;
      }
      
      // Detect "Details" section - stop collecting summary when we hit it
      // This must come BEFORE "Suggested next steps" detection
      if (lowerLine === 'details' && currentSection === 'summary') {
        currentSection = null;
        foundSummaryHeader = false; // Reset so we don't collect Details content
        continue;
      }
      
      // Detect "Suggested next steps" header
      if ((lowerLine.includes('suggested next steps') || 
           lowerLine.includes('suggested next step')) && 
          !foundSuggestedStepsHeader) {
        foundSuggestedStepsHeader = true;
        currentSection = 'suggestedSteps';
        sections.suggestedSteps = [];
        continue;
      }
      
      // Detect "📖 Transcript" or "Transcript" header - STOP collecting everything
      if (trimmedLine.includes('📖 Transcript') || 
          (lowerLine === 'transcript' && i > 10 && trimmedLine.includes('Transcript'))) {
        // Stop all collection - we don't want the transcript section
        currentSection = null;
        foundSummaryHeader = false;
        foundSuggestedStepsHeader = false;
        foundTranscriptHeader = true;
        // Only collect transcript if we need it for fallback (placeholder detection)
        currentSection = 'transcript';
        sections.transcript = [];
        continue;
      }
      
      // Collect content for current section
      if (currentSection === 'summary') {
        // Only collect if we haven't hit Details yet
        // Stop immediately if we see "Details" or "Suggested next steps"
        if (lowerLine === 'details' || lowerLine.includes('suggested next steps')) {
          currentSection = null;
          foundSummaryHeader = false;
        } else if (trimmedLine.length > 0 && 
            !lowerLine.includes('summary') && 
            !lowerLine.includes('details') &&
            !lowerLine.includes('dec 17') &&
            !lowerLine.includes('support call') &&
            !lowerLine.includes('notes length') &&
            !lowerLine.includes('client meeting') &&
            !lowerLine.includes('attachments') &&
            !lowerLine.includes('meeting records')) {
          sections.summary!.push(trimmedLine);
        }
      } else if (currentSection === 'suggestedSteps') {
        // Stop if we hit transcript section or any other section header
        if (trimmedLine.includes('📖 Transcript') || 
            (lowerLine === 'transcript' && i > 10) ||
            lowerLine === 'summary' ||
            lowerLine === 'details') {
          currentSection = null;
          foundSuggestedStepsHeader = false;
        } else if (trimmedLine.length > 0 && 
            !lowerLine.includes('suggested next steps') && 
            !lowerLine.includes('suggested next step') &&
            !lowerLine.includes('you should review') &&
            !lowerLine.includes('please provide feedback') &&
            !lowerLine.includes('get tips') &&
            !lowerLine.includes('visit the help center')) {
          sections.suggestedSteps!.push(trimmedLine);
        }
      } else if (currentSection === 'transcript') {
        // Only collect transcript if we need it as fallback (for placeholder detection)
        // We don't actually want to include transcript content in the final output
        // This is just for checking if summary/steps are placeholders
        if (trimmedLine.length > 0 && 
            !trimmedLine.match(/^\d{2}:\d{2}:\d{2}$/) && // Skip timestamp lines like "00:00:00"
            !lowerLine.includes('transcription ended') &&
            !lowerLine.includes('this editable transcript') &&
            !lowerLine.includes('dec 17') &&
            !lowerLine.includes('support call - alert')) {
          sections.transcript!.push(trimmedLine);
        }
      }
    }
    
    // Check if summary is a placeholder message
    const isPlaceholderSummary = (text: string): boolean => {
      const lower = text.toLowerCase();
      return lower.includes("wasn't produced") ||
             lower.includes("wasn't enough conversation") ||
             lower.includes("not enough conversation") ||
             lower.includes("no summary") ||
             text.length < 20;
    };
    
    // Check if suggested steps is a placeholder message
    const isPlaceholderSteps = (text: string): boolean => {
      const lower = text.toLowerCase();
      return lower.includes("no suggested next steps") ||
             lower.includes("weren't found") ||
             lower.includes("not found") ||
             text.length < 20;
    };
    
    // Build the cleaned transcript
    const parts: string[] = [];
    
    // Process Summary
    let summaryText = '';
    if (sections.summary && sections.summary.length > 0) {
      summaryText = sections.summary
        .filter(line => {
          const lower = line.toLowerCase();
          return !lower.includes('notes length') &&
                 !lower.includes('client attendance') &&
                 !lower.includes('meeting records') &&
                 !lower.includes('attachments') &&
                 !lower.includes('visit the help center') &&
                 line.length > 5;
        })
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
    }
    
    // If summary is empty or placeholder, create one from transcript
    if (!summaryText || isPlaceholderSummary(summaryText)) {
      if (sections.transcript && sections.transcript.length > 0) {
        // Extract meaningful content from transcript
        const transcriptLines = sections.transcript
          .filter(line => {
            // Skip speaker names and timestamps
            const lower = line.toLowerCase();
            return !lower.match(/^\w+ \w+:/) || line.includes(':'); // Keep lines with content after speaker name
          })
          .map(line => {
            // Remove speaker names (format: "Name: content")
            return line.replace(/^[^:]+:\s*/, '').trim();
          })
          .filter(line => line.length > 10)
          .slice(0, 3); // Take first 3 meaningful lines
        
        if (transcriptLines.length > 0) {
          summaryText = transcriptLines.join(' ').substring(0, 500); // Limit length
        }
      }
    }
    
    if (summaryText && summaryText.length > 10 && !isPlaceholderSummary(summaryText)) {
      parts.push('## Summary');
      parts.push(summaryText);
    }
    
    // Process Suggested Next Steps
    let stepsText = '';
    if (sections.suggestedSteps && sections.suggestedSteps.length > 0) {
      stepsText = sections.suggestedSteps
        .filter(line => {
          const lower = line.toLowerCase();
          return !lower.includes('you should review') &&
                 !lower.includes('please provide feedback') &&
                 !lower.includes('get tips') &&
                 !lower.includes('visit the help center') &&
                 line.length > 5;
        })
        .map(line => line.replace(/^[\*\-\•]\s*/, '').trim())
        .filter(line => line.length > 0)
        .join('\n')
        .trim();
    }
    
    // If suggested steps is empty or placeholder, try to infer from transcript
    if (!stepsText || isPlaceholderSteps(stepsText)) {
      // Look for action items in transcript (lines with "will", "should", "need to", etc.)
      if (sections.transcript && sections.transcript.length > 0) {
        const actionItems = sections.transcript
          .filter(line => {
            const lower = line.toLowerCase();
            return (lower.includes('will ') || 
                   lower.includes('should ') || 
                   lower.includes('need to ') ||
                   lower.includes('going to ')) &&
                   line.length > 15;
          })
          .map(line => {
            // Remove speaker names
            return line.replace(/^[^:]+:\s*/, '').trim();
          })
          .slice(0, 3); // Take first 3 action items
        
        if (actionItems.length > 0) {
          stepsText = actionItems.join('\n');
        }
      }
    }
    
    if (stepsText && stepsText.length > 10 && !isPlaceholderSteps(stepsText)) {
      parts.push('\n## Suggested Next Steps');
      parts.push(stepsText);
    }
    
    const cleanedTranscript = parts.join('\n\n').trim();
    
    // If we still don't have meaningful content, use transcript as fallback
    if (!cleanedTranscript || cleanedTranscript.length < 10) {
      console.warn('[Drive] No summary or steps found, using transcript as fallback');
      if (sections.transcript && sections.transcript.length > 0) {
        // Use transcript content as summary
        const transcriptContent = sections.transcript
          .map(line => line.replace(/^[^:]+:\s*/, '').trim())
          .filter(line => line.length > 10)
          .join(' ')
          .substring(0, 1000); // Limit to 1000 chars
        
        return `## Summary\n${transcriptContent}${transcriptContent.length >= 1000 ? '...' : ''}`;
      }
      
      console.warn('[Drive] Could not parse Google Meet transcript structure, using first 500 chars');
      return fullText.substring(0, 500) + '...';
    }
    
    // Return ONLY the cleaned transcript (Summary + Suggested Steps)
    // Do NOT include the full transcript section
    return cleanedTranscript;
  } catch (error) {
    console.error('[Drive] Error parsing Google Meet transcript:', error);
    if (error instanceof Error) {
      console.error('[Drive] Error stack:', error.stack);
    }
    // Fallback: return first 1000 characters
    console.warn('[Drive] Returning fallback (first 1000 chars) due to parse error');
    return fullText.substring(0, 1000) + '...';
  }
}

/**
 * Get file metadata from Google Drive
 */
export async function getFileMetadata(fileId: string): Promise<DriveFile> {
  try {
    const drive = await getDriveClient();
    const response = await drive.files.get({
      fileId,
      fields: 'id, name, mimeType, createdTime, modifiedTime, size, webViewLink, webContentLink',
    });

    const file = response.data;
    return {
      id: file.id!,
      name: file.name!,
      mimeType: file.mimeType!,
      createdTime: file.createdTime || file.modifiedTime || '',
      modifiedTime: file.modifiedTime || '',
      size: file.size,
      webViewLink: file.webViewLink,
      webContentLink: file.webContentLink,
    };
  } catch (error) {
    console.error('Error getting file metadata:', error);
    throw new Error(`Failed to get file metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

