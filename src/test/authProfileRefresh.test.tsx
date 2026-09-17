import { act, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

const mocks = vi.hoisted(() => ({
  profile: {
    data: {
      referral_code: "ABC123",
      first_name: "Asha",
      degree: "B.Tech Computer Science",
      academic_year: "3rd year",
      subscription_status: "inactive",
      user_mode: "student",
    } as Record<string, unknown> | null,
    error: null as unknown,
  },
  membership: {
    data: { institution_id: "college-1" } as { institution_id: string } | null,
    error: null as unknown,
  },
  linkedCollege: {
    data: [{
      institution_id: "college-1",
      institution_name: "Test College",
      city: "Pune",
      roll_number: "CS-42",
    }] as Record<string, unknown>[] | null,
    error: null as unknown,
  },
}));

vi.mock("@/lib/supabase", () => ({
  isSupabaseConfigured: () => true,
  supabase: {
    auth: {
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
      getSession: async () => ({
        data: { session: { user: { id: "user-1", email: "student@example.com" } } },
        error: null,
      }),
    },
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          eq: () => ({ maybeSingle: async () => mocks.membership }),
          maybeSingle: async () => table === "profiles" ? mocks.profile : mocks.membership,
        }),
      }),
    }),
    rpc: async (name: string) => {
      if (name === "get_valid_referrals") return { data: 0, error: null };
      if (name === "get_my_linked_college") return mocks.linkedCollege;
      return { data: null, error: null };
    },
  },
}));

describe("profile refresh", () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.profile = {
      data: {
        referral_code: "ABC123",
        first_name: "Asha",
        degree: "B.Tech Computer Science",
        academic_year: "3rd year",
        subscription_status: "inactive",
        user_mode: "student",
      },
      error: null,
    };
    mocks.membership = { data: { institution_id: "college-1" }, error: null };
    mocks.linkedCollege = {
      data: [{
        institution_id: "college-1",
        institution_name: "Test College",
        city: "Pune",
        roll_number: "CS-42",
      }],
      error: null,
    };
  });

  it("keeps confirmed academic and college data when refresh requests fail", async () => {
    let auth: ReturnType<typeof useAuth>;
    function Probe() {
      auth = useAuth();
      return <span>{auth.user.firstName}|{auth.user.degree}|{auth.user.linkedCollege?.name}</span>;
    }

    const screen = render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByText("Asha|B.Tech Computer Science|Test College")).toBeInTheDocument());

    mocks.profile = { data: null, error: { message: "temporary profile failure" } };
    mocks.membership = { data: null, error: { message: "temporary membership failure" } };
    mocks.linkedCollege = { data: null, error: { message: "temporary RPC failure" } };

    await act(async () => {
      await auth!.refreshProfile();
    });

    expect(auth!.user.degree).toBe("B.Tech Computer Science");
    expect(auth!.user.firstName).toBe("Asha");
    expect(auth!.user.academicYear).toBe("3rd year");
    expect(auth!.user.hasLinkedCollege).toBe(true);
    expect(auth!.user.linkedCollege?.name).toBe("Test College");
  });
});
