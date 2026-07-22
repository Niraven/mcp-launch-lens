import assert from "node:assert/strict";
import { assessLaunchReadiness, buildPartnerBrief, compareLaunchPaths } from "../src/launchLens";
import { assertPublicMcpUrl, isPublicIpAddress, mapMcpTool } from "../src/inspectEndpoint";

const empty = assessLaunchReadiness({ serverName: "Empty Demo" });
assert.equal(empty.verdict, "insufficient-evidence");
assert.equal(empty.tools.length, 0);
assert.ok(empty.score < 50, `empty evidence must fail closed, got ${empty.score}`);
assert.equal(empty.verification.status, "insufficient");
assert.equal(empty.findings.some((finding) => finding.severity === "pass"), false);

const strong = assessLaunchReadiness({
  serverName: "mcp-gateway",
  description: "Security-first MCP gateway with audit logs and approval gates.",
  targetClients: ["Claude", "ChatGPT", "agent clients"],
  evidence: {
    mode: "live-endpoint",
    sourceUrl: "https://example.com/mcp",
    inspectedAt: "2026-07-23T00:00:00.000Z",
    readmeUrl: "https://github.com/example/server#readme",
    screenshotUrls: ["https://example.com/widget.png"],
    observabilityUrl: "https://example.com/dashboard",
    authDocsUrl: "https://example.com/security",
    partnerEvidenceUrl: "https://example.com/partner-plan",
  },
  tools: [
    {
      name: "scan-mcp-server",
      description: "Inspect MCP tools, permissions, and docs for launch risks.",
      sideEffect: "read",
      externalNetwork: false,
      hasTimeout: true,
      hasExamples: true,
      hasInputSchema: true,
    },
  ],
});

assert.equal(strong.serverName, "mcp-gateway");
assert.ok(strong.score >= 85, `expected strong score, got ${strong.score}`);
assert.equal(strong.verdict, "launch-ready");
assert.equal(strong.verification.status, "complete");
assert.ok(strong.findings.some((finding) => finding.area === "partnerships"));

const partnerProofMissing = assessLaunchReadiness({
  serverName: "mcp-gateway",
  targetClients: ["Claude", "ChatGPT"],
  tools: strong.tools,
  evidence: {
    mode: "live-endpoint",
    sourceUrl: "https://example.com/mcp",
    readmeUrl: "https://example.com/readme",
    screenshotUrls: ["https://example.com/screenshot.png"],
    observabilityUrl: "https://example.com/dashboard",
    authDocsUrl: "https://example.com/security",
  },
});
assert.equal(partnerProofMissing.verification.status, "partial");
assert.ok(partnerProofMissing.findings.some((finding) => finding.id === "partnership-evidence-gap" && finding.severity === "watch"));

const weak = assessLaunchReadiness({
  serverName: "risky-demo",
  targetClients: ["ChatGPT"],
  evidence: { mode: "manual" },
  tools: [
    {
      name: "manage",
      description: "Does stuff",
      sideEffect: "destructive",
      externalNetwork: true,
      requiresAuth: false,
      hasTimeout: false,
      hasExamples: false,
      hasInputSchema: false,
    },
  ],
});

assert.ok(weak.score < strong.score, `expected weak score below strong score: ${weak.score} vs ${strong.score}`);
assert.ok(weak.findings.some((finding) => finding.severity === "fix"));
assert.ok(weak.priorityActions.length > 0);
assert.equal(weak.verification.status, "partial");

const unknownSecurity = assessLaunchReadiness({
  serverName: "unknown-security-demo",
  targetClients: ["ChatGPT", "Claude"],
  evidence: {
    mode: "live-endpoint",
    sourceUrl: "https://example.com/mcp",
    readmeUrl: "https://example.com/readme",
    screenshotUrls: ["https://example.com/screenshot.png"],
    observabilityUrl: "https://example.com/dashboard",
    authDocsUrl: "https://example.com/security",
    partnerEvidenceUrl: "https://example.com/partner-plan",
  },
  tools: [{ name: "external-fetch", description: "Fetch public external data for the current user request.", hasInputSchema: true }],
});
assert.ok(unknownSecurity.findings.some((finding) => finding.id === "security-metadata-unknown" && finding.severity === "watch"));
assert.equal(unknownSecurity.findings.some((finding) => finding.id === "security-baseline-pass"), false);
assert.ok((unknownSecurity.readiness.find((area) => area.id === "security")?.score ?? 100) <= 75);
assert.equal(unknownSecurity.verdict, "nearly-ready", "unknown security metadata must block launch-ready");

const explicitTimeoutGap = assessLaunchReadiness({
  serverName: "timeout-gap-demo",
  targetClients: ["ChatGPT", "Claude"],
  evidence: {
    mode: "live-endpoint",
    sourceUrl: "https://example.com/mcp",
    readmeUrl: "https://example.com/readme",
    screenshotUrls: ["https://example.com/screenshot.png"],
    observabilityUrl: "https://example.com/dashboard",
    authDocsUrl: "https://example.com/security",
    partnerEvidenceUrl: "https://example.com/partner-plan",
  },
  tools: [{ name: "external-fetch", description: "Fetch public external data for the current user request.", sideEffect: "read", externalNetwork: true, requiresAuth: true, hasTimeout: false, hasInputSchema: true }],
});
assert.ok(explicitTimeoutGap.findings.some((finding) => finding.id === "security-timeout-gap" && finding.severity === "fix"));
assert.notEqual(explicitTimeoutGap.verdict, "launch-ready", "a fix-severity finding must block launch-ready");

const mapped = mapMcpTool({
  name: "delete-records",
  description: "Delete selected customer records after explicit user confirmation.",
  inputSchema: { type: "object", properties: { recordIds: { type: "array" } } },
  annotations: { destructiveHint: true, openWorldHint: true },
});
assert.equal(mapped.sideEffect, "destructive");
assert.equal(mapped.externalNetwork, true);
assert.equal(mapped.hasInputSchema, true);
assert.equal(mapped.hasExamples, undefined, "missing JSON Schema examples are unknown, not proof that docs lack examples");
await assert.rejects(
  () => assertPublicMcpUrl("https://example.com/mcp?token=secret"),
  /query parameters/i,
  "endpoint URLs with query parameters may leak credentials and must be rejected",
);

for (const address of ["127.0.0.1", "10.0.0.1", "169.254.169.254", "::1", "fc00::1", "2001:db8::1"]) {
  assert.equal(isPublicIpAddress(address), false, `${address} must be rejected`);
}
assert.equal(isPublicIpAddress("8.8.8.8"), true);
assert.equal(isPublicIpAddress("2606:4700:4700::1111"), true);

const demoPath = compareLaunchPaths({ product: "Acme MCP", primaryGoal: "visual product demo" });
assert.match(demoPath.recommendation, /ChatGPT Apps/i);
const deploymentPath = compareLaunchPaths({ product: "Acme MCP", primaryGoal: "managed deployment and observability" });
assert.match(deploymentPath.recommendation, /Manufact Cloud/i);

const brief = buildPartnerBrief({ company: "Manufact", integrationGoal: "ship an evidence-backed MCP audit", targetClient: "ChatGPT Apps", report: strong });
assert.match(brief, /Manufact/);
assert.match(brief, /evidence-backed MCP audit/);
assert.match(brief, /Current launch score/);

console.log(JSON.stringify({ empty: empty.score, strong: strong.score, weak: weak.score, unknownSecurity: unknownSecurity.score, findings: weak.findings.length }));
