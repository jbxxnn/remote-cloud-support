"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { SignalingClient } from "@/lib/webrtc/signaling-client";

interface TabletSignalingOptions {
  onInvite: (data: { callSessionId: string; from: string }) => void;
  enabled?: boolean;
}

export function useTabletSignaling({ onInvite, enabled = true }: TabletSignalingOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const signalingRef = useRef<SignalingClient | null>(null);

  const initSignaling = useCallback(async () => {
    if (!enabled) return;
    
    try {
      // 1. Get device token
      const response = await fetch("/api/devices/token");
      if (!response.ok) throw new Error("Failed to get device token");
      
      const { token, signalingUrl } = await response.json();

      // 2. Initialize Signaling Client
      const signaling = new SignalingClient(signalingUrl, token);
      signalingRef.current = signaling;

      // 3. Setup Listeners
      signaling.on("connect", () => {
        setIsConnected(true);
        console.log("📟 Tablet signaling connected");
      });

      signaling.on("disconnect", () => {
        setIsConnected(false);
        console.log("📟 Tablet signaling disconnected");
      });

      signaling.on("call:invite", (data: any) => {
        console.log("📞 Received call invite:", data);
        if (data.callSessionId) {
          onInvite({
            callSessionId: data.callSessionId,
            from: data.from
          });
        }
      });

    } catch (err) {
      console.error("Failed to initialize tablet signaling:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }, [onInvite, enabled]);

  useEffect(() => {
    if (enabled) {
      initSignaling();
    }
    
    return () => {
      signalingRef.current?.disconnect();
      signalingRef.current = null;
      setIsConnected(false);
    };
  }, [initSignaling, enabled]);

  return { isConnected, error };
}
