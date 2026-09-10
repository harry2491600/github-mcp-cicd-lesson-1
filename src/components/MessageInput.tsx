export type MessageInputProps = {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  onSubmit: (question: string) => void | Promise<void>;
};

export function MessageInput({ value, disabled, onChange, onSubmit }: MessageInputProps) {
  return (
    <form
      className="message-input"
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit(value);
      }}
    >
      <label htmlFor="question">Your question</label>
      <div className="message-input__row">
        <input
          id="question"
          name="question"
          type="text"
          placeholder="e.g. When does TDS usually apply?"
          autoComplete="off"
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
        <button type="submit" disabled={disabled}>{disabled ? "Thinking..." : "Send"}</button>
      </div>
    </form>
  );
}
