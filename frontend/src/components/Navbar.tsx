"use client";

import React, { useState } from "react";
import {
  Bell,
  ChevronDown,
  Grid2X2,
  HelpCircle,
  Search,
  Settings,
  User as UserIcon,
  X,
} from "lucide-react";
import { User } from "@/types/meeting";

interface NavbarProps {
  currentUser: User | null;
  onOpenSettings: () => void;
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onOpenSettings,
  activeTab = "home",
  setActiveTab,
}) => {
  const [profileOpen, setProfileOpen] = useState(false);
  const [appsOpen, setAppsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const goHome = () => setActiveTab?.("home");

  return (
    <header className="h-16 shrink-0 border-b border-[#e5e7eb] bg-white flex items-center justify-between px-5 lg:px-8 z-40">
      {/* LEFT */}
      <div className="flex items-center gap-8 min-w-0">
        <button
          onClick={goHome}
          className="flex items-center gap-2 shrink-0"
          aria-label="Zoom Home"
        >
          <span className="text-[27px] leading-none font-bold tracking-[-1.8px] text-[#0b5cff]">
            zoom
          </span>
        </button>

        <nav className="hidden md:flex items-center gap-1 h-full">
          <button
            onClick={goHome}
            className={`h-10 px-4 rounded-lg text-[14px] font-medium transition ${
              activeTab === "home"
                ? "text-[#0b5cff] bg-[#eef5ff]"
                : "text-[#4b5563] hover:bg-[#f5f6f8]"
            }`}
          >
            Home
          </button>

          <button
            onClick={() => setActiveTab?.("meetings")}
            className={`h-10 px-4 rounded-lg text-[14px] font-medium transition ${
              activeTab === "meetings"
                ? "text-[#0b5cff] bg-[#eef5ff]"
                : "text-[#4b5563] hover:bg-[#f5f6f8]"
            }`}
          >
            Meetings
          </button>
        </nav>
      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-1.5">
        {/* SEARCH */}
        {searchOpen ? (
          <div className="hidden sm:flex items-center w-64 h-10 border border-[#cfd4dc] rounded-lg bg-white px-3">
            <Search className="w-4 h-4 text-[#6b7280] shrink-0" />

            <input
              autoFocus
              placeholder="Search"
              className="w-full ml-2 text-sm outline-none text-[#111827]"
            />

            <button
              onClick={() => setSearchOpen(false)}
              aria-label="Close search"
            >
              <X className="w-4 h-4 text-[#6b7280]" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setSearchOpen(true)}
            className="p-2.5 rounded-lg text-[#4b5563] hover:bg-[#f5f6f8]"
            aria-label="Search"
          >
            <Search className="w-[19px] h-[19px]" />
          </button>
        )}

        {/* NOTIFICATIONS */}
        <button
          className="p-2.5 rounded-lg text-[#4b5563] hover:bg-[#f5f6f8] relative"
          aria-label="Notifications"
        >
          <Bell className="w-[19px] h-[19px]" />

          <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[#0b5cff]" />
        </button>

        {/* APPS */}
        <div className="relative">
          <button
            onClick={() => setAppsOpen(!appsOpen)}
            className="p-2.5 rounded-lg text-[#4b5563] hover:bg-[#f5f6f8]"
            aria-label="Zoom apps"
          >
            <Grid2X2 className="w-[19px] h-[19px]" />
          </button>

          {appsOpen && (
            <div className="absolute right-0 top-12 w-64 rounded-xl border border-[#e5e7eb] bg-white shadow-xl p-3 z-50">
              <p className="text-xs font-semibold text-[#6b7280] px-2 pb-2">
                Zoom Workplace
              </p>

              <div className="grid grid-cols-2 gap-1">
                {[
                  "Meetings",
                  "Team Chat",
                  "Whiteboards",
                  "Contacts",
                ].map((item) => (
                  <button
                    key={item}
                    className="text-left px-3 py-2.5 rounded-lg text-sm text-[#374151] hover:bg-[#f5f6f8]"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* SETTINGS */}
        <button
          onClick={onOpenSettings}
          className="p-2.5 rounded-lg text-[#4b5563] hover:bg-[#f5f6f8]"
          aria-label="Settings"
        >
          <Settings className="w-[19px] h-[19px]" />
        </button>

        {/* PROFILE */}
        <div className="relative ml-1">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 rounded-full pl-1 pr-2 py-1 hover:bg-[#f5f6f8]"
          >
            <div className="w-9 h-9 rounded-full bg-[#e8f1ff] text-[#0b5cff] flex items-center justify-center overflow-hidden border border-[#d8e6ff]">
              {currentUser?.avatar_url ? (
                <img
                  src={currentUser.avatar_url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <UserIcon className="w-4 h-4" />
              )}
            </div>

            <ChevronDown className="w-4 h-4 text-[#6b7280] hidden sm:block" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-12 w-72 rounded-xl border border-[#e5e7eb] bg-white shadow-xl overflow-hidden z-50">
              <div className="p-4 flex gap-3 border-b border-[#eef0f3]">
                <div className="w-11 h-11 rounded-full bg-[#e8f1ff] text-[#0b5cff] flex items-center justify-center overflow-hidden shrink-0">
                  {currentUser?.avatar_url ? (
                    <img
                      src={currentUser.avatar_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <UserIcon className="w-5 h-5" />
                  )}
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#111827] truncate">
                    {currentUser?.name || "Alex Johnson"}
                  </p>

                  <p className="text-xs text-[#6b7280] truncate mt-0.5">
                    {currentUser?.email || "alex.johnson@zoomclone.app"}
                  </p>

                  <span className="inline-block mt-2 px-2 py-0.5 rounded-full bg-[#eef5ff] text-[#0b5cff] text-[11px] font-medium">
                    Host
                  </span>
                </div>
              </div>

              <div className="p-2">
                <button
                  onClick={() => {
                    setProfileOpen(false);
                    onOpenSettings();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#374151] hover:bg-[#f5f6f8]"
                >
                  <Settings className="w-4 h-4 text-[#6b7280]" />
                  Settings
                </button>

                <button
                  onClick={() => setProfileOpen(false)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#374151] hover:bg-[#f5f6f8]"
                >
                  <HelpCircle className="w-4 h-4 text-[#6b7280]" />
                  Help & Support
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};