import { Inject, Injectable, Logger } from "@nestjs/common";
import { LicenseClientService } from "./license-client.service";

/**
 * Makes one best-effort activation attempt before the API starts listening.
 *
 * The attempt is deliberately not retried in-process: failures leave the
 * existing fail-closed soft-lock decision in place and the manual activation
 * endpoint remains available as a technical fallback. A new process boot may
 * safely attempt activation again because the remote activation contract is
 * idempotent for the same license/account/fingerprint.
 */
@Injectable()
export class LicenseAutoActivationService {
  private readonly logger = new Logger(LicenseAutoActivationService.name);
  private activationAttempt: Promise<void> | null = null;

  constructor(@Inject(LicenseClientService) private readonly licenseClient: LicenseClientService) {}

  async activateOnBoot(): Promise<void> {
    if (this.activationAttempt) {
      return this.activationAttempt;
    }

    this.activationAttempt = this.runActivationAttempt();
    return this.activationAttempt;
  }

  private async runActivationAttempt(): Promise<void> {
    if (!this.licenseClient.isConfigured()) {
      this.logger.log("license_auto_activation_skipped_not_configured");
      return;
    }

    // Clearing LICENSE_SERVER_URL is the documented opt-out for local
    // development. Preserve that inert behavior even if stale key variables
    // happen to be present in the process environment.
    if (await this.licenseClient.isInert()) {
      this.logger.log("license_auto_activation_skipped_inert");
      return;
    }

    try {
      await this.licenseClient.activate();
      this.logger.log("license_auto_activation_succeeded");
    } catch {
      // Do not include the error, key, identity, payload, or server response
      // in logs. LicenseClientService retains the fail-closed reason and the
      // public manual route remains exempt from the write guard.
      this.logger.warn("license_auto_activation_failed");
    }
  }
}
