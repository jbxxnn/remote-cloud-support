/**
 * A wrapper for RTCPeerConnection to manage WebRTC state and lifecycle.
 */
export class PeerConnectionWrapper {
  public pc: RTCPeerConnection;
  private onIceCandidateCallback: (candidate: RTCIceCandidate) => void;
  private onTrackCallback: (stream: MediaStream) => void;
  private remoteStream: MediaStream | null = null;

  constructor(
    iceServers: RTCIceServer[],
    onIceCandidate: (candidate: RTCIceCandidate) => void,
    onTrack: (stream: MediaStream) => void
  ) {
    this.pc = new RTCPeerConnection({ iceServers });
    this.onIceCandidateCallback = onIceCandidate;
    this.onTrackCallback = onTrack;

    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.onIceCandidateCallback(event.candidate);
      }
    };

    this.pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
        this.onTrackCallback(this.remoteStream);
      }
    };

    this.pc.onconnectionstatechange = () => {
      console.log('Connection state:', this.pc.connectionState);
    };

    this.pc.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', this.pc.iceConnectionState);
    };
  }

  /**
   * Add local tracks to the connection
   */
  public addLocalStream(stream: MediaStream) {
    stream.getTracks().forEach((track) => {
      this.pc.addTrack(track, stream);
    });
  }

  /**
   * Create an offer for the remote peer
   */
  public async createOffer(): Promise<RTCSessionDescriptionInit> {
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    return offer;
  }

  /**
   * Create an answer for an incoming offer
   */
  public async createAnswer(offerSdp: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    await this.pc.setRemoteDescription(new RTCSessionDescription(offerSdp));
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    return answer;
  }

  /**
   * Handle an incoming answer
   */
  public async handleAnswer(answerSdp: RTCSessionDescriptionInit) {
    await this.pc.setRemoteDescription(new RTCSessionDescription(answerSdp));
  }

  /**
   * Add an ICE candidate received from the remote peer
   */
  public async addIceCandidate(candidateInit: RTCIceCandidateInit) {
    try {
      await this.pc.addIceCandidate(new RTCIceCandidate(candidateInit));
    } catch (e) {
      console.error('Error adding ICE candidate:', e);
    }
  }

  /**
   * Close the connection
   */
  public close() {
    this.pc.close();
  }
}
