import { act, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

const authMock = vi.hoisted(() => ({
  callback: null as null | ((event: string, session: unknown) => unknown),
}));

vi.mock("@/lib/supabase", () => ({
  isSupabaseConfigured: () => true,
  supabase: {
    auth: {
      onAuthStateChange: (callback: typeof authMock.callback) => {
        authMock.callback = callback;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
      signInWithPassword: async () => {
        const user = { id: "signed-in-user", email: "test@example.com" };
        // Supabase waits for subscribers before resolving signInWithPassword.
        await authMock.callback?.("SIGNED_IN", { user });
        return { data: { user }, error: null };
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
});
