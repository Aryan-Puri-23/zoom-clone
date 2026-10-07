export interface User {
  id: number;
  name: string;
  email: string;
  avatar_url?: string;
  role: string;
  created_at?: string;
}

export interface Participant {
  id: number;
  meeting_id: number;
  user_id?: number;
  display_name: string;
  role: "host" | "co-host" | "participant";
  is_muted: boolean;
  is_video_off: boolean;
  is_hand_raised?: boolean;
  joined_at?: string;
  left_at?: string;
}

export interface Meeting {
  id: number;
  meeting_id: string;
  title: string;
  description?: string;
  host_id: number;
  host_name?: string;
  host_email?: string;
  host_avatar?: string;
  meeting_type: "instant" | "scheduled";
  status: "upcoming" | "active" | "ended";
  scheduled_start_time?: string;
  duration_minutes: number;
  passcode: string;
  invite_link: string;
  created_at?: string;
  started_at?: string;
  ended_at?: string;
  participant_count?: number;
  participants?: Participant[];
}

export interface ChatMessage {
  id?: number;
  sender_id: string;
  sender_name: string;
  recipient: string;
  message: string;
  timestamp?: string;
}

export interface RemotePeer {
  peer_id: string;
  display_name: string;
  role: string;
  is_muted: boolean;
  is_video_off: boolean;
  is_hand_raised?: boolean;
  stream?: MediaStream;
}

export interface ReactionEvent {
  id: string;
  peer_id: string;
  sender_name: string;
  emoji: string;
}
