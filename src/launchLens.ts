export type SideEffectLevel = "read" | "write" | "destructive";

export type MCPToolSpec = {
  name: string;
  description: string;
  sideEffect?: SideEffectLevel;
  requiresAuth?: boolean;
  externalNetwork?: boolean;
  hasTimeout?: boolean;
  hasExamples?: boolean;
  hasInputSchema?: boolean;
};

export type EvidenceInput = {
  mode?: "live-endpoint" | "manual";
  sourceUrl?: string;
  inspectedAt?: string;
  readmeUrl?: string;
  screenshotUrls?: string[];
  observabilityUrl?: string;
  authDocsUrl?: string;
  partnerEvidenceUrl?: string;
};

export type Verification = {
  status: "complete" | "partial" | "insufficient";
  mode: "live-endpoint" | "manual" | "none";
  sourceUrl?: string;
  inspectedAt?: string;
  evidenceChecks: string[];
  missingChecks: string[];
  readmeUrl?: string;
  screenshotUrls: string[];
  observabilityUrl?: string;
  authDocsUrl?: string;
  partnerEvidenceUrl?: string;
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
  verdict: "launch-ready" | "nearly-ready" | "needs-hardening" | "insufficient-evidence";
  headline: string;
  summary: string;
  readiness: ReadinessArea[];
  findings: LaunchFinding[];
  priorityActions: string[];
  partnerAngles: string[];
  tools: MCPToolSpec[];
  verification: Verification;
};

export type LaunchLensInput = {
  serverName?: string;
  description?: string;
  tools?: MCPToolSpec[];
  targetClients?: string[];
  evidence?: EvidenceInput;
};

const clampScore = (score: number): number => Math.max(0, Math.min(100, Math.round(score)));
const areaScore = (total: number, penalties: number): number => clampScore(total - penalties);

function hasVagueToolName(name: string): boolean {
  const vague = ["manage", "handle", "process", "do", "run", "tool", "action"];
  const lower = name.toLowerCase();
  return vague.some((word) => lower === word || lower.startsWith(`${word}-`) || lower.includes(`-${word}-`));
}

function buildVerification(tools: MCPToolSpec[], evidence: EvidenceInput | undefined): Verification {
  const evidenceChecks: string[] = [];
  const missingChecks: string[] = [];
  const liveTools = evidence?.mode === "live-endpoint" && tools.length > 0 && Boolean(evidence.sourceUrl);
  const checks: Array<[boolean, string]> = [
    [liveTools, "Live MCP tool manifest"],
    [Boolean(evidence?.readmeUrl), "README linked"],
    [Boolean(evidence?.screenshotUrls?.length), "Widget or product screenshots"],
    [Boolean(evidence?.observabilityUrl), "Cloud observability"],
    [Boolean(evidence?.authDocsUrl), "Authentication and data boundaries"],
    [Boolean(evidence?.partnerEvidenceUrl), "Partner story evidence"],
  ];
  for (const [verified, label] of checks) (verified ? evidenceChecks : missingChecks).push(label);

  const mode = evidence?.mode ?? "none";
  const status = evidenceChecks.length === checks.length ? "complete" : tools.length || evidenceChecks.length ? "partial" : "insufficient";
  return {
    status,
    mode,
    sourceUrl: evidence?.sourceUrl,
    inspectedAt: evidence?.inspectedAt,
    evidenceChecks,
    missingChecks,
    readmeUrl: evidence?.readmeUrl,
    screenshotUrls: evidence?.screenshotUrls ?? [],
    observabilityUrl: evidence?.observabilityUrl,
    authDocsUrl: evidence?.authDocsUrl,
    partnerEvidenceUrl: evidence?.partnerEvidenceUrl,
  };
}

