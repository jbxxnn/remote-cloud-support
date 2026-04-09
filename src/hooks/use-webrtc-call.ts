"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { SignalingClient } from '@/lib/webrtc/signaling-client';
import { PeerConnectionWrapper } from '@/lib/webrtc/peer-connection';

export interface UseWebRTCCallOptions {
  callSessionId: string;
  token: string;
  signalingUrl: string;
  iceServers: RTCIceServer[];
  initialLocalStream?: MediaStream | null;
  onCallEnded?: () => void;
  autoAnswer?: boolean;
  inviteTarget?: {
    clientId?: string;
    userId?: string;
  };
}

function getSupportedRecordingMimeType() {
  if (typeof MediaRecorder === 'undefined') {
    return null;
  }

  const mimeTypes = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=h264,opus',
    'video/webm',
    'video/mp4',
    '',
  ];

  for (const mimeType of mimeTypes) {
    if (!mimeType || MediaRecorder.isTypeSupported(mimeType)) {
      return mimeType;
    }
  }

  return null;
}

export function useWebRTCCall(options: UseWebRTCCallOptions) {
  const { 
    callSessionId, 
    token, 
    signalingUrl, 
    iceServers, 
    initialLocalStream,
    onCallEnded, 
    autoAnswer,
    inviteTarget 
  } = options;
  
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [callState, setCallState] = useState<'initializing' | 'ringing' | 'connecting' | 'active' | 'ended' | 'failed'>('initializing');
  const [error, setError] = useState<string | null>(null);
  
  const signalingRef = useRef<SignalingClient | null>(null);
  const peerRef = useRef<PeerConnectionWrapper | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const hasStartedOfferRef = useRef(false);
  const hasUploadedRecordingRef = useRef(false);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  /**
   * Handle incoming call offer
   */
  const handleOffer = useCallback(async (data: { sdp: RTCSessionDescriptionInit, from: string, callSessionId: string }) => {
    if (!peerRef.current) return;
    
    try {
      console.log('Received offer from:', data.from, 'for session:', data.callSessionId);
      setCallState('connecting');
      const answer = await peerRef.current.createAnswer(data.sdp);
      signalingRef.current?.sendAnswer(answer, data.callSessionId, data.from);
    } catch (err) {
      console.error('Failed to handle offer:', err);
      setError('Failed to handle incoming call');
      setCallState('failed');
    }
  }, []);

  /**
   * Handle incoming call answer
   */
  const handleAnswer = useCallback(async (data: { sdp: RTCSessionDescriptionInit, from: string, callSessionId: string }) => {
    if (!peerRef.current) return;
    
    try {
      console.log('Received answer from:', data.from);
      await peerRef.current.handleAnswer(data.sdp);
      setCallState('active');
    } catch (err) {
      console.error('Failed to handle answer:', err);
      setError('Failed to connect call');
    }
  }, []);

  /**
   * Handle incoming ICE candidate
   */
  const handleIceCandidate = useCallback(async (data: { candidate: RTCIceCandidateInit, callSessionId: string }) => {
    if (!peerRef.current) return;
    await peerRef.current.addIceCandidate(data.candidate);
  }, []);

  /**
   * Handle call end
   */
  const handleCallEnd = useCallback(() => {
    console.log('Call ended by remote');
    stopRecording();
    cleanup();
    setCallState('ended');
    onCallEnded?.();
  }, [cleanup, onCallEnded, stopRecording]);

  /**
   * Cleanup resources
   */
  const cleanup = useCallback(() => {
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
    if (signalingRef.current) {
      signalingRef.current.disconnect();
      signalingRef.current = null;
    }
    
    // We don't stop tracks here to avoid re-init loops if this is called during effect teardown
    // but we do want to stop them if explicitly ending.
    // The safest way is to stop them only if the component is unmounting or session changes.
    setRemoteStream(null);
  }, []); // Remove localStream dependency to fix infinite loop

  /**
   * Start a call (as caller)
   */
  const startCall = useCallback(async () => {
    if (!peerRef.current || !signalingRef.current || hasStartedOfferRef.current) return;
    
    try {
      hasStartedOfferRef.current = true;
      setCallState('connecting');
      const offer = await peerRef.current.createOffer();
      signalingRef.current.sendOffer(offer, callSessionId);
    } catch (err) {
      hasStartedOfferRef.current = false;
      console.error('Failed to start call:', err);
      setError('Failed to start call');
      setCallState('failed');
    }
  }, [callSessionId]);

  /**
   * Initialize WebRTC and Signaling
   */
  useEffect(() => {
    console.log('🔄 Initializing useWebRTCCall for session:', callSessionId);
    let isMounted = true;
    let localMediaStream: MediaStream | null = null;
    hasStartedOfferRef.current = false;
    hasUploadedRecordingRef.current = false;

    async function init() {
      try {
        // 1. Reuse a pre-authorized stream when available so the tablet does not
        // prompt on every incoming call.
        localMediaStream = initialLocalStream ?? await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (!isMounted) {
          if (!initialLocalStream) {
            localMediaStream.getTracks().forEach(t => t.stop());
          }
          return;
        }
        setLocalStream(localMediaStream);

        // 2. Initialize Signaling
        const signaling = new SignalingClient(signalingUrl, token);
        signalingRef.current = signaling;

        // 3. Setup Recording for remote stream
        const setupRecording = (remote: MediaStream) => {
          console.log('🎥 Setting up recording for remote stream');
          const mimeType = getSupportedRecordingMimeType();
          if (mimeType === null) {
            console.warn('⚠️ MediaRecorder is not supported in this browser. Skipping call recording.');
            return;
          }

          const recorder = mimeType
            ? new MediaRecorder(remote, { mimeType })
            : new MediaRecorder(remote);
          mediaRecorderRef.current = recorder;
          chunksRef.current = [];
          hasUploadedRecordingRef.current = false;
          console.log('🎙️ Using recording mime type:', mimeType || 'browser-default');

          recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunksRef.current.push(e.data);
          };

          recorder.onstop = async () => {
            if (hasUploadedRecordingRef.current) return;
            hasUploadedRecordingRef.current = true;
            const blob = new Blob(chunksRef.current, { type: mimeType || recorder.mimeType || 'video/webm' });
            console.log('📼 Recording stopped, blob size:', blob.size);
            
            if (blob.size > 0) {
              const formData = new FormData();
              formData.append('file', blob, `call-${callSessionId}.webm`);
              
              try {
                const uploadRes = await fetch(`/api/calls/${callSessionId}/recording`, {
                  method: 'POST',
                  body: formData,
                });
                if (uploadRes.ok) console.log('✅ Recording uploaded successfully');
              } catch (err) {
                console.error('❌ Failed to upload recording:', err);
              }
            }
          };

          recorder.start(1000);
        };

        // 4. Initialize Peer Connection
        const onRemoteStream = (s: MediaStream) => {
          if (!isMounted) return;
          setRemoteStream(s);
          setupRecording(s);
        };

        const peer = new PeerConnectionWrapper(
          iceServers,
          (candidate) => signaling.sendIceCandidate(candidate, callSessionId),
          onRemoteStream
        );
        peerRef.current = peer;
        peer.addLocalStream(localMediaStream);

        // 5. Setup signaling listeners
        signaling.on('call:offer', handleOffer);
        signaling.on('call:answer', handleAnswer);
        signaling.on('call:ice-candidate', handleIceCandidate);
        signaling.on('call:end', handleCallEnd);

        // Initiator specific: wait for target to join before sending offer
        signaling.on('user:joined', (data) => {
          if (inviteTarget) {
            console.log('🤝 Remote participant joined room, sending offer now...', data);
            startCall();
          }
        });

        setCallState('ringing');
        
        if (autoAnswer) {
          console.log('🤖 Auto-answer enabled');
        }

        if (inviteTarget) {
          signaling.emit('call:invite', {
            toUserId: inviteTarget.userId,
            toClientId: inviteTarget.clientId,
            callSessionId,
            metadata: { callerName: 'Staff Support' }
          });
          console.log('📨 Sent call invite to:', inviteTarget);
          // Wait for 'user:joined' to send offer
        }

      } catch (err) {
        console.error('Failed to initialize WebRTC call:', err);
        if (isMounted) {
          setError('Camera or Microphone access denied');
          setCallState('failed');
        }
      }
    }

    if (callSessionId && token) {
      init();
    }

    return () => {
      isMounted = false;
      stopRecording();
      cleanup();
      if (localMediaStream && !initialLocalStream) {
        localMediaStream.getTracks().forEach(t => t.stop());
      }
    };
  }, [callSessionId, token, signalingUrl, iceServers, initialLocalStream, autoAnswer, inviteTarget, handleOffer, handleAnswer, handleIceCandidate, handleCallEnd, cleanup, startCall, stopRecording]);

  return {
    localStream,
    remoteStream,
    callState,
    error,
    startCall,
    endCall: () => {
      stopRecording();
      setCallState('ended');
      signalingRef.current?.sendEnd(callSessionId);
      // Give Socket.IO a moment to flush the end event before disconnecting.
      window.setTimeout(() => {
        cleanup();
      }, 150);
    }
  };
}
