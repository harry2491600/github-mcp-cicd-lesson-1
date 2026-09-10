import { expect, test, type Page } from "@playwright/test";

type GeminiPayload = {
  contents?: Array<{
    role?: string;
    parts?: Array<{ text?: string }>;
  }>;
};

type ProviderCapture = {
  requests: GeminiPayload[];
  failNext: () => void;
};

function currentQuestion(payload: GeminiPayload): string {
  const lastContent = payload.contents?.at(-1);
  return lastContent?.parts?.map((part) => part.text ?? "").join("") ?? "";
}

async function interceptGemini(page: Page): Promise<ProviderCapture> {
  const requests: GeminiPayload[] = [];
  let shouldFail = false;

  await page.route("**/generativelanguage.googleapis.com/**", async (route) => {
    const payload = JSON.parse(route.request().postData() ?? "{}") as GeminiPayload;
    requests.push(payload);

    if (shouldFail) {
      shouldFail = false;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ candidates: [] }),
      });
      return;
    }

    const question = currentQuestion(payload).toLowerCase();
    const text = question.includes("unsupported") || question.includes("crypto")
      ? "CA Buddy only covers GST, TDS, ITR deadlines, and audit basics. Please consult a Chartered Accountant for unsupported topics."
      : question.includes("specific") || question.includes("choose for my business")
        ? "I can share general information, but a business-specific filing decision needs a Chartered Accountant."
        : question.includes("fresh")
          ? "This is a fresh conversation with no earlier context."
          : question.includes("when")
            ? "TDS usually applies at payment or credit, depending on the transaction and applicable rules."
            : "TDS is tax deducted at source before certain payments are made.";

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        candidates: [
          {
            content: { parts: [{ text }], role: "model" },
            finishReason: "STOP",
          },
        ],
        usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 12, totalTokenCount: 22 },
      }),
    });
  });

  return {
    requests,
    failNext: () => {
      shouldFail = true;
    },
  };
}

async function ask(page: Page, question: string, answer: string) {
  await page.getByRole("textbox", { name: "Your question" }).fill(question);
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText(answer)).toBeVisible();
}

test.describe("CA Buddy browser flow", () => {
  test("shows the first screen and answers a supported question", async ({ page }) => {
    const provider = await interceptGemini(page);
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "CA Buddy" })).toBeVisible();
    await expect(page.getByRole("region", { name: "CA Buddy chat" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Your question" })).toBeVisible();
    await expect(page.getByRole("button", { name: "New chat" })).toBeVisible();
    await expect(page.getByText("CA Buddy provides general information, not professional tax advice;")).toBeVisible();

    await ask(page, "What is TDS and when does it usually apply?", "TDS usually applies at payment or credit, depending on the transaction and applicable rules.");
    expect(provider.requests).toHaveLength(1);
    expect(currentQuestion(provider.requests[0])).toContain("What is TDS and when does it usually apply?");
  });

  test("preserves follow-up context and clears it with New chat", async ({ page }) => {
    const provider = await interceptGemini(page);
    await page.goto("/");

    await ask(page, "What is TDS?", "TDS is tax deducted at source before certain payments are made.");
    await ask(page, "When does it apply?", "TDS usually applies at payment or credit, depending on the transaction and applicable rules.");
    expect(JSON.stringify(provider.requests[1].contents ?? [])).toContain("What is TDS?");

    await page.getByRole("button", { name: "New chat" }).click();
    await expect(page.getByText("What is TDS?")).toHaveCount(0);
    await expect(page.getByText("TDS is tax deducted at source before certain payments are made.")).toHaveCount(0);

    await ask(page, "Fresh question", "This is a fresh conversation with no earlier context.");
    expect(JSON.stringify(provider.requests[2].contents ?? [])).not.toContain("What is TDS?");
  });

  test("bounds unsupported and individualized questions", async ({ page }) => {
    await interceptGemini(page);
    await page.goto("/");

    await ask(page, "Can you answer an unsupported crypto question?", "CA Buddy only covers GST, TDS, ITR deadlines, and audit basics. Please consult a Chartered Accountant for unsupported topics.");
    await ask(page, "Which filing option should I choose for my business?", "I can share general information, but a business-specific filing decision needs a Chartered Accountant.");
    await expect(page.getByText("CA Buddy provides general information, not professional tax advice;")).toBeVisible();
  });

  test("handles empty input, provider failure, retry, and reload without persistence", async ({ page }) => {
    const provider = await interceptGemini(page);
    await page.goto("/");

    await page.getByRole("button", { name: "Send" }).click();
    expect(provider.requests).toHaveLength(0);

    provider.failNext();
    await page.getByRole("textbox", { name: "Your question" }).fill("What is TDS?");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByRole("alert")).toContainText("We couldn't get an answer right now. Please try again.");
    await expect(page.getByText("What is TDS?")).toBeVisible();
    await page.getByRole("button", { name: "Retry" }).click();
    await expect(page.getByText("TDS is tax deducted at source before certain payments are made.")).toBeVisible();

    await page.reload();
    await expect(page.getByText("What is TDS?")).toHaveCount(0);
    await expect(page.getByText("TDS is tax deducted at source before certain payments are made.")).toHaveCount(0);
  });
});
