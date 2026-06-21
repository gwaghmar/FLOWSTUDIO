import type { DiagramType } from "@flowchart/core";

export type TemplateCategory = "flowchart" | "sequence" | "architecture" | "erd" | "charts" | "social" | "bpmn" | "orgchart";

export type Template = {
  id: string;
  title: string;
  description: string;
  diagramType: DiagramType;
  themeId: string;
  source: string;
  /** Tailwind gradient classes used for the card thumbnail when no preview exists. */
  gradient: string;
  /** Short use-case tag shown on the card. */
  tag: string;
  /** Filter category for the templates page filter bar. */
  category: TemplateCategory;
};

/**
 * Curated starting points. Hand-crafted to demonstrate quality across diagram
 * types and use-cases. New users fork these as a fast on-ramp.
 */
export const TEMPLATES: Template[] = [
  {
    id: "onboarding-funnel",
    title: "User Onboarding Funnel",
    description: "Map the steps a new signup takes from landing page to activation, with drop-off points called out.",
    diagramType: "mermaid",
    themeId: "stage_pipeline",
    tag: "Product",
    category: "flowchart",
    gradient: "from-indigo-500 via-violet-500 to-fuchsia-500",
    source: `flowchart LR
  L["Landing page"] --> S["Sign up"]
  S --> V{"Email verified?"}
  V -- "No (24% drop)" --> R["Reminder email"]
  R --> V
  V -- "Yes" --> O["Onboarding tour"]
  O --> A["First aha! moment"]
  A --> H["Habit loop"]
  H --> ACT(["Activated"])

  style L fill:#eef2ff,stroke:#6366f1
  style ACT fill:#dcfce7,stroke:#16a34a`,
  },
  {
    id: "oauth-sequence",
    title: "OAuth 2.0 Flow",
    description: "End-to-end auth sequence between browser, your app, and the identity provider — exchange, callback, refresh.",
    diagramType: "mermaid",
    themeId: "stage_pipeline",
    tag: "Engineering",
    category: "sequence",
    gradient: "from-cyan-500 via-sky-500 to-blue-600",
    source: `sequenceDiagram
  participant U as User
  participant B as Browser
  participant A as App Server
  participant I as Identity Provider

  U->>B: Click "Sign in with Google"
  B->>A: GET /auth/start
  A->>B: 302 redirect to IdP authorize URL
  B->>I: GET /authorize?client_id&redirect_uri
  I->>U: Show consent screen
  U->>I: Approve
  I->>B: 302 redirect to /callback?code
  B->>A: GET /callback?code
  A->>I: POST /token (code + client_secret)
  I->>A: access_token + refresh_token
  A->>B: Set session cookie
  B->>U: You're signed in`,
  },
  {
    id: "system-architecture",
    title: "Web App Architecture",
    description: "A standard production stack — clients, edge, app, queue, cache, database, observability.",
    diagramType: "mermaid",
    themeId: "stage_pipeline",
    tag: "Architecture",
    category: "architecture",
    gradient: "from-slate-700 via-slate-600 to-zinc-700",
    source: `flowchart TB
  subgraph Clients
    W[Web]
    M[Mobile]
  end
  subgraph Edge
    CDN[CDN / WAF]
    LB[Load Balancer]
  end
  subgraph App
    API[API Servers]
    Q[(Queue)]
    Worker[Background Workers]
  end
  subgraph Data
    Cache[(Redis)]
    DB[(Postgres)]
    Store[(Object Storage)]
  end
  subgraph Obs[Observability]
    Logs[Logs]
    Metrics[Metrics]
    Trace[Tracing]
  end

  W --> CDN --> LB --> API
  M --> CDN
  API --> Cache
  API --> DB
  API --> Q --> Worker --> DB
  API --> Store
  API -.-> Logs
  API -.-> Metrics
  API -.-> Trace`,
  },
  {
    id: "quarterly-revenue",
    title: "Quarterly Revenue",
    description: "Bar chart comparing four quarters across two segments — ready to drop in a board deck.",
    diagramType: "echarts",
    themeId: "stage_pipeline",
    tag: "Reporting",
    category: "charts",
    gradient: "from-emerald-500 via-teal-500 to-cyan-500",
    source: JSON.stringify({
      title: { text: "Quarterly Revenue ($M)", left: "center" },
      tooltip: { trigger: "axis" },
      legend: { bottom: 0, data: ["Self-serve", "Enterprise"] },
      xAxis: { type: "category", data: ["Q1", "Q2", "Q3", "Q4"] },
      yAxis: { type: "value", name: "Revenue ($M)" },
      series: [
        { name: "Self-serve", type: "bar", data: [4.2, 5.1, 6.8, 8.4], itemStyle: { color: "#6366f1" } },
        { name: "Enterprise", type: "bar", data: [12.1, 13.7, 15.2, 18.6], itemStyle: { color: "#8b5cf6" } },
      ],
      color: ["#6366f1", "#8b5cf6", "#f59e0b", "#10b981"],
    }, null, 2),
  },
  {
    id: "blog-erd",
    title: "Blog Schema (ER)",
    description: "Entity-relationship diagram for a blog: users, posts, comments, tags, with cardinality.",
    diagramType: "mermaid",
    themeId: "stage_pipeline",
    tag: "Data model",
    category: "erd",
    gradient: "from-amber-500 via-orange-500 to-rose-500",
    source: `erDiagram
  USER ||--o{ POST : authors
  USER ||--o{ COMMENT : writes
  POST ||--o{ COMMENT : has
  POST }o--o{ TAG : tagged
  USER {
    uuid id PK
    string email UK
    string name
    timestamp created_at
  }
  POST {
    uuid id PK
    uuid author_id FK
    string title
    text body
    timestamp published_at
  }
  COMMENT {
    uuid id PK
    uuid post_id FK
    uuid author_id FK
    text body
    timestamp created_at
  }
  TAG {
    uuid id PK
    string name UK
  }`,
  },
  {
    id: "release-roadmap",
    title: "Quarterly Roadmap",
    description: "Gantt-style timeline of upcoming work blocks — milestones, dependencies, and target dates.",
    diagramType: "mermaid",
    themeId: "stage_pipeline",
    tag: "Planning",
    category: "flowchart",
    gradient: "from-pink-500 via-rose-500 to-red-500",
    source: `gantt
  title Q3 Roadmap
  dateFormat YYYY-MM-DD
  axisFormat %b
  section Platform
    Auth rewrite          :done,    a1, 2026-07-01, 14d
    Multi-tenant support  :active,  a2, after a1, 21d
    Billing v2            :         a3, after a2, 14d
  section Product
    AI iteration          :done,    p1, 2026-07-01, 28d
    Templates gallery     :active,  p2, after p1, 14d
    Real-time collab      :         p3, after p2, 28d
  section Growth
    Public profiles       :         g1, 2026-08-15, 14d
    Referral program      :         g2, after g1, 14d`,
  },
  {
    id: "timeline_startup_journey",
    title: "Startup journey timeline",
    description: "Milestones from first prototype to 10k users",
    diagramType: "timeline",
    themeId: "stage_pipeline",
    tag: "Story",
    category: "social",
    gradient: "from-sky-500 via-blue-500 to-indigo-500",
    source: JSON.stringify({
      type: "timeline", title: "From idea to 10k users",
      items: [
        { date: "Jan 2025", label: "First prototype" },
        { date: "Mar 2025", label: "Public beta", description: "500 signups in week one" },
        { date: "Jun 2025", label: "Product Hunt #1" },
        { date: "Dec 2025", label: "10,000 users" },
      ],
    }, null, 2),
  },
  {
    id: "versus_remote_office",
    title: "Remote vs Office",
    description: "Side-by-side comparison card",
    diagramType: "versus",
    themeId: "stage_pipeline",
    tag: "Compare",
    category: "social",
    gradient: "from-amber-500 via-orange-500 to-yellow-500",
    source: JSON.stringify({
      type: "versus", title: "Remote vs Office",
      left: { name: "Remote", points: ["No commute", "Deep focus time", "Hire anywhere"] },
      right: { name: "Office", points: ["Faster onboarding", "Spontaneous collaboration", "Clear work-life boundary"] },
    }, null, 2),
  },
  {
    id: "matrix_effort_impact",
    title: "Effort vs impact matrix",
    description: "Prioritize features in a 2x2 quadrant",
    diagramType: "matrix2x2",
    themeId: "stage_pipeline",
    tag: "Strategy",
    category: "social",
    gradient: "from-violet-500 via-purple-500 to-fuchsia-500",
    source: JSON.stringify({
      type: "matrix2x2", title: "Feature priorities",
      xAxis: { low: "Low effort", high: "High effort" },
      yAxis: { low: "Low impact", high: "High impact" },
      items: [
        { label: "Dark mode", x: 20, y: 75 }, { label: "SSO", x: 80, y: 85 },
        { label: "Emoji reactions", x: 15, y: 25 }, { label: "Plugin API", x: 90, y: 40 },
      ],
      quadrantLabels: ["Quick wins", "Big bets", "Fill-ins", "Money pits"],
    }, null, 2),
  },
  {
    id: "funnel_saas_signup",
    title: "SaaS signup funnel",
    description: "Visitors to paid conversions with drop-off notes",
    diagramType: "funnel",
    themeId: "stage_pipeline",
    tag: "Growth",
    category: "social",
    gradient: "from-pink-500 via-rose-500 to-red-500",
    source: JSON.stringify({
      type: "funnel", title: "SaaS signup funnel",
      stages: [
        { label: "Site visitors", value: "40,000" },
        { label: "Started trial", value: "2,400", note: "6% conversion" },
        { label: "Activated", value: "1,100" },
        { label: "Paid plan", value: "310" },
      ],
    }, null, 2),
  },
  {
    id: "venn_design_engineering",
    title: "Design vs Engineering",
    description: "Map shared skills and unique strengths between two disciplines — works for any cross-functional comparison.",
    diagramType: "venn",
    themeId: "stage_pipeline",
    tag: "Team",
    category: "social",
    gradient: "from-indigo-500 via-violet-500 to-purple-500",
    source: JSON.stringify({
      type: "venn",
      title: "Design vs Engineering",
      sets: [
        { label: "Design", items: ["Visual craft", "Prototyping", "UX research"] },
        { label: "Engineering", items: ["Systems thinking", "Performance", "Code review"] },
      ],
      intersection: ["Communication", "Problem solving", "Empathy"],
    }, null, 2),
  },
  {
    id: "tierlist_saas_tools",
    title: "SaaS Tools Tier List",
    description: "Rate your stack from S-tier essentials to D-tier regrets — great for team retros or gear posts.",
    diagramType: "tierlist",
    themeId: "stage_pipeline",
    tag: "Tools",
    category: "social",
    gradient: "from-red-500 via-orange-400 to-yellow-400",
    source: JSON.stringify({
      type: "tierlist",
      title: "Our SaaS Stack",
      tiers: [
        { label: "S", items: ["Linear", "Vercel", "Supabase"] },
        { label: "A", items: ["GitHub", "Figma", "Notion"] },
        { label: "B", items: ["Slack", "Loom"] },
        { label: "C", items: ["Jira", "Confluence"] },
      ],
    }, null, 2),
  },
  {
    id: "iceberg_startup_work",
    title: "Startup work iceberg",
    description: "What investors see vs the real iceberg of unglamorous work under the surface.",
    diagramType: "iceberg",
    themeId: "stage_pipeline",
    tag: "Story",
    category: "social",
    gradient: "from-sky-400 via-blue-500 to-blue-900",
    source: JSON.stringify({
      type: "iceberg",
      title: "Startup work iceberg",
      layers: [
        { label: "What investors see", items: ["Revenue growth", "Product demos", "Press mentions"] },
        { label: "Just below the surface", items: ["Customer interviews", "Hiring", "Fundraising prep"] },
        { label: "Deep water", items: ["Late-night debugging", "Churn analysis", "Rewriting the auth flow again"] },
      ],
    }, null, 2),
  },
  {
    id: "alignment_developer",
    title: "Developer alignment chart",
    description: "The classic 3x3 alignment chart applied to developer archetypes — swap in your own cast.",
    diagramType: "alignment",
    themeId: "stage_pipeline",
    tag: "Fun",
    category: "social",
    gradient: "from-slate-700 via-slate-600 to-slate-500",
    source: JSON.stringify({
      type: "alignment",
      title: "Developer Alignment Chart",
      xAxis: ["Lawful", "Neutral", "Chaotic"],
      yAxis: ["Good", "Neutral", "Evil"],
      cells: [
        { x: 0, y: 0, label: "DevOps", description: "Writes runbooks for fun" },
        { x: 1, y: 0, label: "Open Source Maintainer", description: "Responds to every issue" },
        { x: 2, y: 0, label: "10x Hacker", description: "Ships at 3am, no PR" },
        { x: 0, y: 1, label: "Tech Lead", description: "RFC-first, always" },
        { x: 1, y: 1, label: "Backend Dev", description: "Just writes the SQL" },
        { x: 2, y: 1, label: "Cowboy Coder", description: "YOLO to production" },
        { x: 0, y: 2, label: "Enterprise Architect", description: "Diagrams without code" },
        { x: 1, y: 2, label: "DBA", description: "Deletes your index" },
        { x: 2, y: 2, label: "Sneaky PM", description: "Moves the deadline quietly" },
      ],
    }, null, 2),
  },
  {
    id: "budget_monthly",
    title: "Monthly budget breakdown",
    description: "Visualize where your money goes — income split across rent, food, savings, and more.",
    diagramType: "budget",
    themeId: "stage_pipeline",
    tag: "Finance",
    category: "social",
    gradient: "from-emerald-500 via-teal-500 to-cyan-500",
    source: JSON.stringify({
      type: "budget",
      title: "Monthly Budget",
      total: "$5,000",
      categories: [
        { label: "Rent", percent: 36, amount: "$1,800" },
        { label: "Food", percent: 12, amount: "$600" },
        { label: "Transport", percent: 6, amount: "$300" },
        { label: "Savings", percent: 20, amount: "$1,000" },
        { label: "Other", percent: 26, amount: "$1,300" },
      ],
    }, null, 2),
  },
  {
    id: "habits_reading",
    title: "30-day reading streak",
    description: "A GitHub-style grid tracking your daily reading habit for the whole month.",
    diagramType: "habits",
    themeId: "stage_pipeline",
    tag: "Wellness",
    category: "social",
    gradient: "from-indigo-500 via-blue-500 to-violet-500",
    source: JSON.stringify({
      type: "habits",
      title: "Reading streak — June 2025",
      habit: "Read 30 min",
      month: "June 2025",
      days: [
        { day: 1, done: true }, { day: 2, done: true }, { day: 3, done: false },
        { day: 4, done: true }, { day: 5, done: true }, { day: 6, done: true },
        { day: 7, done: false }, { day: 8, done: true }, { day: 9, done: true },
        { day: 10, done: true }, { day: 11, done: false }, { day: 12, done: true },
        { day: 13, done: true }, { day: 14, done: true }, { day: 15, done: true },
        { day: 16, done: false }, { day: 17, done: true }, { day: 18, done: true },
        { day: 19, done: true }, { day: 20, done: false }, { day: 21, done: true },
        { day: 22, done: true }, { day: 23, done: true }, { day: 24, done: false },
        { day: 25, done: true }, { day: 26, done: true }, { day: 27, done: true },
        { day: 28, done: false }, { day: 29, done: true }, { day: 30, done: true },
      ],
    }, null, 2),
  },
  {
    id: "bingo_startup",
    title: "Startup bingo card",
    description: "The classic startup buzzword bingo — print it out for your next pitch event.",
    diagramType: "bingo",
    themeId: "stage_pipeline",
    tag: "Fun",
    category: "social",
    gradient: "from-amber-500 via-orange-500 to-yellow-400",
    source: JSON.stringify({
      type: "bingo",
      title: "Startup Bingo",
      squares: [
        "Pivoted twice", "MVP in a week", "YC rejection", "Side project", "10x engineer",
        "Move fast", "Disrupting", "Synergy", "AI wrapper", "Blockchain",
        "Hockey stick", "Unicorn", "FREE", "Series A", "Burn rate",
        "Runway", "PMF", "TAM SAM SOM", "Cold email", "Demo day",
        "ARR", "Exit strategy", "Iterate", "Founder mode", "Zero to one",
      ],
    }, null, 2),
  },
  {
    id: "bracket_frameworks",
    title: "JS framework bracket",
    description: "Who wins the ultimate JavaScript framework tournament? Fill in your own results.",
    diagramType: "bracket",
    themeId: "stage_pipeline",
    tag: "Engineering",
    category: "social",
    gradient: "from-red-500 via-rose-500 to-pink-500",
    source: JSON.stringify({
      type: "bracket",
      title: "Best JS Framework",
      rounds: [
        { name: "Quarterfinals", matches: [
          { a: "React", b: "Angular", winner: "React" },
          { a: "Vue", b: "Ember", winner: "Vue" },
          { a: "Svelte", b: "Preact", winner: "Svelte" },
          { a: "Solid", b: "Qwik", winner: "Solid" },
        ]},
        { name: "Semifinals", matches: [
          { a: "React", b: "Vue", winner: "React" },
          { a: "Svelte", b: "Solid" },
        ]},
        { name: "Final", matches: [
          { a: "React", b: "Svelte" },
        ]},
      ],
    }, null, 2),
  },
];

export function getTemplate(id: string): Template | undefined {
  return TEMPLATES.find((t) => t.id === id);
}
