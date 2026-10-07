"use client";

import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Copy,
  Grid2X2,
  Hand,
  Info,
  MessageSquare,
  Mic,
  MicOff,
  MoreHorizontal,
  PhoneOff,
  PlayCircle,
  Send,
  Settings,
  Share2,
  ShieldCheck,
  Smile,
  Users,
  Video as VideoIcon,
  VideoOff,
  X,
} from "lucide-react";

import {
  Meeting,
  User,
} from "@/types/meeting";

import { useWebRTC } from "@/hooks/useWebRTC";

import { SettingsModal } from "@/components/SettingsModal";

interface MeetingRoomProps {
  meeting: Meeting;
  currentUser: User | null;
  displayName: string;
  initialAudio?: boolean;
  initialVideo?: boolean;
  onLeaveMeeting: () => void;
}

export const MeetingRoom: React.FC<MeetingRoomProps> = ({
  meeting,
  currentUser,
  displayName,
  initialAudio = true,
  initialVideo = true,
  onLeaveMeeting,
}) => {
  /* =========================================================
     PEER / HOST
  ========================================================= */

  const [peerId] = useState(
    () =>
      `peer-${Math.random()
        .toString(36)
        .slice(2, 9)}`
  );

  const isHost =
    meeting.host_name === displayName ||
    currentUser?.role === "host";

  /* =========================================================
     UI STATE
  ========================================================= */

  const [sidebar, setSidebar] =
    useState<"participants" | "chat" | null>(null);

  const [infoOpen, setInfoOpen] =
    useState(false);

  const [moreOpen, setMoreOpen] =
    useState(false);

  const [showSettings, setShowSettings] =
    useState(false);

  const [reactionOpen, setReactionOpen] =
    useState(false);

  const [leaveOpen, setLeaveOpen] =
    useState(false);

  const [chatInput, setChatInput] =
    useState("");

  const [layout, setLayout] =
    useState<"gallery" | "speaker">("gallery");

  const [copied, setCopied] =
    useState(false);

  /* =========================================================
     REFS
  ========================================================= */

  const screenVideoRef =
    useRef<HTMLVideoElement | null>(null);

  const chatBottomRef =
    useRef<HTMLDivElement | null>(null);

  /* =========================================================
     WEBRTC
  ========================================================= */

  const {
    localStream,
    screenStream,

    isAudioMuted,
    isVideoOff,
    isScreenSharing,
    isHandRaised,

    remotePeers,
    messages,
    activeReactions,

    connectionStatus,
    cameraError,

    toggleAudio,
    toggleVideo,
    toggleHandRaise,
    toggleScreenShare,

    sendMessage,
    sendReaction,

    hostMuteAll,
    hostRemovePeer,
    hostEndMeeting,
  } = useWebRTC({
    meetingId: meeting.meeting_id,

    peerId,

    displayName,

    role: isHost
      ? "host"
      : "participant",

    initialAudio,
    initialVideo,

    onRemovedByHost: () => {
      alert(
        "You have been removed from the meeting by the host."
      );

      onLeaveMeeting();
    },

    onMeetingEnded: () => {
      alert(
        "The host ended the meeting for everyone."
      );

      onLeaveMeeting();
    },
  });

  /* =========================================================
     SCREEN SHARE VIDEO
  ========================================================= */

  useEffect(() => {
    const video = screenVideoRef.current;

    if (!video || !screenStream || !isScreenSharing) {
      return;
    }

    video.srcObject = screenStream;

    video.play().catch((err) => {
      console.warn(
        "Screen share video play failed:",
        err
      );
    });
  }, [
    screenStream,
    isScreenSharing,
  ]);

  /* =========================================================
     CHAT AUTO SCROLL
  ========================================================= */

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages.length]);

  /* =========================================================
     COPY INVITE
  ========================================================= */

  const copyInvite = async () => {
    try {
      await navigator.clipboard?.writeText(
        `${window.location.origin}/meeting/${meeting.meeting_id}`
      );

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1600);
    } catch (err) {
      console.warn(
        "Could not copy invite link:",
        err
      );
    }
  };

  /* =========================================================
     CHAT
  ========================================================= */

  const submitChat = (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    const message = chatInput.trim();

    if (!message) {
      return;
    }

    sendMessage(
      message,
      "everyone"
    );

    setChatInput("");
  };

  /* =========================================================
     PARTICIPANT COUNT
  ========================================================= */

  const total =
    1 + remotePeers.length;

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div className="w-screen h-screen bg-[#1a1a1a] text-white flex flex-col overflow-hidden select-none">

      {/* =====================================================
          TOP BAR
      ===================================================== */}

      <header className="relative h-14 shrink-0 bg-[#202124] border-b border-white/10 flex items-center justify-between px-4 z-30">

        {/* LEFT */}

        <div className="flex items-center gap-3 min-w-0">

          <span className="text-[21px] font-bold tracking-[-1.2px] text-white">
            zoom
          </span>

          <span className="h-5 w-px bg-white/20" />

          <button
            onClick={() =>
              setInfoOpen(!infoOpen)
            }
            className="flex items-center gap-1.5 text-sm text-[#f1f3f4] hover:text-white truncate max-w-[320px]"
          >
            <span className="truncate">
              {meeting.title}
            </span>

            <Info className="w-4 h-4 text-[#aeb4bd] shrink-0" />
          </button>

          <span
            className={`hidden sm:inline-flex items-center gap-1.5 text-[11px] ${
              connectionStatus === "connected"
                ? "text-[#8ee6a8]"
                : "text-[#f5c86b]"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                connectionStatus === "connected"
                  ? "bg-[#37d67a]"
                  : "bg-[#e8b64a]"
              }`}
            />

            {connectionStatus === "connected"
              ? "Connected"
              : "Connecting"}
          </span>

        </div>

        {/* RIGHT */}

        <div className="flex items-center gap-1.5">

          <button
            onClick={() =>
              setLayout(
                layout === "gallery"
                  ? "speaker"
                  : "gallery"
              )
            }
            className="h-9 px-3 rounded-lg hover:bg-white/10 text-xs flex items-center gap-2"
          >
            <Grid2X2 className="w-4 h-4" />

            <span className="hidden sm:inline">
              {layout === "gallery"
                ? "Speaker View"
                : "Gallery View"}
            </span>
          </button>

          <button
            onClick={() =>
              setMoreOpen(!moreOpen)
            }
            className="p-2 rounded-lg hover:bg-white/10"
            aria-label="More"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>

        </div>

        {/* ===================================================
            MEETING INFO
        =================================================== */}

        {infoOpen && (
          <div className="absolute top-14 left-4 w-[330px] bg-white text-[#202124] rounded-xl shadow-2xl border border-[#dfe3e8] p-4 z-[60]">

            <div className="flex items-center justify-between mb-3">

              <h3 className="font-semibold text-sm">
                Meeting information
              </h3>

              <button
                onClick={() =>
                  setInfoOpen(false)
                }
                className="p-1 rounded-lg hover:bg-gray-100"
              >
                <X className="w-4 h-4 text-[#6b7280]" />
              </button>

            </div>

            <div className="space-y-3 text-xs">

              <div>
                <p className="text-[#6b7280]">
                  Meeting ID
                </p>

                <p className="font-mono font-medium mt-0.5">
                  {meeting.meeting_id.replace(
                    /(\d{3})(\d{3})(\d{4})/,
                    "$1 $2 $3"
                  )}
                </p>
              </div>

              <div>
                <p className="text-[#6b7280]">
                  Passcode
                </p>

                <p className="font-mono font-medium mt-0.5">
                  {meeting.passcode}
                </p>
              </div>

              <button
                onClick={copyInvite}
                className="w-full h-9 rounded-lg bg-[#0b5cff] text-white font-semibold flex items-center justify-center gap-2"
              >
                {copied ? (
                  "Invite copied"
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy invite link
                  </>
                )}
              </button>

              <p className="flex items-center gap-1.5 text-[#15803d]">
                <ShieldCheck className="w-3.5 h-3.5" />
                Encrypted connection
              </p>

            </div>
          </div>
        )}

        {/* ===================================================
            MORE MENU
        =================================================== */}

        {moreOpen && (
          <div className="absolute top-14 right-4 w-52 bg-white text-[#202124] rounded-xl shadow-2xl border border-[#dfe3e8] p-1.5 z-[70]">

            {/* SETTINGS */}

            <button
              onClick={() => {
                setMoreOpen(false);
                setShowSettings(true);
              }}
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm hover:bg-[#f5f6f8] flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />

              Settings
            </button>

            {/* FULL SCREEN */}

            <button
              onClick={async () => {
                setMoreOpen(false);

                try {
                  if (!document.fullscreenElement) {
                    await document.documentElement.requestFullscreen();
                  } else {
                    await document.exitFullscreen();
                  }
                } catch (err) {
                  console.warn(
                    "Fullscreen unavailable:",
                    err
                  );
                }
              }}
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm hover:bg-[#f5f6f8] flex items-center gap-2"
            >
              <PlayCircle className="w-4 h-4" />

              Full screen
            </button>

          </div>
        )}

      </header>

      {/* =====================================================
          MAIN
      ===================================================== */}

      <div className="flex-1 flex min-h-0">

        <main className="relative flex-1 min-w-0 bg-[#171717] p-3 sm:p-4 overflow-hidden flex items-center justify-center">

          {/* PARTICIPANT COUNT */}

          <div className="absolute top-3 left-4 z-20 text-[11px] text-[#c7c7c7] bg-black/45 rounded-md px-2.5 py-1">
            {total} participant
            {total === 1 ? "" : "s"}
          </div>

          {/* CAMERA ERROR */}

          {cameraError && (
            <div className="absolute top-3 right-4 z-20 bg-[#3b241e] border border-[#754033] text-[#f4c8bf] rounded-md px-3 py-1.5 text-[11px]">
              Camera unavailable — check camera permissions
            </div>
          )}

          {/* REACTIONS */}

          {activeReactions.length > 0 && (
            <div className="absolute bottom-20 left-5 z-30 flex flex-col gap-2 pointer-events-none">

              {activeReactions
                .slice(-4)
                .map((reaction) => (
                  <div
                    key={reaction.id}
                    className="bg-black/70 rounded-full px-3 py-1.5 flex items-center gap-2"
                  >
                    <span className="text-xl">
                      {reaction.emoji}
                    </span>

                    <span className="text-xs">
                      {reaction.sender_name}
                    </span>
                  </div>
                ))}

            </div>
          )}

          {/* =================================================
              SCREEN SHARE
          ================================================= */}

          {isScreenSharing ? (
            <div className="w-full h-full bg-black rounded-lg overflow-hidden relative flex items-center justify-center">

              <video
                ref={screenVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-contain"
              />

              <span className="absolute top-3 left-3 bg-[#2e8b57] rounded px-2.5 py-1 text-xs font-medium">
                You are sharing your screen
              </span>

            </div>
          ) : (

            /* =================================================
               VIDEO GRID
            ================================================= */

            <div
              className={`w-full h-full grid gap-2.5 ${
                layout === "speaker"
                  ? "grid-cols-1"
                  : total === 1
                  ? "grid-cols-1"
                  : total === 2
                  ? "grid-cols-1 md:grid-cols-2"
                  : total <= 4
                  ? "grid-cols-2"
                  : "grid-cols-2 lg:grid-cols-3"
              }`}
            >

              {/* LOCAL */}

              <LocalTile
                displayName={displayName}
                isHost={isHost}
                stream={localStream}
                videoOff={isVideoOff}
                muted={isAudioMuted}
                handRaised={isHandRaised}
              />

              {/* REMOTE */}

              {layout === "gallery" &&
                remotePeers.map((peer) => (
                  <RemoteTile
                    key={peer.peer_id}
                    peer={peer}
                    isHost={isHost}
                    onRemove={() =>
                      hostRemovePeer(
                        peer.peer_id
                      )
                    }
                  />
                ))}

              {/* SPEAKER */}

              {layout === "speaker" &&
                remotePeers.length > 0 && (
                  <RemoteTile
                    peer={remotePeers[0]}
                    isHost={isHost}
                    onRemove={() =>
                      hostRemovePeer(
                        remotePeers[0].peer_id
                      )
                    }
                  />
                )}

            </div>
          )}

        </main>

        {/* ===================================================
            SIDE PANEL
        =================================================== */}

        {sidebar && (
          <aside className="w-[340px] max-w-[42vw] bg-white text-[#202124] border-l border-[#dfe3e8] flex flex-col shrink-0">

            <div className="h-14 px-4 border-b border-[#eef0f3] flex items-center justify-between">

              <h2 className="font-semibold text-sm">
                {sidebar === "participants"
                  ? `Participants (${total})`
                  : "Meeting chat"}
              </h2>

              <button
                onClick={() =>
                  setSidebar(null)
                }
                className="p-1.5 hover:bg-[#f3f4f6] rounded-lg"
              >
                <X className="w-4 h-4 text-[#6b7280]" />
              </button>

            </div>

            {sidebar === "participants" ? (

              <div className="flex-1 overflow-y-auto p-2">

                {isHost && (
                  <div className="px-2 py-2 mb-2">

                    <button
                      onClick={hostMuteAll}
                      className="w-full h-9 rounded-lg border border-[#dfe3e8] text-xs font-semibold hover:bg-[#f5f6f8]"
                    >
                      Mute all
                    </button>

                  </div>
                )}

                <ParticipantRow
                  name={`${displayName} (You)`}
                  muted={isAudioMuted}
                  host={isHost}
                />

                {remotePeers.map((peer) => (
                  <ParticipantRow
                    key={peer.peer_id}
                    name={peer.display_name}
                    muted={peer.is_muted}
                    host={peer.role === "host"}
                    onRemove={
                      isHost
                        ? () =>
                            hostRemovePeer(
                              peer.peer_id
                            )
                        : undefined
                    }
                  />
                ))}

              </div>

            ) : (

              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">

                  {messages.length === 0 && (
                    <div className="h-full flex items-center justify-center text-xs text-[#9ca3af] text-center">
                      Messages sent here are visible to everyone.
                    </div>
                  )}

                  {messages.map(
                    (msg, index) => (
                      <div
                        key={`${msg.id ?? index}-${msg.timestamp ?? ""}`}
                      >
                        <div className="text-[11px] text-[#6b7280] mb-1">
                          {msg.sender_name}
                        </div>

                        <div className="inline-block max-w-[90%] bg-[#f2f3f5] rounded-lg px-3 py-2 text-sm break-words">
                          {msg.message}
                        </div>
                      </div>
                    )
                  )}

                  <div ref={chatBottomRef} />

                </div>

                <form
                  onSubmit={submitChat}
                  className="p-3 border-t border-[#eef0f3] flex gap-2"
                >
                  <input
                    value={chatInput}
                    onChange={(e) =>
                      setChatInput(
                        e.target.value
                      )
                    }
                    placeholder="Type a message..."
                    className="flex-1 h-10 rounded-lg border border-[#dfe3e8] px-3 text-sm outline-none focus:border-[#0b5cff]"
                  />

                  <button
                    type="submit"
                    className="w-10 h-10 rounded-lg bg-[#0b5cff] text-white flex items-center justify-center"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </>

            )}

          </aside>
        )}

      </div>

      {/* =====================================================
          BOTTOM TOOLBAR
      ===================================================== */}

      <footer className="h-[76px] shrink-0 bg-[#202124] border-t border-white/10 px-3 sm:px-5 flex items-center justify-between z-30">

        <div className="w-[190px] hidden lg:flex items-center gap-2 text-[11px] text-[#c4c7cc]">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#35c76f]" />
            Meeting is secure
          </span>
        </div>

        <div className="flex items-center justify-center gap-1 sm:gap-2 flex-1">

          {/* MIC */}

          <ControlButton
            icon={
              isAudioMuted ? (
                <MicOff />
              ) : (
                <Mic />
              )
            }
            label={
              isAudioMuted
                ? "Unmute"
                : "Mute"
            }
            danger={isAudioMuted}
            onClick={toggleAudio}
          />

          {/* VIDEO */}

          <ControlButton
            icon={
              isVideoOff ? (
                <VideoOff />
              ) : (
                <VideoIcon />
              )
            }
            label={
              isVideoOff
                ? "Start Video"
                : "Stop Video"
            }
            danger={isVideoOff}
            onClick={toggleVideo}
          />

          {/* PARTICIPANTS */}

          <ControlButton
            icon={<Users />}
            label="Participants"
            badge={total}
            active={
              sidebar === "participants"
            }
            onClick={() =>
              setSidebar(
                sidebar ===
                  "participants"
                  ? null
                  : "participants"
              )
            }
          />

          {/* CHAT */}

          <ControlButton
            icon={<MessageSquare />}
            label="Chat"
            badge={
              messages.length ||
              undefined
            }
            active={
              sidebar === "chat"
            }
            onClick={() =>
              setSidebar(
                sidebar === "chat"
                  ? null
                  : "chat"
              )
            }
          />

          {/* SHARE */}

          <ControlButton
            icon={<Share2 />}
            label={
              isScreenSharing
                ? "Stop Share"
                : "Share"
            }
            active={isScreenSharing}
            onClick={
              toggleScreenShare
            }
          />

          {/* REACTIONS */}

          <div className="relative hidden sm:block">

            <ControlButton
              icon={<Smile />}
              label="React"
              active={reactionOpen}
              onClick={() =>
                setReactionOpen(
                  !reactionOpen
                )
              }
            />

            {reactionOpen && (
              <div className="absolute bottom-14 left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-xl p-2 flex gap-1 border border-[#dfe3e8]">

                {[
                  "👍",
                  "👏",
                  "❤️",
                  "😂",
                  "😮",
                ].map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      sendReaction(
                        emoji
                      );

                      setReactionOpen(
                        false
                      );
                    }}
                    className="w-9 h-9 rounded-lg hover:bg-[#f3f4f6] text-xl"
                  >
                    {emoji}
                  </button>
                ))}

                <button
                  onClick={() => {
                    toggleHandRaise();

                    setReactionOpen(
                      false
                    );
                  }}
                  className={`w-9 h-9 rounded-lg text-[#202124] hover:bg-[#f3f4f6] ${
                    isHandRaised
                      ? "bg-[#eef5ff]"
                      : ""
                  }`}
                  title="Raise hand"
                >
                  <Hand className="w-4 h-4 mx-auto" />
                </button>

              </div>
            )}

          </div>

          {/* MORE */}

          <div className="relative hidden md:block">

            <ControlButton
              icon={<MoreHorizontal />}
              label="More"
              onClick={() =>
                setMoreOpen(
                  !moreOpen
                )
              }
            />

          </div>

        </div>

        {/* LEAVE */}

        <div className="w-[190px] flex justify-end">

          <button
            onClick={() =>
              setLeaveOpen(true)
            }
            className="h-10 px-4 rounded-lg bg-[#d33f31] hover:bg-[#bb3327] text-white text-sm font-semibold flex items-center gap-2"
          >
            <PhoneOff className="w-4 h-4" />

            {isHost
              ? "End"
              : "Leave"}
          </button>

        </div>

      </footer>

      {/* =====================================================
          LEAVE MODAL
      ===================================================== */}

      {leaveOpen && (
        <div className="fixed inset-0 z-[90] bg-black/60 flex items-center justify-center p-4">

          <div className="w-full max-w-sm bg-white text-[#202124] rounded-xl shadow-2xl p-6">

            <h3 className="text-lg font-semibold">
              {isHost
                ? "End meeting?"
                : "Leave meeting?"}
            </h3>

            <p className="text-sm text-[#6b7280] mt-2">
              {isHost
                ? "Ending the meeting will remove all participants."
                : "You can rejoin later using the meeting link."}
            </p>

            <div className="flex justify-end gap-2 mt-6">

              <button
                onClick={() =>
                  setLeaveOpen(false)
                }
                className="h-10 px-4 rounded-lg text-sm font-medium hover:bg-[#f3f4f6]"
              >
                Cancel
              </button>

              {isHost && (
                <button
                  onClick={() => {
                    hostEndMeeting();
                    onLeaveMeeting();
                  }}
                  className="h-10 px-4 rounded-lg bg-[#d33f31] text-white text-sm font-semibold"
                >
                  End for everyone
                </button>
              )}

              <button
                onClick={
                  onLeaveMeeting
                }
                className="h-10 px-4 rounded-lg bg-[#0b5cff] text-white text-sm font-semibold"
              >
                Leave
              </button>

            </div>

          </div>

        </div>
      )}

      {/* =====================================================
          SETTINGS
      ===================================================== */}

      <SettingsModal
        isOpen={showSettings}
        onClose={() =>
          setShowSettings(false)
        }
      />

    </div>
  );
};


