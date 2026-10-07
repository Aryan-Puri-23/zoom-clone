import { Meeting, User, Participant, ChatMessage } from "@/types/meeting";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  try {
    const res = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      ...options,
    });

    if (!res.ok) {
      let errorMsg = `Request failed: ${res.statusText}`;
      try {
        const errorData = await res.json();
        if (errorData.detail) {
          errorMsg = typeof errorData.detail === "string" ? errorData.detail : JSON.stringify(errorData.detail);
        }
      } catch {
        // use default errorMsg
      }
      throw new Error(errorMsg);
    }

    return await res.json();
  } catch (err: any) {
    console.error(`API Error on [${options?.method || "GET"} ${endpoint}]:`, err);
    throw err;
  }
}

export const api = {
  // Current user (default host)
  getCurrentUser: (): Promise<User> => {
    return request<User>("/api/users/current");
  },

  // Instant meeting
  createInstantMeeting: (title?: string, hostId?: number): Promise<Meeting> => {
    return request<Meeting>("/api/meetings/instant", {
      method: "POST",
      body: JSON.stringify({ title, host_id: hostId }),
    });
  },

  // Schedule meeting
  createScheduledMeeting: (data: {
    title: string;
    scheduled_start_time: string;
    duration_minutes: number;
    description?: string;
    host_id?: number;
  }): Promise<Meeting> => {
    return request<Meeting>("/api/meetings/schedule", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Meeting listings
  getUpcomingMeetings: (): Promise<Meeting[]> => {
    return request<Meeting[]>("/api/meetings/upcoming");
  },

  getRecentMeetings: (): Promise<Meeting[]> => {
    return request<Meeting[]>("/api/meetings/recent");
  },

  // Meeting lookup & validation
  getMeetingDetails: (meetingId: string): Promise<Meeting> => {
    const cleanId = meetingId.replace(/[-\s]/g, "");
    return request<Meeting>(`/api/meetings/${cleanId}`);
  },

  // Join meeting check / registration
  joinMeeting: (meetingId: string, displayName: string): Promise<Participant> => {
    const cleanId = meetingId.replace(/[-\s]/g, "");
    return request<Participant>(`/api/meetings/${cleanId}/join`, {
      method: "POST",
      body: JSON.stringify({ display_name: displayName }),
    });
  },

  // Host Controls
  endMeeting: (meetingId: string): Promise<Meeting> => {
    const cleanId = meetingId.replace(/[-\s]/g, "");
    return request<Meeting>(`/api/meetings/${cleanId}/end`, {
      method: "POST",
    });
  },

  muteAll: (meetingId: string): Promise<{ status: string; muted_count: number }> => {
    const cleanId = meetingId.replace(/[-\s]/g, "");
    return request<{ status: string; muted_count: number }>(`/api/meetings/${cleanId}/mute-all`, {
      method: "POST",
    });
  },

  removeParticipant: (participantId: number): Promise<{ status: string; removed_id: number }> => {
    return request<{ status: string; removed_id: number }>(`/api/meetings/participants/${participantId}`, {
      method: "DELETE",
    });
  },

  // Chat History
  getMeetingChatHistory: (meetingId: string): Promise<ChatMessage[]> => {
    const cleanId = meetingId.replace(/[-\s]/g, "");
    return request<ChatMessage[]>(`/api/meetings/${cleanId}/messages`);
  },

  postChatMessage: (
    meetingId: string,
    data: { sender_id: string; sender_name: string; message: string; recipient?: string }
  ): Promise<ChatMessage> => {
    const cleanId = meetingId.replace(/[-\s]/g, "");
    return request<ChatMessage>(`/api/meetings/${cleanId}/messages`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};
