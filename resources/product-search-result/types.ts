import { z } from "zod";

export const toolSpecSchema = z.object({
  name: z.string(),
  description: z.string(),
  sideEffect: z.enum(["read", "write", "destructive"]).optional(),
  requiresAuth: z.boolean().optional(),
  externalNetwork: z.boolean().optional(),
  hasTimeout: z.boolean().optional(),
  hasExamples: z.boolean().optional(),
});

export const findingSchema = z.object({
  id: z.string(),
  area: z.enum(["security", "tool-ux", "docs", "observability", "marketplace", "partnerships"]),
  severity: z.enum(["pass", "watch", "fix"]),
  title: z.string(),
  detail: z.string(),
  action: z.string(),
});

export const readinessSchema = z.object({
  id: z.string(),
  label: z.string(),
  score: z.number(),
  summary: z.string(),
});

export const propSchema = z.object({
  serverName: z.string(),
  score: z.number(),
  verdict: z.enum(["launch-ready", "nearly-ready", "needs-hardening"]),
  headline: z.string(),
  summary: z.string(),
  readiness: z.array(readinessSchema),
  findings: z.array(findingSchema),
  priorityActions: z.array(z.string()),
  partnerAngles: z.array(z.string()),
  tools: z.array(toolSpecSchema),
});

export type ProductSearchResultProps = z.infer<typeof propSchema>;
export type Finding = z.infer<typeof findingSchema>;
export type ReadinessArea = z.infer<typeof readinessSchema>;

export type AccordionItemProps = {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
};
