import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import * as dotenv from "dotenv";

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
