import type { DiagramType } from "@flowchart/core";

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
];

export function getTemplate(id: string): Template | undefined {
  return TEMPLATES.find((t) => t.id === id);
}
