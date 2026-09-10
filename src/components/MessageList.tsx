import type { ConversationStatus, Message } from "../types";

export type MessageListProps = {
  messages: Message[];
  pendingMessage?: Message;
  status: ConversationStatus;
};

export function MessageList({ messages, pendingMessage, status }: MessageListProps) {
  const visibleMessages = pendingMessage ? [...messages, pendingMessage] : messages;

  if (visibleMessages.length === 0) {
    return (
      <div className="message-list" aria-live="polite" aria-label="Conversation messages">
        <div className="empty-state">
          <span className="empty-state__icon" aria-hidden="true">?</span>
          <p>Ask about GST, TDS, ITR deadlines, or audit basics.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="message-list" aria-live="polite" aria-label="Conversation messages" aria-busy={status === "submitting"}>
      <ol className="message-list__items">
        {visibleMessages.map((message) => (
          <li
            className={`message-bubble message-bubble--${message.role}`}
            data-message-role={message.role}
            key={message.id}
          >
            <span className="message-bubble__sender">{message.role === "user" ? "You" : "CA Buddy"}</span>
            <p>{message.text}</p>
          </li>
        ))}
      </ol>
      {status === "submitting" ? <p className="status-line" role="status">CA Buddy is preparing a clear answer...</p> : null}
    </div>
  );
}
