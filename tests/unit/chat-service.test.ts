import { describe, expect, it, vi } from "vitest";
import type { BaseMessage } from "@langchain/core/messages";
import { FakeChatService } from "../../src/services/fake-chat-service";
import { GeminiChatService } from "../../src/services/gemini-chat-service";

describe("FakeChatService", () => {
  it("records a defensive copy of ordered history and returns trimmed text", async () => {
    const history = [
      { role: "user" as const, text: "What is TDS?" },
      { role: "assistant" as const, text: "TDS is tax deducted at source." },
    ];
    const service = new FakeChatService({ response: "  A concise answer.  " });

    await expect(
      service.sendMessage({ message: "  When does it apply? ", history }),
    ).resolves.toEqual({ text: "A concise answer." });

    history[0].text = "changed after submission";

    expect(service.requests).toEqual([
      {
        message: "  When does it apply? ",
        history: [
          { role: "user", text: "What is TDS?" },
          { role: "assistant", text: "TDS is tax deducted at source." },
        ],
      },
    ]);
  });

  it("supports deterministic responses and failures", async () => {
    const service = new FakeChatService({
      responses: ["first answer", "second answer"],
    });

    await expect(service.sendMessage({ message: "one", history: [] })).resolves.toEqual({
      text: "first answer",
    });
    await expect(service.sendMessage({ message: "two", history: [] })).resolves.toEqual({
      text: "second answer",
    });

    const failingService = new FakeChatService({ error: new Error("provider failed") });
    await expect(failingService.sendMessage({ message: "one", history: [] })).rejects.toThrow(
      "provider failed",
    );
  });

  it("rejects an empty fake response", async () => {
    const service = new FakeChatService({ response: "   " });

    await expect(service.sendMessage({ message: "one", history: [] })).rejects.toThrow(
      "empty response",
    );
  });
});

describe("GeminiChatService", () => {
  it("uses the mandated model configuration and ordered LangChain messages", async () => {
    const invoke = vi.fn<(messages: BaseMessage[]) => Promise<{ content: unknown }>>();
    invoke.mockResolvedValue({
      content: [{ type: "text", text: "  Gemini answer.  " }],
    });
    let configuration: unknown;
    const service = new GeminiChatService({
      apiKey: "restricted-test-key",
      modelFactory: (config) => {
        configuration = config;
        return { invoke };
      },
    });

    await expect(
      service.sendMessage({
        message: "When does TDS apply?",
        history: [{ role: "user", text: "What is TDS?" }],
      }),
    ).resolves.toEqual({ text: "Gemini answer." });

    expect(configuration).toEqual({
      apiKey: "restricted-test-key",
      model: "gemma-4-26b-a4b-it",
      maxOutputTokens: 512,
    });
    expect(invoke).toHaveBeenCalledOnce();
    const invokedMessages = invoke.mock.calls[0][0];
    expect(invokedMessages.map((message) => message.getType())).toEqual([
      "system",
      "human",
      "human",
    ]);
    expect(invokedMessages.map((message) => message.content)).toEqual([
      expect.stringContaining("CA Buddy"),
      "What is TDS?",
      "When does TDS apply?",
    ]);
  });

  it("rejects missing configuration, provider failure, and empty provider text", async () => {
    const missingKeyService = new GeminiChatService({ apiKey: "  " });
    await expect(missingKeyService.sendMessage({ message: "question", history: [] })).rejects.toThrow(
      "not configured",
    );

    const failingService = new GeminiChatService({
      apiKey: "restricted-test-key",
      modelFactory: () => ({
        invoke: vi.fn().mockRejectedValue(new Error("provider detail must stay private")),
      }),
    });
    await expect(failingService.sendMessage({ message: "question", history: [] })).rejects.toThrow(
      "unavailable",
    );

    const emptyService = new GeminiChatService({
      apiKey: "restricted-test-key",
      modelFactory: () => ({ invoke: vi.fn().mockResolvedValue({ content: "  " }) }),
    });
    await expect(emptyService.sendMessage({ message: "question", history: [] })).rejects.toThrow(
      "empty response",
    );
  });
});
