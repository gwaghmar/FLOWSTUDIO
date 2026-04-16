/** All diagram types supported by the application */

export type DiagramType =
  | "mermaid"        // Text-based: flowchart, sequence, ERD, gantt, mindmap, class, etc.
  | "excalidraw"     // Hand-drawn whiteboard canvas
  | "reactflow"      // Interactive node/edge graphs
  | "echarts"        // Data visualizations: bar, line, pie, radar, heatmap, etc.
  | "nivo"           // Beautiful statistical charts
  | "tldraw"         // Figma-like infinite canvas
  | "bpmn";          // Business Process Model and Notation

export type DiagramCategory =
  | "whiteboard"
  | "flowchart"
  | "data"
  | "technical"
  | "business";

export type DiagramTypeMeta = {
  id: DiagramType;
  label: string;
  description: string;
  category: DiagramCategory;
  icon: string;
  color: string;
  subtypes?: string[];
  aiOutputFormat: "mermaid" | "excalidraw-json" | "reactflow-json" | "echarts-json" | "nivo-json" | "tldraw-json" | "bpmn-xml";
};

export const DIAGRAM_TYPE_META: DiagramTypeMeta[] = [
  {
    id: "mermaid",
    label: "Text flowcharts",
    description: "Flowcharts, sequence, ERD, Gantt, mindmap, class, state, C4",
    category: "technical",
    icon: "git-fork",
    color: "#6366f1",
    subtypes: ["flowchart", "sequenceDiagram", "erDiagram", "gantt", "mindmap", "classDiagram", "stateDiagram-v2", "timeline", "C4Context"],
    aiOutputFormat: "mermaid",
  },
  {
    id: "excalidraw",
    label: "Whiteboard",
    description: "Hand-drawn style canvas — brainstorming, sketches, wireframes",
    category: "whiteboard",
    icon: "pencil-ruler",
    color: "#f59e0b",
    aiOutputFormat: "excalidraw-json",
  },
  {
    id: "reactflow",
    label: "Node Graph",
    description: "Interactive node/edge diagrams — org charts, pipelines, networks",
    category: "flowchart",
    icon: "network",
    color: "#10b981",
    subtypes: ["orgchart", "pipeline", "network", "tree", "swimlane"],
    aiOutputFormat: "reactflow-json",
  },
  {
    id: "echarts",
    label: "Data Charts",
    description: "Bar, line, pie, scatter, radar, heatmap, treemap, sankey, funnel, gauge",
    category: "data",
    icon: "bar-chart-2",
    color: "#3b82f6",
    subtypes: ["bar", "line", "pie", "scatter", "radar", "heatmap", "treemap", "sankey", "funnel", "gauge", "candlestick", "map"],
    aiOutputFormat: "echarts-json",
  },
  {
    id: "nivo",
    label: "Beautiful Charts",
    description: "Publication-quality charts with smooth animations",
    category: "data",
    icon: "area-chart",
    color: "#8b5cf6",
    subtypes: ["bar", "line", "pie", "radar", "treemap", "sankey", "network", "chord", "calendar", "stream", "waffle"],
    aiOutputFormat: "nivo-json",
  },
  {
    id: "tldraw",
    label: "Design Canvas",
    description: "Figma-like infinite canvas — mockups, diagrams, presentations",
    category: "whiteboard",
    icon: "layout-template",
    color: "#ec4899",
    aiOutputFormat: "tldraw-json",
  },
  {
    id: "bpmn",
    label: "BPMN Process",
    description: "Business Process Model and Notation — enterprise workflows",
    category: "business",
    icon: "workflow",
    color: "#64748b",
    aiOutputFormat: "bpmn-xml",
  },
];

export function getDiagramTypeMeta(id: DiagramType): DiagramTypeMeta {
  return DIAGRAM_TYPE_META.find((d) => d.id === id) ?? DIAGRAM_TYPE_META[0];
}

