"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Mic,
  MicOff,
  Settings,
  ShieldCheck,
  Video,
  VideoOff,
} from "lucide-react";
import { Meeting } from "@/types/meeting";

interface MeetingLobbyProps {
  meeting: Meeting;
  defaultName: string;
  onJoin: (
    displayName: string,
    audioEnabled: boolean,
    videoEnabled: boolean
  ) => void;
  onCancel: () => void;
  onOpenSettings?: () => void;
}

export const MeetingLobby: React.FC<MeetingLobbyProps> = ({
  meeting,
  defaultName,
  onJoin,
  onCancel,
  onOpenSettings,
}) => {
  const [name, setName] = useState(
    defaultName || "Alex Johnson"
  );

  const [audio, setAudio] = useState(true);
  const [video, setVideo] = useState(true);

  const [stream, setStream] =
    useState<MediaStream | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    let active: MediaStream | null = null;

    navigator.mediaDevices
      ?.getUserMedia({
        video: true,
        audio: true,
      })
      .then((s) => {
        active = s;
        setStream(s);

        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
      })
      .catch(() => undefined);

    return () => {
      active?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const toggleAudio = () => {
    stream?.getAudioTracks().forEach((track) => {
      track.enabled = !audio;
    });

    setAudio((value) => !value);
  };

  const toggleVideo = () => {
    stream?.getVideoTracks().forEach((track) => {
      track.enabled = !video;
    });

    setVideo((value) => !value);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      return;
    }

    stream?.getTracks().forEach((track) => track.stop());

    onJoin(
      name.trim(),
      audio,
      video
    );
  };

  return (
    <div className="min-h-screen bg-[#f7f7f8] text-[#202124] flex flex-col">

      {/* HEADER */}
      <header className="h-16 bg-white border-b border-[#e5e7eb] flex items-center justify-between px-5 sm:px-8">
        <button
          onClick={onCancel}
          className="flex items-center gap-2 text-sm text-[#4b5563] hover:text-[#111827]"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="text-[25px] font-bold tracking-[-1.5px] text-[#0b5cff]">
          zoom
        </div>

        {onOpenSettings ? (
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-lg hover:bg-[#f3f4f6] text-[#4b5563]"
            aria-label="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        ) : (
          <div className="w-9" />
        )}
      </header>

      {/* CONTENT */}
      <main className="flex-1 flex items-center justify-center p-5 sm:p-8">
        <div className="w-full max-w-[980px] grid lg:grid-cols-[1.45fr_.85fr] gap-7 items-center">

          {/* CAMERA PREVIEW */}
          <section>
            <div className="mb-4">
              <p className="text-xs font-semibold text-[#6b7280] uppercase tracking-[.12em]">
                {meeting.meeting_id.replace(
                  /(\d{3})(\d{3})(\d{4})/,
                  "$1 $2 $3"
                )}
              </p>

              <h1 className="mt-2 text-[28px] sm:text-[34px] font-semibold tracking-[-.8px]">
                Ready to join?
              </h1>

              <p className="mt-1 text-sm text-[#6b7280]">
                {meeting.title}
              </p>
            </div>

            <div className="relative aspect-video rounded-xl overflow-hidden bg-[#18191c] shadow-[0_10px_35px_rgba(0,0,0,.18)]">

              {video && (
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover -scale-x-100"
                />
              )}

              {!video && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                  <div className="w-20 h-20 rounded-full bg-[#0b5cff] flex items-center justify-center text-3xl font-semibold">
                    {name.charAt(0).toUpperCase()}
                  </div>

                  <p className="mt-3 text-sm text-[#d1d5db]">
                    Your video is off
                  </p>
                </div>
              )}

              {/* PREVIEW CONTROLS */}
              <div className="absolute left-4 bottom-4 flex gap-2">

                <button
                  onClick={toggleAudio}
                  className={`h-10 px-3 rounded-lg backdrop-blur-md flex items-center gap-2 text-sm ${
                    audio
                      ? "bg-black/60 text-white"
                      : "bg-[#d63b32] text-white"
                  }`}
                >
                  {audio ? (
                    <Mic className="w-4 h-4" />
                  ) : (
                    <MicOff className="w-4 h-4" />
                  )}

                  {audio ? "Mute" : "Unmute"}
                </button>

                <button
                  onClick={toggleVideo}
                  className={`h-10 px-3 rounded-lg backdrop-blur-md flex items-center gap-2 text-sm ${
                    video
                      ? "bg-black/60 text-white"
                      : "bg-[#d63b32] text-white"
                  }`}
                >
                  {video ? (
                    <Video className="w-4 h-4" />
                  ) : (
                    <VideoOff className="w-4 h-4" />
                  )}

                  {video ? "Stop Video" : "Start Video"}
                </button>

              </div>
            </div>
          </section>

          {/* JOIN CARD */}
          <section className="bg-white border border-[#e3e6ea] rounded-xl p-6 sm:p-7 shadow-[0_2px_8px_rgba(0,0,0,.04)]">

            <div className="flex items-start gap-3 mb-6">
              <div className="w-9 h-9 rounded-lg bg-[#eef5ff] text-[#0b5cff] flex items-center justify-center shrink-0">
                <Video className="w-4 h-4" />
              </div>

              <div>
                <h2 className="font-semibold text-lg">
                  Join Meeting
                </h2>

                <p className="text-xs text-[#6b7280] mt-1">
                  Enter your name to join as a participant.
                </p>
              </div>
            </div>

            <form
              onSubmit={submit}
              className="space-y-4"
            >

              {/* NAME */}
              <div>
                <label className="block text-xs font-semibold text-[#374151] mb-1.5">
                  Your Name
                </label>

                <input
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value)
                  }
                  autoFocus
                  className="w-full h-11 rounded-lg border border-[#cfd4dc] px-3.5 text-sm outline-none focus:border-[#0b5cff] focus:ring-2 focus:ring-[#0b5cff]/10"
                  placeholder="Enter your name"
                />
              </div>

              {/* AUDIO */}
              <label className="flex items-center gap-3 rounded-lg border border-[#e5e7eb] p-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={audio}
                  onChange={toggleAudio}
                  className="w-4 h-4 accent-[#0b5cff]"
                />

                <span className="text-sm">
                  Join with audio
                </span>
              </label>

              {/* VIDEO */}
              <label className="flex items-center gap-3 rounded-lg border border-[#e5e7eb] p-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={video}
                  onChange={toggleVideo}
                  className="w-4 h-4 accent-[#0b5cff]"
                />

                <span className="text-sm">
                  Join with video
                </span>
              </label>

              {/* SECURITY */}
              <div className="flex items-center gap-2 text-xs text-[#6b7280] pt-1">
                <ShieldCheck className="w-4 h-4 text-[#16a34a]" />
                Secure meeting connection
              </div>

              {/* JOIN */}
              <button
                type="submit"
                disabled={!name.trim()}
                className="w-full h-11 rounded-lg bg-[#0b5cff] hover:bg-[#064bd1] disabled:opacity-50 text-white text-sm font-semibold transition"
              >
                Join now
              </button>

              {/* CANCEL */}
              <button
                type="button"
                onClick={onCancel}
                className="w-full h-10 rounded-lg text-sm text-[#4b5563] hover:bg-[#f5f6f8]"
              >
                Cancel
              </button>

            </form>
          </section>
        </div>
      </main>
    </div>
  );
};