import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "../../src/App";
import { FakeChatService } from "../../src/services/fake-chat-service";

async function submitQuestion(question: string) {
  const user = userEvent.setup();
  const input = screen.getByRole("textbox", { name: "Your question" });
  await user.type(input, question);
  await user.click(screen.getByRole("button", { name: "Send" }));
  return user;
}

describe("CA Buddy", () => {
  it("renders the required first-screen controls", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "CA Buddy" })).toBeVisible();
    expect(screen.getByRole("region", { name: "CA Buddy chat" })).toBeVisible();
    expect(screen.getByRole("textbox", { name: "Your question" })).toBeVisible();
    expect(screen.getByRole("button", { name: "New chat" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Send" })).toBeVisible();
    expect(
      screen.getByText(
        "CA Buddy provides general information, not professional tax advice; consult a Chartered Accountant for decisions specific to your business.",
      ),
    ).toBeVisible();
  });

  it("renders a supported answer and sends trimmed text with empty initial history", async () => {
    const service = new FakeChatService({ response: "TDS is tax deducted at source." });
    render(<App chatService={service} />);

    await submitQuestion("  What is TDS?  ");

    expect(await screen.findByText("TDS is tax deducted at source.")).toBeVisible();
    expect(screen.getByText("What is TDS?")).toBeVisible();
    expect(service.requests).toEqual([{ message: "What is TDS?", history: [] }]);
  });

  it("sends completed exchanges as follow-up context and clears them on New chat", async () => {
    const service = new FakeChatService({
      responses: [
        "TDS is tax deducted at source.",
        "It usually applies at payment or credit.",
        "A fresh answer.",
      ],
    });
    render(<App chatService={service} />);

    const user = await submitQuestion("What is TDS?");
    await screen.findByText("TDS is tax deducted at source.");
    await user.type(screen.getByRole("textbox", { name: "Your question" }), "When does it apply?");
    await user.click(screen.getByRole("button", { name: "Send" }));
    await screen.findByText("It usually applies at payment or credit.");

    expect(service.requests[1]).toEqual({
      message: "When does it apply?",
      history: [
        { role: "user", text: "What is TDS?" },
        { role: "assistant", text: "TDS is tax deducted at source." },
      ],
    });

    await user.click(screen.getByRole("button", { name: "New chat" }));
    expect(screen.queryByText("What is TDS?")).not.toBeInTheDocument();
    expect(screen.queryByText("It usually applies at payment or credit.")).not.toBeInTheDocument();

    await user.type(screen.getByRole("textbox", { name: "Your question" }), "Fresh question");
    await user.click(screen.getByRole("button", { name: "Send" }));
    await screen.findByText("A fresh answer.");
    expect(service.requests[2]).toEqual({ message: "Fresh question", history: [] });
  });

  it("ignores empty and whitespace-only submissions", async () => {
    const service = new FakeChatService({ response: "Should not appear" });
    render(<App chatService={service} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Send" }));
    await user.type(screen.getByRole("textbox", { name: "Your question" }), "   ");
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(service.requests).toHaveLength(0);
    expect(screen.queryByText("Should not appear")).not.toBeInTheDocument();
  });

  it("keeps the failed question visible and offers a generic retry", async () => {
    const service = new FakeChatService({ error: new Error("provider secret detail") });
    render(<App chatService={service} />);

    const user = await submitQuestion("Will my filing be accepted?");
    const alert = await screen.findByRole("alert");

    expect(alert).toHaveTextContent("We couldn't get an answer right now. Please try again.");
    expect(alert).not.toHaveTextContent("provider secret detail");
    expect(screen.getByText("Will my filing be accepted?")).toBeVisible();
    expect(service.requests).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(service.requests).toHaveLength(2));
    expect(service.requests[1]).toEqual({ message: "Will my filing be accepted?", history: [] });
  });
});
