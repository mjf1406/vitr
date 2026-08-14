/** True when this deployment was bootstrapped for local Docker / Electron self-host. */
export function isSelfHosted(): boolean {
  return process.env.SELF_HOSTED === "true";
}
