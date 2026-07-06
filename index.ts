import { MCPServer, object, text, widget } from "mcp-use/server";
import { z } from "zod";
import { assessLaunchReadiness, buildPartnerBrief, type MCPToolSpec } from "./src/launchLens";

const toolSpecSchema = z.object({
  name: z.string().min(1).describe("Kebab-case MCP tool name, e.g. 'search-docs'"),
  description: z.string().min(1).describe("What the tool does and when an AI should call it"),
  sideEffect: z.enum(["read", "write", "destructive"]).optional().describe("Whether the tool reads, writes, or destructively changes data"),
  requiresAuth: z.boolean().optional().describe("Whether the tool needs user or service authentication"),
  externalNetwork: z.boolean().optional().describe("Whether the tool calls external APIs or services"),
  hasTimeout: z.boolean().optional().describe("Whether the tool documents timeout/error behavior"),
  hasExamples: z.boolean().optional().describe("Whether docs include a concrete example for this tool"),
});

const server = new MCPServer({
  name: "mcp-launch-lens",
  title: "MCP Launch Lens",
  version: "1.0.0",
  description: "Launch-readiness scorecards for MCP Apps: trust, tool UX, docs, observability, marketplace fit, and partner narrative.",
  instructions: "Use assess-mcp-launch to audit an MCP server/app before launch. Use generate-partner-brief when the user needs a DevRel or partnership narrative for a specific company. Use compare-launch-paths to choose between Claude, ChatGPT, and generic agent-client launch paths.",
  baseUrl: process.env.MCP_URL || "http://localhost:3000",
  favicon: "favicon.ico",
  websiteUrl: "https://github.com/Niraven/mcp-gateway",
  icons: [{ src: "icon.svg", mimeType: "image/svg+xml", sizes: ["512x512"] }],
});

server.tool(
  {
    name: "assess-mcp-launch",
    title: "Assess MCP launch readiness",
    description: "Generate a visual launch-readiness scorecard for an MCP server or app across trust, tool UX, docs, observability, marketplace readiness, and partnerships.",
    schema: z.object({
      serverName: z.string().optional().describe("Name of the MCP server or app being assessed"),
      description: z.string().optional().describe("Short product description or positioning statement"),
      tools: z.array(toolSpecSchema).optional().describe("MCP tool surface to evaluate; omit for a demo-ready sample"),
      targetClients: z.array(z.string()).optional().describe("Target clients/marketplaces, e.g. Claude, ChatGPT, Cursor, agent clients"),
      hasReadme: z.boolean().optional().describe("Whether the repo has a README with setup and usage instructions"),
      hasScreenshots: z.boolean().optional().describe("Whether the launch package includes product/dashboard screenshots"),
      hasEvals: z.boolean().optional().describe("Whether evals or example test cases exist"),
      hasObservability: z.boolean().optional().describe("Whether analytics, logs, evals, and dashboard proof are included"),
      hasAuthStory: z.boolean().optional().describe("Whether user auth, scopes, or data boundaries are documented"),
    }),
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    outputSchema: z.object({
      serverName: z.string(),
      score: z.number(),
      verdict: z.enum(["launch-ready", "nearly-ready", "needs-hardening"]),
      headline: z.string(),
      summary: z.string(),
      readiness: z.array(z.object({ id: z.string(), label: z.string(), score: z.number(), summary: z.string() })),
      findings: z.array(z.object({ id: z.string(), area: z.enum(["security", "tool-ux", "docs", "observability", "marketplace", "partnerships"]), severity: z.enum(["pass", "watch", "fix"]), title: z.string(), detail: z.string(), action: z.string() })),
      priorityActions: z.array(z.string()),
      partnerAngles: z.array(z.string()),
      tools: z.array(toolSpecSchema),
    }),
    widget: { name: "product-search-result", invoking: "Scoring MCP launch readiness...", invoked: "Launch scorecard ready" },
  },
  async (input) => {
    const report = assessLaunchReadiness({ ...input, tools: input.tools as MCPToolSpec[] | undefined });
    return widget({ props: report, output: text(`${report.headline}. ${report.priorityActions[0]}`) });
  }
);

server.tool(
  {
    name: "generate-partner-brief",
    title: "Generate partner launch brief",
    description: "Create a concise DevRel/partnership brief that turns an MCP integration into a launchable story with proof points.",
    schema: z.object({
      company: z.string().optional().describe("Partner or target company name"),
      integrationGoal: z.string().optional().describe("What the integration is trying to accomplish"),
      targetClient: z.string().optional().describe("Primary client or marketplace, e.g. ChatGPT Apps, Claude Connectors, Cursor"),
      serverName: z.string().optional().describe("MCP server/app name to assess alongside the brief"),
      tools: z.array(toolSpecSchema).optional().describe("Optional tool surface to score before writing the brief"),
    }),
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    outputSchema: z.object({ brief: z.string(), score: z.number().optional(), verdict: z.string().optional(), proofChecklist: z.array(z.string()) }),
  },
  async (input) => {
    const report = input.serverName || input.tools?.length ? assessLaunchReadiness({ serverName: input.serverName, tools: input.tools as MCPToolSpec[] | undefined, hasReadme: true }) : undefined;
    return object({ brief: buildPartnerBrief({ ...input, report }), score: report?.score, verdict: report?.verdict, proofChecklist: ["Live MCP URL", "Manufact Cloud dashboard URL", "Widget screenshot", "README with setup, examples, and launch narrative", "60-second video script for application evidence"] });
  }
);

server.tool(
  {
    name: "compare-launch-paths",
    title: "Compare MCP launch paths",
    description: "Compare Claude Connectors, ChatGPT Apps, and generic agent-client launch paths for an MCP product.",
    schema: z.object({ product: z.string().optional().describe("MCP product or server name"), primaryGoal: z.string().optional().describe("Main launch goal: demo, marketplace, customer pilot, or partner integration") }),
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    outputSchema: z.object({ recommendation: z.string(), paths: z.array(z.object({ path: z.string(), fit: z.string(), proof: z.string(), risk: z.string() })) }),
  },
  async ({ product, primaryGoal }) => {
    const name = product || "MCP Launch Lens";
    return object({ recommendation: `${name} should lead with a Manufact Cloud deployment and widget-backed demo, then package the same proof for Claude, ChatGPT, and agent clients. Goal: ${primaryGoal || "application-ready proof"}.`, paths: [
      { path: "Manufact Cloud", fit: "Best immediate proof: live URL, dashboard, logs, analytics, evals, deploy flow.", proof: "MCP URL + dashboard URL + scorecard screenshot.", risk: "Requires CLI auth before deploy." },
      { path: "ChatGPT Apps", fit: "Best visual story because the widget is the product experience.", proof: "Widget interaction screenshot and model-facing output summary.", risk: "Needs tight UX, CSP, and client compatibility polish." },
      { path: "Claude / generic MCP clients", fit: "Best for protocol credibility and tool-call clarity.", proof: "Tool list, example calls, structured outputs, README examples.", risk: "Less visual unless paired with screenshots and narrative." },
    ] });
  }
);

server.listen().then(() => console.log("MCP Launch Lens server running"));
