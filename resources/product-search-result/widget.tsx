import { AppsSDKUIProvider } from "@openai/apps-sdk-ui/components/AppsSDKUIProvider";
import { McpUseProvider, useCallTool, useWidget, useWidgetTheme, type WidgetMetadata } from "mcp-use/react";
import React from "react";
import { Link } from "react-router";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BookOpenText,
  CheckCircle2,
  CircleDot,
  Gauge,
  Handshake,
  Layers3,
  Rocket,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import "../styles.css";
import type { Finding, ProductSearchResultProps, ReadinessArea } from "./types";
import { propSchema } from "./types";

export const widgetMetadata: WidgetMetadata = {
  description: "Interactive MCP Launch Lens scorecard for trust, tool UX, docs, observability, marketplace readiness, and partner narrative.",
  props: propSchema,
  exposeAsTool: false,
  metadata: { prefersBorder: false, invoking: "Scoring MCP launch readiness...", invoked: "Launch scorecard ready" },
};

type LensState = { selectedArea?: string; findingFilter?: "all" | Finding["severity"] };

type BriefContent = { brief?: string } | undefined;

const severityLabel: Record<Finding["severity"], string> = { pass: "Pass", watch: "Watch", fix: "Fix" };
const severityIcon: Record<Finding["severity"], LucideIcon> = { pass: CheckCircle2, watch: CircleDot, fix: AlertTriangle };
const areaIcon: Record<string, LucideIcon> = {
  security: ShieldCheck,
  "tool-ux": Layers3,
  docs: BookOpenText,
  observability: Activity,
  marketplace: Rocket,
  partnerships: Handshake,
};

function scoreTone(score: number) {
  if (score >= 85) return "strong";
  if (score >= 70) return "medium";
  return "weak";
}

function humanVerdict(verdict: ProductSearchResultProps["verdict"]) {
  return verdict.replaceAll("-", " ");
}

function ShellButton({ active, className = "", children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return <button className={`lens-btn ${active ? "lens-btn-active" : ""} ${className}`} type="button" {...props}>{children}</button>;
}

function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "strong" | "medium" | "weak" | Finding["severity"] }) {
  return <span className={`lens-badge lens-badge-${tone}`}>{children}</span>;
}

function ScorePanel({ score, verdict }: { score: number; verdict: ProductSearchResultProps["verdict"] }) {
  const tone = scoreTone(score);
  return <aside className="lens-score-card" aria-label={`Launch readiness score ${score} out of 100`}>
    <div className="lens-score-orbit" style={{ "--score": score } as React.CSSProperties}>
      <div className="lens-score-core">
        <span className="lens-score-number">{score}</span>
        <span className="lens-score-caption">/100</span>
      </div>
    </div>
    <div className="lens-score-meta">
      <Badge tone={tone}>{humanVerdict(verdict)}</Badge>
      <p>Readiness score based on trust, UX, docs, observability, marketplace fit, and partner story.</p>
    </div>
  </aside>;
}

function AreaCard({ area, active, onClick }: { area: ReadinessArea; active: boolean; onClick: () => void }) {
  const Icon = areaIcon[area.id] ?? Gauge;
  const tone = scoreTone(area.score);
  return <button className={`lens-area-card ${active ? "lens-area-card-active" : ""}`} onClick={onClick} type="button">
    <div className="lens-area-card-head">
      <span className={`lens-icon lens-icon-${tone}`}><Icon size={17} strokeWidth={2} /></span>
      <span className="lens-area-score">{area.score}</span>
    </div>
    <h3>{area.label}</h3>
    <p>{area.summary}</p>
    <div className="lens-progress" aria-hidden="true"><span className={`lens-progress-fill lens-progress-${tone}`} style={{ width: `${area.score}%` }} /></div>
  </button>;
}

function FindingCard({ finding }: { finding: Finding }) {
  const Icon = severityIcon[finding.severity];
  return <article className={`lens-finding lens-finding-${finding.severity}`}>
    <div className="lens-finding-topline">
      <Badge tone={finding.severity}><Icon size={13} />{severityLabel[finding.severity]}</Badge>
      <span className="lens-finding-area">{finding.area.replace("tool-", "tool ")}</span>
    </div>
    <h3>{finding.title}</h3>
    <p>{finding.detail}</p>
    <div className="lens-action-row"><ArrowRight size={14} /><span>{finding.action}</span></div>
  </article>;
}