/* ============================================================
   CONTROL BUTTON
============================================================ */

const ControlButton: React.FC<{
  icon: React.ReactElement<{ className?: string }>;
  label: string;
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
  badge?: number;
}> = ({
  icon,
  label,
  onClick,
  active,
  danger,
  badge,
}) => (
  <button
    onClick={onClick}
    className={`relative min-w-[58px] h-[58px] px-2 rounded-lg flex flex-col items-center justify-center gap-1 transition ${
      danger
        ? "text-[#ff6b60] hover:bg-white/10"
        : active
        ? "bg-white/15 text-white"
        : "text-[#e5e7eb] hover:bg-white/10"
    }`}
  >
    <span className="relative">

      {React.cloneElement(
        icon,
        {
          className:
            "w-5 h-5",
        }
      )}

      {badge !== undefined && (
        <span className="absolute -top-2 -right-3 min-w-4 h-4 px-1 rounded-full bg-[#0b5cff] text-white text-[9px] flex items-center justify-center">
          {badge}
        </span>
      )}

    </span>

    <span className="text-[10px] whitespace-nowrap">
      {label}
    </span>
  </button>
);


/* ============================================================
   LOCAL VIDEO
============================================================ */

const LocalTile: React.FC<{
  displayName: string;
  isHost: boolean;
  stream: MediaStream | null;
  videoOff: boolean;
  muted: boolean;
  handRaised: boolean;
}> = ({
  displayName,
  isHost,
  stream,
  videoOff,
  muted,
  handRaised,
}) => {
  const videoRef =
    useRef<HTMLVideoElement | null>(
      null
    );

  /*
   * IMPORTANT FIX:
   *
   * The <video> element is removed when videoOff=true.
   * When videoOff becomes false, a NEW <video> element
   * is created.
   *
   * Therefore the effect MUST depend on videoOff,
   * not just stream.
   */

  useEffect(() => {
    const video =
      videoRef.current;

    if (
      !video ||
      !stream ||
      videoOff
    ) {
      return;
    }

    console.log(
      "Attaching local stream:",
      stream.id
    );

    video.srcObject = stream;

    video.play().catch((err) => {
      console.warn(
        "Local video play failed:",
        err
      );
    });

  }, [
    stream,
    videoOff,
  ]);

  return (
    <div className="relative min-h-0 bg-[#262626] rounded-lg overflow-hidden flex items-center justify-center border border-white/10">

      {!videoOff && stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover -scale-x-100"
        />
      ) : (
        <AvatarTile
          name={displayName}
        />
      )}

      <div className="absolute bottom-2 left-2 bg-black/60 rounded px-2 py-1 text-xs flex items-center gap-1.5">

        <span>
          {displayName}{" "}
          {isHost
            ? "(Host)"
            : "(You)"}
        </span>

        {muted ? (
          <MicOff className="w-3.5 h-3.5 text-[#ff6b60]" />
        ) : (
          <Mic className="w-3.5 h-3.5" />
        )}

      </div>

      {handRaised && (
        <div className="absolute top-2 right-2 bg-[#f4b400] text-black rounded-full px-2 py-1 text-xs font-semibold">
          ✋
        </div>
      )}

    </div>
  );
};


