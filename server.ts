import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import * as dotenv from "dotenv";
import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

// Service-role client for /api/impersonate: needs to bypass RLS to (a)
// verify the caller is really SUPER_ADMIN and (b) mint a session for the
// target user. Never expose SUPABASE_SERVICE_ROLE_KEY to the client bundle.
const supabaseAdmin =
  process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

  app.use(express.json());

  // Welcome Email Endpoint
  app.post("/api/send-welcome-email", async (req, res) => {
    try {
      const { email, displayName, role } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const roleLabel = role || "Lecturer";
      const loginUrl = process.env.APP_URL || "https://ais-dev-qcqizp2hs76lqxeojmxap3-183847904156.europe-west2.run.app";

      const emailSubject = "Welcome to VaultIQ - Academic Governance & Compliance Portal";
      const emailHtml = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <div style="background-color: #4f46e5; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">VaultIQ</h1>
            <p style="color: #e0e7ff; margin: 4px 0 0 0; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Academic Governance & Compliance</p>
          </div>
          <div style="padding: 24px; color: #1e293b; line-height: 1.6;">
            <h2 style="margin-top: 0; font-size: 20px; font-weight: 700; color: #0f172a;">Welcome to the Platform, ${displayName || 'Colleague'}!</h2>
            <p>Your official academic staff account has been successfully provisioned on the VaultIQ Portal.</p>

            <div style="background-color: #f8fafc; border-left: 4px solid #4f46e5; padding: 16px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; font-size: 13px; font-weight: bold; color: #475569; text-transform: uppercase; letter-spacing: 0.5px;">Account Profile Details</p>
              <p style="margin: 8px 0 0 0; font-size: 14px;"><strong>Registered Email:</strong> ${email}</p>
              <p style="margin: 4px 0 0 0; font-size: 14px;"><strong>Assigned Role:</strong> ${roleLabel}</p>
            </div>

            <p><strong>How to sign in:</strong></p>
            <p style="margin-bottom: 24px;">Use the email and password you registered with on the VaultIQ portal.</p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${loginUrl}" style="background-color: #4f46e5; color: #ffffff; padding: 14px 28px; text-decoration: none; font-weight: bold; border-radius: 8px; display: inline-block; font-size: 14px; box-shadow: 0 4px 6px rgba(79, 70, 229, 0.15);">Access VaultIQ Portal</a>
            </div>

            <p style="font-size: 12px; color: #64748b; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 15px;">
              This is an automated system notification. Please do not reply directly to this email. For any issues, please contact your Faculty Admin or Head of Department.
            </p>
          </div>
        </div>
      `;

      const emailText = `
Dear ${displayName || 'Academic Colleague'},

Welcome to VaultIQ! Your official academic staff portal account has been successfully provisioned.

Account Profile Details:
- Registered Email: ${email}
- Assigned Role: ${roleLabel}

How to login:
Please access the portal at: ${loginUrl}
Log in using the email and password you registered with on the VaultIQ portal.

Best regards,
VaultIQ Institutional Administration
      `;

      /*
       * Configure SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS/SMTP_FROM in .env to
       * send real emails via nodemailer. Without them, this endpoint logs the
       * email to the console instead (simulation mode).
       */
      const host = process.env.SMTP_HOST;
      const port = parseInt(process.env.SMTP_PORT || "587");
      const user = process.env.SMTP_USER;
      const pass = process.env.SMTP_PASS;
      const from = process.env.SMTP_FROM || "VaultIQ Alerts <noreply@example.com>";

      if (host && user && pass) {
        const transporter = nodemailer.createTransport({
          host,
          port,
          secure: port === 465,
          auth: { user, pass },
        });

        await transporter.sendMail({
          from,
          to: email,
          subject: emailSubject,
          text: emailText,
          html: emailHtml,
        });

        console.log(`[VaultIQ EMAIL] Welcome email sent successfully to ${email} via SMTP.`);
        return res.json({ success: true, mode: 'smtp', recipient: email });
      } else {
        console.log("\n==================================================");
        console.log("[VaultIQ EMAIL DISPATCHER - LOG-BASED SIMULATION]");
        console.log(`Timestamp: ${new Date().toISOString()}`);
        console.log(`To: ${email}`);
        console.log(`From: ${from}`);
        console.log(`Subject: ${emailSubject}`);
        console.log("--------------------------------------------------");
        console.log(emailText);
        console.log("==================================================\n");

        return res.json({ success: true, mode: 'simulated', recipient: email });
      }
    } catch (error: any) {
      console.error("[VaultIQ EMAIL ERROR]:", error);
      res.status(500).json({ error: error.message || "Failed to dispatch welcome email" });
    }
  });

  // "View as user" (Platform Setup > Users > eye icon): mints a real session
  // for the target user so RLS enforces their actual permissions, not a
  // cosmetic sidebar preview. Every use is logged to impersonation_log.
  app.post("/api/impersonate", async (req, res) => {
    try {
      if (!supabaseAdmin) {
        return res.status(503).json({ error: "SUPABASE_SERVICE_ROLE_KEY is not configured on this server" });
      }

      const authHeader = req.headers.authorization || "";
      const adminToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
      const { targetUserId } = req.body;
      if (!adminToken || !targetUserId) {
        return res.status(400).json({ error: "Missing admin token or targetUserId" });
      }

      const { data: callerAuth, error: callerErr } = await supabaseAdmin.auth.getUser(adminToken);
      if (callerErr || !callerAuth.user) {
        return res.status(401).json({ error: "Invalid or expired session" });
      }

      const { data: callerProfile, error: callerProfileErr } = await supabaseAdmin
        .from("profiles")
        .select("id, user_type(roles(name))")
        .eq("auth_user_id", callerAuth.user.id)
        .single();
      if (callerProfileErr || !callerProfile) {
        return res.status(403).json({ error: "Caller has no profile" });
      }
      const callerRoles: string[] = (callerProfile as any).user_type?.map((ut: any) => ut.roles?.name).filter(Boolean) ?? [];
      if (!callerRoles.includes("SUPER_ADMIN")) {
        return res.status(403).json({ error: "Only Super Admin can view as another user" });
      }

      const { data: targetProfile, error: targetErr } = await supabaseAdmin
        .from("profiles")
        .select("id, email, display_name")
        .eq("id", targetUserId)
        .single();
      if (targetErr || !targetProfile) {
        return res.status(404).json({ error: "Target user not found" });
      }
      if (!targetProfile.email) {
        return res.status(422).json({ error: "Target user has no email on file" });
      }

      const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email: targetProfile.email,
      });
      if (linkErr || !linkData) {
        return res.status(500).json({ error: linkErr?.message || "Failed to mint impersonation session" });
      }

      await supabaseAdmin.from("impersonation_log").insert({
        admin_profile_id: callerProfile.id,
        target_profile_id: targetProfile.id,
        target_email: targetProfile.email,
      });
      console.log(
        `[VaultIQ IMPERSONATE] admin_profile=${callerProfile.id} viewed_as=${targetProfile.id} (${targetProfile.email}) at ${new Date().toISOString()}`
      );

      return res.json({
        email: targetProfile.email,
        hashedToken: linkData.properties.hashed_token,
      });
    } catch (error: any) {
      console.error("[VaultIQ IMPERSONATE ERROR]:", error);
      res.status(500).json({ error: error.message || "Failed to mint impersonation session" });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Server-side relay from this app's browser client to Mission Control's runtime
  // security event pipeline (mc_security_events / POST /api/security/events). The
  // ingestion bearer token never reaches the browser -- this route re-signs the
  // request server-side. Fails soft everywhere: no token configured -> 204 no-op;
  // upstream failure -> swallowed. Must never affect a real user's sign-in.
  app.post("/api/security-event", async (req, res) => {
    try {
      const token = process.env.MISSION_CONTROL_SECURITY_TOKEN;
      if (!token) return res.status(204).end();

      const allowed = new Set(["auth.login_failed", "auth.signup_failed"]);
      const eventType = req.body?.eventType;
      if (!eventType || !allowed.has(eventType)) return res.status(204).end();

      const crypto = await import("node:crypto");
      const sha256Hex = (input: string) => crypto.createHash("sha256").update(input).digest("hex").slice(0, 12);
      const emailHash = req.body?.emailHint ? sha256Hex(String(req.body.emailHint).toLowerCase().trim()) : null;
      const ip = (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() || req.socket.remoteAddress || "";
      const ipHash = ip ? sha256Hex(ip) : null;
      const fingerprint = `${eventType}:${emailHash ?? "unknown"}:${ipHash ?? "unknown"}`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      await fetch("https://missioncontrol.distinct-app.com/api/security/events", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({
          estate: "DISTINCT",
          application_id: "vaultiq",
          environment: "production",
          source: "supabase-auth",
          event_type: eventType,
          category: "Authentication",
          severity: "medium",
          title: eventType === "auth.login_failed" ? "Repeated failed login attempt" : "Repeated failed sign-up attempt",
          description: "Aggregated from client-reported Supabase Auth failures. Not evidence of an attack by itself -- see occurrence_count for volume before escalating.",
          fingerprint,
          actor_ip_hash: ipHash,
          metadata: { email_hash_prefix: emailHash },
        }),
        signal: controller.signal,
      }).catch(() => {}).finally(() => clearTimeout(timeout));
    } catch {
      // swallow -- see header comment
    }
    return res.status(204).end();
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AegisEDU Server running at http://localhost:${PORT}`);
  });
}

startServer();
