import { io, Socket } from 'socket.io-client';

export interface SignalingEvents {
  'user:joined': (data: { userId: string; role: string }) => void;
  'user:left': (data: { userId: string }) => void;
  'call:invite': (data: { from: string; metadata?: any }) => void;
  'call:offer': (data: { from: string; callSessionId: string; sdp: RTCSessionDescriptionInit }) => void;
  'call:answer': (data: { from: string; callSessionId: string; sdp: RTCSessionDescriptionInit }) => void;
  'call:ice-candidate': (data: { from: string; callSessionId: string; candidate: RTCIceCandidateInit }) => void;
  'call:end': (data: { from: string }) => void;
  'connect_error': (err: Error) => void;
  'disconnect': (reason: string) => void;
  'connect': () => void;
}

export class SignalingClient {
  private socket: Socket | null = null;
  private url: string;
  private token: string;

  constructor(url: string, token: string) {
    this.url = url;
    this.token = token;
    this.connect(); // Auto-connect on instantiation
  }

  connect() {
    if (this.socket?.connected) return;

    this.socket = io(this.url, {
      auth: { token: this.token },
      transports: ['websocket'], // Force websocket for reliability in PWA
      reconnectionAttempts: 5,
    });

    this.socket.on('connect', () => {
      console.log('✅ Connected to signaling server');
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  emit(event: string, data: any) {
    if (!this.socket) return;
    this.socket.emit(event, data);
  }

  on<K extends keyof SignalingEvents>(event: K, callback: SignalingEvents[K]) {
    this.socket?.on(event as string, callback as any);
  }

  off<K extends keyof SignalingEvents>(event: K, callback: SignalingEvents[K]) {
    this.socket?.off(event as string, callback as any);
  }

  sendOffer(sdp: RTCSessionDescriptionInit, callSessionId: string) {
    this.socket?.emit('call:offer', { sdp, callSessionId });
  }

  sendAnswer(sdp: RTCSessionDescriptionInit, callSessionId: string, toUserId?: string) {
    this.socket?.emit('call:answer', { sdp, callSessionId, toUserId });
  }

  sendIceCandidate(candidate: RTCIceCandidate, callSessionId: string) {
    this.socket?.emit('call:ice-candidate', { candidate, callSessionId });
  }

  sendEnd(callSessionId?: string) {
    this.socket?.emit('call:end', { callSessionId });
  }
}
