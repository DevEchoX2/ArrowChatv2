"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Loader2,
} from "lucide-react";
import { useCall } from "@/context/CallContext";
import { UserAvatar } from "./UserAvatar";

function statusLabel(status: string) {
  switch (status) {
    case "incoming":
      return "Incoming call";
    case "outgoing":
      return "Calling…";
    case "connecting":
      return "Connecting…";
    case "active":
      return "Live";
    default:
      return "";
  }
}

export function CallOverlay() {
  const {
    status,
    mode,
    peer,
    localStream,
    remoteStream,
    isMuted,
    isVideoEnabled,
    acceptCall,
    declineCall,
    hangup,
    toggleMute,
    toggleVideo,
  } = useCall();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  const hasRemoteVideo = useMemo(
    () => Boolean(remoteStream?.getVideoTracks().length),
    [remoteStream]
  );

  useEffect(() => {
    if (!localVideoRef.current) return;
    localVideoRef.current.srcObject = localStream ?? null;
  }, [localStream]);

  useEffect(() => {
    if (mode !== "video" || !remoteVideoRef.current) return;
    remoteVideoRef.current.srcObject = remoteStream ?? null;
  }, [mode, remoteStream]);

  useEffect(() => {
    if (mode !== "audio" || !remoteAudioRef.current) return;
    remoteAudioRef.current.srcObject = remoteStream ?? null;
  }, [mode, remoteStream]);

  if (status === "idle" || !peer || !mode) return null;

  const isIncoming = status === "incoming";
  const isActive = status === "active" || status === "connecting";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-4xl rounded-2xl border border-white/10 bg-black/80 p-5 shadow-xl backdrop-blur">
        <div className="flex items-center gap-4">
          <UserAvatar
            user={{
              displayName: peer.displayName,
              avatarUrl: peer.avatarUrl,
              tier: peer.tier ?? "free",
              isOnline: peer.isOnline ?? true,
            }}
            size="lg"
          />
          <div>
            <p className="text-sm font-semibold text-white/90">{peer.displayName}</p>
            {peer.username && (
              <p className="text-xs text-white/40">@{peer.username}</p>
            )}
            <div className="mt-1 flex items-center gap-2 text-[11px] uppercase tracking-widest text-white/30">
              <span>{mode === "video" ? "Video call" : "Audio call"}</span>
              <span>•</span>
              <span>{statusLabel(status)}</span>
              {status === "connecting" && (
                <Loader2 size={12} className="animate-spin text-white/30" />
              )}
            </div>
          </div>
        </div>

        <div className="mt-5">
          {mode === "video" ? (
            <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black/60">
              {hasRemoteVideo ? (
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="aspect-video h-full w-full object-cover"
                />
              ) : (
                <div className="flex aspect-video items-center justify-center text-sm text-white/30">
                  Waiting for video…
                </div>
              )}
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="absolute bottom-3 right-3 h-24 w-36 rounded-lg border border-white/10 bg-black/50 object-cover"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-black/60 py-12 text-sm text-white/30">
              <UserAvatar
                user={{
                  displayName: peer.displayName,
                  avatarUrl: peer.avatarUrl,
                  tier: peer.tier ?? "free",
                  isOnline: peer.isOnline ?? true,
                }}
                size="lg"
              />
              <p className="mt-3 text-xs uppercase tracking-widest text-white/40">
                Audio only
              </p>
              <audio ref={remoteAudioRef} autoPlay />
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-center gap-3">
          {isIncoming ? (
            <>
              <button
                onClick={() => void acceptCall()}
                className="flex items-center gap-2 rounded-full bg-white px-5 py-2 text-xs font-semibold uppercase tracking-widest text-black"
              >
                <Phone size={14} />
                Accept
              </button>
              <button
                onClick={() => void declineCall()}
                className="flex items-center gap-2 rounded-full border border-red-400/50 bg-red-500/20 px-5 py-2 text-xs font-semibold uppercase tracking-widest text-red-200"
              >
                <PhoneOff size={14} />
                Decline
              </button>
            </>
          ) : (
            <>
              {isActive && (
                <button
                  onClick={toggleMute}
                  className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white/80"
                >
                  {isMuted ? <MicOff size={14} /> : <Mic size={14} />}
                  {isMuted ? "Unmute" : "Mute"}
                </button>
              )}
              {isActive && mode === "video" && (
                <button
                  onClick={toggleVideo}
                  className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white/80"
                >
                  {isVideoEnabled ? <Video size={14} /> : <VideoOff size={14} />}
                  {isVideoEnabled ? "Video" : "Camera off"}
                </button>
              )}
              <button
                onClick={() => void hangup()}
                className="flex items-center gap-2 rounded-full border border-red-400/50 bg-red-500/20 px-5 py-2 text-xs font-semibold uppercase tracking-widest text-red-200"
              >
                <PhoneOff size={14} />
                Hang up
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