/* ============================================================
   REMOTE VIDEO
============================================================ */

const RemoteTile: React.FC<{
  peer: any;
  isHost: boolean;
  onRemove: () => void;
}> = ({
  peer,
  isHost,
  onRemove,
}) => {
  const videoRef =
    useRef<HTMLVideoElement | null>(
      null
    );

  useEffect(() => {
    const video =
      videoRef.current;

    if (
      !video ||
      !peer.stream
    ) {
      return;
    }

    video.srcObject =
      peer.stream;

    video.play().catch((err) => {
      console.warn(
        "Remote video play failed:",
        err
      );
    });

  }, [
    peer.stream,
  ]);

  const videoOff =
    peer.is_video_off;

  return (
    <div className="relative min-h-0 bg-[#262626] rounded-lg overflow-hidden flex items-center justify-center border border-white/10">

      {!videoOff && peer.stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
      ) : (
        <AvatarTile
          name={
            peer.display_name
          }
        />
      )}

      <div className="absolute bottom-2 left-2 bg-black/60 rounded px-2 py-1 text-xs flex items-center gap-1.5">

        <span>
          {peer.display_name}
          {peer.role === "host"
            ? " (Host)"
            : ""}
        </span>

        {peer.is_muted ? (
          <MicOff className="w-3.5 h-3.5 text-[#ff6b60]" />
        ) : (
          <Mic className="w-3.5 h-3.5" />
        )}

      </div>

      {isHost && (
        <button
          onClick={onRemove}
          className="absolute top-2 right-2 bg-black/60 hover:bg-red-600 rounded-lg px-2 py-1 text-[10px] text-white transition"
        >
          Remove
        </button>
      )}

    </div>
  );
};


