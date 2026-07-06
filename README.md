# MCP Launch Lens

A Manufact Cloud MCP App that turns an MCP server into a launch-readiness scorecard: trust, tool UX, docs, observability, marketplace fit, and partner narrative.

Built for the Manufact application as a live proof artifact: a deployed MCP URL, a visual widget, and a dashboard link that shows analytics, evals, logs, and observability.

## Why this exists

Most MCP security tools answer: “is this risky?”

MCP Launch Lens answers a broader DevRel question:

> Is this MCP integration ready to launch, partner around, and show to real users?

It builds on prior MCP infrastructure work:

- [`@niraven/mcp-gateway`](https://github.com/Niraven/mcp-gateway) — security-first MCP gateway, audit logging, approval gates, run reports.
- [`myelin-memory`](https://github.com/Niraven/myelin) — MCP-native procedural memory for agents.

## Tools

| Tool | Purpose | Widget |
| --- | --- | --- |
| `assess-mcp-launch` | Scores an MCP app/server across launch-readiness dimensions | Yes |
| `generate-partner-brief` | Creates a DevRel/partnership launch brief | No |
| `compare-launch-paths` | Compares Manufact Cloud, ChatGPT Apps, Claude, and agent-client paths | No |

## Local development

```bash
npm install
npm run build
npm run dev
```

Open the inspector at:

```text
http://localhost:3000/inspector
```

## Example call

```json
{
  "serverName": "mcp-gateway",
  "description": "Security-first MCP gateway with audit logs and approval gates.",
  "targetClients": ["Claude", "ChatGPT", "agent clients"],
  "hasReadme": true,
  "hasScreenshots": false,
  "hasObservability": true,
  "hasAuthStory": true,
  "tools": [
    {
      "name": "scan-mcp-server",
      "description": "Inspect MCP tools, permissions, and docs for launch risks.",
      "sideEffect": "read",
      "externalNetwork": false,
      "hasTimeout": true,
      "hasExamples": true
    }
  ]
}
```

## Deployment

Fast Manufact-managed deployment:

```bash
npx -y mcp-use@latest deploy --no-github -y --org org-bb5b108a-sifrx
```

GitHub-backed deployment after installing the mcp-use GitHub App:

```bash
npx -y mcp-use@latest deploy -y --org org-bb5b108a-sifrx
```

## Application proof checklist

- Live MCP URL
- Manufact Cloud dashboard URL
- Widget screenshot
- Short walkthrough script
- Link to related GitHub proof: `mcp-gateway`, `myelin`
