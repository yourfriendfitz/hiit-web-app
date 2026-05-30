import { describe, expect, it, vi } from "vitest";

import { DeferredUpdatePolicy } from "../../src/update-policy";

const createPolicy = () => {
  const applyUpdate = vi.fn();
  const reload = vi.fn();
  const policy = new DeferredUpdatePolicy();
  policy.configure({ applyUpdate, reload });

  return { applyUpdate, policy, reload };
};

describe("DeferredUpdatePolicy", () => {
  it("tracks unsaved input until the input is cleared", () => {
    const { policy } = createPolicy();

    policy.setInputDirty("weight-row", true);
    expect(policy.hasUnsavedInput()).toBe(true);

    policy.clearInput("weight-row");
    expect(policy.hasUnsavedInput()).toBe(false);
  });

  it("applies a waiting update immediately when the app is clean", () => {
    const { applyUpdate, policy } = createPolicy();

    policy.markUpdateWaiting();

    expect(applyUpdate).toHaveBeenCalledOnce();
  });

  it("defers update activation until unsaved input is cleared", () => {
    const { applyUpdate, policy } = createPolicy();

    policy.setInputDirty("weight-row", true);
    policy.markUpdateWaiting();
    expect(applyUpdate).not.toHaveBeenCalled();

    policy.clearInput("weight-row");
    expect(applyUpdate).toHaveBeenCalledOnce();
  });

  it("defers a service-worker reload until unsaved input is cleared", () => {
    const { policy, reload } = createPolicy();

    policy.setInputDirty("weight-row", true);
    policy.markReloadWaiting();
    expect(reload).not.toHaveBeenCalled();

    policy.clearInput("weight-row");
    expect(reload).toHaveBeenCalledOnce();
  });
});
