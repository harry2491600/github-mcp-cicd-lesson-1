import type { ChatMessage } from "./services/chat-service";

export type Message = ChatMessage & {
  id: string;
};

export type ConversationStatus = "idle" | "submitting" | "error";

export type Conversation = {
  messages: Message[];
  status: ConversationStatus;
  errorMessage?: string;
};
