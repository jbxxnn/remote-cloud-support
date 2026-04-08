import crypto from "crypto";

const DEFAULT_STUN_URL = "stun:stun.l.google.com:19302";
const DEFAULT_TURN_TTL_SECONDS = 24 * 60 * 60;

function buildTurnCredential(username: string, secret: string) {
  return crypto.createHmac("sha1", secret).update(username).digest("base64");
}

function buildTurnUrls() {
  const udpUrl = process.env.NEXT_PUBLIC_RTC_TURN_URL;
  const tcpUrl = process.env.NEXT_PUBLIC_RTC_TURN_TCP_URL;

  return [udpUrl, tcpUrl].filter(Boolean) as string[];
}

export function buildIceServers(userId: string) {
  const iceServers: RTCIceServer[] = [
    { urls: process.env.NEXT_PUBLIC_RTC_STUN_URL || DEFAULT_STUN_URL },
  ];

  const turnSecret = process.env.RTC_TURN_SECRET;
  const turnUrls = buildTurnUrls();

  if (!turnSecret || turnUrls.length === 0) {
    return iceServers;
  }

  const ttlSeconds = Number(process.env.RTC_TURN_TTL_SECONDS || DEFAULT_TURN_TTL_SECONDS);
  const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
  const username = `${expiresAt}:${userId}`;

  iceServers.push({
    urls: turnUrls,
    username,
    credential: buildTurnCredential(username, turnSecret),
  });

  return iceServers;
}
