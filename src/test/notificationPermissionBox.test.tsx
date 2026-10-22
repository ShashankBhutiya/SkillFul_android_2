import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationPermissionBox } from "@/components/layout/NotificationPermissionBox";

const mocks = vi.hoisted(() => ({
  native: false,
  supported: true,
  enabled: false,
  permission: "prompt",
  request: vi.fn(),
  browserRequest: vi.fn(),
  init: vi.fn(),
  save: vi.fn(),
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "user-1" } }) }));
vi.mock("@/services/notificationService", () => ({
  getNotificationSettings: () => ({ nativePushEnabled: mocks.enabled, browserNotificationsEnabled: mocks.enabled }),
  isBrowserNotificationSupported: () => mocks.supported,
  requestBrowserNotificationPermission: mocks.browserRequest,
  saveNotificationSettings: mocks.save,
}));
vi.mock("@/services/pushNotificationService", () => ({
  isNativePlatform: () => mocks.native,
  checkPushPermission: async () => mocks.permission,
  requestPushPermission: mocks.request,
  initPushNotifications: mocks.init,
}));

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  mocks.native = false;
  mocks.supported = true;
  mocks.enabled = false;
  mocks.permission = "prompt";
  mocks.request.mockResolvedValue(true);
  mocks.browserRequest.mockResolvedValue(true);
  mocks.init.mockResolvedValue(undefined);
});

describe("notification permission box", () => {
  it("requests browser permission only after clicking and hides after enabling", async () => {
    render(<NotificationPermissionBox />);
    const button = await screen.findByRole("button", { name: "Turn on notifications" });
    expect(mocks.browserRequest).not.toHaveBeenCalled();
    fireEvent.click(button);
    await waitFor(() => expect(mocks.save).toHaveBeenCalledWith({ browserNotificationsEnabled: true, remindersEnabled: true }));
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("initializes native notifications after permission is granted", async () => {
    mocks.native = true;
    render(<NotificationPermissionBox />);
    fireEvent.click(await screen.findByRole("button"));
    await waitFor(() => expect(mocks.init).toHaveBeenCalledWith("user-1"));
    expect(mocks.save).toHaveBeenCalledWith({ nativePushEnabled: true, remindersEnabled: true });
  });

  it("keeps the box available with instructions after denial", async () => {
    mocks.browserRequest.mockResolvedValue(false);
    render(<NotificationPermissionBox />);
    fireEvent.click(await screen.findByRole("button"));
    expect(await screen.findByRole("status")).toHaveTextContent("browser's site settings");
    expect(mocks.save).not.toHaveBeenCalled();
    expect(screen.getByRole("button")).toBeEnabled();
  });

  it("hides when already enabled and rechecks revoked permissions on focus", async () => {
    mocks.enabled = true;
    mocks.permission = "granted";
    render(<NotificationPermissionBox />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    mocks.permission = "denied";
    fireEvent.focus(window);
    expect(await screen.findByRole("button")).toBeInTheDocument();
  });

  it("hides on browsers without notification support", () => {
    mocks.supported = false;
    render(<NotificationPermissionBox />);
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
  });
});
