<!-- markdownlint-disable MD013 -->

# MCP Launch Lens — Manufact Application Proof

## Live proof

- **MCP endpoint:** <https://keen-steel-bs1nz.run.mcp-use.com/mcp>
- **Manufact Inspector:** <https://inspector.manufact.com/inspector?autoConnect=https%3A%2F%2Fkeen-steel-bs1nz.run.mcp-use.com%2Fmcp>
- **Manufact Cloud dashboard:** <https://manufact.com/cloud/org-bb5b108a-sifrx/servers/38b23d2a-f688-47b7-8425-59e143dcd6e1>
- **Public repository:** <https://github.com/Niraven/mcp-launch-lens>
- **Widget overview:** [`launch-lens-v1.1-evidence.png`](./launch-lens-v1.1-evidence.png)

## Verified v1.1 behavior

```bash
npm test
# {"empty":34,"strong":91,"weak":44,"unknownSecurity":88,"findings":8}

npm run build
# Build complete; TypeScript type check passed; 1 widget built
```

A local production build was connected through `mcp-use client` and asked to inspect the public Manufact endpoint with the complete evidence set:

```text
server:   mcp-launch-lens
score:    91/100
verdict:  launch-ready
evidence: complete
findings: 6 pass · 0 watch · 0 fix
```

The same build was checked against its failure boundaries:

```text
empty input:      34/100 · insufficient-evidence · insufficient
unknown security: 88/100 overall · 75/100 trust · nearly-ready
                   security-metadata-unknown; no security pass emitted
URL with query:   rejected with a structured MCP tool error
private/reserved: rejected by regression tests
```

`complete` means the required evidence links were supplied. It does not claim that every linked artifact was independently authenticated. The live MCP identity and `tools/list` metadata are inspected directly; external links remain supplied evidence.

## Tool surface

| Tool | Launch job |
| --- | --- |
| `assess-mcp-launch` | Inspect a public endpoint and render the launch scorecard |
| `generate-partner-brief` | Convert technical proof into a concise DevRel/partnership motion |
| `compare-launch-paths` | Choose a path across Manufact Cloud, ChatGPT Apps, Claude Connectors, and generic MCP clients |

## Positioning

MCP Launch Lens is not a generic MCP security scanner. It is a launch-readiness layer for MCP Apps: trust, model-selectable tool UX, documentation, observability, marketplace fit, and partner story.

The product demonstrates the work I want to do at Manufact:

1. understand the protocol and implementation details;
2. make the developer experience concrete and reproducible;
3. expose unknowns instead of hiding them behind a polished score;
4. connect deployment and observability to the product story; and
5. turn technical proof into a partner launch motion.

It builds on my previous MCP work:

- [`@niraven/mcp-gateway`](https://github.com/Niraven/mcp-gateway) — MCP guardrails, approval gates, and run evidence;
- [`myelin`](https://github.com/Niraven/myelin) — MCP-native memory and agent workflow learning; and
- MCP Launch Lens — launch, adoption, and partner proof.

## Loom preflight

Before recording:

1. Open the [Manufact Cloud dashboard](https://manufact.com/cloud/org-bb5b108a-sifrx/servers/38b23d2a-f688-47b7-8425-59e143dcd6e1) in one tab.
2. Open the [Manufact Inspector](https://inspector.manufact.com/inspector?autoConnect=https%3A%2F%2Fkeen-steel-bs1nz.run.mcp-use.com%2Fmcp) in a second tab.
3. Keep the repository README open at the architecture diagram.
4. Prepare the full `assess-mcp-launch` input from the README.
5. Use 125–150% browser zoom if the Inspector widget is visually small.
6. Record one clean take. Do not narrate terminal setup or package installation.

## 90-second Loom script

### 0:00–0:12 — Problem

**Screen:** repository hero and architecture diagram.

> “I built MCP Launch Lens because a successful MCP handshake only proves that a server connects. It does not prove that developers can understand it, users can trust it, or a partner team can launch it.”

### 0:12–0:27 — Live infrastructure

**Screen:** Manufact Cloud dashboard, then the live endpoint.

> “This is a real MCP App deployed on Manufact Cloud. The deployment gives me the public MCP endpoint and the operating layer for logs, analytics, and iteration—not a mocked application screenshot.”

### 0:27–0:47 — Real endpoint inspection

**Screen:** run `assess-mcp-launch` in the Inspector.

> “The assessment connects to a public Streamable HTTP endpoint, initializes an MCP session, and reads the actual paginated `tools/list` surface. It never executes the inspected tools. The request path also rejects private addresses, redirects, credentials in URLs, and query parameters.”

### 0:47–1:08 — Widget and evidence model

**Screen:** score, evidence panel, six readiness cards, then filters.

> “The result is a typed, interactive scorecard across trust, agent tool UX, docs, observability, marketplace readiness, and partner narrative. The important part is the evidence model: endpoint metadata is inspected directly, links are labeled as supplied evidence, and missing proof fails closed. Empty input scores 34—not 90.”

### 1:08–1:22 — DevRel and partnerships

**Screen:** ship plan, `Generate partner brief`, then `compare-launch-paths`.

> “From the same evidence, the app creates a ship plan, drafts a partner brief, and compares the launch path across Manufact, ChatGPT Apps, Claude Connectors, and generic MCP clients. That turns technical readiness into a concrete DevRel motion.”

### 1:22–1:30 — Close

**Screen:** return to the 91/100 overview.

> “This is how I want to contribute at Manufact: understand the protocol deeply, make the product legible, make the proof reproducible, and help developers and partners get from working MCP code to a launch people can trust.”

## Questions this demo should invite

- Which launch-readiness signals could Manufact derive directly from Cloud telemetry?
- How should MCP annotations and auth metadata evolve so clients can reason about risk without guessing?
- Could this become a pre-deploy check, marketplace submission gate, or partner enablement artifact?
- Which proof should remain human-reviewed rather than automatically scored?
