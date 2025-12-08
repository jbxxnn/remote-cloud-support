"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, 
  X, 
  Image as ImageIcon, 
  FileText, 
  File, 
  Loader2,
  Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Evidence {
  id: string;
  evidenceType: 'photo' | 'text' | 'file' | 'recording';
  fileUrl?: string;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
  description?: string;
  uploadedBy?: string;
  uploadedByName?: string;
  createdAt: string;
}

interface EvidenceUploadProps {
  sopResponseId: string;
  alertId?: string;
  onEvidenceAdded?: (evidence: Evidence) => void;
  onEvidenceRemoved?: (evidenceId: string) => void;
  existingEvidence?: Evidence[];
}

export function EvidenceUpload({
  sopResponseId,
  alertId,
  onEvidenceAdded,
  onEvidenceRemoved,
  existingEvidence = []
}: EvidenceUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [textEvidence, setTextEvidence] = useState("");
  const [showTextInput, setShowTextInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('sopResponseId', sopResponseId);
      if (alertId) {
        formData.append('alertId', alertId);
      }

      const response = await fetch('/api/evidence/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload file');
      }

      const evidence = await response.json();
      toast.success('Evidence uploaded successfully');
      onEvidenceAdded?.(evidence);
      
      // Reset
      setSelectedFile(null);
      setPreviewUrl(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Failed to upload evidence:', error);
      toast.error('Failed to upload evidence');
    } finally {
      setUploading(false);
    }
  };

  const handleTextEvidenceSubmit = async () => {
    if (!textEvidence.trim()) return;

    setUploading(true);
    try {
      const response = await fetch('/api/evidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sopResponseId,
          alertId: alertId || null,
          evidenceType: 'text',
          description: textEvidence,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save text evidence');
      }

      const evidence = await response.json();
      toast.success('Text evidence saved');
      onEvidenceAdded?.(evidence);
      setTextEvidence("");
      setShowTextInput(false);
    } catch (error) {
      console.error('Failed to save text evidence:', error);
      toast.error('Failed to save text evidence');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteEvidence = async (evidenceId: string) => {
    if (!confirm('Are you sure you want to delete this evidence?')) return;

    try {
      const response = await fetch(`/api/evidence/${evidenceId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete evidence');
      }

      toast.success('Evidence deleted');
      onEvidenceRemoved?.(evidenceId);
    } catch (error) {
      console.error('Failed to delete evidence:', error);
      toast.error('Failed to delete evidence');
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getEvidenceIcon = (type: string) => {
    switch (type) {
      case 'photo':
        return <ImageIcon className="w-4 h-4" />;
      case 'text':
        return <FileText className="w-4 h-4" />;
      case 'recording':
        return <File className="w-4 h-4" />;
      default:
        return <File className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Evidence</h4>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTextInput(!showTextInput)}
          >
            <FileText className="w-4 h-4 mr-1" />
            Add Text
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-4 h-4 mr-1" />
            Upload File
          </Button>
        </div>
      </div>

      {/* Text Evidence Input */}
      {showTextInput && (
        <Card>
          <CardContent className="p-4">
            <Textarea
              placeholder="Enter text evidence..."
              value={textEvidence}
              onChange={(e) => setTextEvidence(e.target.value)}
              rows={3}
              className="mb-2"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleTextEvidenceSubmit}
                disabled={!textEvidence.trim() || uploading}
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                ) : null}
                Save Text Evidence
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowTextInput(false);
                  setTextEvidence("");
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* File Upload Preview */}
      {selectedFile && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              {previewUrl && (
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-24 h-24 object-cover rounded"
                />
              )}
              <div className="flex-1">
                <p className="text-sm font-medium">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(selectedFile.size)} • {selectedFile.type}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleFileUpload}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedFile(null);
                    setPreviewUrl(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelect}
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
      />

      {/* Existing Evidence List */}
      {existingEvidence.length > 0 && (
        <div className="space-y-2">
          <h5 className="text-xs font-medium text-muted-foreground">Attached Evidence</h5>
          {existingEvidence.map((evidence) => (
            <Card key={evidence.id}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {getEvidenceIcon(evidence.evidenceType)}
                    <div className="flex-1 min-w-0">
                      {evidence.evidenceType === 'text' ? (
                        <p className="text-sm truncate">{evidence.description}</p>
                      ) : (
                        <a
                          href={evidence.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline truncate"
                        >
                          {evidence.fileName || 'Evidence file'}
                        </a>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(evidence.fileSize)} • {new Date(evidence.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {evidence.evidenceType}
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteEvidence(evidence.id)}
                    className="ml-2"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

