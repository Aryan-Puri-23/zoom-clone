"use client";

import React, { useEffect, useState } from "react";
import {
  Calendar,
  ChevronRight,
  Clock3,
  Copy,
  ExternalLink,
  MonitorUp,
  Plus,
  Search,
  Video,
  Users,
} from "lucide-react";
import { Meeting, User } from "@/types/meeting";

interface DashboardProps {
  currentUser: User | null;
  upcomingMeetings: Meeting[];
  recentMeetings: Meeting[];
  isLoading: boolean;
  onNewMeeting: () => void;
  onOpenJoinModal: () => void;
  onOpenScheduleModal: () => void;
  onStartOrJoinMeeting: (meeting: Meeting) => void;
}

const actionStyles = [
  {
    label: "New Meeting",
    helper: "Start an instant meeting",
    icon: Video,
    className: "bg-[#f26d3d] hover:bg-[#e55d2d]",
  },
  {
    label: "Join",
    helper: "Join a meeting",
    icon: Plus,
    className: "bg-[#0b5cff] hover:bg-[#064bd1]",
  },
  {
    label: "Schedule",
    helper: "Plan a meeting",
    icon: Calendar,
    className: "bg-[#0b5cff] hover:bg-[#064bd1]",
  },
  {
    label: "Share Screen",
    helper: "Share to a meeting",
    icon: MonitorUp,
    className: "bg-[#0b5cff] hover:bg-[#064bd1]",
  },
];

