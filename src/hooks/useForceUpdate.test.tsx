import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useForceUpdate } from "@/hooks/useForceUpdate";

const mocks = vi.hoisted(() => ({ from: vi.fn() }));

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    getPlatform: () => "web",
    isNativePlatform: () => false,
  },
}));

vi.mock("@/lib/supabase", () => ({
  supabase: { from: mocks.from },
}));

afterEach(() => {
  cleanup();
  mocks.from.mockClear();
});

describe("useForceUpdate", () => {
  it("does not apply the Android version gate to the website", async () => {
    const { result } = renderHook(() => useForceUpdate());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.needsUpdate).toBe(false);
    expect(mocks.from).not.toHaveBeenCalled();
  });
});
