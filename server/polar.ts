import { Polar } from "@polar-sh/sdk";

import { POLAR_ENV } from "../shared/polarEnv.ts";
import { isSelfHosted } from "../shared/selfHosted.ts";

export function createPolarClient(): Polar {
  return new Polar({
    accessToken: POLAR_ENV.organizationToken,
    server: POLAR_ENV.server,
  });
}

export function assertCloudBilling(): void {
  if (isSelfHosted()) {
    throw new Error("Billing is disabled in self-hosted mode.");
  }
}

export { POLAR_ENV };
