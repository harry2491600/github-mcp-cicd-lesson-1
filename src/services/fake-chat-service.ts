import type { ChatRequest, ChatResponse, ChatService } from "./chat-service";
import { requireResponseText } from "./chat-service";

type FakeResponse = string | ((request: ChatRequest, callIndex: number) => string | Promise<string>);
type FakeFailure = Error | ((request: ChatRequest, callIndex: number) => Error);

export type FakeChatServiceOptions = {
  response?: FakeResponse;
  responses?: readonly string[];
  error?: FakeFailure;
};

export class FakeChatService implements ChatService {
  readonly requests: ChatRequest[] = [];

  private readonly response?: FakeResponse;
  private readonly responses: readonly string[];
  private readonly error?: FakeFailure;

  constructor(options: FakeChatServiceOptions = {}) {
    this.response = options.response;
    this.responses = options.responses ?? [];
    this.error = options.error;
  }

  async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    const requestSnapshot: ChatRequest = {
      message: request.message,
      history: request.history.map((message) => ({ ...message })),
    };
    const callIndex = this.requests.length;
    this.requests.push(requestSnapshot);

    if (this.error) {
      throw typeof this.error === "function"
        ? this.error(requestSnapshot, callIndex)
        : this.error;
    }

    const response = this.response
      ? typeof this.response === "function"
        ? await this.response(requestSnapshot, callIndex)
        : this.response
      : this.responses[callIndex] ?? this.responses.at(-1) ?? "";

    return requireResponseText(response);
  }
}
