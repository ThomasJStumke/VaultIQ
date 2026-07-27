import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import * as dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // AI Validation Endpoint
  app.post("/api/validate-document", async (req, res) => {
    try {
      const { fileBase64, fileType, moduleContext, evidenceType } = req.body;
      
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "Gemini API Key is missing" });
      }

      const genAI = new GoogleGenAI({ 
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
      
      const prompt = `You are VaultIQ, an expert University Academic Compliance auditor. 
      Analyze the provided document for the module ${moduleContext.code} (${moduleContext.name}).
      Evidence Category: ${evidenceType}
      
      Task:
      1. Identify if the document type matches '${evidenceType}'.
      2. Verify if the Module Code '${moduleContext.code}' is prominently displayed.
      3. For Moderation Reports: Detect if there is a handwritten or digital signature.
      4. Detect if the file is a blank submission, placeholder, or duplicate.
      5. Look for handwritten notes or margin comments (common in moderation).
      6. Assess the professional quality of the academic formatting.
      
      Return a JSON object in this strict format:
      {
        "isCorrectType": boolean,
        "confidence": number (0-100),
        "hasSignature": boolean,
        "extractedCode": string,
        "feedback": string[],
        "handwrittenNotesDetected": boolean,
        "status": "APPROVED" | "PARTIAL" | "REJECTED"
      }`;

      const response = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              { inlineData: { data: fileBase64, mimeType: fileType || "application/pdf" } }
            ]
          }
        ],
        config: { 
          responseMimeType: "application/json"
        }
      });
      
      const text = response.text;
      if (!text) {
        throw new Error("No response text from Gemini");
      }
      res.json(JSON.parse(text));
    } catch (error) {
      console.error("AI Validation Error:", error);
      res.status(500).json({ error: "Failed to validate document with AI" });
    }
  });

  // AI-Powered Custom Compliance Reporting Assistant Endpoint
  app.post("/api/generate-custom-report", async (req, res) => {
    try {
      const { prompt, modules, departments } = req.body;
      
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "Gemini API Key is missing" });
      }

      if (!prompt || !modules) {
        return res.status(400).json({ error: "Missing required parameters: prompt or modules" });
      }

      const genAI = new GoogleGenAI({ 
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const systemInstruction = `You are the VaultIQ Institutional Compliance Scribe. Your purpose is to generate beautiful, tailored, highly accurate compliance report recommendations for South African university HODs, Deans, and Executive Management.
      
      Analyze the user prompt and the provided module curriculum records to output a highly professional reporting schema.
      The extraction date is current time: ${new Date().toLocaleString()}.

      Based on what the user types (e.g. 'MATH modules study guides', 'all non-compliant courses inside management accounting', or 'overall study guide compliance report'), you will:
      1. Formulate a highly formal, executive report title (e.g., 'Special Audit of Study Guide Compliance in Underperforming Modules').
      2. Identify the Scoped Boundary (e.g., 'Department of Auditing & Taxation', 'Faculty of Accounting & Informatics', or 'Institutional Wide Audit').
      3. Compose a 2-3 sentence administrative quality analysis summary describing the status quo. Be formal and helpful.
      4. Filter and select matching files or modules that directly fit the user's query.
      5. Construct a gorgeous, fully standard CSV layout containing the filtered results. You MUST insert a header block into the CSV layout at the top. The top of the CSV MUST look like this:
         "REPORT SUMMARY HEADER"
         "Report Title: [Your chosen Report Title]"
         "Scope Boundary: [Your chosen Scope Boundary]"
         "Extraction Date: ${new Date().toLocaleString()}"
         "============================================================"
         "Module Code,Module Name,Target Requirement,Status,Evaluation Time"
         Followed by actual CSV lines of the filtered results!

      Data Schema for JSON response:
      {
        "reportTitle": "string",
        "scopedBoundary": "string",
        "analysisSummary": "string",
        "filteredModules": [
          { "code": "string", "name": "string", "requirement": "string", "status": "string", "valDate": "string" }
        ],
        "suggestedCsv": "string (the full multiline CSV text)"
      }
      
      Ensure your entire output is valid JSON strictly adhering to the schema. Do not prefix or suffix with markdown comments.`;

      const contentsPrompt = `USER REQUEST: "${prompt}"

      ACTIVE MODULES AND COMPLIANCE DATA REGISTERED IN FIRESTORE:
      ${JSON.stringify(modules.map((m: any) => ({
        code: m.code,
        name: m.name,
        deptId: m.departmentId,
        complianceStatus: m.complianceStatus,
        statuses: m.requirementStatuses || {}
      })), null, 2)}

      DEPARTMENTS MAPPING LIST:
      ${JSON.stringify(departments, null, 2)}

      Please return the conforming JSON object corresponding to the request.`;

      const response = await genAI.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          {
            role: "user",
            parts: [{ text: systemInstruction + "\n\n" + contentsPrompt }]
          }
        ],
        config: { 
          responseMimeType: "application/json"
        }
      });
      
      const text = response.text;
      if (!text) {
        throw new Error("No response text from Gemini Scribe");
      }
      res.json(JSON.parse(text));
    } catch (error: any) {
      console.error("AI Scribe Reporting Error:", error);
      res.status(500).json({ error: error.message || "Failed to generate report with AI" });
    }
  });

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
              <p style="margin: 8px 0 0 0; font-size: 14px;"><strong>Registered DUT Email:</strong> ${email}</p>
              <p style="margin: 4px 0 0 0; font-size: 14px;"><strong>Assigned Role:</strong> ${roleLabel}</p>
            </div>

            <p><strong>How to sign in:</strong></p>
            <p style="margin-bottom: 24px;">Please use your standard DUT email address and your normal Microsoft password (the same credentials you use for your DUT Microsoft/Office 365 account). Since we utilize secure Microsoft sign-in integration, no separate portal password or registration is needed.</p>

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
- Registered DUT Email: ${email}
- Assigned Role: ${roleLabel}