export const Dashboard: React.FC<DashboardProps> = ({
  currentUser,
  upcomingMeetings,
  recentMeetings,
  isLoading,
  onNewMeeting,
  onOpenJoinModal,
  onOpenScheduleModal,
  onStartOrJoinMeeting,
}) => {
  /*
   * IMPORTANT:
   * Do not initialize this with new Date().
   *
   * Next.js prerenders Client Components on the server.
   * new Date() during prerender can cause a hydration mismatch.
   */
  const [now, setNow] = useState<Date | null>(null);

  const [tab, setTab] = useState<"upcoming" | "recent">("upcoming");
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  /*
   * Set the current time only after the component mounts
   * in the browser.
   */
  useEffect(() => {
    const updateTime = () => {
      setNow(new Date());
    };

    updateTime();

    const timer = window.setInterval(updateTime, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const visibleMeetings = (
    tab === "upcoming" ? upcomingMeetings : recentMeetings
  ).filter((meeting) =>
    `${meeting.title} ${meeting.meeting_id}`
      .toLowerCase()
      .includes(query.toLowerCase())
  );

  const copyLink = async (meeting: Meeting) => {
    try {
      const link = `${window.location.origin}/meeting/${meeting.meeting_id}`;

      await navigator.clipboard?.writeText(link);

      setCopied(meeting.meeting_id);

      window.setTimeout(() => {
        setCopied(null);
      }, 1600);
    } catch (error) {
      console.error("Could not copy meeting link:", error);
    }
  };

  /*
   * During SSR, now is null.
   * Keep these values empty until the browser mounts.
   */
  const time = now
    ? now.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      })
    : "";

  const date = now
    ? now.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      })
    : "";

  const greeting = now
    ? now.getHours() < 12
      ? "morning"
      : now.getHours() < 18
        ? "afternoon"
        : "evening"
    : "morning";

  const next = upcomingMeetings[0];

  return (
    <main className="flex-1 overflow-y-auto bg-[#f7f8fa]">
      <div className="max-w-[1180px] mx-auto px-5 sm:px-8 py-8 lg:py-10">

        {/* HEADER */}
        <section className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <p className="text-sm text-[#6b7280] mb-1">
              {date}
            </p>

            <h1 className="text-[30px] leading-tight font-semibold tracking-[-0.8px] text-[#202124]">
              Good {greeting},{" "}
              {currentUser?.name?.split(" ")[0] || "Alex"}
            </h1>

            <p className="mt-1.5 text-[14px] text-[#6b7280]">
              Start or join a meeting in seconds.
            </p>
          </div>

          <div className="text-right hidden sm:block">
            <div className="text-[24px] font-semibold tracking-[-0.5px] text-[#202124]">
              {time || "--:--"}
            </div>

            <div className="text-xs text-[#6b7280]">
              Local time
            </div>
          </div>
        </section>

        {/* QUICK ACTIONS */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {actionStyles.map((action, index) => {
            const Icon = action.icon;

            const onClick =
              index === 0
                ? onNewMeeting
                : index === 1
                  ? onOpenJoinModal
                  : index === 2
                    ? onOpenScheduleModal
                    : onOpenJoinModal;

            return (
              <button
                key={action.label}
                onClick={onClick}
                type="button"
                className="group text-left bg-white rounded-xl border border-[#e3e6ea] hover:border-[#cdd3db] shadow-[0_1px_2px_rgba(0,0,0,.03)] hover:shadow-[0_4px_14px_rgba(0,0,0,.07)] p-5 transition-all"
              >
                <div
                  className={`w-12 h-12 rounded-lg ${action.className} text-white flex items-center justify-center mb-5 transition-transform group-hover:-translate-y-0.5`}
                >
                  <Icon className="w-6 h-6" />
                </div>

                <p className="font-semibold text-[15px] text-[#202124]">
                  {action.label}
                </p>

                <p className="text-xs text-[#6b7280] mt-1">
                  {action.helper}
                </p>
              </button>
            );
          })}
        </section>

        {/* MEETINGS */}
        <section className="bg-white border border-[#e3e6ea] rounded-xl overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,.03)]">

          {/* TABS */}
          <div className="px-5 sm:px-6 pt-5 border-b border-[#eef0f3]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

              <div className="flex items-center gap-6">
                <button
                  type="button"
                  onClick={() => setTab("upcoming")}
                  className={`pb-3 text-sm font-semibold border-b-2 ${
                    tab === "upcoming"
                      ? "text-[#0b5cff] border-[#0b5cff]"
                      : "text-[#6b7280] border-transparent"
                  }`}
                >
                  Upcoming
                </button>

                <button
                  type="button"
                  onClick={() => setTab("recent")}
                  className={`pb-3 text-sm font-semibold border-b-2 ${
                    tab === "recent"
                      ? "text-[#0b5cff] border-[#0b5cff]"
                      : "text-[#6b7280] border-transparent"
                  }`}
                >
                  Recent
                </button>
              </div>

              <div className="relative w-full sm:w-64 mb-3 sm:mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af]" />

                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search meetings"
                  className="w-full h-9 rounded-lg bg-[#f6f7f9] border border-transparent focus:border-[#cfd7e3] focus:bg-white pl-9 pr-3 text-sm outline-none"
                />
              </div>

            </div>
          </div>

          {/* LOADING */}
          {isLoading ? (
            <div className="py-16 text-center text-sm text-[#6b7280]">
              Loading meetings...
            </div>
          ) : visibleMeetings.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-12 h-12 rounded-full bg-[#eef5ff] text-[#0b5cff] flex items-center justify-center mx-auto mb-3">
                <Calendar className="w-5 h-5" />
              </div>

              <p className="text-sm font-semibold text-[#374151]">
                No {tab} meetings
              </p>

              <p className="text-xs text-[#9ca3af] mt-1">
                {tab === "upcoming"
                  ? "Schedule a meeting or start one now."
                  : "Completed meetings will appear here."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#eef0f3]">
              {visibleMeetings.map((meeting) => {
                /*
                 * Meeting dates are data from the backend, so creating
                 * a Date here is safe. It is not used for initial
                 * server/client rendering of the current time.
                 */
                const when = meeting.scheduled_start_time
                  ? new Date(meeting.scheduled_start_time)
                  : null;

                return (
                  <div
                    key={meeting.meeting_id}
                    className="px-5 sm:px-6 py-4 hover:bg-[#fafbfc] transition group"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">

                      {/* DATE */}
                      <div className="w-14 shrink-0">
                        {when ? (
                          <>
                            <p className="text-[11px] uppercase font-semibold text-[#9ca3af]">
                              {when.toLocaleDateString("en-US", {
                                month: "short",
                              })}
                            </p>

                            <p className="text-[22px] leading-6 font-semibold text-[#202124]">
                              {when.getDate()}
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-[11px] uppercase font-semibold text-[#9ca3af]">
                              Now
                            </p>

                            <p className="text-[22px] leading-6 font-semibold text-[#202124]">
                              —
                            </p>
                          </>
                        )}
                      </div>

                      {/* INFO */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-[14px] text-[#202124] truncate">
                            {meeting.title}
                          </h3>

                          {meeting.status === "active" && (
                            <span className="px-1.5 py-0.5 rounded bg-[#e9f8ef] text-[#15803d] text-[10px] font-semibold">
                              LIVE
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-[#6b7280]">

                          <span className="flex items-center gap-1">
                            <Clock3 className="w-3.5 h-3.5" />

                            {when
                              ? when.toLocaleTimeString("en-US", {
                                  hour: "numeric",
                                  minute: "2-digit",
                                })
                              : "Instant"}
                          </span>

                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />

                            {meeting.participant_count || 1} participant
                            {meeting.participant_count === 1 ? "" : "s"}
                          </span>

                          <span className="font-mono">
                            {meeting.meeting_id.replace(
                              /(\d{3})(\d{3})(\d{4})/,
                              "$1 $2 $3"
                            )}
                          </span>
                        </div>
                      </div>

                      {/* ACTIONS */}
                      <div className="flex items-center gap-2 lg:opacity-90 group-hover:opacity-100">

                        {tab === "upcoming" && (
                          <button
                            type="button"
                            onClick={() =>
                              onStartOrJoinMeeting(meeting)
                            }
                            className="h-9 px-4 rounded-lg bg-[#0b5cff] hover:bg-[#064bd1] text-white text-xs font-semibold flex items-center gap-1.5"
                          >
                            <Video className="w-3.5 h-3.5" />
                            Start
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyLink(meeting);
                          }}
                          className="h-9 w-9 rounded-lg border border-[#dfe3e8] hover:bg-[#f4f6f8] text-[#4b5563] flex items-center justify-center"
                          title="Copy invite link"
                        >
                          {copied === meeting.meeting_id ? (
                            <span className="text-[10px] text-[#0b5cff] font-semibold">
                              OK
                            </span>
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            onStartOrJoinMeeting(meeting)
                          }
                          className="h-9 w-9 rounded-lg border border-[#dfe3e8] hover:bg-[#f4f6f8] text-[#4b5563] flex items-center justify-center"
                          title="Open meeting"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>

                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* NEXT MEETING */}
        {next && (
          <section className="mt-5 flex items-center justify-between rounded-xl bg-[#eef5ff] border border-[#dbe8ff] px-5 py-4">
            <div className="flex items-center gap-3 min-w-0">

              <div className="w-9 h-9 rounded-lg bg-white text-[#0b5cff] flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4" />
              </div>

              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-[#0b5cff] uppercase tracking-wide">
                  Up next
                </p>

                <p className="text-sm font-semibold text-[#202124] truncate">
                  {next.title}
                </p>
              </div>

            </div>

            <button
              type="button"
              onClick={() => onStartOrJoinMeeting(next)}
              className="ml-4 shrink-0 text-sm font-semibold text-[#0b5cff] flex items-center gap-1"
            >
              Join
              <ChevronRight className="w-4 h-4" />
            </button>
          </section>
        )}

      </div>
    </main>
  );
};