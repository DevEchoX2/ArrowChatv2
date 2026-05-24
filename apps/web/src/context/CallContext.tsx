"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";
import { RealtimeChannel } from "@supabase/supabase-js";
import { getBrowserSupabaseClient } from "@/lib/supabase";
import { useAuth } from "./AuthContext";

export type CallMode = "audio" | "video";
export type CallStatus = "idle" | "incoming" | "outgoing" | "connecting" | "active";

export interface CallPeer {
  userId: string;
  displayName: string;
  username?: string;
  avatarUrl?: string;
}

interface CallContextValue {
  status: CallStatus;
  mode: CallMode | null;
  peer: CallPeer | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isVideoEnabled: boolean;
  startCall: (peer: CallPeer, mode: CallMode) => Promise<void>;
  acceptCall: () => Promise<void>;
  declineCall: () => Promise<void>;
  hangup: () => Promise<void>;
  toggleMute: () => void;
  toggleVideo: () => void;
}

interface CallSignalPayload {
  callId: string;
  to: string;
  from: string;
  mode?: CallMode;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  fromDisplayName?: string;
  fromUsername?: string;
  fromAvatarUrl?: string | null;
}

const CallContext = createContext<CallContextValue | null>(null);

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:global.stun.twilio.com:3478" },
];

const SIGNAL_CHANNEL = "call-signaling";

