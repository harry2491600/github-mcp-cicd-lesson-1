import { MessageInput } from "./MessageInput";
import { MessageList } from "./MessageList";
import type { Conversation, Message } from "../types";

export type ChatPanelProps = {
  conversation: Conversation;
  pendingMessage?: Message;
  inputValue: string;
  onInputChange: (value: string) => void;
  onSubmit: (question: string) => void | Promise<void>;
  onNewChat: () => void;
  onRetry: () => void;
};

export function ChatPanel({
  conversation,
  pendingMessage,
  inputValue,
  onInputChange,
  onSubmit,
  onNewChat,
  onRetry,
}: ChatPanelProps) {
  return (
    <section className="chat-panel" aria-label="CA Buddy chat">
      <div className="chat-panel__topline">
        <div>
          <p className="panel-kicker">Ask a first question</p>
          <h2>Clearer next steps for your business</h2>
        </div>
        <button className="new-chat-button" type="button" onClick={onNewChat}>New chat</button>
      </div>
      <MessageList
        messages={conversation.messages}
        pendingMessage={pendingMessage}
        status={conversation.status}
      />
      {conversation.status === "error" && conversation.errorMessage && pendingMessage ? (
        <div className="error-state" role="alert">
          <p>{conversation.errorMessage}</p>
          <button type="button" onClick={onRetry}>Retry</button>
        </div>
      ) : null}
      <MessageInput
        value={inputValue}
        disabled={conversation.status === "submitting"}
        onChange={onInputChange}
        onSubmit={onSubmit}
      />
    </section>
  );
}