/** System prompts for AI generation per diagram type */
export const DIAGRAM_SYSTEM_PROMPTS: Record<DiagramType, string> = {
  mermaid: `You output ONLY valid Mermaid diagram source. No markdown code fences, no explanation, no prose — raw syntax only.

SUBTYPE SELECTION — choose the best type for the user's intent:
- "flowchart TD" or "flowchart LR" → process flows, pipelines, decision trees, general diagrams
- "sequenceDiagram" → API calls, authentication flows, actor interactions, request/response cycles
- "erDiagram" → database schemas, data models, table relationships
- "gantt" → project plans, schedules, timelines with dates
- "mindmap" → brainstorming, topic breakdowns, concept maps
- "classDiagram" → OOP class hierarchies, object models, interfaces
- "stateDiagram-v2" → state machines, FSMs, lifecycle flows
- "timeline" → historical events, milestones, roadmaps (no dates needed)
- "C4Context" → system context diagrams (people, systems, external deps)
- "gitGraph" → git branching strategies, release flows

QUALITY RULES:
- Reflect user intent exactly — no invented branches, no filler nodes
- Use meaningful verb+object labels on nodes ("Validate Input", "Send Email")
- Use edge labels to explain transitions ("on success", "if error", "returns 200")
- For flowcharts: use subgraphs to group related steps; classDef for color-coding
- For sequences: use proper activate/deactivate for async; note over for annotations
- Short requests → concise but complete; detailed requests → richer structure

SYNTAX RULES (parse failures are common here — follow exactly):
- Node labels with parens/brackets MUST use quotes: A["Label (with parens)"]
- classDef lines MUST appear before any class assignment (:::className)
- gantt: dateFormat line MUST be the first line after "gantt" keyword
- Edge labels: use either A -->|label| B  OR  A -- label --> B — never mix in same diagram
- sequenceDiagram participants must be declared before use if they have spaces in names
- Subgraph IDs must be unique and must NOT reuse any node ID in the diagram
- stateDiagram-v2: use [*] for start/end states; --> for transitions

FEW-SHOT EXAMPLES:

User: "User login flow"
Output:
flowchart TD
    A([Start]) --> B[/Enter credentials/]
    B --> C{Valid?}
    C -->|Yes| D[Create session]
    C -->|No| E[Show error]
    E --> B
    D --> F([Dashboard])
    classDef decision fill:#fef3c7,stroke:#d97706
    class C decision

User: "Auth API sequence"
Output:
sequenceDiagram
    actor User
    participant Frontend
    participant AuthAPI
    participant DB
    User->>Frontend: Submit login form
    Frontend->>AuthAPI: POST /auth/login
    AuthAPI->>DB: Query user by email
    DB-->>AuthAPI: User record
    AuthAPI->>AuthAPI: Verify password hash
    alt Valid credentials
        AuthAPI-->>Frontend: 200 JWT token
        Frontend-->>User: Redirect to dashboard
    else Invalid
        AuthAPI-->>Frontend: 401 Unauthorized
        Frontend-->>User: Show error message
    end

User: "Products database schema"
Output:
erDiagram
    USERS {
        uuid id PK
        string email UK
        string name
        timestamp created_at
    }
    PRODUCTS {
        uuid id PK
        string name
        decimal price
        int stock
        uuid category_id FK
    }
    CATEGORIES {
        uuid id PK
        string name
    }
    ORDERS {
        uuid id PK
        uuid user_id FK
        decimal total
        string status
        timestamp placed_at
    }
    ORDER_ITEMS {
        uuid id PK
        uuid order_id FK
        uuid product_id FK
        int quantity
        decimal unit_price
    }
    USERS ||--o{ ORDERS : "places"
    ORDERS ||--|{ ORDER_ITEMS : "contains"
    PRODUCTS ||--o{ ORDER_ITEMS : "included in"
    CATEGORIES ||--o{ PRODUCTS : "groups"`,

  excalidraw: `You output ONLY valid JSON for Excalidraw. No explanation, no markdown.
Design quality rules:
- Build coherent left-to-right or top-to-bottom flow with clear entry and exit.
- Keep spacing balanced and prevent visual overlap.
- Use color only to encode categories, not decoration.
- If detail is high, add grouped sections and explicit edge labels.
The JSON must have this exact structure:
{
  "type": "excalidraw",
  "version": 2,
  "elements": [...],
  "appState": { "viewBackgroundColor": "#ffffff" }
}
Each element must have: id (string), type ("rectangle"|"ellipse"|"diamond"|"arrow"|"line"|"text"|"freedraw"), x (number), y (number), width (number), height (number), angle (0), strokeColor ("#1e1e1e"), backgroundColor ("transparent" or hex), fillStyle ("solid"), strokeWidth (2), roughness (1), opacity (100), groupIds ([]), roundness (null or {"type":3}), text (for text elements), fontSize (20 for text), fontFamily (1), textAlign ("center").
For arrows: add "startBinding" and "endBinding" with elementId pointing to connected shapes, and "points": [[0,0],[dx,dy]]. CRITICAL: points are RELATIVE vectors from the arrow's x,y origin — [0,0] is the start anchor, [deltaX,deltaY] is the end offset. Calculate as: deltaX = targetCenterX - arrowX, deltaY = targetCenterY - arrowY.
Layout elements with good spacing (min 200px between boxes). Use colors to distinguish categories.`,

  reactflow: `You output ONLY valid JSON for React Flow. No explanation, no markdown.
Design quality rules:
- Ensure nodes/edges represent the user flow exactly, not generic filler.
- Include explicit start and end states where applicable.
- Avoid edge crossing where possible; keep rank-aligned lanes.
The JSON must have this exact structure:
{
  "nodes": [
    { "id": "1", "type": "default", "position": { "x": 0, "y": 0 }, "data": { "label": "Node Name", "description": "", "color": "#6366f1" } }
  ],
  "edges": [
    { "id": "e1-2", "source": "1", "target": "2", "label": "edge label", "animated": false, "type": "smoothstep" }
  ]
}
Node types: "default" (rounded box), "input" (start node, no incoming), "output" (end node, no outgoing), "group" (container).
Use good x/y positioning with ~200px horizontal and ~100px vertical spacing.
Use colors in node data.color to distinguish categories (#6366f1 blue, #10b981 green, #f59e0b amber, #ef4444 red, #8b5cf6 purple).`,

  echarts: `You output ONLY valid Apache ECharts option JSON. No explanation, no markdown.
Design quality rules:
- Choose chart type based on semantics, not randomly.
- Keep titles, legends, and axes readable and consistent.
- For sparse input, produce a clean minimal chart; for detailed input, include richer labeling and meaningful series grouping.
The JSON is a complete ECharts option object:
{
  "title": { "text": "Chart Title", "subtext": "optional subtitle" },
  "tooltip": { "trigger": "axis" },
  "legend": { "data": [...] },
  "xAxis": { "type": "category", "data": [...] },
  "yAxis": { "type": "value" },
  "series": [...]
}
Choose the best chart type for the data: bar, line, pie, scatter, radar, heatmap, treemap, sankey, funnel, gauge, candlestick.
For pie charts omit xAxis/yAxis. For radar use "radar" key instead of axis.
Make it visually beautiful: include title with left:center when appropriate, grid with containLabel, tooltip axisPointer shadow for bars, rounded bars (itemStyle.borderRadius or barBorderRadius), smooth lines (smooth: true), optional areaStyle for area charts.
Use a rich color palette: ["#6366f1","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#f97316","#84cc16"].
CRITICAL — sankey: series[0].data is [{"name":"NodeName"}] and series[0].links is [{"source":"NodeName","target":"NodeName","value":number}]. source/target must be exact string names — NOT integer indices.
CRITICAL — treemap: series[0].data is [{"name":"category","value":number}] or nested [{"name":"group","children":[{"name":"item","value":number}]}]. No xAxis/yAxis for treemap.`,

  nivo: `You output ONLY valid JSON for Nivo charts. No explanation, no markdown.
Design quality rules:
- Match chart type to intent and data structure.
- Keep labels and keys semantically meaningful.
- Use concise structure for short prompts and richer comparative structure for detailed prompts.
The JSON must have this exact structure:
{
  "type": "bar"|"line"|"pie"|"radar"|"treemap"|"sankey"|"network"|"chord"|"calendar"|"stream"|"waffle",
  "data": [...],
  "keys": [...],
  "indexBy": "...",
  "colors": { "scheme": "nivo" }
}
For bar: data is array of objects with indexBy field + numeric keys. keys is array of series names.
For line: data is array of { "id": "series", "data": [{"x":"label","y":number}] }.
For pie: data is array of { "id": "label", "value": number, "label": "label" }.
For radar: data is array of objects, keys are the radar axes.
For treemap: data is { "name": "root", "children": [{ "name": "...", "value": number }] }.
For sankey: data is { "nodes": [{"id":"..."}], "links": [{"source":"...","target":"...","value":number}] }. source/target are node id strings — NOT indices.
For calendar: data is [{"day":"YYYY-MM-DD","value":number}]. Also add top-level "from":"YYYY-MM-DD" and "to":"YYYY-MM-DD" alongside "data".
For waffle: data is [{"id":"label","value":number,"label":"label"}]. Also add top-level "total":number, "rows":number, "columns":number.
For chord: data is a square matrix (array of arrays of numbers). Also add top-level "keys":["A","B",...] matching matrix dimensions.
For network: data is { "nodes":[{"id":"...","radius":number,"color":"hex"}], "links":[{"source":"nodeId","target":"nodeId","distance":number}] }.
Choose beautiful Nivo color schemes: "nivo", "category10", "accent", "dark2", "paired", "pastel1", "set1", "spectral".`,

  tldraw: `You output ONLY valid JSON for tldraw. No explanation, no markdown.
Design quality rules:
- Build intentional composition with readable flow and hierarchy.
- Keep objects aligned and spaced consistently.
- Use text labels that map directly to user concepts.
IMPORTANT: Use the simplified elements[] format below — the renderer converts it to tldraw's native store format automatically. Do NOT output tldraw's native document.store keyed-record format.
The JSON must have this exact structure:
{
  "elements": [
    {
      "id": "shape:unique-id",
      "type": "geo",
      "x": 100,
      "y": 100,
      "rotation": 0,
      "props": {
        "geo": "rectangle",
        "w": 200,
        "h": 80,
        "text": "Label",
        "color": "blue",
        "fill": "solid",
        "dash": "draw",
        "size": "m",
        "font": "sans"
      }
    }
  ]
}
Geo types: rectangle, ellipse, triangle, diamond, pentagon, hexagon, star, cloud, arrow-left, arrow-right, check-box, x-box.
Colors: blue, green, red, orange, yellow, violet, light-blue, light-green, light-red, light-orange, light-yellow, light-violet, black, grey, white.
For arrows use type "arrow" with props: { start: {x,y}, end: {x,y}, color, size }.
For text use type "text" with props: { text, color, size, font }.
Assign each shape a unique id like "shape:1", "shape:2", etc. Use generous spacing (200–300px) between shapes for readability.`,

  bpmn: `You output ONLY valid BPMN 2.0 XML. No explanation, no markdown, no code fences.
Design quality rules:
- Model true business flow with explicit gateways, happy path, and exception/alternate paths when requested.
- Name tasks with clear business actions.
- Keep BPMNDI coordinates readable and non-overlapping.

Hard requirements:
- Output must start with: <?xml version="1.0" encoding="UTF-8"?>
- Root element must be <bpmn2:definitions ...> (use prefix bpmn2)
- Include these namespaces on <bpmn2:definitions> exactly:
  xmlns:bpmn2="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
  targetNamespace="http://bpmn.io/schema/bpmn"
- Every XML tag must be closed. No stray angle brackets. No invalid nesting.

Semantic requirements:
- Include exactly one <bpmn2:process id="Process_1" ...> and reference it from bpmndi:BPMNPlane bpmnElement="Process_1"
- Every sequenceFlow must have valid sourceRef and targetRef IDs that exist.
- Include BPMNDI layout (BPMNDiagram/BPMNPlane/BPMNShape/BPMNEdge) so it renders in bpmn.io viewers.

Use proper BPMN elements: startEvent, endEvent, task, userTask, serviceTask, exclusiveGateway, parallelGateway, sequenceFlow, subProcess, lane, laneSet.
Example structure:
<?xml version="1.0" encoding="UTF-8"?>
<bpmn2:definitions xmlns:bpmn2="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="sample-diagram" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn2:process id="Process_1" isExecutable="false">
    <bpmn2:startEvent id="StartEvent_1" name="Start"/>
    <bpmn2:task id="Task_1" name="Task Name"/>
    <bpmn2:endEvent id="EndEvent_1" name="End"/>
    <bpmn2:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="Task_1"/>
    <bpmn2:sequenceFlow id="Flow_2" sourceRef="Task_1" targetRef="EndEvent_1"/>
  </bpmn2:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="StartEvent_1_di" bpmnElement="StartEvent_1"><dc:Bounds x="152" y="82" width="36" height="36"/></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_1_di" bpmnElement="Task_1"><dc:Bounds x="240" y="60" width="100" height="80"/></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="EndEvent_1_di" bpmnElement="EndEvent_1"><dc:Bounds x="392" y="82" width="36" height="36"/></bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1"><di:waypoint x="188" y="100"/><di:waypoint x="240" y="100"/></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2"><di:waypoint x="340" y="100"/><di:waypoint x="392" y="100"/></bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn2:definitions>`,
};

