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
version:  1.1.0
score:    89/100
verdict:  nearly-ready
evidence: complete
findings: 5 pass · 1 watch · 0 fix
```

The single watch item is `security-metadata-unknown`: the live protocol advertises open-world behavior for `assess-mcp-launch`, but MCP tool annotations do not independently prove its auth and timeout boundaries. v1.1 therefore refuses to emit `launch-ready` or a security pass until those declarations are explicit.

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
