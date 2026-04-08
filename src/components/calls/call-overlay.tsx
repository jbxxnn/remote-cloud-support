"use client";

import React, { useEffect, useRef, useState } from "react";
import { useWebRTCCall } from "@/hooks/use-webrtc-call";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Mic, MicOff, Video, VideoOff, PhoneOff, 
  Maximize2, Minimize2, Settings, Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CallOverlayProps {
  callSessionId: string;
  token: string;
  signalingUrl: string;
  iceServers: RTCIceServer[];
  onClose: () => void;
  clientName?: string;
  isIncoming?: boolean;
  autoAnswer?: boolean;
  hideControls?: boolean;
  inviteTarget?: {
    clientId?: string;
    userId?: string;
  };
}

export const CallOverlay: React.FC<CallOverlayProps> = ({
  callSessionId,
  token,
  signalingUrl,
  iceServers,
  onClose,
  clientName = "Client",
  isIncoming = false,
  autoAnswer = false,
  hideControls = false,
  inviteTarget,
}) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const {
    localStream,
    remoteStream,
    callState,
    error,
    startCall,
    endCall
  } = useWebRTCCall({
    callSessionId,
    token,
    signalingUrl,
    iceServers,
    onCallEnded: onClose,
    autoAnswer,
    inviteTarget,
  });

  // Attach local stream to video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Attach remote stream to video element
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Handle Mute/Video Toggles
  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => track.enabled = !track.enabled);
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => track.enabled = !track.enabled);
      setIsVideoOff(!isVideoOff);
    }
  };

  const handleEndCall = () => {
    endCall();
    onClose();
  };

  return (
    <div className={cn(
      "fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm transition-all duration-300",
      isFullScreen ? "p-0" : "p-4 md:p-8"
    )}>
      <Card className={cn(
        "relative w-full h-full max-w-6xl bg-zinc-900 border-zinc-800 overflow-hidden shadow-2xl flex flex-col",
        isFullScreen ? "rounded-none" : "rounded-2xl"
      )}>
        
        {/* Header Info */}
        <div className="absolute top-0 left-0 right-0 p-6 z-10 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
              <span className="text-primary font-bold">{clientName.charAt(0)}</span>
            </div>
            <div>
              <h3 className="text-white font-medium">{clientName}</h3>
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  callState === 'active' ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                )} />
                <span className="text-zinc-400 text-xs uppercase tracking-wider">
                  {callState}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-zinc-400 hover:text-white"
              onClick={() => setIsFullScreen(!isFullScreen)}
            >
              {isFullScreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
            </Button>
            <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white">
              <Settings size={20} />
            </Button>
          </div>
        </div>

        {/* Video Grid */}
        <div className="flex-1 relative bg-zinc-950 flex items-center justify-center overflow-hidden">
          
          {/* Main (Remote) Video */}
          <div className="w-full h-full relative">
            {remoteStream ? (
              <video 
                ref={remoteVideoRef} 
                autoPlay 
                playsInline 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500 gap-4">
                <div className="w-24 h-24 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-800">
                  <span className="text-4xl font-bold text-zinc-700">{clientName.charAt(0)}</span>
                </div>
                {callState === 'ringing' ? (
                  <div className="text-center">
                    <p className="text-zinc-300">Ringing...</p>
                    <p className="text-xs text-zinc-500">
                      {isIncoming ? "Auto-answering..." : "Connecting to participant..."}
                    </p>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-zinc-300 text-sm mb-1 uppercase tracking-widest opacity-50">
                      {callState === 'active' ? 'Call Active' : 'Negotiating...'}
                    </p>
                    <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Local Picture-in-Picture */}
          <div className="absolute bottom-24 right-6 w-48 aspect-video rounded-xl bg-zinc-900 border-2 border-primary/20 overflow-hidden shadow-2xl transition-all hover:scale-105 hover:border-primary/40 group z-10">
            {localStream ? (
              <>
                <video 
                  ref={localVideoRef} 
                  autoPlay 
                  muted 
                  playsInline 
                  className={cn(
                    "w-full h-full object-cover",
                    isVideoOff && "hidden"
                  )}
                />
                {isVideoOff && (
                  <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                    <VideoOff size={24} className="text-zinc-600" />
                  </div>
                )}
                <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/50 text-[10px] text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity">
                  You
                </div>
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                <Loader2 size={16} className="animate-spin text-zinc-600" />
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="absolute top-24 left-1/2 -translate-x-1/2 px-4 py-2 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-lg text-sm backdrop-blur-md z-30">
              {error}
            </div>
          )}

          {/* Controls Bar - Absolute Overlay */}
          {!hideControls && (
            <div className="absolute bottom-0 left-0 right-0 p-8 flex items-center justify-center gap-4 bg-gradient-to-t from-black/80 to-transparent z-40">
              <Button 
                variant="outline" 
                size="icon" 
                className={cn(
                  "w-14 h-14 rounded-full border-zinc-700 bg-zinc-800/50 backdrop-blur-md hover:bg-zinc-700 transition-all",
                  isMuted && "bg-rose-500/20 border-rose-500/30 text-rose-500 hover:bg-rose-500/30"
                )}
                onClick={toggleMute}
                disabled={!localStream}
              >
                {isMuted ? <MicOff /> : <Mic />}
              </Button>
              
              <Button 
                variant="outline" 
                size="icon" 
                className={cn(
                  "w-14 h-14 rounded-full border-zinc-700 bg-zinc-800/50 backdrop-blur-md hover:bg-zinc-700 transition-all",
                  isVideoOff && "bg-rose-500/20 border-rose-500/30 text-rose-500 hover:bg-rose-500/30"
                )}
                onClick={toggleVideo}
                disabled={!localStream}
              >
                {isVideoOff ? <VideoOff /> : <Video />}
              </Button>
    
              <Button 
                variant="destructive" 
                size="icon" 
                className="w-16 h-16 rounded-full shadow-lg shadow-rose-500/20 hover:scale-110 active:scale-95 transition-all"
                onClick={handleEndCall}
              >
                <PhoneOff className="fill-current" />
              </Button>
            </div>
          )}
        </div>

      </Card>
    </div>
  );
};
