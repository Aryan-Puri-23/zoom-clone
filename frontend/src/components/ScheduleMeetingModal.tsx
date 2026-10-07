"use client";

import React, { useState, useEffect } from "react";
import { X, Calendar, Clock, Lock, Shield, Loader2, AlertCircle } from "lucide-react";
import { api } from "@/services/api";
import { Meeting } from "@/types/meeting";

interface ScheduleMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMeetingScheduled: (meeting: Meeting) => void;
}

export const ScheduleMeetingModal: React.FC<ScheduleMeetingModalProps> = ({
  isOpen,
  onClose,
  onMeetingScheduled,
}) => {
  const [title, setTitle] = useState("Team Strategy & Sync");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("2026-10-07");
  const [time, setTime] = useState("15:00");
  const [duration, setDuration] = useState(45);
  const [passcode, setPasscode] = useState("zoom123");
  const [waitingRoom, setWaitingRoom] = useState(true);

  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      setDate(now.toISOString().split("T")[0]);
      const nextH = new Date();
      nextH.setHours(nextH.getHours() + 1);
      nextH.setMinutes(0);
      setTime(`${String(nextH.getHours()).padStart(2, "0")}:${String(nextH.getMinutes()).padStart(2, "0")}`);
    }
  }, [isOpen]);
  const [hostVideo, setHostVideo] = useState(true);
  const [participantVideo, setParticipantVideo] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!title.trim()) {
      setErrorMessage("Please enter a meeting topic/title.");
      return;
    }

    setIsLoading(true);
    try {
      const scheduledDateTime = new Date(`${date}T${time}:00`);

      const meeting = await api.createScheduledMeeting({
        title: title.trim(),
        description: description.trim(),
        scheduled_start_time: scheduledDateTime.toISOString(),
        duration_minutes: Number(duration),
      });

      onMeetingScheduled(meeting);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to schedule meeting.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg my-8 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0E71EB] flex items-center justify-center">
              <Calendar className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-base">Schedule Meeting</h3>
              <p className="text-xs text-gray-500">Plan and invite attendees to an upcoming meeting</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Topic */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
              Topic / Meeting Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Q4 Sprint Planning"
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-300 rounded-xl focus:border-[#0E71EB] focus:ring-2 focus:ring-[#0E71EB]/20 transition outline-none"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Meeting agenda, goals, and preparation links..."
              className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-xl focus:border-[#0E71EB] focus:ring-2 focus:ring-[#0E71EB]/20 transition outline-none resize-none"
            />
          </div>

          {/* Date, Time, Duration Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-xl focus:border-[#0E71EB] outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
                Start Time
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-xl focus:border-[#0E71EB] outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
                Duration
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-xl focus:border-[#0E71EB] outline-none"
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>1 hour</option>
                <option value={90}>1.5 hours</option>
                <option value={120}>2 hours</option>
              </select>
            </div>
          </div>

          {/* Security Box */}
          <div className="pt-3 border-t border-gray-100">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-700 flex items-center space-x-1.5 mb-2.5">
              <Shield className="w-3.5 h-3.5 text-[#0E71EB]" />
              <span>Security & Access</span>
            </h4>
            <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-800">Passcode Protection</p>
                  <p className="text-[11px] text-gray-500">Only invited users can join with code</p>
                </div>
                <input
                  type="text"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  className="w-24 px-2 py-1 text-xs text-center font-mono font-semibold bg-white border border-gray-300 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                <div>
                  <p className="text-xs font-medium text-gray-800">Waiting Room</p>
                  <p className="text-[11px] text-gray-500">Admit participants individually</p>
                </div>
                <input
                  type="checkbox"
                  checked={waitingRoom}
                  onChange={(e) => setWaitingRoom(e.target.checked)}
                  className="w-4 h-4 rounded text-[#0E71EB] focus:ring-[#0E71EB] border-gray-300 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Video Options */}
          <div className="pt-2 border-t border-gray-100">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-700 mb-2">
              Default Video State
            </h4>
            <div className="grid grid-cols-2 gap-3 text-xs text-gray-700">
              <label className="flex items-center space-x-2 bg-gray-50 p-2.5 rounded-xl border border-gray-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hostVideo}
                  onChange={(e) => setHostVideo(e.target.checked)}
                  className="w-4 h-4 rounded text-[#0E71EB] border-gray-300"
                />
                <span>Host Video On</span>
              </label>
              <label className="flex items-center space-x-2 bg-gray-50 p-2.5 rounded-xl border border-gray-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={participantVideo}
                  onChange={(e) => setParticipantVideo(e.target.checked)}
                  className="w-4 h-4 rounded text-[#0E71EB] border-gray-300"
                />
                <span>Participant Video On</span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 flex items-center justify-end space-x-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !title.trim()}
              className="px-5 py-2 text-xs font-semibold text-white bg-[#0E71EB] hover:bg-[#0c63cf] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-sm transition flex items-center space-x-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Scheduling...</span>
                </>
              ) : (
                <span>Save & Schedule</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