// ─── Mermaid subtypes ────────────────────────────────────────────────────────

export type MermaidSubtype =
  | "flowchart"
  | "sequence"
  | "er"
  | "gantt"
  | "mindmap"
  | "class"
  | "state"
  | "timeline"
  | "c4"
  | "git";

export type MermaidSubtypeMeta = {
  id: MermaidSubtype;
  label: string;
  icon: string; // lucide icon name
  starter: string;
  quickPrompts: string[];
  /** Prepended to the user's AI prompt to steer the model toward this subtype */
  aiHint: string;
};

export const MERMAID_SUBTYPE_META: MermaidSubtypeMeta[] = [
  {
    id: "flowchart",
    label: "Flowchart",
    icon: "git-fork",
    starter: `flowchart TD
    A([Start]) --> B{Decision}
    B -->|Yes| C[Action A]
    B -->|No| D[Action B]
    C --> E([End])
    D --> E
    classDef decision fill:#fef3c7,stroke:#d97706
    class B decision`,
    quickPrompts: [
      "User registration flow",
      "Order processing steps",
      "Support ticket lifecycle",
      "CI/CD pipeline stages",
    ],
    aiHint: "Generate a Mermaid flowchart TD diagram for the following. Use subgraphs to group related steps, classDef for color-coding, and meaningful verb+object node labels. Output only valid Mermaid syntax:\n",
  },
  {
    id: "sequence",
    label: "Sequence",
    icon: "arrow-right-left",
    starter: `sequenceDiagram
    actor User
    participant Frontend
    participant API
    participant DB
    User->>Frontend: Submit form
    Frontend->>API: POST /submit
    API->>DB: INSERT record
    DB-->>API: 201 Created
    API-->>Frontend: { id, status }
    Frontend-->>User: Show confirmation`,
    quickPrompts: [
      "User login with JWT",
      "Payment checkout flow",
      "OAuth2 authorization code",
      "REST API request lifecycle",
    ],
    aiHint: "Generate a Mermaid sequenceDiagram for the following. Use actor for humans, participant for systems, activate/deactivate for async, alt/else for branches. Output only valid Mermaid syntax:\n",
  },
  {
    id: "er",
    label: "ERD",
    icon: "table-2",
    starter: `erDiagram
    USERS {
        uuid id PK
        string email UK
        string name
        timestamp created_at
    }
    POSTS {
        uuid id PK
        uuid author_id FK
        string title
        text body
        timestamp published_at
    }
    COMMENTS {
        uuid id PK
        uuid post_id FK
        uuid author_id FK
        text content
    }
    USERS ||--o{ POSTS : "writes"
    USERS ||--o{ COMMENTS : "writes"
    POSTS ||--o{ COMMENTS : "has"`,
    quickPrompts: [
      "E-commerce product catalog",
      "Blog with users and posts",
      "Multi-tenant SaaS schema",
      "Inventory management DB",
    ],
    aiHint: "Generate a Mermaid erDiagram for the following database schema. Include PK/FK/UK annotations, proper cardinality (||--o{, }|--|{, etc.), and relationship labels. Output only valid Mermaid syntax:\n",
  },
  {
    id: "gantt",
    label: "Gantt",
    icon: "calendar-range",
    starter: `gantt
    title Project Roadmap
    dateFormat YYYY-MM-DD
    section Planning
        Requirements    :done, req, 2025-01-01, 14d
        Architecture    :done, arch, after req, 7d
    section Development
        Backend API     :active, api, after arch, 30d
        Frontend UI     :ui, after arch, 25d
        Integration     :int, after api, 10d
    section Launch
        QA & Testing    :qa, after int, 14d
        Production      :prod, after qa, 3d`,
    quickPrompts: [
      "6-month product roadmap",
      "Sprint planning for Q1",
      "Website redesign timeline",
      "Software release schedule",
    ],
    aiHint: "Generate a Mermaid gantt chart for the following. Use dateFormat YYYY-MM-DD, sections for phases, :done/:active statuses, and 'after taskId' for dependencies. Output only valid Mermaid syntax:\n",
  },
  {
    id: "mindmap",
    label: "Mind Map",
    icon: "brain",
    starter: `mindmap
  root((Product Strategy))
    Market
      Segments
      Competitors
      Pricing
    Users
      Personas
      Pain Points
      Jobs to be Done
    Features
      Core
      Differentiators
      Roadmap
    Growth
      Acquisition
      Retention
      Revenue`,
    quickPrompts: [
      "System design concepts",
      "Company org breakdown",
      "Feature brainstorm",
      "Learning topics outline",
    ],
    aiHint: "Generate a Mermaid mindmap for the following. Use root((Title)) at center, indent children with spaces (not tabs), max 4 levels deep. Output only valid Mermaid syntax:\n",
  },
  {
    id: "class",
    label: "Class",
    icon: "box",
    starter: `classDiagram
    class Animal {
        +String name
        +int age
        +makeSound() String
    }
    class Dog {
        +String breed
        +fetch() void
    }
    class Cat {
        +bool indoor
        +purr() void
    }
    class Owner {
        +String name
        +List~Animal~ pets
        +adopt(animal Animal) void
    }
    Animal <|-- Dog
    Animal <|-- Cat
    Owner "1" --> "*" Animal : owns`,
    quickPrompts: [
      "REST API controller hierarchy",
      "Authentication class model",
      "E-commerce domain classes",
      "Design pattern example",
    ],
    aiHint: "Generate a Mermaid classDiagram for the following. Use +/-/# visibility, <<interface>> / <<abstract>> annotations, and cardinality on relationships. Output only valid Mermaid syntax:\n",
  },
  {
    id: "state",
    label: "State",
    icon: "activity",
    starter: `stateDiagram-v2
    [*] --> Draft
    Draft --> Review : submit
    Review --> Approved : approve
    Review --> Draft : request changes
    Approved --> Published : publish
    Published --> Archived : archive
    Approved --> Draft : revoke
    Archived --> [*]
    note right of Review : Requires 2 approvals`,
    quickPrompts: [
      "Order lifecycle states",
      "User account status",
      "Pull request workflow",
      "Subscription state machine",
    ],
    aiHint: "Generate a Mermaid stateDiagram-v2 for the following. Use [*] for start/end, --> for transitions with labels, note for annotations, state{} for composite states where helpful. Output only valid Mermaid syntax:\n",
  },
  {
    id: "timeline",
    label: "Timeline",
    icon: "milestone",
    starter: `timeline
    title Company History
    2018 : Founded
         : Seed funding ($500K)
    2019 : First 100 customers
         : Hired core team
    2020 : Series A ($5M)
         : Remote-first pivot
    2021 : Launched mobile app
         : 10K users
    2022 : Series B ($20M)
         : International expansion
    2023 : 100K users
         : Profitable`,
    quickPrompts: [
      "Product launch milestones",
      "Company founding history",
      "Technology evolution",
      "Project delivery timeline",
    ],
    aiHint: "Generate a Mermaid timeline for the following. Each year/period on its own line, with events indented below. No dates needed for events. Output only valid Mermaid syntax:\n",
  },
  {
    id: "c4",
    label: "C4",
    icon: "layers",
    starter: `C4Context
    title System Context — E-Commerce Platform
    Person(customer, "Customer", "Buys products online")
    Person(admin, "Admin", "Manages catalog and orders")
    System(web, "Web Shop", "React frontend + Next.js API")
    System_Ext(stripe, "Stripe", "Payment processing")
    System_Ext(sendgrid, "SendGrid", "Transactional email")
    SystemDb(db, "PostgreSQL", "Orders, products, users")
    Rel(customer, web, "Browses, orders")
    Rel(admin, web, "Manages inventory")
    Rel(web, stripe, "Charges cards", "HTTPS")
    Rel(web, sendgrid, "Sends receipts", "HTTPS")
    Rel(web, db, "Reads/writes", "SQL")`,
    quickPrompts: [
      "SaaS platform context",
      "Microservices overview",
      "Mobile app architecture",
      "Data pipeline systems",
    ],
    aiHint: "Generate a Mermaid C4Context diagram for the following system. Use Person() for users, System() for the main system, System_Ext() for external services, SystemDb() for databases, Rel() for relationships. Output only valid Mermaid syntax:\n",
  },
  {
    id: "git",
    label: "Git Graph",
    icon: "git-branch",
    starter: `gitGraph
    commit id: "init"
    branch develop
    checkout develop
    commit id: "feat: auth"
    commit id: "feat: dashboard"
    branch feature/payments
    checkout feature/payments
    commit id: "feat: stripe integration"
    commit id: "feat: webhooks"
    checkout develop
    merge feature/payments id: "merge payments"
    checkout main
    merge develop id: "v1.0.0" tag: "v1.0.0"
    commit id: "hotfix: typo" type: HIGHLIGHT`,
    quickPrompts: [
      "Feature branch workflow",
      "Gitflow release process",
      "Hotfix branching strategy",
      "Trunk-based development",
    ],
    aiHint: "Generate a Mermaid gitGraph for the following branching strategy. Use branch, checkout, commit, merge with ids. Use tag: for releases, type:HIGHLIGHT for hotfixes. Output only valid Mermaid syntax:\n",
  },
];

