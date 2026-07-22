import { MCPServer, error, object, text, widget } from "mcp-use/server";
import { z } from "zod";
import { inspectMcpEndpoint } from "./src/inspectEndpoint";
import { assessLaunchReadiness, buildPartnerBrief, compareLaunchPaths, type EvidenceInput, type MCPToolSpec } from "./src/launchLens";

const httpsUrl = z.string().url().refine((value) => value.startsWith("https://"), "URL must use HTTPS");
const toolSpecSchema = z.object({
  name: z.string().min(1).describe("Kebab-case MCP tool name, e.g. 'search-docs'"),
  description: z.string().min(1).describe("What the tool does and when an AI should call it"),
  sideEffect: z.enum(["read", "write", "destructive"]).optional().describe("Whether the tool reads, writes, or destructively changes data"),
  requiresAuth: z.boolean().optional().describe("Whether the tool needs user or service authentication"),
  externalNetwork: z.boolean().optional().describe("Whether the tool calls external APIs or services"),
  hasTimeout: z.boolean().optional().describe("Whether the tool documents timeout/error behavior"),
  hasExamples: z.boolean().optional().describe("Whether docs include a concrete example for this tool"),
  hasInputSchema: z.boolean().optional().describe("Whether the tool exposes a meaningful input schema"),
});
const verificationSchema = z.object({
  status: z.enum(["complete", "partial", "insufficient"]),
  mode: z.enum(["live-endpoint", "manual", "none"]),
  sourceUrl: z.string().optional(),
  inspectedAt: z.string().optional(),
  evidenceChecks: z.array(z.string()),
  missingChecks: z.array(z.string()),
  readmeUrl: z.string().optional(),
  screenshotUrls: z.array(z.string()),
  observabilityUrl: z.string().optional(),
  authDocsUrl: z.string().optional(),
  partnerEvidenceUrl: z.string().optional(),
});
const reportSchema = {
  serverName: z.string(),
  score: z.number(),
  verdict: z.enum(["launch-ready", "nearly-ready", "needs-hardening", "insufficient-evidence"]),
  headline: z.string(),
  summary: z.string(),
  readiness: z.array(z.object({ id: z.string(), label: z.string(), score: z.number(), summary: z.string() })),
  findings: z.array(z.object({ id: z.string(), area: z.enum(["security", "tool-ux", "docs", "observability", "marketplace", "partnerships"]), severity: z.enum(["pass", "watch", "fix"]), title: z.string(), detail: z.string(), action: z.string() })),
  priorityActions: z.array(z.string()),
  partnerAngles: z.array(z.string()),
  tools: z.array(toolSpecSchema),
  verification: verificationSchema,
};

const server = new MCPServer({
  name: "mcp-launch-lens",
  title: "MCP Launch Lens",
  version: "1.1.0",
  description: "Evidence-aware launch-readiness scorecards for MCP Apps: inspect a live endpoint, separate inspected MCP metadata from supplied evidence and unknowns, then turn the gaps into a launch plan.",
  instructions: "Use assess-mcp-launch with a public HTTPS mcpUrl whenever possible. Missing evidence fails closed and appears as partial or insufficient. Use generate-partner-brief after an assessment, and compare-launch-paths to choose a launch path from the product goal.",
  baseUrl: process.env.MCP_URL || "http://localhost:3000",
  favicon: "favicon.ico",
  websiteUrl: "https://github.com/Niraven/mcp-launch-lens",
  icons: [{ src: "icon.svg", mimeType: "image/svg+xml", sizes: ["512x512"] }],
});

