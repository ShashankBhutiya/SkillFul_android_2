import { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AuthModal from "@/components/AuthModal";

const auth = vi.hoisted(() => ({
  user: { isGuest: true },
  signIn: vi.fn(),
  signUp: vi.fn(),
  signInWithGoogle: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => auth }));

function App() {
  const [open, setOpen] = useState(true);
  return (
    <MemoryRouter>
      <main>Main app</main>
      <AuthModal isOpen={open} onClose={() => setOpen(false)} />
    </MemoryRouter>
  );
}

describe("authentication pop-up", () => {
  beforeEach(() => {
    auth.user = { isGuest: true };
    localStorage.clear();
  });

  it("closes when an external session signs the user in", async () => {
    const view = render(<App />);
    expect(screen.getByText("Welcome back")).toBeInTheDocument();

    auth.user = { isGuest: false };
    view.rerender(<App />);

    await waitFor(() => expect(screen.queryByText("Welcome back")).not.toBeInTheDocument());
    expect(screen.getByRole("main")).toHaveTextContent("Main app");
  });

  it("dismisses a pop-up opened for an already signed-in user", async () => {
    auth.user = { isGuest: false };
    render(<App />);
    await waitFor(() => expect(screen.queryByText("Welcome back")).not.toBeInTheDocument());
  });

  it("keeps authentication available while the user is a guest", () => {
    render(<App />);
    expect(screen.getByText("Welcome back")).toBeInTheDocument();
  });
});
