/**
 * Google Drive Watch Service
 * 
 * Sets up push notifications (webhooks) for Google Drive file changes
 * Note: Watch channels expire after 7 days and need to be renewed
 */

import { getDriveClient } from './drive-service';

export interface WatchChannel {
  id: string;
  resourceId: string;
  expiration: number;
  address: string;
}

/**
 * Set up a watch channel for Google Drive changes
 * 
 * This subscribes to changes in Google Drive and sends notifications
 * to your webhook URL when files are created/updated
 * 
 * @param webhookUrl - Your webhook endpoint URL (must be publicly accessible)
 * @param folderId - Optional: Watch specific folder, or null for all files
 * @returns Watch channel information
 */
export async function setupDriveWatch(
  webhookUrl: string,
  folderId?: string
): Promise<WatchChannel> {
  try {
    const drive = await getDriveClient();

    // Set up watch channel
    const requestBody: any = {
      id: `channel-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      type: 'web_hook',
      address: webhookUrl,
    };

    // Watch specific folder or all files
    const resource = folderId 
      ? `files/${folderId}`
      : 'changes';

    const response = await drive.changes.watch({
      requestBody,
      pageToken: undefined, // Start from current state
    });

    if (!response.data.id || !response.data.resourceId) {
      throw new Error('Failed to create watch channel');
    }

    return {
      id: response.data.id,
      resourceId: response.data.resourceId,
      expiration: response.data.expiration ? parseInt(response.data.expiration) : Date.now() + 7 * 24 * 60 * 60 * 1000,
      address: webhookUrl,
    };
  } catch (error) {
    console.error('Error setting up Drive watch:', error);
    throw new Error(`Failed to set up watch channel: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Stop a watch channel
 */
export async function stopDriveWatch(channelId: string, resourceId: string): Promise<void> {
  try {
    const drive = await getDriveClient();

    await drive.channels.stop({
      requestBody: {
        id: channelId,
        resourceId: resourceId,
      },
    });
  } catch (error) {
    console.error('Error stopping watch channel:', error);
    throw new Error(`Failed to stop watch channel: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Renew a watch channel (channels expire after 7 days)
 */
export async function renewDriveWatch(
  webhookUrl: string,
  folderId?: string
): Promise<WatchChannel> {
  // Just set up a new watch channel
  return setupDriveWatch(webhookUrl, folderId);
}

