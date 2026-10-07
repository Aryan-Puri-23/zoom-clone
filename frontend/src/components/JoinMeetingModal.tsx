"use client";

import React, { useState } from "react";
import { X, Video, Mic, Loader2, AlertCircle } from "lucide-react";
import { api } from "@/services/api";

interface JoinMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultName: string;
  onJoin: (meetingId: string, displayName: string, audioEnabled: boolean, videoEnabled: boolean) => void;
}

export const JoinMeetingModal: React.FC<JoinMeetingModalProps> = ({
  isOpen,
  onClose,
  defaultName,
  onJoin,
}) => {
  const [meetingInput, setMeetingInput] = useState("");
  const [displayName, setDisplayName] = useState(defaultName || "Alex Johnson");
  const [turnOffVideo, setTurnOffVideo] = useState(false);
  const [doNotConnectAudio, setDoNotConnectAudio] = useState(false);
  const [rememberName, setRememberName] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const rawInput = meetingInput.trim();
    if (!rawInput) {
      setErrorMessage("Please enter a Meeting ID or Personal Link.");
      return;
    }

    if (!displayName.trim()) {
      setErrorMessage("Please enter your display name.");
      return;
    }

    // Extract meeting ID if user pasted full URL (e.g. /meeting/8349281042 or https://...)
    let cleanId = rawInput;
    if (cleanId.includes("/meeting/")) {
      const parts = cleanId.split("/meeting/");
      cleanId = parts[1].split("?")[0].split("/")[0];
    }
    cleanId = cleanId.replace(/[-\s]/g, "");

    setIsLoading(true);
    try {
      // Validate meeting exists in backend SQLite database
      const meeting = await api.getMeetingDetails(cleanId);
      if (!meeting) {
        setErrorMessage("Meeting not found. Please verify the ID.");
        setIsLoading(false);
        return;
      }

      onJoin(cleanId, displayName.trim(), !doNotConnectAudio, !turnOffVideo);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Invalid Meeting ID or meeting is no longer active.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-[#0E71EB] flex items-center justify-center">
              <Video className="w-4 h-4 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900 text-base">Join Meeting</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
              Meeting ID or Personal Link Name
            </label>
            <input
              type="text"
              value={meetingInput}
              onChange={(e) => setMeetingInput(e.target.value)}
              placeholder="e.g. 834 928 1042 or meeting link"
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-300 rounded-xl focus:border-[#0E71EB] focus:ring-2 focus:ring-[#0E71EB]/20 transition outline-none"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
              Your Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your name"
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-300 rounded-xl focus:border-[#0E71EB] focus:ring-2 focus:ring-[#0E71EB]/20 transition outline-none"
            />
          </div>

          {/* Join Preferences */}
          <div className="pt-2 border-t border-gray-100 space-y-2.5">
            <label className="flex items-center space-x-2.5 text-xs text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberName}
                onChange={(e) => setRememberName(e.target.checked)}
                className="w-4 h-4 rounded text-[#0E71EB] focus:ring-[#0E71EB] border-gray-300"
              />
              <span>Remember my name for future meetings</span>
            </label>

            <label className="flex items-center space-x-2.5 text-xs text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={doNotConnectAudio}
                onChange={(e) => setDoNotConnectAudio(e.target.checked)}
                className="w-4 h-4 rounded text-[#0E71EB] focus:ring-[#0E71EB] border-gray-300"
              />
              <span>Do not connect to audio</span>
            </label>

            <label className="flex items-center space-x-2.5 text-xs text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={turnOffVideo}
                onChange={(e) => setTurnOffVideo(e.target.checked)}
                className="w-4 h-4 rounded text-[#0E71EB] focus:ring-[#0E71EB] border-gray-300"
              />
              <span>Turn off my video</span>
            </label>
          </div>

          {/* Actions */}
          <div className="pt-4 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !meetingInput.trim()}
              className="px-5 py-2 text-xs font-semibold text-white bg-[#0E71EB] hover:bg-[#0c63cf] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-sm transition flex items-center space-x-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Joining...</span>
                </>
              ) : (
                <span>Join Meeting</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
