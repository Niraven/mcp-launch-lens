export type SideEffectLevel = "read" | "write" | "destructive";

export type MCPToolSpec = {
  name: string;
  description: string;
  sideEffect?: SideEffectLevel;
  requiresAuth?: boolean;
  externalNetwork?: boolean;
  hasTimeout?: boolean;
  hasExamples?: boolean;
};

export type FindingSeverity = "pass" | "watch" | "fix";
export type LaunchFinding = {
  id: string;
  area: "security" | "tool-ux" | "docs" | "observability" | "marketplace" | "partnerships";
  severity: FindingSeverity;
  title: string;
  detail: string;
  action: string;
};
export type ReadinessArea = { id: string; label: string; score: number; summary: string };
export type LaunchLensReport = {
  serverName: string;
  score: number;
  verdict: "launch-ready" | "nearly-ready" | "needs-hardening";
  headline: string;
  summary: string;
  readiness: ReadinessArea[];
  findings: LaunchFinding[];
  priorityActions: string[];
  partnerAngles: string[];
  tools: MCPToolSpec[];
};

const DEFAULT_TOOLS: MCPToolSpec[] = [
  { name: "assess-mcp-server", description: "Inspect an MCP server manifest and produce a launch-readiness scorecard.", sideEffect: "read", requiresAuth: false, externalNetwork: false, hasTimeout: true, hasExamples: true },
  { name: "generate-partner-brief", description: "Turn MCP capability data into a DevRel and partnership brief for launch planning.", sideEffect: "read", requiresAuth: false, externalNetwork: false, hasTimeout: true, hasExamples: true },
  { name: "compare-launch-paths", description: "Compare Claude Connector, ChatGPT App, and agent-client launch paths for the server.", sideEffect: "read", requiresAuth: false, externalNetwork: false, hasTimeout: true, hasExamples: true },
];

const clampScore = (score: number): number => Math.max(0, Math.min(100, Math.round(score)));
const areaScore = (total: number, penalties: number): number => clampScore(total - penalties);
function hasVagueToolName(name: string): boolean {
  const vague = ["manage", "handle", "process", "do", "run", "tool", "action"];
  const lower = name.toLowerCase();
  return vague.some((word) => lower === word || lower.startsWith(`${word}-`) || lower.includes(`-${word}-`));
}