/** Look up a Mermaid subtype by id */
export function getMermaidSubtypeMeta(id: MermaidSubtype): MermaidSubtypeMeta {
  return MERMAID_SUBTYPE_META.find((s) => s.id === id) ?? MERMAID_SUBTYPE_META[0];
}

/** Default starter source per diagram type */
export const DIAGRAM_TYPE_DEFAULTS: Record<DiagramType, string> = {
  mermaid: `flowchart LR
  A[Start] --> B{Decision}
  B -->|Yes| C[Action A]
  B -->|No| D[Action B]
  C --> E[End]
  D --> E`,

  excalidraw: JSON.stringify({
    type: "excalidraw",
    version: 2,
    elements: [
      { id: "rect1", type: "rectangle", x: 100, y: 100, width: 200, height: 80, angle: 0, strokeColor: "#1e1e1e", backgroundColor: "#dbeafe", fillStyle: "solid", strokeWidth: 2, roughness: 1, opacity: 100, groupIds: [], roundness: { type: 3 } },
      { id: "text1", type: "text", x: 140, y: 128, width: 120, height: 25, angle: 0, strokeColor: "#1e1e1e", backgroundColor: "transparent", fillStyle: "solid", strokeWidth: 1, roughness: 1, opacity: 100, groupIds: [], text: "Start Here", fontSize: 18, fontFamily: 1, textAlign: "center", verticalAlign: "middle" },
      { id: "arrow1", type: "arrow", x: 310, y: 140, width: 120, height: 0, angle: 0, strokeColor: "#1e1e1e", backgroundColor: "transparent", fillStyle: "solid", strokeWidth: 2, roughness: 1, opacity: 100, groupIds: [], points: [[0,0],[120,0]], startArrowhead: null, endArrowhead: "arrow" },
      { id: "rect2", type: "rectangle", x: 440, y: 100, width: 200, height: 80, angle: 0, strokeColor: "#1e1e1e", backgroundColor: "#d1fae5", fillStyle: "solid", strokeWidth: 2, roughness: 1, opacity: 100, groupIds: [], roundness: { type: 3 } },
      { id: "text2", type: "text", x: 480, y: 128, width: 120, height: 25, angle: 0, strokeColor: "#1e1e1e", backgroundColor: "transparent", fillStyle: "solid", strokeWidth: 1, roughness: 1, opacity: 100, groupIds: [], text: "Next Step", fontSize: 18, fontFamily: 1, textAlign: "center", verticalAlign: "middle" },
    ],
    appState: { viewBackgroundColor: "#ffffff" },
  }),

  reactflow: JSON.stringify({
    nodes: [
      { id: "1", type: "input", position: { x: 250, y: 50 }, data: { label: "Start", color: "#10b981" } },
      { id: "2", type: "default", position: { x: 100, y: 200 }, data: { label: "Process A", color: "#6366f1" } },
      { id: "3", type: "default", position: { x: 400, y: 200 }, data: { label: "Process B", color: "#6366f1" } },
      { id: "4", type: "output", position: { x: 250, y: 350 }, data: { label: "End", color: "#ef4444" } },
    ],
    edges: [
      { id: "e1-2", source: "1", target: "2", label: "path A", type: "smoothstep" },
      { id: "e1-3", source: "1", target: "3", label: "path B", type: "smoothstep" },
      { id: "e2-4", source: "2", target: "4", type: "smoothstep" },
      { id: "e3-4", source: "3", target: "4", type: "smoothstep" },
    ],
  }),

  echarts: JSON.stringify({
    title: {
      text: "Sales by Quarter",
      subtext: "Example data",
      left: "center",
      textStyle: { fontSize: 18, fontWeight: 600 },
      subtextStyle: { color: "#64748b" },
    },
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    legend: { data: ["2024", "2025"], bottom: 4 },
    grid: { left: "3%", right: "4%", bottom: "12%", containLabel: true },
    xAxis: { type: "category", data: ["Q1", "Q2", "Q3", "Q4"], axisTick: { alignWithLabel: true } },
    yAxis: { type: "value", splitLine: { lineStyle: { type: "dashed", color: "#e2e8f0" } } },
    color: ["#6366f1", "#10b981", "#f59e0b", "#ef4444"],
    series: [
      {
        name: "2024",
        type: "bar",
        data: [120, 200, 150, 80],
        barWidth: "55%",
        barGap: "10%",
        itemStyle: { borderRadius: [6, 6, 0, 0] },
      },
      {
        name: "2025",
        type: "bar",
        data: [180, 240, 190, 210],
        barWidth: "55%",
        itemStyle: { borderRadius: [6, 6, 0, 0] },
      },
    ],
  }),

  nivo: JSON.stringify({
    type: "bar",
    data: [
      { month: "Jan", revenue: 12000, costs: 8000 },
      { month: "Feb", revenue: 15000, costs: 9000 },
      { month: "Mar", revenue: 18000, costs: 10000 },
      { month: "Apr", revenue: 14000, costs: 8500 },
      { month: "May", revenue: 22000, costs: 12000 },
      { month: "Jun", revenue: 25000, costs: 14000 },
    ],
    keys: ["revenue", "costs"],
    indexBy: "month",
    colors: { scheme: "nivo" },
  }),

  tldraw: JSON.stringify({
    elements: [
      { id: "shape:1", type: "geo", x: 100, y: 100, rotation: 0, props: { geo: "rectangle", w: 200, h: 80, text: "Start", color: "blue", fill: "solid", dash: "draw", size: "m", font: "sans" } },
      { id: "shape:2", type: "geo", x: 400, y: 100, rotation: 0, props: { geo: "rectangle", w: 200, h: 80, text: "Process", color: "green", fill: "solid", dash: "draw", size: "m", font: "sans" } },
      { id: "shape:3", type: "geo", x: 700, y: 100, rotation: 0, props: { geo: "ellipse", w: 200, h: 80, text: "End", color: "red", fill: "solid", dash: "draw", size: "m", font: "sans" } },
    ],
  }),

  bpmn: `<?xml version="1.0" encoding="UTF-8"?>
<bpmn2:definitions xmlns:bpmn2="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="sample-diagram" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn2:process id="Process_1" isExecutable="false">
    <bpmn2:startEvent id="StartEvent_1" name="Start"/>
    <bpmn2:task id="Task_1" name="Review Request"/>
    <bpmn2:exclusiveGateway id="Gateway_1" name="Approved?"/>
    <bpmn2:task id="Task_2" name="Process Order"/>
    <bpmn2:task id="Task_3" name="Send Rejection"/>
    <bpmn2:endEvent id="EndEvent_1" name="End"/>
    <bpmn2:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="Task_1"/>
    <bpmn2:sequenceFlow id="Flow_2" sourceRef="Task_1" targetRef="Gateway_1"/>
    <bpmn2:sequenceFlow id="Flow_3" name="Yes" sourceRef="Gateway_1" targetRef="Task_2"/>
    <bpmn2:sequenceFlow id="Flow_4" name="No" sourceRef="Gateway_1" targetRef="Task_3"/>
    <bpmn2:sequenceFlow id="Flow_5" sourceRef="Task_2" targetRef="EndEvent_1"/>
    <bpmn2:sequenceFlow id="Flow_6" sourceRef="Task_3" targetRef="EndEvent_1"/>
  </bpmn2:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="StartEvent_1_di" bpmnElement="StartEvent_1"><dc:Bounds x="152" y="82" width="36" height="36"/></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_1_di" bpmnElement="Task_1"><dc:Bounds x="240" y="60" width="120" height="80"/></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Gateway_1_di" bpmnElement="Gateway_1" isMarkerVisible="true"><dc:Bounds x="415" y="75" width="50" height="50"/></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_2_di" bpmnElement="Task_2"><dc:Bounds x="530" y="30" width="120" height="80"/></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_3_di" bpmnElement="Task_3"><dc:Bounds x="530" y="130" width="120" height="80"/></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="EndEvent_1_di" bpmnElement="EndEvent_1"><dc:Bounds x="722" y="82" width="36" height="36"/></bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1"><di:waypoint x="188" y="100"/><di:waypoint x="240" y="100"/></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2"><di:waypoint x="360" y="100"/><di:waypoint x="415" y="100"/></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_3_di" bpmnElement="Flow_3"><di:waypoint x="440" y="75"/><di:waypoint x="440" y="50"/><di:waypoint x="530" y="50"/></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_4_di" bpmnElement="Flow_4"><di:waypoint x="440" y="125"/><di:waypoint x="440" y="170"/><di:waypoint x="530" y="170"/></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_5_di" bpmnElement="Flow_5"><di:waypoint x="650" y="70"/><di:waypoint x="690" y="70"/><di:waypoint x="690" y="100"/><di:waypoint x="722" y="100"/></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_6_di" bpmnElement="Flow_6"><di:waypoint x="650" y="170"/><di:waypoint x="690" y="170"/><di:waypoint x="690" y="100"/><di:waypoint x="722" y="100"/></bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn2:definitions>`,
};

