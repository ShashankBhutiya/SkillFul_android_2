import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import AuthModal from "@/components/AuthModal";
import ProfileSettingsModal from "@/components/ProfileSettingsModal";
import { CALL_CONSENT_TEXT } from "@/config/callConsent";
import { USER_MODE_KEY } from "@/config/userMode";

const auth = vi.hoisted(() => ({
  user: { id: "test", isGuest: false, phone: "+919876543210", callConsent: true, callConsentAvailable: true },
  signUp: vi.fn(), signIn: vi.fn(), signInWithGoogle: vi.fn(),
  updateProfileSettings: vi.fn(), updateUserMode: vi.fn(),
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => auth }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  localStorage.setItem(USER_MODE_KEY, "student");
  auth.signUp.mockResolvedValue({ error: "Test response" });
  auth.updateProfileSettings.mockResolvedValue({ error: "Test response" });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function signupForm() {
  render(<MemoryRouter><AuthModal isOpen onClose={() => {}} /></MemoryRouter>);
  fireEvent.click(screen.getByRole("button", { name: "Sign Up" }));
  fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "test@example.com" } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "test-password" } });
  return screen.getByRole("button", { name: "Create Account" }).closest("form")!;
}

describe("call consent UI", () => {
  it("keeps calls optional and unchecked for email signup", async () => {
    const form = signupForm();
    expect(screen.getByRole("checkbox", { name: new RegExp(CALL_CONSENT_TEXT.split(".")[0]) })).not.toBeChecked();
    fireEvent.submit(form);
    await waitFor(() => expect(auth.signUp).toHaveBeenCalled());
    expect(auth.signUp.mock.calls[0][8]).toBe(false);
  });

  it("requires a country-coded phone before accepting call permission", async () => {
    const form = signupForm();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.submit(form);
    expect(auth.signUp).not.toHaveBeenCalled();
    fireEvent.change(screen.getByPlaceholderText("+91 98765 43210"), { target: { value: "9876543210" } });
    fireEvent.submit(form);
    expect(auth.signUp).not.toHaveBeenCalled();
    fireEvent.change(screen.getByPlaceholderText("+91 98765 43210"), { target: { value: "+91 98765 43210" } });
    fireEvent.submit(form);
    await waitFor(() => expect(auth.signUp).toHaveBeenCalled());
    expect(auth.signUp.mock.calls[0][8]).toBe(true);
    expect(auth.signUp.mock.calls[0][6]).toBe(false); // No WhatsApp consent inferred.
  });

  it("saves withdrawal and requires a fresh opt-in after changing numbers", async () => {
    render(<ProfileSettingsModal isOpen onClose={() => {}} />);
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeChecked();
    fireEvent.change(screen.getByPlaceholderText("+1 (555) 000-0000"), { target: { value: "+919876543211" } });
    expect(checkbox).not.toBeChecked();
    fireEvent.submit(document.querySelector("form")!);
    await waitFor(() => expect(auth.updateProfileSettings).toHaveBeenCalled());
    expect(auth.updateProfileSettings.mock.calls[0][7]).toBe(false);
  });
});
