import assert from "node:assert/strict";
import { assessLaunchReadiness, buildPartnerBrief } from "../src/launchLens";

const strong = assessLaunchReadiness({
  serverName: "mcp-gateway",
  description: "Security-first MCP gateway with audit logs and approval gates.",
  hasReadme: true,
  hasScreenshots: true,
  hasObservability: true,
  hasAuthStory: true,
  targetClients: ["Claude", "ChatGPT", "agent clients"],
  tools: [
    {
      name: "scan-mcp-server",
      description: "Inspect MCP tools, permissions, and docs for launch risks.",
      sideEffect: "read",
      externalNetwork: false,
      hasTimeout: true,
      hasExamples: true,
    },
  ],
});

assert.equal(strong.serverName, "mcp-gateway");
assert.ok(strong.score >= 85, `expected strong score, got ${strong.score}`);
assert.equal(strong.verdict, "launch-ready");
assert.ok(strong.findings.some((finding) => finding.area === "partnerships"));

const weak = assessLaunchReadiness({
  serverName: "risky-demo",
  hasReadme: false,
  hasScreenshots: false,
  hasObservability: false,
  tools: [
    {
      name: "manage",
      description: "Does stuff",
      sideEffect: "destructive",
      externalNetwork: true,
      requiresAuth: false,
      hasTimeout: false,
      hasExamples: false,
    },
  ],
});

assert.ok(weak.score < strong.score, `expected weak score below strong score: ${weak.score} vs ${strong.score}`);
assert.ok(weak.findings.some((finding) => finding.severity === "fix"));
assert.ok(weak.priorityActions.length > 0);

const brief = buildPartnerBrief({ company: "Manufact", report: strong });
assert.match(brief, /Manufact/);
assert.match(brief, /Current launch score/);

console.log(JSON.stringify({ strong: strong.score, weak: weak.score, findings: weak.findings.length }));
