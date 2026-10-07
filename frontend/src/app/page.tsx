"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Navbar } from "@/components/Navbar";
import { Dashboard } from "@/components/Dashboard";
import { JoinMeetingModal } from "@/components/JoinMeetingModal";
import { ScheduleMeetingModal } from "@/components/ScheduleMeetingModal";
import { SettingsModal } from "@/components/SettingsModal";
import { MeetingLobby } from "@/components/MeetingLobby";
import { MeetingRoom } from "@/components/MeetingRoom";
import { api } from "@/services/api";
import { Meeting, User } from "@/types/meeting";
import { Loader2 } from "lucide-react";

export default function HomePage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [upcomingMeetings, setUpcomingMeetings] = useState<Meeting[]>([]);
  const [recentMeetings, setRecentMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // App View Mode
  const [currentView, setCurrentView] = useState<"dashboard" | "lobby" | "room">("dashboard");
  const [activeMeeting, setActiveMeeting] = useState<Meeting | null>(null);
  const [displayName, setDisplayName] = useState<string>("Alex Johnson (Host)");
  const [initialAudio, setInitialAudio] = useState<boolean>(true);
  const [initialVideo, setInitialVideo] = useState<boolean>(true);

  // Modals
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [activeNavTab, setActiveNavTab] = useState("home");

  // Load initial data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [user, upcoming, recent] = await Promise.all([
        api.getCurrentUser().catch(() => ({
          id: 1,
          name: "Alex Johnson (Host)",
          email: "alex.johnson@zoomclone.app",
          avatar_url:
            "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80",
          role: "host",
        })),
        api.getUpcomingMeetings().catch(() => []),
        api.getRecentMeetings().catch(() => []),
      ]);

      setCurrentUser(user);
      setDisplayName(user.name);
      setUpcomingMeetings(upcoming);
      setRecentMeetings(recent);
    } catch (err) {
      console.error("Failed to load initial meetings data:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Instant Meeting Creation
  const handleNewInstantMeeting = async () => {
    try {
      setIsLoading(true);
      const meeting = await api.createInstantMeeting(
        `${currentUser?.name || "Alex"}'s Meeting Room`,
        currentUser?.id || 1
      );
      setActiveMeeting(meeting);
      setDisplayName(currentUser?.name || "Alex Johnson (Host)");
      setInitialAudio(true);
      setInitialVideo(true);
      setCurrentView("room");
    } catch (err: any) {
      alert("Failed to create instant meeting: " + (err.message || "Unknown error"));
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Start / Join Meeting from Dashboard
  const handleStartOrJoinMeeting = (meeting: Meeting) => {
    setActiveMeeting(meeting);
    setDisplayName(currentUser?.name || "Alex Johnson");
    setCurrentView("lobby");
  };

  // Handle Join From Modal
  const handleJoinFromModal = async (
    meetingId: string,
    joinDisplayName: string,
    audioEnabled: boolean,
    videoEnabled: boolean
  ) => {
    try {
      setIsLoading(true);
      const meeting = await api.getMeetingDetails(meetingId);
      setActiveMeeting(meeting);
      setDisplayName(joinDisplayName);
      setInitialAudio(audioEnabled);
      setInitialVideo(videoEnabled);
      setCurrentView("room");
    } catch (err: any) {
      alert(err.message || "Could not find meeting");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Scheduled Meeting Success
  const handleMeetingScheduled = (newMeeting: Meeting) => {
    setUpcomingMeetings((prev) => [newMeeting, ...prev]);
  };

  // Handle Joining from Lobby
  const handleLobbyJoin = (
    finalDisplayName: string,
    audioEnabled: boolean,
    videoEnabled: boolean
  ) => {
    setDisplayName(finalDisplayName);
    setInitialAudio(audioEnabled);
    setInitialVideo(videoEnabled);
    setCurrentView("room");
  };

  // Handle Exit / Leave Meeting
  const handleLeaveMeeting = () => {
    setCurrentView("dashboard");
    setActiveMeeting(null);
    loadData();
  };

  // If in active meeting room
  if (currentView === "room" && activeMeeting) {
    return (
      <MeetingRoom
        meeting={activeMeeting}
        currentUser={currentUser}
        displayName={displayName}
        initialAudio={initialAudio}
        initialVideo={initialVideo}
        onLeaveMeeting={handleLeaveMeeting}
      />
    );
  }

  // If in pre-meeting lobby
  if (currentView === "lobby" && activeMeeting) {
    return (
      <MeetingLobby
        meeting={activeMeeting}
        defaultName={displayName}
        onJoin={handleLobbyJoin}
        onCancel={() => {
          setCurrentView("dashboard");
          setActiveMeeting(null);
        }}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
      />
    );
  }

  // Dashboard View
  return (
    <div className="min-h-screen flex flex-col bg-white text-gray-900">
      {/* Top Navbar */}
      <Navbar
        currentUser={currentUser}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        activeTab={activeNavTab}
        setActiveTab={setActiveNavTab}
      />

      {/* Main Dashboard Content */}
      <Dashboard
        currentUser={currentUser}
        upcomingMeetings={upcomingMeetings}
        recentMeetings={recentMeetings}
        isLoading={isLoading}
        onNewMeeting={handleNewInstantMeeting}
        onOpenJoinModal={() => setIsJoinModalOpen(true)}
        onOpenScheduleModal={() => setIsScheduleModalOpen(true)}
        onStartOrJoinMeeting={handleStartOrJoinMeeting}
      />

      {/* Modals */}
      <JoinMeetingModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        defaultName={currentUser?.name || "Alex Johnson"}
        onJoin={handleJoinFromModal}
      />

      <ScheduleMeetingModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        onMeetingScheduled={handleMeetingScheduled}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />
    </div>
  );
}