How to login:
Please access the portal at: ${loginUrl}
Log in using your official DUT email address and your normal Microsoft password (the same one you use for your DUT Microsoft/Office 365 account). No separate password or registration is needed.

Best regards,
VaultIQ Institutional Administration
      `;

      /*
       * -----------------------------------------------------------------------------------------
       * DEVELOPER NOTE / CONFIGURATION FOR DUT IT:
       * Once the system is ready to go live and you receive SMTP mail server details from DUT IT,
       * you simply need to configure the following environment variables in your deployment env (or .env file):
       *
       *   SMTP_HOST="smtp.office365.com" (or your local DUT exchange SMTP server)
       *   SMTP_PORT="587" (usually 587 for TLS, or 465 for SSL)
       *   SMTP_USER="noreply@dut.ac.za" (the authenticated system email address)
       *   SMTP_PASS="your-authenticated-service-password"
       *   SMTP_FROM="VaultIQ Alerts <noreply@dut.ac.za>"
       *
       * The system is fully pre-wired to use nodemailer. If these environment variables are detected, 
       * it automatically disables log-based simulation and sends real emails via secure SMTP.
       * -----------------------------------------------------------------------------------------
       */
      const host = process.env.SMTP_HOST;
      const port = parseInt(process.env.SMTP_PORT || "587");
      const user = process.env.SMTP_USER;
      const pass = process.env.SMTP_PASS;
      const from = process.env.SMTP_FROM || "VaultIQ Alerts <noreply@dut.ac.za>";

      if (host && user && pass) {
        // Real mail delivery using nodemailer
        const transporter = nodemailer.createTransport({
          host,
          port,
          secure: port === 465, // true for 465, false for other ports (like 587)
          auth: {
            user,
            pass,
          },
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
        // Simulation mode
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

  // AI-Powered Student Evaluation Summary & Sentiment Analysis Endpoint
  app.post("/api/summarize-evaluations", async (req, res) => {
    try {
      const { moduleCode, surveyTitle, questions, responses } = req.body;

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "Gemini API Key is missing" });
      }

      if (!moduleCode || !responses || !Array.isArray(responses)) {
        return res.status(400).json({ error: "Missing required fields: moduleCode or responses" });
      }

      const genAI = new GoogleGenAI({ 
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      // Construct a summary prompt
      const prompt = `You are an expert academic quality assurance auditor analyzing student survey evaluations.
      Module under review: ${moduleCode}
      Survey title: "${surveyTitle || 'General Course Feedback'}"

      Evaluation Questions:
      ${questions && Array.isArray(questions) ? questions.map((q: string, i: number) => `${i + 1}. ${q}`).join('\n') : 'Standard rating questions.'}

      Student Responses Data:
      ${JSON.stringify(responses.map((r: any) => ({ ratings: r.ratings, comments: r.comments })), null, 2)}

      Task:
      Analyze the responses (rating scores and text comments).
      Identify the lowest-scoring areas or most commonly mentioned concerns.
      Summarize these as "Areas for Improvement" as a concise, highly professional list of bullet points (maximum 3-4 points).
      CRITICAL: Your output MUST NOT contain any raw quotes from individual students, names, email addresses, or specific student identities. It must be written as synthesized administrative recommendations to protect double-blind student anonymity.

      Return a JSON object in this strict format:
      {
        "areasForImprovement": ["string", "string", ...]
      }`;

      const response = await genAI.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }]
          }
        ],
        config: { 
          responseMimeType: "application/json"
        }
      });

      const text = response.text;
      if (!text) {
        throw new Error("No response text from Gemini");
      }
      res.json(JSON.parse(text));
    } catch (error: any) {
      console.error("AI Evaluation Summary Error:", error);
      res.status(500).json({ error: error.message || "Failed to summarize evaluations with AI" });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
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
