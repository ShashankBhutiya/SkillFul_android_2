import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  profile: vi.fn(),
  rpc: vi.fn(),
  join: vi.fn(),
  callback: null as null | ((event: string, session: any) => unknown),
}));
vi.mock("@/lib/supabase", () => ({
  isSupabaseConfigured: () => true,
  supabase: {
    auth: {
      getSession: mocks.getSession,
      onAuthStateChange: (callback: typeof mocks.callback) => {
        mocks.callback = callback;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
    },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.profile }) }) }),
    rpc: mocks.rpc,
  },
}));
vi.mock("@/services/institutionService", () => ({ applyPendingJoinCode: mocks.join }));
vi.mock("@/services/callConsentService", () => ({
  getCallConsent: vi.fn().mockResolvedValue(null), saveCallConsent: vi.fn(),
}));
vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => false } }));

const session = { user: { id: "signed-in-user", email: "user@example.com" } };

describe("auth startup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mocks.getSession.mockResolvedValue({ data: { session } });
    mocks.profile.mockReturnValue(new Promise(() => {}));
    mocks.rpc.mockResolvedValue({ data: 0 });
    mocks.join.mockResolvedValue(undefined);
  });
  afterEach(cleanup);

  it("publishes the restored identity without waiting for profile or enrollment", async () => {
    mocks.join.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(useAuth, { wrapper: AuthProvider });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.user.id).toBe(session.user.id);
    expect(result.current.user.isGuest).toBe(false);
  });

  it("handles sign-in during startup synchronously and ignores an older session read", async () => {
    let resolveSession!: (value: any) => void;
    mocks.getSession.mockReturnValue(new Promise(resolve => { resolveSession = resolve; }));
    const { result } = renderHook(useAuth, { wrapper: AuthProvider });
    act(() => {
      expect(mocks.callback!("SIGNED_IN", session)).toBeUndefined();
    });
    expect(result.current.user.isGuest).toBe(false);
    expect(result.current.isLoading).toBe(false);
    await act(async () => { resolveSession({ data: { session: null } }); });
    expect(result.current.user.id).toBe(session.user.id);
  });

  it("does not restore a signed-out user when a slow profile finishes", async () => {
    let resolveProfile!: (value: any) => void;
    mocks.profile.mockReturnValue(new Promise(resolve => { resolveProfile = resolve; }));
    const { result } = renderHook(useAuth, { wrapper: AuthProvider });
    await waitFor(() => expect(mocks.profile).toHaveBeenCalled());
    act(() => { mocks.callback!("SIGNED_OUT", null); });
    await act(async () => { resolveProfile({ data: { first_name: "Old account" } }); });
    expect(result.current.user.isGuest).toBe(true);
  });
});