export function assessLaunchReadiness(input: LaunchLensInput): LaunchLensReport {
  const serverName = (input.serverName?.trim() || "Unnamed MCP server").slice(0, 80);
  const tools = (input.tools ?? []).map((tool) => ({ ...tool }));
  const description = input.description?.trim() || "MCP app/server launch readiness assessment.";
  const targetClients = (input.targetClients ?? []).map((client) => client.trim()).filter(Boolean);
  const verification = buildVerification(tools, input.evidence);
  const findings: LaunchFinding[] = [];

  const destructiveTools = tools.filter((tool) => tool.sideEffect === "destructive");
  const writeTools = tools.filter((tool) => tool.sideEffect === "write" || tool.sideEffect === "destructive");
  const externalTools = tools.filter((tool) => tool.externalNetwork === true);
  const unknownNetworkTools = tools.filter((tool) => tool.externalNetwork === undefined);
  const authRelevantTools = tools.filter((tool) => tool.externalNetwork !== false);
  const timeoutRelevantTools = tools.filter((tool) => tool.externalNetwork !== false || tool.sideEffect !== "read");
  const authGaps = externalTools.filter((tool) => tool.requiresAuth === false);
  const timeoutGaps = timeoutRelevantTools.filter((tool) => tool.hasTimeout === false);
  const unknownAuthTools = authRelevantTools.filter((tool) => tool.requiresAuth === undefined);
  const unknownTimeoutTools = timeoutRelevantTools.filter((tool) => tool.hasTimeout === undefined);
  const hasSecurityUnknowns = Boolean(unknownNetworkTools.length || unknownAuthTools.length || unknownTimeoutTools.length);
  const vagueNames = tools.filter((tool) => hasVagueToolName(tool.name));
  const thinDescriptions = tools.filter((tool) => tool.description.trim().split(/\s+/).length < 7);
  const schemaGaps = tools.filter((tool) => tool.hasInputSchema === false);
  const exampleGaps = tools.filter((tool) => tool.hasExamples === false);

  if (!tools.length) {
    findings.push({ id: "security-unverified", area: "security", severity: "fix", title: "No live tool manifest was inspected", detail: "Security claims cannot be made without an MCP tool surface.", action: "Provide a public HTTPS MCP endpoint or an explicit tool manifest." });
    findings.push({ id: "tool-ux-unverified", area: "tool-ux", severity: "fix", title: "Tool UX is unverified", detail: "No names, descriptions, schemas, or annotations were supplied.", action: "Inspect tools/list before scoring model-selectability or schema quality." });
  } else {
    if (destructiveTools.length) findings.push({ id: "security-destructive-tools", area: "security", severity: "fix", title: "Destructive tools need explicit guardrails", detail: `${destructiveTools.length} tool(s) can delete or overwrite data.`, action: "Add confirmation copy, destructive annotations, dry-run mode, and rollback notes." });
    if (authGaps.length) findings.push({ id: "security-auth-gap", area: "security", severity: "fix", title: "External calls need an auth and permission story", detail: `${authGaps.length} external-network tool(s) explicitly report no authentication.`, action: "Document OAuth/API-key scope, least-privilege access, and per-user data boundaries." });
    if (timeoutGaps.length) findings.push({ id: "security-timeout-gap", area: "security", severity: "fix", title: "Network or write tools need timeout boundaries", detail: `${timeoutGaps.length} security-relevant tool(s) explicitly report no timeout.`, action: "Add bounded timeouts, cancellation behavior, and retry limits." });
    if (hasSecurityUnknowns) findings.push({ id: "security-metadata-unknown", area: "security", severity: "watch", title: "Security metadata is incomplete", detail: `${unknownNetworkTools.length} network-scope, ${unknownAuthTools.length} auth, and ${unknownTimeoutTools.length} timeout declaration(s) are unknown.`, action: "Declare network scope, authentication requirements, and timeout behavior before treating the security baseline as complete." });
    if (!destructiveTools.length && !authGaps.length && !timeoutGaps.length && !hasSecurityUnknowns) findings.push({ id: "security-baseline-pass", area: "security", severity: "pass", title: "Declared security baseline is legible", detail: "No destructive tools, explicit auth/timeout gaps, or unknown security declarations were detected.", action: "Keep the declarations synchronized with implementation and linked security documentation." });

    if (vagueNames.length || thinDescriptions.length || schemaGaps.length) findings.push({ id: "tool-ux-clarity", area: "tool-ux", severity: "watch", title: "Tool routing signals need work", detail: `${vagueNames.length} vague name(s), ${thinDescriptions.length} thin description(s), ${schemaGaps.length} schema gap(s).`, action: "Use capability-specific names, concrete descriptions, and explicit input schemas." });
    else findings.push({ id: "tool-ux-pass", area: "tool-ux", severity: "pass", title: "Inspected tool surface is model-selectable", detail: "Tool names, descriptions, and schemas provide clear routing signals.", action: "Preserve one-tool-one-capability boundaries as the server expands." });
  }

  if (!input.evidence?.readmeUrl) findings.push({ id: "docs-evidence-gap", area: "docs", severity: "fix", title: "README evidence is missing", detail: "Documentation cannot pass from a self-reported boolean.", action: "Add a public README URL with setup, calls, expected outputs, and failure cases." });
  else if (exampleGaps.length) findings.push({ id: "docs-examples-gap", area: "docs", severity: "watch", title: "Executable examples are incomplete", detail: `${exampleGaps.length} inspected tool(s) do not expose example evidence.`, action: "Add copy-paste calls and expected outputs to the linked README." });
  else findings.push({ id: "docs-pass", area: "docs", severity: "pass", title: "Documentation evidence is linked", detail: "The assessment includes a README URL and no explicit example gaps.", action: "Keep examples synchronized with the deployed tool schemas." });

  if (!input.evidence?.observabilityUrl) findings.push({ id: "observability-gap", area: "observability", severity: "watch", title: "Observability evidence is missing", detail: "No dashboard, logs, analytics, or eval evidence was linked.", action: "Link the Manufact Cloud dashboard or another observability artifact." });
  else findings.push({ id: "observability-pass", area: "observability", severity: "pass", title: "Observability evidence is linked", detail: "A cloud dashboard or observability artifact is attached to the assessment.", action: "Use the dashboard during the launch walkthrough." });

  if (!input.evidence?.screenshotUrls?.length) findings.push({ id: "marketplace-visual-gap", area: "marketplace", severity: "watch", title: "Visual proof is missing", detail: "No widget, install, or product screenshot was linked.", action: "Attach a focused widget screenshot and one deployment screenshot." });
  else findings.push({ id: "marketplace-visual-pass", area: "marketplace", severity: "pass", title: "Visual launch proof is linked", detail: `${input.evidence.screenshotUrls.length} screenshot artifact(s) are attached.`, action: "Use the strongest screenshot as the launch preview image." });

  if (targetClients.length >= 2 && input.evidence?.partnerEvidenceUrl) findings.push({ id: "partnership-multi-client-pass", area: "partnerships", severity: "pass", title: "Multi-client launch angle is evidenced", detail: `Positioning spans ${targetClients.join(", ")} and includes linked partner-story evidence.`, action: "Tie each client path to a concrete user or partner outcome." });
  else if (targetClients.length >= 2) findings.push({ id: "partnership-evidence-gap", area: "partnerships", severity: "watch", title: "Partner story is not evidenced", detail: `Positioning names ${targetClients.join(", ")}, but no partner plan or outcome proof is linked.`, action: "Link a partner brief, launch plan, or customer outcome for the stated client paths." });
  else findings.push({ id: "partnership-target-gap", area: "partnerships", severity: "watch", title: "Partner target is too narrow or missing", detail: targetClients.length ? `Only ${targetClients[0]} is named.` : "No target client or marketplace was supplied.", action: "Name the first client, the next expansion path, and the proof each requires." });

  const securityScore = tools.length ? areaScore(96, destructiveTools.length * 18 + authGaps.length * 16 + timeoutGaps.length * 7 + unknownNetworkTools.length * 8 + unknownAuthTools.length * 7 + unknownTimeoutTools.length * 6) : 30;
  const uxScore = tools.length ? areaScore(94, vagueNames.length * 10 + thinDescriptions.length * 8 + schemaGaps.length * 12) : 30;
  const docsScore = input.evidence?.readmeUrl ? areaScore(90, exampleGaps.length * 7) : 30;
  const observabilityScore = input.evidence?.observabilityUrl ? 88 : 30;
  const marketplaceScore = input.evidence?.screenshotUrls?.length ? areaScore(86, input.evidence.authDocsUrl || !writeTools.length ? 0 : 12) : 30;
  const partnershipScore = input.evidence?.partnerEvidenceUrl && targetClients.length >= 2 ? 92 : targetClients.length >= 2 ? 74 : 55;
  const readiness: ReadinessArea[] = [
    { id: "security", label: "Trust & safety", score: securityScore, summary: "Tool permissions, auth boundaries, timeout/error posture." },
    { id: "tool-ux", label: "Agent tool UX", score: uxScore, summary: "Names, descriptions, schemas, model-selectability." },
    { id: "docs", label: "Developer docs", score: docsScore, summary: "Linked README, examples, demo path, copy-paste usage." },
    { id: "observability", label: "Cloud observability", score: observabilityScore, summary: "Linked analytics, logs, evals, and dashboard proof." },
    { id: "marketplace", label: "Marketplace readiness", score: marketplaceScore, summary: "Screenshots, visual proof, client fit, install story." },
    { id: "partnerships", label: "Partner narrative", score: partnershipScore, summary: "DevRel story, integrations, co-marketing angles." },
  ];
  const score = clampScore(readiness.reduce((sum, item) => sum + item.score, 0) / readiness.length);
  const hasFixFindings = findings.some((finding) => finding.severity === "fix");
  const verdict: LaunchLensReport["verdict"] = !tools.length ? "insufficient-evidence" : score >= 86 && verification.status === "complete" && !hasFixFindings && !hasSecurityUnknowns ? "launch-ready" : score >= 72 ? "nearly-ready" : "needs-hardening";
  const priorityActions = findings.filter((finding) => finding.severity !== "pass").slice(0, 4).map((finding) => finding.action);

  return {
    serverName,
    score,
    verdict,
    headline: `${serverName}: ${score}/100 ${verdict.split("-").join(" ")}`,
    summary: `${description} Launch Lens separates inspected endpoint metadata, supplied evidence links, and unknowns before an MCP product reaches real users.`,
    readiness,
    findings,
    priorityActions: priorityActions.length ? priorityActions : ["Ship the inspected demo and use its evidence links in the launch walkthrough."],
    partnerAngles: ["Evidence-aware audit for devtools teams shipping MCP integrations.", "Pre-launch checklist before Claude Connector or ChatGPT App submissions.", "Manufact Cloud proof layer: deploy, observe, evaluate, iterate.", "Bridge from raw MCP server to a client-facing MCP App experience."],
    tools,
    verification,
  };
}

