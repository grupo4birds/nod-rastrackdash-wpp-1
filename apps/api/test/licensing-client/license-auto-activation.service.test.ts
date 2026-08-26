import { Logger } from "@nestjs/common";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LicenseAutoActivationService } from "../../src/licensing-client/license-auto-activation.service";
import { LicenseClientService } from "../../src/licensing-client/license-client.service";
import { createFakePrisma } from "./support";

function fakeLicenseClient(options: {
  configured?: boolean;
  inert?: boolean;
  activate?: () => Promise<unknown>;
} = {}) {
  return {
    isConfigured: vi.fn().mockReturnValue(options.configured ?? true),
    isInert: vi.fn().mockResolvedValue(options.inert ?? false),
    activate: options.activate ? vi.fn(options.activate) : vi.fn().mockResolvedValue(undefined),
  } as unknown as LicenseClientService;
}

describe("LicenseAutoActivationService", () => {
  let log: ReturnType<typeof vi.spyOn>;
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    log = vi.spyOn(Logger.prototype, "log").mockImplementation(() => undefined);
    warn = vi.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not contact the license server when LICENSE_KEY or LICENSE_ACCOUNT_IDENTITY is absent", async () => {
    const licenseClient = fakeLicenseClient({ configured: false });
    const service = new LicenseAutoActivationService(licenseClient);

    await service.activateOnBoot();

    expect(licenseClient.isInert).not.toHaveBeenCalled();
    expect(licenseClient.activate).not.toHaveBeenCalled();
  });

  it("activates once before the API is released when licensing is configured", async () => {
    const licenseClient = fakeLicenseClient();
    const service = new LicenseAutoActivationService(licenseClient);

    await service.activateOnBoot();

    expect(licenseClient.isInert).toHaveBeenCalledTimes(1);
    expect(licenseClient.activate).toHaveBeenCalledTimes(1);
  });

  it("keeps boot alive, fails closed, and does not log credentials after activation fails", async () => {
    const key = "student-key-must-not-appear-in-logs";
    const identity = "student@example.com";
    const { prisma } = createFakePrisma();
    const licenseClient = new LicenseClientService(
      prisma,
      {
        LICENSE_SERVER_URL: "https://license.test",
        LICENSE_KEY: key,
        LICENSE_ACCOUNT_IDENTITY: identity,
      },
      (async () => new Response(null, { status: 500 })) as typeof fetch,
    );
    vi.spyOn(licenseClient, "getFingerprint").mockReturnValue("test-fingerprint");
    const service = new LicenseAutoActivationService(licenseClient);

    expect(licenseClient.isConfigured()).toBe(true);
    await expect(licenseClient.isInert()).resolves.toBe(false);
    await expect(service.activateOnBoot()).resolves.toBeUndefined();

    await expect(licenseClient.getLockState()).resolves.toMatchObject({
      inert: false,
      locked: true,
      reason: "activation_failed",
    });
    expect(JSON.stringify([...log.mock.calls, ...warn.mock.calls])).not.toContain(key);
    expect(JSON.stringify([...log.mock.calls, ...warn.mock.calls])).not.toContain(identity);
    expect(warn).toHaveBeenCalledWith("license_activate_error:license_activate_failed:500");
    expect(warn).toHaveBeenCalledWith("license_auto_activation_failed");
  });

  it("deduplicates repeated startup hooks into one activation attempt per process", async () => {
    let releaseActivation: (() => void) | undefined;
    const activation = new Promise<void>((resolve) => {
      releaseActivation = resolve;
    });
    const licenseClient = fakeLicenseClient({ activate: () => activation });
    const service = new LicenseAutoActivationService(licenseClient);

    const first = service.activateOnBoot();
    const second = service.activateOnBoot();
    releaseActivation?.();
    await Promise.all([first, second]);

    expect(licenseClient.activate).toHaveBeenCalledTimes(1);
  });
});
