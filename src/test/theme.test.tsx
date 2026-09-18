import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { ThemeProvider } from "next-themes";
import ThemeToggle from "@/components/ThemeToggle";

describe("Theme support and white/light default", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = "";
  });

  it("defaults to white/light theme when no preference is saved in localStorage", async () => {
    render(
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem={false}
        storageKey="skillful_theme"
      >
        <ThemeToggle variant="icon" />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });

    const toggleBtn = screen.getByRole("button", { name: /switch to dark theme/i });
    expect(toggleBtn).toBeDefined();
  });

  it("toggles to dark theme and back to light when clicked", async () => {
    render(
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem={false}
        storageKey="skillful_theme"
      >
        <ThemeToggle variant="icon" />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });

    const toggleBtn = screen.getByRole("button", { name: /switch to dark theme/i });
    fireEvent.click(toggleBtn);

    await waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(true);
      expect(localStorage.getItem("skillful_theme")).toBe("dark");
    });

    const darkToggleBtn = screen.getByRole("button", { name: /switch to light theme/i });
    fireEvent.click(darkToggleBtn);

    await waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(false);
      expect(localStorage.getItem("skillful_theme")).toBe("light");
    });
  });

  it("renders segmented control with Light marked by default and allows selecting Dark", async () => {
    render(
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem={false}
        storageKey="skillful_theme"
      >
        <ThemeToggle variant="segmented" showLabel />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /light/i })).toBeDefined();
    });

    const lightBtn = screen.getByRole("button", { name: /light/i });
    const darkBtn = screen.getByRole("button", { name: /dark/i });

    expect(lightBtn.getAttribute("aria-pressed")).toBe("true");
    expect(darkBtn.getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(darkBtn);

    await waitFor(() => {
      expect(darkBtn.getAttribute("aria-pressed")).toBe("true");
      expect(lightBtn.getAttribute("aria-pressed")).toBe("false");
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });
  });
});
