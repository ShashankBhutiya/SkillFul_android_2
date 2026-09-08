import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveCallConsent } from "@/services/callConsentService";

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ supabase: { rpc } }));
beforeEach(() => { rpc.mockReset(); rpc.mockResolvedValue({ error: null }); });

describe("call preference saving", () => {
  it("allows withdrawal even if the phone is missing", async () => {
    await saveCallConsent(false, "");
    expect(rpc).toHaveBeenCalledWith("set_call_consent", expect.objectContaining({ p_enabled: false, p_phone: null }));
  });
  it("rejects malformed opt-in numbers without contacting the server", async () => {
    await expect(saveCallConsent(true, "9876543210")).rejects.toThrow("country code");
    expect(rpc).not.toHaveBeenCalled();
  });
  it("sends normalized numbers without client timestamps", async () => {
    await saveCallConsent(true, "+91 (98765) 43210");
    expect(rpc).toHaveBeenCalledWith("set_call_consent", {
      p_enabled: true, p_phone: "+919876543210", p_version: "2026-09-08-v1",
    });
  });
  it("reports a failed save rather than claiming permission was updated", async () => {
    rpc.mockResolvedValue({ error: { message: "Database unavailable" } });
    await expect(saveCallConsent(false, "")).rejects.toThrow("Could not save");
  });
});
