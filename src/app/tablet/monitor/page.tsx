"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useTabletSignaling } from "@/hooks/use-tablet-signaling";
import { useWakeLock } from "@/hooks/use-wake-lock";
import { CallOverlay } from "@/components/calls/call-overlay";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Monitor, Wifi, WifiOff, Loader2, Play, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export default function TabletMonitorPage() {
  const [isStarted, setIsStarted] = useState(false);
  const [activationError, setActivationError] = useState<string | null>(null);
  const [isActivating, setIsActivating] = useState(false);
  const [prewarmedStream, setPrewarmedStream] = useState<MediaStream | null>(null);
  const prewarmedStreamRef = useRef<MediaStream | null>(null);
  const [activeCall, setActiveCall] = useState<{
    callSessionId: string;
    token: string;
    signalingUrl: string;
    iceServers: any[];
  } | null>(null);

  // 1. Enable Wake Lock when started to prevent tablet from sleeping
  useWakeLock(isStarted);

  useEffect(() => {
    prewarmedStreamRef.current = prewarmedStream;
  }, [prewarmedStream]);

  useEffect(() => {
    return () => {
      prewarmedStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const handleActivateMonitor = useCallback(async () => {
    setActivationError(null);
    setIsActivating(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      prewarmedStreamRef.current?.getTracks().forEach((track) => track.stop());
      prewarmedStreamRef.current = stream;
      setPrewarmedStream(stream);
      setIsStarted(true);
    } catch (err) {
      console.error("Failed to pre-authorize camera and microphone:", err);
      setActivationError("Camera and microphone access is required before the tablet can auto-answer calls.");
    } finally {
      setIsActivating(false);
    }
  }, []);

  const handleInvite = useCallback(async (data: { callSessionId: string; from: string }) => {
    console.log("📟 Tablet: Received invite, preparing to auto-answer...");
    
    try {
      // Get a session token for this specific call
      const response = await fetch(`/api/calls/${data.callSessionId}/token`, {
        method: "POST"
      });
      
      if (!response.ok) throw new Error("Failed to get call token");
      const tokenData = await response.json();

      setActiveCall({
        callSessionId: data.callSessionId,
        token: tokenData.token,
        signalingUrl: tokenData.signalingUrl,
        iceServers: tokenData.iceServers
      });
    } catch (err) {
      console.error("Failed to prepare auto-answer:", err);
    }
  }, []);

  const { isConnected, error } = useTabletSignaling({
    onInvite: handleInvite,
    enabled: isStarted // Only connect once user has interacted
  });

  if (!isStarted) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-white font-sans">
        <div className="text-center max-w-md animate-in fade-in zoom-in duration-700">
          <div className="w-24 h-24 mx-auto mb-8 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Monitor className="w-12 h-12 text-primary" />
          </div>
          <h1 className="text-4xl font-bold mb-4">Tablet Monitor</h1>
          <p className="text-zinc-400 text-lg mb-12">
            Click the button below to activate monitoring. This ensures the tablet stays awake and has permission to play audio/video.
          </p>
          <Button 
            size="lg" 
            className="w-full h-16 text-xl gap-3 rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
            onClick={handleActivateMonitor}
            disabled={isActivating}
          >
            {isActivating ? <Loader2 className="animate-spin" /> : <Play className="fill-current" />}
            {isActivating ? "Granting Permissions..." : "Activate Monitor"}
          </Button>
          <div className="mt-8 flex items-center justify-center gap-2 text-zinc-500 text-sm">
            <Lock size={14} />
            <span>Screen timeout will be disabled</span>
          </div>
          {activationError && (
            <Card className="mt-6 p-4 bg-rose-500/10 border-rose-500/20 text-rose-400 text-sm">
              {activationError}
            </Card>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-white font-sans">
      {/* Status Header */}
      <div className="fixed top-0 left-0 right-0 p-8 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-4 bg-zinc-900/50 backdrop-blur-md px-6 py-3 rounded-full border border-zinc-800">
          <Monitor size={20} className="text-primary" />
          <span className="font-medium tracking-tight">Support Tablet Mode</span>
        </div>
        
        <div className={cn(
          "flex items-center gap-3 px-6 py-3 rounded-full border transition-all duration-500",
          isConnected 
            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" 
            : "bg-rose-500/10 border-rose-500/20 text-rose-500"
        )}>
          {isConnected ? <Wifi size={18} /> : <WifiOff size={18} />}
          <span className="text-sm font-semibold uppercase tracking-widest">
            {isConnected ? "Ready" : "Offline"}
          </span>
        </div>
      </div>

      {/* Main Content */}
      {!activeCall ? (
        <div className="text-center max-w-md animate-in fade-in zoom-in duration-700">
          <div className="relative mb-12">
            <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150 animate-pulse" />
            <div className="w-32 h-32 mx-auto rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center relative z-10 shadow-2xl">
              {isConnected ? (
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <div className="w-3 h-3 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <div className="w-3 h-3 bg-primary rounded-full animate-bounce" />
                </div>
              ) : (
                <Loader2 className="w-10 h-10 animate-spin text-zinc-700" />
              )}
            </div>
          </div>
          
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-br from-white to-zinc-500 bg-clip-text text-transparent">
            {isConnected ? "Monitoring for Calls" : "Connecting..."}
          </h1>
          <p className="text-zinc-400 text-lg leading-relaxed">
            {isConnected 
              ? "This device is now ready to receive remote support calls. Please do not close this window."
              : "Re-establishing connection to signaling server. This will only take a moment."}
          </p>
          
          {error && (
            <Card className="mt-8 p-4 bg-rose-500/10 border-rose-500/20 text-rose-400 text-sm">
              {error}
            </Card>
          )}
        </div>
      ) : (
        <CallOverlay
          callSessionId={activeCall.callSessionId}
          token={activeCall.token}
          signalingUrl={activeCall.signalingUrl}
          iceServers={activeCall.iceServers}
          initialLocalStream={prewarmedStream}
          shouldRecord={false}
          clientName="Support Staff"
          autoAnswer={true}
          hideControls={true}
          onClose={() => setActiveCall(null)}
        />
      )}

      {/* Footer Branding */}
      <div className="fixed bottom-12 text-zinc-600 text-xs uppercase tracking-[0.2em] font-medium">
        Powered by Support Sense P2P Engine
      </div>
    </div>
  );
}
