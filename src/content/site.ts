/*
 * All page content and structure data in one typed module.
 * Components render this; no copy lives in markup.
 */

import type { ImageMetadata } from "astro";
import artifactShot from "../assets/maka-artifact-pane.png";
import permissionShot from "../assets/maka-permission-fresh.png";
import questionShot from "../assets/maka-question-fresh.png";

export const GITHUB_URL = "https://github.com/maka-agent/maka-agent";
export const ARCHITECTURE_URL = `${GITHUB_URL}/blob/main/ARCHITECTURE.md`;

export const SITE_TITLE = "Maka — Your work. Your agent.";
export const SITE_DESCRIPTION =
  "A local-first Agent workspace where tools, permissions, artifacts, and durable progress stay visible.";

/* ————— Navigation ————— */

export interface NavItem {
  label: string;
  key: string;
  href: string;
  external?: boolean;
}

export const NAV: NavItem[] = [
  { label: "WORK", key: "W", href: "#work" },
  { label: "RUNTIME", key: "R", href: "#runtime" },
  { label: "SOURCE", key: "G", href: GITHUB_URL, external: true },
];

/* ————— Work index ————— */

export interface WorkEntry {
  /** Index-row columns, in haoqi's work-list grammar. */
  name: string;
  meta: string;
  tag: string;
  no: string;
  /** Grid recipe: which side carries the frame, which the copy. */
  layout: "wide" | "copy-first" | "frame-first";
  image: ImageMetadata;
  alt: string;
  caption: string;
  heading: string;
  body: string;
  eager?: boolean;
}

export const WORK_ENTRIES: WorkEntry[] = [
  {
    name: "ARTIFACT PANE",
    meta: "TASK / TURN / FILES",
    tag: "ATTACHED",
    no: "№01",
    layout: "wide",
    image: artifactShot,
    alt: "A Maka task where a Tool Call generated three files; the artifact pane shows the files and a Markdown preview beside the conversation.",
    caption: "CONVERSATION → TOOL CALL → ARTIFACT",
    heading: "Work becomes evidence you can inspect.",
    body: "Generated files stay with the turn that made them. Open any artifact, read what ran, and verify what changed — inside the task, not in a downloads folder.",
    eager: true,
  },
  {
    name: "PERMISSION BOUNDARY",
    meta: "FILE EDIT / EXACT DIFF",
    tag: "EXPLICIT",
    no: "№02",
    layout: "copy-first",
    image: permissionShot,
    alt: "Maka's file-edit permission prompt showing the exact proposed diff and explicit deny or allow controls.",
    caption: "ALLOW / DENY · SHOWN BEFORE EXECUTION",
    heading: "Tool Calls cross a visible boundary.",
    body: "Before Maka touches a file, you see the exact proposed change and an explicit allow-or-deny control. Nothing runs behind your back.",
  },
  {
    name: "CLARIFICATION",
    meta: "QUESTION / CHOICES",
    tag: "IN-TASK",
    no: "№03",
    layout: "frame-first",
    image: questionShot,
    alt: "A Maka clarification prompt keeping explicit release choices inside the task conversation.",
    caption: "DECISIONS STAY IN THE RECORD",
    heading: "Questions stay inside the task.",
    body: "When the agent needs a decision, the question and your answer are part of the same record as the work itself — inspectable later, never lost in chat scroll.",
  },
];

/* ————— Runtime ledger ————— */

export interface LedgerStage {
  no: string;
  name: string;
  note: string;
}

export const LEDGER: LedgerStage[] = [
  { no: "01", name: "Request", note: "A turn begins with your intent." },
  { no: "02", name: "AgentRun", note: "Model reasons, tools act." },
  { no: "03", name: "Event Log", note: "Facts append. Nothing rewrites." },
  { no: "04", name: "Projection", note: "Context and UI derive from the log." },
  { no: "05", name: "Recovery", note: "Work survives interruption." },
];

/* ————— Surfaces ————— */

export interface Surface {
  name: string;
  note: string;
}

export const SURFACES: Surface[] = [
  { name: "DESKTOP", note: "The full companion workspace." },
  { name: "TUI", note: "The same tasks in your terminal." },
  { name: "CLI", note: "Scriptable, single-shot runs." },
  { name: "HEADLESS", note: "Embedded and automated execution." },
];
