import { describe, expect, it } from "vitest";
import { extractFunctionError } from "@/services/edgeFunctionError";

describe("edge function error messages", () => {
  it("shows the JSON error returned by an edge function", async () => {
    const context = new Response(JSON.stringify({
      error: "Choose one of the college-linked annual plans.",
      reference: "pay-123",
    }), { status: 400, headers: { "Content-Type": "application/json" } });

    await expect(extractFunctionError({ context, message: "Edge Function returned a non-2xx status code" }))
      .resolves.toBe("Choose one of the college-linked annual plans. Reference: pay-123.");
  });

  it("replaces the generic non-2xx message with an actionable fallback", async () => {
    const context = new Response("", { status: 500 });
    await expect(extractFunctionError({ context, message: "Edge Function returned a non-2xx status code" }))
      .resolves.toBe("The payment service could not start checkout. Please try again shortly.");
  });

  it("explains missing and unauthorized functions", async () => {
    await expect(extractFunctionError({ context: new Response("", { status: 404 }) }))
      .resolves.toContain("still being updated");
    await expect(extractFunctionError({ context: new Response("", { status: 401 }) }))
      .resolves.toContain("session expired");
  });
});
