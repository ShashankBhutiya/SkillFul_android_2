import { describe, expect, it, vi } from "vitest";
import { withTimeout } from "@/contexts/AuthContext";

describe("withTimeout helper", () => {
  it("resolves promptly when the wrapped promise resolves in time", async () => {
    const fastPromise = Promise.resolve("success");
    const result = await withTimeout(fastPromise, 1000, "Fast op");
    expect(result).toBe("success");
  });

  it("rejects with a timeout error when the promise exceeds the timeout limit", async () => {
    const slowPromise = new Promise((resolve) => setTimeout(() => resolve("slow"), 200));
    await expect(withTimeout(slowPromise, 50, "Network call")).rejects.toThrow(
      "Network call timed out after 0.05s"
    );
  });

  it("propagates original error if the promise rejects before timeout", async () => {
    const failingPromise = Promise.reject(new Error("Invalid credentials"));
    await expect(withTimeout(failingPromise, 1000, "Sign in")).rejects.toThrow(
      "Invalid credentials"
    );
  });

  it("clears internal timer after resolution", async () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");
    const fastPromise = Promise.resolve(42);
    await withTimeout(fastPromise, 500, "Timer op");
    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });
});
