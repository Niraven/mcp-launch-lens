# MCP Launch Lens — Manufact Application Proof

## Live deployment

- MCP URL: https://keen-steel-bs1nz.run.mcp-use.com/mcp
- Manufact Cloud dashboard: https://manufact.com/cloud/org-bb5b108a-sifrx/servers/38b23d2a-f688-47b7-8425-59e143dcd6e1
- Inspector: https://inspector.manufact.com/inspector?autoConnect=https%3A%2F%2Fkeen-steel-bs1nz.run.mcp-use.com%2Fmcp
- Public GitHub proof repo: https://github.com/Niraven/mcp-launch-lens
- Widget screenshot: `launch-lens-widget-cropped.png`

## Verified output

```bash
npm test
# {"strong":91,"weak":68,"findings":7}

npm run build
# Build complete; TypeScript type check passed; 1 widget built

npx -y mcp-use@latest client connect launchlens-prod https://keen-steel-bs1nz.run.mcp-use.com/mcp
# Connected; 3 tools available

npx -y mcp-use@latest client launchlens-prod tools call compare-launch-paths product='MCP Launch Lens' primaryGoal='Manufact application proof'
# Tool executed successfully
```

## Tool surface

- `assess-mcp-launch` — visual launch-readiness scorecard for MCP Apps/servers.
- `generate-partner-brief` — DevRel/partnership narrative and proof checklist.
- `compare-launch-paths` — Manufact Cloud vs ChatGPT Apps vs Claude/generic MCP launch path comparison.

## Positioning

MCP Launch Lens is not just another security scanner. It is a launch-readiness layer for MCP Apps: trust, tool UX, docs, observability, marketplace fit, and partner story. It builds on previous MCP work:

- `@niraven/mcp-gateway`: security-first MCP gateway and audit concepts.
- `myelin-memory`: MCP-native procedural memory and agent workflow learning.

## 60-second walkthrough script

I built MCP Launch Lens as a live Manufact Cloud demo for teams shipping MCP integrations. The app audits an MCP server’s tool surface and turns it into a visual launch-readiness scorecard across trust, tool UX, docs, observability, marketplace readiness, and partnerships. The key point is that MCP launch is not only about whether a server works; it is whether users and partner teams can trust it, understand it, monitor it, and tell a clear story around it.

The live MCP URL is deployed on Manufact Cloud, and the dashboard gives the operational layer: analytics, logs, evals, observability, and deployment status. The widget makes the output concrete inside the MCP client experience, while the companion tools generate partner briefs and compare launch paths across Manufact, ChatGPT Apps, Claude, and generic agent clients.
