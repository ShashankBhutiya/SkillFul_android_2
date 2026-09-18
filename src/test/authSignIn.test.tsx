import { act, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

const authMock = vi.hoisted(() => ({
  callback: null as null | ((event: string, session: unknown) => unknown),
  getSession: async () => ({ data: { session: null }, error: null }),
}));

vi.mock("@/lib/supabase", () => ({
  isSupabaseConfigured: () => true,
  supabase: {
    auth: {
      onAuthStateChange: (callback: typeof authMock.callback) => {
        authMock.callback = callback;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
      getSession: () => authMock.getSession(),
      signInWithPassword: async () => {
        const user = { id: "signed-in-user", email: "test@example.com" };
        // Supabase waits for subscribers before resolving signInWithPassword.
        await authMock.callback?.("SIGNED_IN", { user });
        return { data: { user }, error: null };
      },
      signUp: async () => {
        const user = { id: "new-user", email: "new@example.com" };
        const session = { user };
        await authMock.callback?.("SIGNED_IN", session);
        return { data: { user, session }, error: null };
      },
    },
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: () => new Promise(() => {}) }) }),
    }),
    rpc: () => new Promise(() => {}),
  },
}));

describe("sign-in session handling", () => {
  beforeEach(() => {
    localStorage.clear();
    authMock.callback = null;
    authMock.getSession = async () => ({ data: { session: null }, error: null });
  });

  it("finishes sign-in and exposes the user while profile requests are pending", async () => {
    let auth: ReturnType<typeof useAuth>;
    function Probe() {
      auth = useAuth();
      return <span>{auth.user.isGuest ? "guest" : auth.user.email}</span>;
    }

    const screen = render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(authMock.callback).toBeTypeOf("function"));

    let result: { error?: string } | undefined;
    await act(async () => {
      result = await auth!.signIn("test@example.com", "password");
    });

    expect(result).toEqual({});
    expect(screen.getByText("test@example.com")).toBeInTheDocument();
    expect(auth!.isLoading).toBe(false);
  });

  it("does not replace a sign-in event with an older empty startup session", async () => {
    let resolveStartup!: (value: { data: { session: null }; error: null }) => void;
    authMock.getSession = () => new Promise((resolve) => { resolveStartup = resolve; });
    let auth: ReturnType<typeof useAuth>;
    function Probe() {
      auth = useAuth();
      return <span>{auth.user.isGuest ? "guest" : auth.user.email}</span>;
    }

    const screen = render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(authMock.callback).toBeTypeOf("function"));
    await act(async () => {
      await auth!.signIn("test@example.com", "password");
    });
    await act(async () => {
      resolveStartup({ data: { session: null }, error: null });
    });

    expect(screen.getByText("test@example.com")).toBeInTheDocument();
  });

  it("finishes sign-up and exposes the user with session immediately", async () => {
    let auth: ReturnType<typeof useAuth>;
    function Probe() {
      auth = useAuth();
      return <span>{auth.user.isGuest ? "guest" : auth.user.email}</span>;
    }

    const screen = render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(authMock.callback).toBeTypeOf("function"));

    let result: { error?: string; session?: any } | undefined;
    await act(async () => {
      result = await auth!.signUp("new@example.com", "password");
    });

    expect(result?.error).toBeUndefined();
    expect(screen.getByText("new@example.com")).toBeInTheDocument();
    expect(auth!.isLoading).toBe(false);
  });
});