export function compareLaunchPaths(input: { product?: string; primaryGoal?: string }) {
  const name = input.product?.trim() || "the MCP product";
  const goal = input.primaryGoal?.trim() || "deployment proof";
  const normalized = goal.toLowerCase();
  const recommendedPath = /visual|demo|consumer|chatgpt/.test(normalized) ? "ChatGPT Apps" : /claude|enterprise|connector/.test(normalized) ? "Claude Connectors" : /generic|protocol|client/.test(normalized) ? "generic MCP clients" : "Manufact Cloud";
  return {
    recommendation: `${name} should lead with ${recommendedPath} for ${goal}, then reuse the same evidence set across the remaining launch paths.`,
    paths: [
      { path: "Manufact Cloud", fit: "Managed deployment, logs, analytics, evals, and operational proof.", proof: "Live MCP URL, dashboard evidence, and inspected tools.", risk: "Requires deployment access and honest evidence links." },
      { path: "ChatGPT Apps", fit: "Visual product demos and widget-backed user workflows.", proof: "Widget interaction, focused screenshots, and model-facing output.", risk: "Needs client compatibility, CSP, and UX polish." },
      { path: "Claude Connectors", fit: "Enterprise connector and protocol-first workflows.", proof: "Clear tool schemas, auth boundaries, and example calls.", risk: "Requires a precise permission and data-access story." },
      { path: "Generic MCP clients", fit: "Portable protocol credibility across agent runtimes.", proof: "tools/list evidence, compatibility checks, and structured outputs.", risk: "Less visual without a widget or launch narrative." },
    ],
  };
}

export function buildPartnerBrief(input: { company?: string; integrationGoal?: string; targetClient?: string; report?: LaunchLensReport }): string {
  const company = input.company?.trim() || "the partner";
  const targetClient = input.targetClient?.trim() || "the selected MCP client";
  const goal = input.integrationGoal?.trim() || "turn an MCP server into a trustworthy, observable app experience";
  const scoreLine = input.report ? `Current launch score: ${input.report.score}/100 (${input.report.verdict}); evidence set: ${input.report.verification.status}.` : "No launch score is available until evidence is inspected.";
  return [`# MCP Launch Brief: ${company}`, "", `**Goal:** ${goal}.`, `**Target client:** ${targetClient}.`, "**Manufact angle:** deploy the MCP server, expose the widget experience, and use Cloud analytics/evals/logs as the iteration loop.", "", `**Readiness:** ${scoreLine}`, "", "## Partnership motion", "1. Inspect the live MCP tool surface and separate inspected metadata from supplied evidence and open questions.", "2. Ship one widget-backed workflow that makes the integration concrete for users.", "3. Capture proof: MCP URL, dashboard, focused screenshot, README, auth boundaries, and partner outcome.", "4. Turn the evidence into partner docs and a short launch post."].join("\n");
}
