export type ChatEventType =
  | 'start'
  | 'chunk'
  | 'turn'
  | 'tool_call'
  | 'tool_result'
  | 'error'
  | 'done';

export type MessageStatus = 'pending' | 'streaming' | 'done' | 'error';

export type ToolStatus = 'running' | 'done' | 'error';

export interface UIToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
  turn: number;
  status: ToolStatus;
  preview: string;
  ok: boolean;
}

export type TimelineItem =
  | { kind: 'text'; text: string }
  | { kind: 'tool'; toolId: string }
  | { kind: 'turn'; turn: number };

export interface UIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timeline: TimelineItem[];
  tools: Record<string, UIToolCall>;
  status: MessageStatus;
  errorMessage?: string;
  attachmentIds: string[];
}
