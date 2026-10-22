import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import FirstTimeTutorial from "@/components/FirstTimeTutorial";
import { rememberTutorial, shouldShowTutorial, TUTORIAL_STORAGE_KEY } from "@/config/tutorial";

const userMode = vi.hoisted(() => ({ mode: "professional", hasChosen: true }));
vi.mock("@/hooks/useUserMode", () => ({ useUserMode: () => userMode }));

beforeEach(() => {
  localStorage.clear();
  userMode.mode = "professional";
});
afterEach(cleanup);

describe("first-time tutorial", () => {
  it("starts on entry screens and avoids interrupting deep links", () => {
    expect(shouldShowTutorial("/streak")).toBe(true);
    expect(shouldShowTutorial("/skills")).toBe(true);
    expect(shouldShowTutorial("/skills/leadership")).toBe(false);
    expect(shouldShowTutorial("/privacy")).toBe(false);
    localStorage.setItem(TUTORIAL_STORAGE_KEY, "true");
    expect(shouldShowTutorial("/streak")).toBe(false);
  });

  it("supports back, sample feedback, and starting practice after all steps", () => {
    const onStart = vi.fn();
    render(<FirstTimeTutorial open onClose={vi.fn()} onStart={onStart} />);
    expect(screen.getByRole("dialog", { name: "Welcome to Skillful" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Previous tutorial step" }));
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "1");
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "← False" }));
    expect(screen.getByRole("status")).toHaveTextContent("This one is True");
    fireEvent.click(screen.getByRole("button", { name: "True →" }));
    expect(screen.getByRole("status")).toHaveTextContent("Correct!");
    expect(onStart).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Start practising" }));
    expect(onStart).toHaveBeenCalledOnce();
  });

  it("explains student practice and allows skipping or closing", () => {
    userMode.mode = "student";
    const onClose = vi.fn();
    render(<FirstTimeTutorial open onClose={onClose} onStart={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText(/enter a topic and choose a level/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Skip tutorial" }));
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("remembers dismissal and still permits manually replaying the tutorial", () => {
    rememberTutorial();
    expect(localStorage.getItem(TUTORIAL_STORAGE_KEY)).toBe("true");
    expect(shouldShowTutorial("/streak")).toBe(false);
    render(<FirstTimeTutorial open onClose={vi.fn()} onStart={vi.fn()} />);
    expect(screen.getByRole("dialog", { name: "Welcome to Skillful" })).toBeInTheDocument();
  });
});
