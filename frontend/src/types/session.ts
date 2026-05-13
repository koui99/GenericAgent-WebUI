export interface Session {
  id: string;
  title: string;
  active_provider_key: string | null;
  system_prompt_override: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface PersistedMessage {
  id: string;
  session_id: string;
  role: string;
  content: string;
  tool_events: Array<Record<string, unknown>>;
  attachment_ids: string[];
  seq: number;
  created_at: string | null;
}
