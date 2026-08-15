// Fire-and-forget relay to Mission Control's runtime security pipeline. Never awaited
// by the caller and never surfaces an error -- must not affect the sign-in UX.
export function reportSecurityEvent(eventType: "auth.login_failed" | "auth.signup_failed", emailHint: string) {
  void fetch("/api/security-event", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ eventType, emailHint }),
  }).catch(() => {});
}
