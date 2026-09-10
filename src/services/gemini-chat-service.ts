import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import type { BaseMessage } from "@langchain/core/messages";
import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { CA_SYSTEM_PROMPT } from "../prompts/ca-system-prompt";
import type { ChatMessage, ChatRequest, ChatResponse, ChatService } from "./chat-service";
import { requireResponseText } from "./chat-service";

export type GeminiModelConfig = {
  apiKey: string;
  model: string;
  maxOutputTokens: number;
};

export type GeminiModel = {
  invoke(messages: BaseMessage[]): Promise<{ content: unknown }>;
};

export type GeminiModelFactory = (config: GeminiModelConfig) => GeminiModel;

const defaultModelFactory: GeminiModelFactory = (config) =>
  new ChatGoogleGenerativeAI(config) as unknown as GeminiModel;

function messageForChat(message: ChatMessage): BaseMessage {
  return message.role === "user"
    ? new HumanMessage(message.text)
    : new AIMessage(message.text);
}

function contentToText(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }

  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .map((part) => {
      if (typeof part === "string") {
        return part;
      }

      if (part && typeof part === "object" && "text" in part && typeof part.text === "string") {
        return part.text;
      }

      return "";
    })
    .join("");
}

export class GeminiChatService implements ChatService {
  private readonly apiKey: string | undefined;
  private readonly modelFactory: GeminiModelFactory;

  constructor(options: { apiKey?: string; modelFactory?: GeminiModelFactory } = {}) {
    this.apiKey = options.apiKey ?? import.meta.env.VITE_GOOGLE_API_KEY;
    this.modelFactory = options.modelFactory ?? defaultModelFactory;
  }

  async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    const apiKey = this.apiKey?.trim();

    if (!apiKey) {
      throw new Error("The answer service is not configured.");
    }

    const model = this.modelFactory({
      apiKey,
      model: "gemma-4-26b-a4b-it",
      maxOutputTokens: 512,
    });
    const messages: BaseMessage[] = [
      new SystemMessage(CA_SYSTEM_PROMPT),
      ...request.history.map(messageForChat),
      new HumanMessage(request.message),
    ];

    try {
      const response = await model.invoke(messages);
      return requireResponseText(contentToText(response.content));
    } catch (error) {
      if (error instanceof Error && error.message === "The answer service returned an empty response.") {
        throw error;
      }

      throw new Error("The answer service is unavailable.");
    }
  }
}
