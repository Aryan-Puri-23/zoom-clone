"use client";

import React, { useState, useEffect, use, Suspense } from "react";
import { useRouter } from "next/navigation";
import { MeetingLobby } from "@/components/MeetingLobby";
import { MeetingRoom } from "@/components/MeetingRoom";
import { api } from "@/services/api";
import { Meeting, User } from "@/types/meeting";
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react";

function MeetingContent({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const meetingId = resolvedParams.id;

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // States
  const [isInMeeting, setIsInMeeting] = useState(false);
  const [displayName, setDisplayName] = useState("Guest");
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);

  useEffect(() => {
    async function init() {
      try {
        setIsLoading(true);
        const [user, meetingData] = await Promise.all([
          api.getCurrentUser().catch(() => null),
          api.getMeetingDetails(meetingId),
        ]);

        if (user) {
          setCurrentUser(user);
          setDisplayName(user.name);
        } else {
          setDisplayName(`Guest_${Math.floor(Math.random() * 899 + 100)}`);
        }

        setMeeting(meetingData);
      } catch (err: any) {
        setErrorMessage(err.message || "Failed to load meeting details.");
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, [meetingId]);

  const handleJoinFromLobby = (
    finalName: string,
    initialAudio: boolean,
    initialVideo: boolean
  ) => {
    setDisplayName(finalName);
    setAudioEnabled(initialAudio);
    setVideoEnabled(initialVideo);
    setIsInMeeting(true);
  };

  const handleLeaveMeeting = () => {
    router.push("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#181820] text-white flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-9 h-9 animate-spin text-[#0E71EB]" />
        <p className="text-sm font-medium text-gray-300">Connecting to Zoom Meeting {meetingId}...</p>
      </div>
    );
  }

  if (errorMessage || !meeting) {
    return (
      <div className="min-h-screen bg-[#181820] text-white flex flex-col items-center justify-center p-4">
        <div className="bg-[#1e1e26] border border-white/10 rounded-2xl p-8 max-w-md w-full text-center space-y-4 shadow-2xl">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="text-lg font-bold">Unable to Join Meeting</h2>
          <p className="text-xs text-gray-400">{errorMessage || "Meeting does not exist or has expired."}</p>
          <button
            onClick={() => router.push("/")}
            className="w-full py-2.5 px-4 bg-[#0E71EB] hover:bg-[#0c63cf] text-white text-xs font-semibold rounded-xl transition flex items-center justify-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </button>
        </div>
      </div>
    );
  }

  if (isInMeeting) {
    return (
      <MeetingRoom
        meeting={meeting}
        currentUser={currentUser}
        displayName={displayName}
        initialAudio={audioEnabled}
        initialVideo={videoEnabled}
        onLeaveMeeting={handleLeaveMeeting}
      />
    );
  }

  return (
    <MeetingLobby
      meeting={meeting}
      defaultName={displayName}
      onJoin={handleJoinFromLobby}
      onCancel={() => router.push("/")}
    />
  );
}

export default function DirectMeetingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#181820] text-white flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-9 h-9 animate-spin text-[#0E71EB]" />
          <p className="text-sm font-medium text-gray-300">Loading meeting room...</p>
        </div>
      }
    >
      <MeetingContent params={params} />
    </Suspense>
  );
}