server.tool(
  {
    name: "assess-mcp-launch",
    title: "Assess MCP launch readiness",
    description: "Inspect a public HTTPS MCP endpoint or supplied tool manifest, then generate an evidence-aware visual launch-readiness scorecard.",
    schema: z.object({
      mcpUrl: httpsUrl.optional().describe("Public HTTPS MCP endpoint to inspect with tools/list; private and local addresses are rejected"),
      serverName: z.string().optional().describe("Display name; live server metadata wins when mcpUrl is supplied"),
      description: z.string().optional().describe("Short product description or positioning statement"),
      tools: z.array(toolSpecSchema).optional().describe("Manual tool surface; ignored when mcpUrl is supplied"),
      targetClients: z.array(z.string()).optional().describe("Target clients/marketplaces, e.g. Claude, ChatGPT, Cursor, agent clients"),
      readmeUrl: httpsUrl.optional().describe("Public README or developer docs evidence"),
      screenshotUrls: z.array(httpsUrl).optional().describe("Public widget, install, or product screenshots"),
      observabilityUrl: httpsUrl.optional().describe("Manufact Cloud dashboard or other observability evidence"),
      authDocsUrl: httpsUrl.optional().describe("Authentication, scopes, permissions, or data-boundary documentation"),
      partnerEvidenceUrl: httpsUrl.optional().describe("Partner brief, launch plan, or customer outcome evidence"),
    }),
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    outputSchema: z.object(reportSchema),
    widget: { name: "product-search-result", invoking: "Inspecting MCP launch evidence...", invoked: "Evidence-aware scorecard ready" },
  },
  async (input) => {
    try {
      const inspection = input.mcpUrl ? await inspectMcpEndpoint(input.mcpUrl) : undefined;
      const evidence: EvidenceInput = {
        mode: inspection ? "live-endpoint" : input.tools?.length ? "manual" : undefined,
        sourceUrl: inspection?.endpoint,
        inspectedAt: inspection?.inspectedAt,
        readmeUrl: input.readmeUrl,
        screenshotUrls: input.screenshotUrls,
        observabilityUrl: input.observabilityUrl,
        authDocsUrl: input.authDocsUrl,
        partnerEvidenceUrl: input.partnerEvidenceUrl,
      };
      const report = assessLaunchReadiness({
        serverName: inspection?.serverName || input.serverName,
        description: input.description,
        tools: inspection?.tools || input.tools as MCPToolSpec[] | undefined,
        targetClients: input.targetClients,
        evidence,
      });
      return widget({ props: report, output: text(`${report.headline}. Evidence set: ${report.verification.status}. ${report.priorityActions[0]}`) });
    } catch (cause) {
      const detail = cause instanceof Error ? cause.message : "Unknown endpoint inspection failure.";
      return error(`Could not inspect MCP endpoint: ${detail}`);
    }
  }
);

server.tool(
  {
    name: "generate-partner-brief",
    title: "Generate partner launch brief",
    description: "Create a concise DevRel/partnership brief from a supplied MCP integration goal and optional evidence-aware report inputs.",
    schema: z.object({
      company: z.string().min(1).describe("Partner or target company name"),
      integrationGoal: z.string().min(1).describe("Specific user or partner outcome for the integration"),
      targetClient: z.string().min(1).describe("Primary client or marketplace, e.g. ChatGPT Apps or Claude Connectors"),
      serverName: z.string().optional().describe("Optional MCP server name when a report context is supplied"),
      tools: z.array(toolSpecSchema).optional().describe("Optional manual tool surface for a lightweight readiness context"),
    }),
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    outputSchema: z.object({ brief: z.string(), score: z.number().optional(), verdict: z.string().optional(), verification: z.string().optional(), proofChecklist: z.array(z.string()) }),
  },
  async (input) => {
    const report = input.serverName || input.tools?.length ? assessLaunchReadiness({ serverName: input.serverName, tools: input.tools as MCPToolSpec[] | undefined, targetClients: [input.targetClient], evidence: { mode: "manual" } }) : undefined;
    return object({
      brief: buildPartnerBrief({ ...input, report }),
      score: report?.score,
      verdict: report?.verdict,
      verification: report?.verification.status,
      proofChecklist: ["Live MCP endpoint inspection", "Linked README", "Manufact Cloud dashboard", "Focused widget screenshot", "Authentication and data-boundary documentation", "Partner brief or outcome evidence", "60-second walkthrough"],
    });
  }
);

server.tool(
  {
    name: "compare-launch-paths",
    title: "Compare MCP launch paths",
    description: "Choose among Manufact Cloud, ChatGPT Apps, Claude Connectors, and generic MCP clients based on the actual launch goal.",
    schema: z.object({ product: z.string().optional().describe("Product or MCP server name"), primaryGoal: z.string().optional().describe("Main launch goal: visual demo, managed deployment, enterprise connector, or protocol portability") }),
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    outputSchema: z.object({ recommendation: z.string(), paths: z.array(z.object({ path: z.string(), fit: z.string(), proof: z.string(), risk: z.string() })) }),
  },
  async (input) => object(compareLaunchPaths(input))
);

server.listen().then(() => console.log("MCP Launch Lens server running"));