/* ============================================================
   AVATAR
============================================================ */

const AvatarTile: React.FC<{
  name: string;
}> = ({
  name,
}) => {
  const initial =
    name?.trim()?.charAt(0)?.toUpperCase() ||
    "?";

  return (
    <div className="w-full h-full flex items-center justify-center bg-[#262626]">

      <div className="w-20 h-20 rounded-full bg-[#0b5cff] flex items-center justify-center text-white text-3xl font-semibold shadow-lg">
        {initial}
      </div>

    </div>
  );
};


/* ============================================================
   PARTICIPANT ROW
============================================================ */

const ParticipantRow: React.FC<{
  name: string;
  muted: boolean;
  host: boolean;
  onRemove?: () => void;
}> = ({
  name,
  muted,
  host,
  onRemove,
}) => {
  return (
    <div className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-[#f5f6f8]">

      <div className="flex items-center gap-2 min-w-0">

        <div className="w-8 h-8 rounded-full bg-[#0b5cff] text-white flex items-center justify-center text-xs font-semibold shrink-0">
          {name
            .charAt(0)
            .toUpperCase()}
        </div>

        <div className="min-w-0">

          <div className="text-xs font-medium truncate">
            {name}
          </div>

          {host && (
            <div className="text-[10px] text-[#6b7280]">
              Host
            </div>
          )}

        </div>

      </div>

      <div className="flex items-center gap-2">

        {muted ? (
          <MicOff className="w-4 h-4 text-[#d33f31]" />
        ) : (
          <Mic className="w-4 h-4 text-[#6b7280]" />
        )}

        {onRemove && (
          <button
            onClick={onRemove}
            className="text-[10px] text-[#d33f31] hover:underline"
          >
            Remove
          </button>
        )}

      </div>

    </div>
  );
};