function createCallId() {
  if (typeof globalThis.crypto !== "undefined" && "randomUUID" in globalThis.crypto) {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

export function CallProvider({ children }: { children: ReactNode }) {
  const supabase = getBrowserSupabaseClient();
  const { user } = useAuth();

  const [status, setStatus] = useState<CallStatus>("idle");
  const [mode, setMode] = useState<CallMode | null>(null);
  const [peer, setPeer] = useState<CallPeer | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const signalChannelRef = useRef<RealtimeChannel | null>(null);
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);
  const callIdRef = useRef<string | null>(null);
  const statusRef = useRef<CallStatus>("idle");
  const peerRef = useRef<CallPeer | null>(null);
  const userIdRef = useRef<string | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    peerRef.current = peer;
  }, [peer]);

  useEffect(() => {
    userIdRef.current = user?.id ?? null;
  }, [user?.id]);

  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  useEffect(() => {
    remoteStreamRef.current = remoteStream;
  }, [remoteStream]);

  const sendSignal = useCallback((event: string, payload: CallSignalPayload) => {
    const channel = signalChannelRef.current;
    if (!channel) return;
    channel.send({ type: "broadcast", event, payload });
  }, []);

  const endCall = useCallback(
    async ({ notify }: { notify: boolean }) => {
      const peerId = peerRef.current?.userId;
      const callId = callIdRef.current;
      const from = userIdRef.current;
      if (notify && peerId && callId && from) {
        sendSignal("call:hangup", { callId, to: peerId, from });
      }

      if (peerConnectionRef.current) {
        peerConnectionRef.current.ontrack = null;
        peerConnectionRef.current.onicecandidate = null;
        peerConnectionRef.current.onconnectionstatechange = null;
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }

      stopStream(localStreamRef.current);
      stopStream(remoteStreamRef.current);
      localStreamRef.current = null;
      remoteStreamRef.current = null;
      pendingOfferRef.current = null;
      pendingIceRef.current = [];
      callIdRef.current = null;

      setLocalStream(null);
      setRemoteStream(null);
      setStatus("idle");
      setMode(null);
      setPeer(null);
      setIsMuted(false);
      setIsVideoEnabled(true);
    },
    [sendSignal]
  );

  const createPeerConnection = useCallback(
    (peerId: string) => {
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pc.onicecandidate = (event) => {
        const candidate = event.candidate?.toJSON();
        const callId = callIdRef.current;
        const from = userIdRef.current;
        if (!candidate || !callId || !from) return;
        sendSignal("call:ice", { callId, to: peerId, from, candidate });
      };
      pc.ontrack = (event) => {
        const stream = event.streams?.[0];
        if (stream) {
          setRemoteStream(stream);
          return;
        }
        const fallback = new MediaStream();
        if (event.track) fallback.addTrack(event.track);
        setRemoteStream(fallback);
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          setStatus("active");
        }
        if (["failed", "disconnected", "closed"].includes(pc.connectionState)) {
          void endCall({ notify: false });
        }
      };
      return pc;
    },
    [endCall, sendSignal]
  );

  const attachStream = useCallback((pc: RTCPeerConnection, stream: MediaStream) => {
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));
  }, []);

  const ensureMediaAccess = useCallback(async (withVideo: boolean) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Media devices are not available in this browser.");
    }
    return navigator.mediaDevices.getUserMedia({ audio: true, video: withVideo });
  }, []);

  const drainPendingIce = useCallback(async () => {
    const pc = peerConnectionRef.current;
    if (!pc) return;
    const candidates = pendingIceRef.current;
    pendingIceRef.current = [];
    for (const candidate of candidates) {
      try {
        await pc.addIceCandidate(candidate);
      } catch {
        // Ignore ICE failures when remote state has moved on.
      }
    }
  }, []);

  const startCall = useCallback(
    async (target: CallPeer, newMode: CallMode) => {
      if (!supabase || !user) return;
      if (statusRef.current !== "idle") return;

      const callId = createCallId();
      callIdRef.current = callId;
      setPeer(target);
      setMode(newMode);
      setStatus("outgoing");
      setIsMuted(false);
      setIsVideoEnabled(newMode === "video");
      pendingOfferRef.current = null;
      pendingIceRef.current = [];

      const pc = createPeerConnection(target.userId);
      peerConnectionRef.current = pc;

      try {
        const stream = await ensureMediaAccess(newMode === "video");
        setLocalStream(stream);
        attachStream(pc, stream);

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        sendSignal("call:offer", {
          callId,
          to: target.userId,
          from: user.id,
          mode: newMode,
          sdp: offer,
          fromDisplayName: user.displayName,
          fromUsername: user.username,
          fromAvatarUrl: user.avatarUrl ?? null,
        });
      } catch (error) {
        console.error("Failed to start call", error);
        await endCall({ notify: false });
      }
    },
    [attachStream, createPeerConnection, ensureMediaAccess, endCall, sendSignal, supabase, user]
  );

  const acceptCall = useCallback(async () => {
    if (!supabase || !user) return;
    if (statusRef.current !== "incoming") return;
    const offer = pendingOfferRef.current;
    const callId = callIdRef.current;
    const target = peerRef.current;
    if (!offer || !callId || !target) return;

    const pc = createPeerConnection(target.userId);
    peerConnectionRef.current = pc;
    setStatus("connecting");
    setIsMuted(false);
    setIsVideoEnabled(mode === "video");

    try {
      const stream = await ensureMediaAccess(mode === "video");
      setLocalStream(stream);
      attachStream(pc, stream);

      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      sendSignal("call:answer", {
        callId,
        to: target.userId,
        from: user.id,
        sdp: answer,
      });

      pendingOfferRef.current = null;
      await drainPendingIce();
    } catch (error) {
      console.error("Failed to accept call", error);
      sendSignal("call:decline", {
        callId,
        to: target.userId,
        from: user.id,
      });
      await endCall({ notify: false });
    }
  }, [
    attachStream,
    createPeerConnection,
    drainPendingIce,
    endCall,
    ensureMediaAccess,
    mode,
    sendSignal,
    supabase,
    user,
  ]);

  const declineCall = useCallback(async () => {
    if (statusRef.current !== "incoming") return;
    const callId = callIdRef.current;
    const target = peerRef.current;
    const from = userIdRef.current;
    if (callId && target && from) {
      sendSignal("call:decline", { callId, to: target.userId, from });
    }
    await endCall({ notify: false });
  }, [endCall, sendSignal]);

  const hangup = useCallback(async () => {
    if (statusRef.current === "idle") return;
    await endCall({ notify: true });
  }, [endCall]);

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    setIsMuted((prev) => {
      const next = !prev;
      stream?.getAudioTracks().forEach((track) => {
        track.enabled = !next;
      });
      return next;
    });
  }, []);

  const toggleVideo = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    setIsVideoEnabled((prev) => {
      const next = !prev;
      stream.getVideoTracks().forEach((track) => {
        track.enabled = next;
      });
      return next;
    });
  }, []);

  useEffect(() => {
    if (!supabase || !user) return;

    const channel = supabase
      .channel(SIGNAL_CHANNEL, { config: { broadcast: { self: false } } })
      .on("broadcast", { event: "call:offer" }, ({ payload }) => {
        const data = payload as CallSignalPayload;
        if (!data || data.to !== user.id || !data.callId || !data.from) return;
        if (statusRef.current !== "idle") {
          sendSignal("call:busy", { callId: data.callId, to: data.from, from: user.id });
          return;
        }

        callIdRef.current = data.callId;
        pendingOfferRef.current = data.sdp ?? null;
        pendingIceRef.current = [];
        setMode(data.mode ?? "audio");
        setPeer({
          userId: data.from,
          displayName: data.fromDisplayName ?? data.fromUsername ?? "Unknown",
          username: data.fromUsername ?? "user",
          avatarUrl: data.fromAvatarUrl ?? undefined,
        });
        setStatus("incoming");
      })
      .on("broadcast", { event: "call:answer" }, async ({ payload }) => {
        const data = payload as CallSignalPayload;
        if (!data || data.to !== user.id || !data.sdp) return;
        if (data.callId !== callIdRef.current) return;
        const pc = peerConnectionRef.current;
        if (!pc) return;
        try {
          await pc.setRemoteDescription(data.sdp);
          setStatus("connecting");
          await drainPendingIce();
        } catch (error) {
          console.error("Failed to apply call answer", error);
          await endCall({ notify: false });
        }
      })
      .on("broadcast", { event: "call:ice" }, async ({ payload }) => {
        const data = payload as CallSignalPayload;
        if (!data || data.to !== user.id || !data.candidate) return;
        if (data.callId !== callIdRef.current) return;
        const pc = peerConnectionRef.current;
        if (!pc) return;
        if (!pc.remoteDescription) {
          pendingIceRef.current.push(data.candidate);
          return;
        }
        try {
          await pc.addIceCandidate(data.candidate);
        } catch {
          // ignore
        }
      })
      .on("broadcast", { event: "call:hangup" }, async ({ payload }) => {
        const data = payload as CallSignalPayload;
        if (!data || data.to !== user.id) return;
        if (data.callId !== callIdRef.current) return;
        await endCall({ notify: false });
      })
      .on("broadcast", { event: "call:decline" }, async ({ payload }) => {
        const data = payload as CallSignalPayload;
        if (!data || data.to !== user.id) return;
        if (data.callId !== callIdRef.current) return;
        await endCall({ notify: false });
      })
      .on("broadcast", { event: "call:busy" }, async ({ payload }) => {
        const data = payload as CallSignalPayload;
        if (!data || data.to !== user.id) return;
        if (data.callId !== callIdRef.current) return;
        await endCall({ notify: false });
      });

    signalChannelRef.current = channel;
    channel.subscribe();

    return () => {
      channel.unsubscribe();
      signalChannelRef.current = null;
    };
  }, [drainPendingIce, endCall, sendSignal, supabase, user]);

  const value: CallContextValue = {
    status,
    mode,
    peer,
    localStream,
    remoteStream,
    isMuted,
    isVideoEnabled,
    startCall,
    acceptCall,
    declineCall,
    hangup,
    toggleMute,
    toggleVideo,
  };

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
}

export function useCall(): CallContextValue {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCall must be used within <CallProvider>");
  return ctx;
}
