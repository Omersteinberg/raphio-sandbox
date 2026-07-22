import { describe, it, expect, vi, beforeEach } from "vitest";

// react-toastify's real `toast` is a callable singleton with methods attached
// (toast(msg), toast.error(msg), ...). Our wrapper must preserve BOTH the call
// signature and the methods, or a bare `toast(msg)` throws "toast is not a
// function" and crashes the app (regression: batch image upload over the cap).
const base = vi.hoisted(() => {
  const b = vi.fn();
  b.success = vi.fn();
  b.info = vi.fn();
  b.error = vi.fn();
  b.warning = vi.fn();
  b.dismiss = vi.fn();
  return b;
});

vi.mock("react-toastify", () => ({ toast: base }));

import { toast } from "./toast";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("toast wrapper", () => {
  it("is callable so a bare toast(message) delegates instead of crashing", () => {
    expect(typeof toast).toBe("function");
    expect(() => toast("Only added 2, limit is 10 per video")).not.toThrow();
    expect(base).toHaveBeenCalledWith("Only added 2, limit is 10 per video");
  });

  it("passes .error through to react-toastify", () => {
    toast.error("Maximum 10 images per video");
    expect(base.error).toHaveBeenCalledWith("Maximum 10 images per video");
  });

  it("suppresses the auto-firing success confirmations", () => {
    toast.success("Script approved!");
    expect(base.success).not.toHaveBeenCalled();
  });

  it("lets other success/info messages through", () => {
    toast.success("Link copied");
    toast.info("Heads up");
    expect(base.success).toHaveBeenCalledWith("Link copied");
    expect(base.info).toHaveBeenCalledWith("Heads up");
  });
});