function PriorityPanel({ actions, angles, onGenerate, isPending, brief }: { actions: string[]; angles: string[]; onGenerate: () => void; isPending: boolean; brief?: string }) {
  return <aside className="lens-sidebar">
    <section className="lens-panel">
      <div className="lens-panel-title"><Rocket size={16} /><h2>Ship plan</h2></div>
      <ol className="lens-action-list">{actions.map((action, index) => <li key={action}><span>{index + 1}</span><p>{action}</p></li>)}</ol>
    </section>
    <section className="lens-panel">
      <div className="lens-panel-title"><Handshake size={16} /><h2>Partner story</h2></div>
      <ul className="lens-angle-list">{angles.map((angle) => <li key={angle}>{angle}</li>)}</ul>
      <ShellButton className="lens-primary-action" disabled={isPending} onClick={onGenerate}>
        <Sparkles size={15} />{isPending ? "Writing brief" : "Generate partner brief"}
      </ShellButton>
      {brief && <pre className="lens-brief-preview">{brief}</pre>}
    </section>
  </aside>;
}

const ProductSearchResult: React.FC = () => {
  const { props, isPending, state, setState, sendFollowUpMessage } = useWidget<ProductSearchResultProps, LensState>();
  const theme = useWidgetTheme();
  const { callTool: generatePartnerBrief, data: partnerBrief, isPending: isBriefPending } = useCallTool("generate-partner-brief");

  if (isPending) return <McpUseProvider autoSize><div className="lens-shell lens-shell-loading"><div className="lens-skeleton lens-skeleton-hero" /><div className="lens-skeleton-grid"><div className="lens-skeleton" /><div className="lens-skeleton" /><div className="lens-skeleton" /></div></div></McpUseProvider>;

  const activeArea = state?.selectedArea ?? "all";
  const findingFilter = state?.findingFilter ?? "all";
  const brief = partnerBrief?.structuredContent as BriefContent;
  const counts = props.findings.reduce<Record<string, number>>((acc, finding) => ({ ...acc, [finding.severity]: (acc[finding.severity] ?? 0) + 1 }), {});
  const visibleFindings = props.findings.filter((finding) => (activeArea === "all" || finding.area === activeArea) && (findingFilter === "all" || finding.severity === findingFilter));

  return <McpUseProvider autoSize><AppsSDKUIProvider linkComponent={Link}><main className={`lens-shell lens-theme-${theme}`}>
    <header className="lens-topbar">
      <div className="lens-brand"><span className="lens-brand-mark"><Gauge size={16} /></span><div><strong>MCP Launch Lens</strong><span>Manufact-ready scorecard</span></div></div>
      <div className="lens-topbar-meta"><Badge tone={scoreTone(props.score)}>{props.score}/100</Badge><Badge>{props.tools.length} tools</Badge></div>
    </header>

    <section className="lens-hero">
      <div className="lens-hero-copy">
        <p className="lens-eyebrow">Manufact Cloud · MCP Apps readiness</p>
        <h1>{props.serverName}</h1>
        <p className="lens-summary">{props.summary}</p>
        <div className="lens-hero-actions">
          <ShellButton className="lens-primary-action" onClick={() => sendFollowUpMessage(`Turn ${props.serverName}'s Launch Lens report into a 60-second Manufact application walkthrough.`)}><Sparkles size={15} />Draft walkthrough</ShellButton>
          <ShellButton onClick={() => setState({ ...state, selectedArea: "observability" })}><Activity size={15} />View cloud proof</ShellButton>
        </div>
      </div>
      <ScorePanel score={props.score} verdict={props.verdict} />
    </section>

    <section className="lens-readiness-section" aria-label="Readiness areas">
      <div className="lens-section-heading"><div><p className="lens-eyebrow">Score breakdown</p><h2>Launch-readiness areas</h2></div><ShellButton active={activeArea === "all"} onClick={() => setState({ ...state, selectedArea: "all" })}>All areas</ShellButton></div>
      <div className="lens-readiness-grid">{props.readiness.map((area) => <AreaCard key={area.id} area={area} active={activeArea === area.id} onClick={() => setState({ ...state, selectedArea: area.id })} />)}</div>
    </section>

    <section className="lens-content-grid">
      <div className="lens-findings-column">
        <div className="lens-section-heading lens-findings-heading">
          <div><p className="lens-eyebrow">Findings</p><h2>What needs attention before launch</h2></div>
          <div className="lens-filter-row">
            {(["all", "fix", "watch", "pass"] as const).map((filter) => <ShellButton key={filter} active={findingFilter === filter} onClick={() => setState({ ...state, findingFilter: filter })}>{filter === "all" ? "All" : `${severityLabel[filter]} ${counts[filter] ?? 0}`}</ShellButton>)}
          </div>
        </div>
        <div className="lens-findings">{visibleFindings.map((finding) => <FindingCard key={finding.id} finding={finding} />)}</div>
      </div>
      <PriorityPanel actions={props.priorityActions} angles={props.partnerAngles} isPending={isBriefPending} brief={brief?.brief} onGenerate={() => generatePartnerBrief({ company: "Manufact", serverName: props.serverName, targetClient: "ChatGPT Apps and Claude Connectors" })} />
    </section>
  </main></AppsSDKUIProvider></McpUseProvider>;
};

export default ProductSearchResult;