export function assessLaunchReadiness(input: {
  serverName?: string;
  description?: string;
  tools?: MCPToolSpec[];
  targetClients?: string[];
  hasReadme?: boolean;
  hasScreenshots?: boolean;
  hasEvals?: boolean;
  hasObservability?: boolean;
  hasAuthStory?: boolean;
}): LaunchLensReport {
  const serverName = (input.serverName?.trim() || "MCP Launch Lens").slice(0, 80);
  const tools = (input.tools?.length ? input.tools : DEFAULT_TOOLS).map((tool) => ({
    sideEffect: "read" as SideEffectLevel,
    requiresAuth: false,
    externalNetwork: false,
    hasTimeout: false,
    hasExamples: false,
    ...tool,
  }));
  const description = input.description?.trim() || "MCP app/server launch readiness assessment.";
  const findings: LaunchFinding[] = [];
  const destructiveTools = tools.filter((tool) => tool.sideEffect === "destructive");
  const writeTools = tools.filter((tool) => tool.sideEffect === "write" || tool.sideEffect === "destructive");
  const externalTools = tools.filter((tool) => tool.externalNetwork);
  const authGaps = externalTools.filter((tool) => !tool.requiresAuth);
  const timeoutGaps = tools.filter((tool) => !tool.hasTimeout && (tool.externalNetwork || tool.sideEffect !== "read"));
  const vagueNames = tools.filter((tool) => hasVagueToolName(tool.name));
  const thinDescriptions = tools.filter((tool) => tool.description.trim().split(/\s+/).length < 7);
  const exampleGaps = tools.filter((tool) => !tool.hasExamples);

  if (destructiveTools.length) findings.push({ id: "security-destructive-tools", area: "security", severity: "fix", title: "Destructive tools need explicit guardrails", detail: `${destructiveTools.length} tool(s) can delete or overwrite data.`, action: "Add confirmation copy, annotations.destructiveHint=true, dry-run mode, and rollback notes." });
  if (authGaps.length) findings.push({ id: "security-auth-gap", area: "security", severity: "fix", title: "External calls need an auth and permission story", detail: `${authGaps.length} external-network tool(s) are not marked as requiring auth.`, action: "Document OAuth/API-key scope, least-privilege access, and per-user data boundaries." });
  if (!destructiveTools.length && !authGaps.length) findings.push({ id: "security-baseline-pass", area: "security", severity: "pass", title: "Security baseline is legible", detail: "No destructive or unscoped external tools were detected in the supplied tool set.", action: "Keep annotations explicit and document what data every tool can see." });

  if (vagueNames.length || thinDescriptions.length) findings.push({ id: "tool-ux-clarity", area: "tool-ux", severity: "watch", title: "Tool naming and descriptions can be sharper", detail: `${vagueNames.length} vague name(s), ${thinDescriptions.length} thin description(s).`, action: "Use capability-specific kebab-case names and action-oriented descriptions with concrete nouns." });
  else findings.push({ id: "tool-ux-pass", area: "tool-ux", severity: "pass", title: "Tool surface is easy for agents to choose", detail: "Tool names are specific and descriptions provide enough intent for model routing.", action: "Preserve one-tool-one-capability boundaries as the server expands." });

  if (exampleGaps.length || input.hasReadme === false) findings.push({ id: "docs-examples-gap", area: "docs", severity: "fix", title: "Docs need executable examples", detail: `${exampleGaps.length} tool(s) lack examples; README present: ${input.hasReadme !== false}.`, action: "Add copy-paste client calls, expected outputs, screenshots, and a 60-second demo path." });
  else findings.push({ id: "docs-pass", area: "docs", severity: "pass", title: "Docs are launchable", detail: "The supplied tool surface includes examples and a README story.", action: "Add dashboard screenshots after deployment for social/application proof." });

  if (!input.hasObservability) findings.push({ id: "observability-gap", area: "observability", severity: "watch", title: "Observability story should be more visible", detail: "The server can launch, but users need analytics, logs, evals, and failure-path visibility.", action: "Show Manufact Cloud analytics/logs in the launch narrative and add eval examples." });
  else findings.push({ id: "observability-pass", area: "observability", severity: "pass", title: "Observability is part of the product story", detail: "Analytics/log/eval surfaces are included in the launch plan.", action: "Use dashboard URL as proof in the application package." });

  if (!input.hasScreenshots) findings.push({ id: "marketplace-visual-gap", area: "marketplace", severity: "watch", title: "Marketplace proof needs screenshots", detail: "A visual MCP App needs install, usage, and dashboard screenshots to feel real.", action: "Capture inspector/widget screenshot plus Manufact Cloud dashboard screenshot after deploy." });

  const targetClients = input.targetClients?.length ? input.targetClients : ["Claude", "ChatGPT", "agent clients"];
  if (targetClients.length >= 2) findings.push({ id: "partnership-multi-client-pass", area: "partnerships", severity: "pass", title: "Multi-client launch angle is strong", detail: `Positioning spans ${targetClients.join(", ")}.`, action: "Frame this as a partner-readiness layer for devtools teams entering MCP marketplaces." });

  const securityPenalties = destructiveTools.length * 18 + authGaps.length * 16 + timeoutGaps.length * 7;
  const uxPenalties = vagueNames.length * 10 + thinDescriptions.length * 8;
  const docsPenalties = (input.hasReadme === false ? 25 : 0) + exampleGaps.length * 7;
  const obsPenalties = input.hasObservability ? 0 : 22;
  const marketplacePenalties = (input.hasScreenshots ? 0 : 14) + (input.hasAuthStory ? 0 : writeTools.length ? 12 : 4);
  const partnershipPenalties = targetClients.length >= 2 ? 0 : 15;
  const readiness: ReadinessArea[] = [
    { id: "security", label: "Trust & safety", score: areaScore(96, securityPenalties), summary: "Tool permissions, auth boundaries, timeout/error posture." },
    { id: "tool-ux", label: "Agent tool UX", score: areaScore(94, uxPenalties), summary: "Names, descriptions, schemas, model-selectability." },
    { id: "docs", label: "Developer docs", score: areaScore(90, docsPenalties), summary: "README, examples, demo path, copy-paste usage." },
    { id: "observability", label: "Cloud observability", score: areaScore(88, obsPenalties), summary: "Analytics, logs, evals, dashboard proof." },
    { id: "marketplace", label: "Marketplace readiness", score: areaScore(86, marketplacePenalties), summary: "Screenshots, visual proof, client fit, install story." },
    { id: "partnerships", label: "Partner narrative", score: areaScore(92, partnershipPenalties), summary: "DevRel story, integrations, co-marketing angles." },
  ];
  const score = clampScore(readiness.reduce((sum, item) => sum + item.score, 0) / readiness.length);
  const verdict = score >= 86 ? "launch-ready" : score >= 72 ? "nearly-ready" : "needs-hardening";
  const priorityActions = findings.filter((finding) => finding.severity !== "pass").slice(0, 4).map((finding) => finding.action);

  return {
    serverName,
    score,
    verdict,
    headline: `${serverName}: ${score}/100 ${verdict.replaceAll("-", " ")}`,
    summary: `${description} Launch Lens checks whether the MCP surface is understandable, trustworthy, observable, and easy to partner around before it reaches Claude, ChatGPT, or agent clients.`,
    readiness,
    findings,
    priorityActions: priorityActions.length ? priorityActions : ["Ship the demo, capture dashboard proof, and turn the report into a short DevRel walkthrough."],
    partnerAngles: ["Co-marketing audit for devtools teams shipping MCP integrations.", "Pre-launch checklist before Claude Connector or ChatGPT App submissions.", "Manufact Cloud proof layer: deploy, observe, evaluate, iterate.", "Bridge from raw MCP server to a client-facing MCP App experience."],
    tools,
  };
}

export function buildPartnerBrief(input: { company?: string; integrationGoal?: string; targetClient?: string; report?: LaunchLensReport }): string {
  const company = input.company?.trim() || "the partner";
  const targetClient = input.targetClient?.trim() || "Claude, ChatGPT, and agent clients";
  const goal = input.integrationGoal?.trim() || "turn an MCP server into a trustworthy, observable app experience";
  const scoreLine = input.report ? `Current launch score: ${input.report.score}/100 (${input.report.verdict}).` : "Launch score should be generated from the MCP tool surface.";
  return [`# MCP Launch Brief: ${company}`, "", `**Goal:** ${goal}.`, `**Target clients:** ${targetClient}.`, "**Manufact angle:** deploy the MCP server, expose the widget experience, and use Cloud analytics/evals/logs as the iteration loop.", "", `**Readiness:** ${scoreLine}`, "", "## Partnership motion", "1. Audit the MCP tool surface for trust, clarity, and marketplace fit.", "2. Ship a widget-backed demo that makes the integration concrete for users.", "3. Capture proof: MCP URL, dashboard URL, screenshots, and a 60-second walkthrough.", "4. Turn the demo into partner docs and a short launch post."].join("\n");
}
