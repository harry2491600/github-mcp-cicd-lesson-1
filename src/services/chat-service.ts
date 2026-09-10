export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  text: string;
};

export type ChatRequest = {
  message: string;
  history: readonly ChatMessage[];
};

export type ChatResponse = {
  text: string;
};

export interface ChatService {
  sendMessage(request: ChatRequest): Promise<ChatResponse>;
}

export function requireResponseText(text: string): ChatResponse {
  const normalizedText = text.trim();

  if (!normalizedText) {
    throw new Error("The answer service returned an empty response.");
  }

  return { text: normalizedText };
}