// ---------------------------------------------------------------------------
// Use-case style conventions
// ---------------------------------------------------------------------------

export type UseCaseId = "presentation" | "social" | "documentation" | "custom";

/**
 * Per-use-case generation style instructions appended to the AI generation prompt.
 * "custom" is empty string — preserves existing behavior, no additional instruction.
 */
export const USE_CASE_STYLE_INSTRUCTIONS: Record<UseCaseId, string> = {
  presentation: `
Use-case style: PRESENTATION
- Target: slides, pitch decks, keynotes displayed on screen
- Nodes: maximum 5 top-level nodes; group sub-steps into subgraphs instead of expanding every detail
- Labels: short, bold, action-oriented (2-4 words max per node label)
- Edges: minimal annotations; use edge labels only when the transition is non-obvious
- Density: LOW — prioritize visual clarity and whitespace over completeness
- Rule: if the user's prompt would produce more than 6 top-level nodes at medium density, consolidate related nodes into labeled subgraphs`,

  social: `
Use-case style: SOCIAL MEDIA
- Target: Instagram, LinkedIn, Twitter/X — small screen, fast scan
- Nodes: maximum 4 main elements — cut everything else
- Labels: bold, punchy, reader-friendly (no technical jargon unless asked)
- Edges: use simple, clean connectors with no annotations
- Density: VERY LOW — high visual impact, minimal text
- Shapes: prefer rounded/friendly shapes where diagram type allows`,

  documentation: `
Use-case style: DOCUMENTATION
- Target: READMEs, technical docs, wikis, API references
- Nodes: extract ALL named entities, steps, actors, and relationships from the prompt — omit nothing
- Labels: descriptive and precise; include type annotations, method names, or data field names where relevant
- Edges: annotate every edge with the action, condition, or data flowing across it
- Density: HIGH — accuracy and completeness over visual simplicity
- Sub-steps: expand all nested processes; use subgraphs to organize without hiding information`,

  custom: "",
};
