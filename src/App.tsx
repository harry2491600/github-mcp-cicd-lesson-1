import { useRef, useState } from "react";
import { ChatPanel } from "./components/ChatPanel";
import { CA_DISCLAIMER } from "./prompts/ca-system-prompt";
import { GeminiChatService } from "./services/gemini-chat-service";
import type { ChatService } from "./services/chat-service";
import type { Conversation, Message } from "./types";

const defaultChatService = new GeminiChatService();
const genericErrorMessage = "We couldn't get an answer right now. Please try again.";

function createMessage(role: Message["role"], text: string): Message {
  const identifier = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  return { id: `${role}-${identifier}`, role, text };
}

function emptyConversation(): Conversation {
  return { messages: [], status: "idle" };
}

export type AppProps = {
  chatService?: ChatService;
};

function App({ chatService = defaultChatService }: AppProps) {
  const [conversation, setConversation] = useState<Conversation>(emptyConversation);
  const [pendingMessage, setPendingMessage] = useState<Message>();
  const [inputValue, setInputValue] = useState("");
  const conversationGeneration = useRef(0);

  const submitQuestion = async (rawQuestion: string) => {
    const question = rawQuestion.trim();

    if (!question || conversation.status === "submitting") {
      return;
    }

    const history = conversation.messages.map(({ role, text }) => ({ role, text }));
    const userMessage = createMessage("user", question);
    const generation = conversationGeneration.current;

    setInputValue("");
    setPendingMessage(userMessage);
    setConversation((currentConversation) => ({
      ...currentConversation,
      status: "submitting",
      errorMessage: undefined,
    }));

    try {
      const response = await chatService.sendMessage({ message: question, history });
      const answer = response.text.trim();

      if (!answer) {
        throw new Error("The answer service returned an empty response.");
      }

      if (generation !== conversationGeneration.current) {
        return;
      }

      setConversation((currentConversation) => ({
        messages: [...currentConversation.messages, userMessage, createMessage("assistant", answer)],
        status: "idle",
      }));
      setPendingMessage(undefined);
    } catch {
      if (generation !== conversationGeneration.current) {
        return;
      }

      setConversation((currentConversation) => ({
        ...currentConversation,
        status: "error",
        errorMessage: genericErrorMessage,
      }));
    }
  };

  const handleNewChat = () => {
    conversationGeneration.current += 1;
    setConversation(emptyConversation());
    setPendingMessage(undefined);
    setInputValue("");
  };

  const handleRetry = () => {
    if (pendingMessage) {
      void submitQuestion(pendingMessage.text);
    }
  };

  return (
    <main className="app-shell">
      <section className="app-frame" aria-labelledby="app-title">
        <header className="app-header">
          <div className="brand-mark" aria-hidden="true">CA</div>
          <div>
            <p className="eyebrow">Everyday tax guidance</p>
            <h1 id="app-title">CA Buddy</h1>
          </div>
        </header>
        <ChatPanel
          conversation={conversation}
          pendingMessage={pendingMessage}
          inputValue={inputValue}
          onInputChange={setInputValue}
          onSubmit={submitQuestion}
          onNewChat={handleNewChat}
          onRetry={handleRetry}
        />
        <p className="disclaimer">{CA_DISCLAIMER}</p>
      </section>
    </main>
  );
}

export default App;
