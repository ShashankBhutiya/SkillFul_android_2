import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProfileSettingsModal from "@/components/ProfileSettingsModal";

const mocks = vi.hoisted(() => ({
  user: {
    id: "user-1",
    isGuest: false,
    isPremium: false,
    unlockCount: 0,
    userMode: "student",
  },
  updateProfileSettings: vi.fn(async () => ({})),
  refreshProfile: vi.fn(async () => undefined),
  claimStudentCode: vi.fn(async () => "Test College"),
  clearPendingStudentCodeClaim: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: mocks.user,
    refreshProfile: mocks.refreshProfile,
    updateProfileSettings: mocks.updateProfileSettings,
    updateUserMode: vi.fn(async () => undefined),
    sendPhoneVerificationOTP: vi.fn(),
    confirmPhoneVerificationOTP: vi.fn(),
  }),
}));

vi.mock("@/hooks/useUserMode", () => ({
  useUserMode: () => ({ mode: "student" }),
}));

vi.mock("@/services/institutionService", () => ({
  listAvailableInstitutions: async () => [{ id: "college-1", name: "Test College", city: "Pune" }],
  claimStudentCode: mocks.claimStudentCode,
  clearPendingStudentCodeClaim: mocks.clearPendingStudentCodeClaim,
  formatStudentCodeClaimError: (error: Error) => error.message,
  leaveStudentCollege: vi.fn(),
}));

vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));

describe("Profile Settings college link", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("links a completed college entry when Save Changes is pressed", async () => {
    render(<ProfileSettingsModal isOpen onClose={vi.fn()} />);

    await screen.findByRole("option", { name: "Test College — Pune" });
    fireEvent.change(screen.getByLabelText("College"), { target: { value: "college-1" } });
    fireEvent.change(screen.getByLabelText("Student code"), { target: { value: "CODE123" } });
    fireEvent.change(screen.getByLabelText("Roll number"), { target: { value: "22CSE104" } });
    fireEvent.change(screen.getByLabelText("Degree / programme"), { target: { value: "B.Tech CSE" } });
    fireEvent.change(screen.getByLabelText("Current year"), { target: { value: "3rd year" } });

    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => expect(mocks.claimStudentCode).toHaveBeenCalledWith({
      institutionId: "college-1",
      code: "CODE123",
      rollNumber: "22CSE104",
      degree: "B.Tech CSE",
      academicYear: "3rd year",
    }, "user-1"));
    expect(mocks.clearPendingStudentCodeClaim).toHaveBeenCalled();
    expect(mocks.refreshProfile).toHaveBeenCalled();
  });
});
