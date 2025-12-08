"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, Download, Trash2, Video, Headphones, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface Recording {
  id: string;
  recordingType: 'video' | 'audio' | 'screen';
  fileUrl: string;
  fileName?: string;
  duration?: number;
  fileSize?: number;
  recordedByName?: string;
  createdAt: string;
}

interface RecordingPlayerProps {
  recording: Recording;
  onDelete?: (recordingId: string) => void;
}

export function RecordingPlayer({ recording, onDelete }: RecordingPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  const getRecordingIcon = () => {
    switch (recording.recordingType) {
      case 'video':
        return <Video className="w-5 h-5" />;
      case 'audio':
        return <Headphones className="w-5 h-5" />;
      case 'screen':
        return <Monitor className="w-5 h-5" />;
      default:
        return <Video className="w-5 h-5" />;
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'Unknown';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
    // In a real implementation, you would control the media element here
  };

  const handleDownload = () => {
    if (recording.fileUrl) {
      window.open(recording.fileUrl, '_blank');
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 p-3 bg-primary/10 rounded-lg">
            {getRecordingIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {recording.fileName || 'Recording'}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {recording.recordingType}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDuration(recording.duration)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatFileSize(recording.fileSize)}
                  </span>
                </div>
                {recording.recordedByName && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Recorded by {recording.recordedByName} • {formatDistanceToNow(new Date(recording.createdAt), { addSuffix: true })}
                  </p>
                )}
              </div>
            </div>

            {/* Media Player */}
            {recording.recordingType === 'video' && recording.fileUrl && (
              <video
                src={recording.fileUrl}
                controls
                className="w-full rounded mt-2"
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />
            )}

            {recording.recordingType === 'audio' && recording.fileUrl && (
              <audio
                src={recording.fileUrl}
                controls
                className="w-full mt-2"
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 mt-3">
              {recording.recordingType !== 'video' && recording.recordingType !== 'audio' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handlePlayPause}
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4 mr-1" />
                  ) : (
                    <Play className="w-4 h-4 mr-1" />
                  )}
                  {isPlaying ? 'Pause' : 'Play'}
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={handleDownload}
              >
                <Download className="w-4 h-4 mr-1" />
                Download
              </Button>
              {onDelete && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onDelete(recording.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

