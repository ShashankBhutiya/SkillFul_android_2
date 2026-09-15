import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MainLayout } from "@/components/layout/MainLayout";

vi.mock("@/components/ProfileBadge", () => ({
  default: function ProfileBadgeMock() {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <>
        <button onClick={() => setIsOpen(true)}>Open profile modal</button>
        {isOpen && <div role="dialog">Profile modal</div>}
      </>
    );
  },
}));

vi.mock("@/components/layout/PwaInstallPrompt", () => ({
  PwaInstallPrompt: () => null,
}));

vi.mock("@/components/mascot/CompanionMascot", () => ({
  CompanionMascot: () => <div data-testid="companion-mascot" />,
}));

vi.mock("@/services/notificationService", () => ({
  getNotificationSettings: () => ({ mascotTipsEnabled: true }),
}));

describe("MainLayout mascot greeting", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    HTMLElement.prototype.scrollTo = vi.fn();
    window.scrollTo = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not close an open header modal when the mascot appears", async () => {
    render(
      <MemoryRouter initialEntries={["/skills"]}>
        <MainLayout><div>Page content</div></MainLayout>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open profile modal" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2500);
    });

    expect(screen.getByTestId("companion-mascot")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
