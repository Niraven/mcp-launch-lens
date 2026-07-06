import { AppsSDKUIProvider } from "@openai/apps-sdk-ui/components/AppsSDKUIProvider";
import { McpUseProvider, useCallTool, useWidget, useWidgetTheme, type WidgetMetadata } from "mcp-use/react";
import React from "react";
import { Link } from "react-router";
import "../styles.css";
import type { Finding, ProductSearchResultProps, ReadinessArea } from "./types";
import { propSchema } from "./types";

export const widgetMetadata: WidgetMetadata = {
  description: "Interactive MCP Launch Lens scorecard for trust, tool UX, docs, observability, marketplace readiness, and partner narrative.",
  props: propSchema,
  exposeAsTool: false,
  metadata: { prefersBorder: false, invoking: "Scoring MCP launch readiness...", invoked: "Launch scorecard ready" },
};

type LensState = { selectedArea?: string; showOnlyFixes?: boolean };
const severityClass: Record<Finding["severity"], string> = { pass: "lens-chip-pass", watch: "lens-chip-watch", fix: "lens-chip-fix" };
const severityLabel: Record<Finding["severity"], string> = { pass: "pass", watch: "watch", fix: "fix" };

function VerdictBadge({ verdict }: { verdict: ProductSearchResultProps["verdict"] }) {
  return <span className={`lens-verdict lens-verdict-${verdict}`}>{verdict.replaceAll("-", " ")}</span>;
}

function ScoreRing({ score }: { score: number }) {
  return <div className="lens-score-ring" aria-label={`Launch readiness score ${score} out of 100`}><div className="lens-score-inner"><span className="lens-score-number">{score}</span><span className="lens-score-label">/100</span></div></div>;
}

function AreaBar({ area, active, onClick }: { area: ReadinessArea; active: boolean; onClick: () => void }) {
  return <button className={`lens-area ${active ? "lens-area-active" : ""}`} onClick={onClick} type="button"><div className="lens-area-topline"><span>{area.label}</span><strong>{area.score}</strong></div><div className="lens-bar"><span className="lens-bar-fill" style={{ width: `${area.score}%` }} /></div><p>{area.summary}</p></button>;
}

function FindingCard({ finding }: { finding: Finding }) {
  return <article className="lens-finding"><div className="lens-finding-head"><span className={severityClass[finding.severity]}>{severityLabel[finding.severity]}</span><span className="lens-area-label">{finding.area}</span></div><h3>{finding.title}</h3><p>{finding.detail}</p><div className="lens-action">{finding.action}</div></article>;
}

const ProductSearchResult: React.FC = () => {
  const { props, isPending, state, setState, sendFollowUpMessage } = useWidget<ProductSearchResultProps, LensState>();
  const theme = useWidgetTheme();
  const { callTool: generatePartnerBrief, data: partnerBrief, isPending: isBriefPending } = useCallTool("generate-partner-brief");

  if (isPending) return <McpUseProvider autoSize><div className="lens-shell lens-shell-loading"><div className="lens-skeleton lens-skeleton-hero" /><div className="lens-skeleton-grid"><div className="lens-skeleton" /><div className="lens-skeleton" /><div className="lens-skeleton" /></div></div></McpUseProvider>;

  const activeArea = state?.selectedArea ?? "all";
  const showOnlyFixes = state?.showOnlyFixes ?? false;
  const filteredFindings = props.findings.filter((finding) => (activeArea === "all" || finding.area === activeArea) && (!showOnlyFixes || finding.severity !== "pass"));
  const brief = partnerBrief?.structuredContent as { brief?: string } | undefined;

  return <McpUseProvider autoSize><AppsSDKUIProvider linkComponent={Link}><main className={`lens-shell lens-theme-${theme}`}>
    <section className="lens-hero"><div className="lens-ink-mark" aria-hidden="true" /><div className="lens-hero-copy"><p className="lens-eyebrow">Manufact Cloud · MCP Apps readiness</p><h1>{props.serverName}</h1><p className="lens-summary">{props.summary}</p><div className="lens-hero-actions"><VerdictBadge verdict={props.verdict} /><button className="lens-secondary-button" type="button" onClick={() => sendFollowUpMessage(`Turn ${props.serverName}'s Launch Lens report into a 60-second Manufact application walkthrough.`)}>Draft walkthrough</button></div></div><ScoreRing score={props.score} /></section>
    <section className="lens-grid lens-readiness-grid" aria-label="Readiness areas"><button className={`lens-area ${activeArea === "all" ? "lens-area-active" : ""}`} onClick={() => setState({ ...state, selectedArea: "all" })} type="button"><div className="lens-area-topline"><span>All areas</span><strong>{props.score}</strong></div><div className="lens-bar"><span className="lens-bar-fill" style={{ width: `${props.score}%` }} /></div><p>Full launch-readiness view across trust, UX, docs, cloud proof, and partner story.</p></button>{props.readiness.map((area) => <AreaBar key={area.id} area={area} active={activeArea === area.id} onClick={() => setState({ ...state, selectedArea: area.id })} />)}</section>
    <section className="lens-two-column"><div><div className="lens-section-head"><div><p className="lens-eyebrow">Findings</p><h2>What blocks or strengthens launch</h2></div><button className={`lens-toggle ${showOnlyFixes ? "lens-toggle-active" : ""}`} type="button" onClick={() => setState({ ...state, showOnlyFixes: !showOnlyFixes })}>{showOnlyFixes ? "Showing fixes" : "Show fixes"}</button></div><div className="lens-findings">{filteredFindings.map((finding) => <FindingCard key={finding.id} finding={finding} />)}</div></div>
      <aside className="lens-side-panel"><p className="lens-eyebrow">Priority actions</p><ol className="lens-priority-list">{props.priorityActions.map((action) => <li key={action}>{action}</li>)}</ol><p className="lens-eyebrow lens-side-eyebrow">Partner angles</p><ul className="lens-angle-list">{props.partnerAngles.map((angle) => <li key={angle}>{angle}</li>)}</ul><button className="lens-primary-button" type="button" disabled={isBriefPending} onClick={() => generatePartnerBrief({ company: "Manufact", serverName: props.serverName, targetClient: "ChatGPT Apps and Claude Connectors" })}>{isBriefPending ? "Writing brief..." : "Generate partner brief"}</button>{brief?.brief && <pre className="lens-brief-preview">{brief.brief}</pre>}</aside>
    </section>
  </main></AppsSDKUIProvider></McpUseProvider>;
};

export default ProductSearchResult;
