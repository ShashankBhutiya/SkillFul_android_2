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
  listAvailableInstitutions: vi.fn(async () => [{ id: "college-1", name: "Test College", city: "Pune" }]),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: mocks.user,
    refreshProfile: mocks.refreshProfile,
    updateProfileSettings: mocks.updateProfileSettings,
    updateUserMode: vi.fn(async () => undefined),
  }),
}));

vi.mock("@/hooks/useUserMode", () => ({
  useUserMode: () => ({ mode: "student" }),
}));

vi.mock("@/services/institutionService", () => ({
  listAvailableInstitutions: mocks.listAvailableInstitutions,
  claimStudentCode: mocks.claimStudentCode,
  clearPendingStudentCodeClaim: mocks.clearPendingStudentCodeClaim,
  formatStudentCodeClaimError: (error: Error) => error.message,
  leaveStudentCollege: vi.fn(),
}));

vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));

describe("Profile Settings college link", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listAvailableInstitutions.mockResolvedValue([{ id: "college-1", name: "Test College", city: "Pune" }]);
  });

  it("links a completed college entry when Save Changes is pressed", async () => {
    render(<ProfileSettingsModal isOpen onClose={vi.fn()} />);

    await screen.findByRole("option", { name: "Test College — Pune" });
    fireEvent.change(screen.getByLabelText("College"), { target: { value: "college-1" } });
    fireEvent.change(screen.getByLabelText("Student code"), { target: { value: "ABCDEF1234567890ABCD" } });
    fireEvent.change(screen.getByLabelText("Roll number"), { target: { value: "22CSE104" } });
    fireEvent.change(screen.getByLabelText("Degree / programme"), { target: { value: "B.Tech CSE" } });
    fireEvent.change(screen.getByLabelText("Current year"), { target: { value: "3rd year" } });

    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => expect(mocks.claimStudentCode).toHaveBeenCalledWith({
      institutionId: "college-1",
      code: "ABCDEF1234567890ABCD",
      rollNumber: "22CSE104",
      degree: "B.Tech CSE",
      academicYear: "3rd year",
    }, "user-1"));
    expect(mocks.clearPendingStudentCodeClaim).toHaveBeenCalled();
    expect(mocks.refreshProfile).toHaveBeenCalled();
  });

  it("shows specific field errors and does not submit incomplete college details", async () => {
    render(<ProfileSettingsModal isOpen onClose={vi.fn()} />);

    await screen.findByRole("option", { name: "Test College — Pune" });
    fireEvent.change(screen.getByLabelText("Student code"), { target: { value: "short-code" } });
    fireEvent.click(screen.getByRole("button", { name: "Link my college" }));

    expect(await screen.findByText("Select your college.")).toBeInTheDocument();
    expect(screen.getByText("Student codes contain 20 letters and numbers.")).toBeInTheDocument();
    expect(screen.getByText("Enter your college roll number.")).toBeInTheDocument();
    expect(screen.getByLabelText("College")).toHaveAttribute("aria-invalid", "true");
    expect(mocks.updateProfileSettings).not.toHaveBeenCalled();
    expect(mocks.claimStudentCode).not.toHaveBeenCalled();
  });

  it("normalizes pasted student codes and roll numbers", async () => {
    render(<ProfileSettingsModal isOpen onClose={vi.fn()} />);

    await screen.findByRole("option", { name: "Test College — Pune" });
    const code = screen.getByLabelText("Student code") as HTMLInputElement;
    const rollNumber = screen.getByLabelText("Roll number") as HTMLInputElement;
    fireEvent.change(code, { target: { value: "abcd-ef12 3456-7890-abcd" } });
    fireEvent.change(rollNumber, { target: { value: "22cse104" } });

    expect(code.value).toBe("ABCDEF1234567890ABCD");
    expect(rollNumber.value).toBe("22CSE104");
  });

  it("lets the user retry when the college list fails to load", async () => {
    mocks.listAvailableInstitutions
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce([{ id: "college-1", name: "Test College", city: "Pune" }]);
    render(<ProfileSettingsModal isOpen onClose={vi.fn()} />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Colleges are unavailable right now");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByRole("option", { name: "Test College — Pune" })).toBeInTheDocument();
  });

  it("displays the error message inside the modal when linking the college fails", async () => {
    mocks.claimStudentCode.mockRejectedValueOnce(new Error("Invalid student code for this college."));
    render(<ProfileSettingsModal isOpen onClose={vi.fn()} />);

    await screen.findByRole("option", { name: "Test College — Pune" });
    fireEvent.change(screen.getByLabelText("College"), { target: { value: "college-1" } });
    fireEvent.change(screen.getByLabelText("Student code"), { target: { value: "ABCDEF1234567890ABCD" } });
    fireEvent.change(screen.getByLabelText("Roll number"), { target: { value: "22CSE104" } });

    fireEvent.click(screen.getByRole("button", { name: "Link my college" }));

    const errorAlert = await screen.findByRole("alert");
    expect(errorAlert).toHaveTextContent("Invalid student code for this college.");
  });

  it("links the college successfully on the first attempt even if profile fields update returns an error", async () => {
    mocks.updateProfileSettings.mockResolvedValueOnce({ error: "Profile write delayed" });
    mocks.claimStudentCode.mockResolvedValueOnce("Test College");

    render(<ProfileSettingsModal isOpen onClose={vi.fn()} />);

    await screen.findByRole("option", { name: "Test College — Pune" });
    fireEvent.change(screen.getByLabelText("College"), { target: { value: "college-1" } });
    fireEvent.change(screen.getByLabelText("Student code"), { target: { value: "ABCDEF1234567890ABCD" } });
    fireEvent.change(screen.getByLabelText("Roll number"), { target: { value: "22CSE104" } });

    fireEvent.click(screen.getByRole("button", { name: "Link my college" }));

    await waitFor(() => expect(mocks.claimStudentCode).toHaveBeenCalledWith({
      institutionId: "college-1",
      code: "ABCDEF1234567890ABCD",
      rollNumber: "22CSE104",
      degree: "",
      academicYear: "",
    }, "user-1"));
    expect(mocks.clearPendingStudentCodeClaim).toHaveBeenCalled();
    expect(mocks.refreshProfile).toHaveBeenCalled();
  });

  it("handles paste events with whitespace and non-alphanumeric characters properly", async () => {
    render(<ProfileSettingsModal isOpen onClose={vi.fn()} />);

    await screen.findByRole("option", { name: "Test College — Pune" });
    const codeInput = screen.getByLabelText("Student code") as HTMLInputElement;
    const rollInput = screen.getByLabelText("Roll number") as HTMLInputElement;

    fireEvent.paste(codeInput, {
      clipboardData: {
        getData: () => "  1234-5678-90ab-cdef-1234  \n",
      },
    });
    fireEvent.paste(rollInput, {
      clipboardData: {
        getData: () => "  roll-22cse104  \n",
      },
    });

    expect(codeInput.value).toBe("1234567890ABCDEF1234");
    expect(rollInput.value).toBe("ROLL-22CSE104");
  });
});

