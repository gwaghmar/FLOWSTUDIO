/** All diagram types supported by the application */

export type DiagramType =
  | "mermaid"        // Text-based: flowchart, sequence, ERD, gantt, mindmap, class, etc.
  | "excalidraw"     // Hand-drawn whiteboard canvas
  | "reactflow"      // Interactive node/edge graphs
  | "echarts"        // Data visualizations: bar, line, pie, radar, heatmap, etc.
  | "nivo"           // Beautiful statistical charts
  | "tldraw"         // Figma-like infinite canvas
  | "bpmn"           // Business Process Model and Notation
  | "cloud"          // Cloud / architecture diagrams with provider service icons
  | "erd";           // Entity-relationship / database schema diagrams (visual tables)

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
  aiOutputFormat: "mermaid" | "excalidraw-json" | "reactflow-json" | "echarts-json" | "nivo-json" | "tldraw-json" | "bpmn-xml" | "cloud-json" | "erd-json";
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
  {
    id: "cloud",
    label: "Cloud Architecture",
    description: "AWS / GCP / Azure system & infrastructure diagrams with service icons",
    category: "technical",
    icon: "cloud",
    color: "#FF9900",
    subtypes: ["aws", "gcp", "azure", "multi-cloud"],
    aiOutputFormat: "cloud-json",
  },
  {
    id: "erd",
    label: "Database Schema",
    description: "Entity-relationship diagrams — tables, columns, keys, and relationships",
    category: "technical",
    icon: "database",
    color: "#0891b2",
    subtypes: ["tables", "relationships", "keys"],
    aiOutputFormat: "erd-json",
  },
];

export function getDiagramTypeMeta(id: DiagramType): DiagramTypeMeta {
  return DIAGRAM_TYPE_META.find((d) => d.id === id) ?? DIAGRAM_TYPE_META[0];
}

/** System prompts for AI generation per diagram type */
export const DIAGRAM_SYSTEM_PROMPTS: Record<DiagramType, string> = {
  mermaid: `You output ONLY valid Mermaid diagram source. No markdown code fences, no explanation, no prose — raw syntax only.

SUBTYPE SELECTION — choose the best type for the user's intent. When multiple types could fit, prefer the one whose decision rule below matches MOST cues:
- "sequenceDiagram" → REQUIRED when the prompt names ≥2 actors/systems exchanging messages in order (e.g., "between browser, API, and auth server", "client → server → DB"). Time-ordered interaction beats process flow.
- "erDiagram" → REQUIRED for "schema", "database", "tables", "entities and relationships". Always include PK/FK and cardinality.
- "classDiagram" → OOP class hierarchies, object models, interfaces — note: "class diagram" beats "flowchart" even if behavior is described.
- "stateDiagram-v2" → state machines, FSMs, lifecycle flows ("draft → published → archived")
- "gantt" → project plans, schedules, timelines with explicit dates / durations
- "mindmap" → brainstorming, topic breakdowns, concept maps with no flow direction
- "timeline" → historical events, milestones, roadmaps without dependencies
- "C4Context" → system context diagrams (people, systems, external deps)
- "gitGraph" → git branching strategies, release flows
- "flowchart TD" / "flowchart LR" → DEFAULT only when none of the above match: process flows, decision trees, general diagrams

CONTENT EXTRACTION CHECKLIST — pull from the prompt:
- Every actor / participant / system named → declare in sequenceDiagram OR a node in flowchart
- Every step or action → a node OR a message line
- Every decision / "if" / "otherwise" → a diamond (flowchart) or alt/else block (sequenceDiagram)
- Every entity, attribute, and relationship (for erDiagram) → table block with PK/FK/UK + relationship line with cardinality
- Time / duration / dependency cues → gantt sections with "after taskId" and durations
- Style cues ("simple", "minimal") → fewer nodes; ("detailed", "thorough") → richer subgraphs and annotations

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

LAYOUT-PATTERN SELECTION — choose the composition that matches the request:
- Linear flow (left-to-right or top-to-bottom) → "process", "pipeline", "user journey", "step by step"
- Wireframe / mockup (stacked rectangles with labels) → "wireframe", "UI mockup", "screen layout", "page design"
- Concept cluster (central node + radiating groups) → "concept map", "brainstorm", "mind map", "ideas around X"
- Architecture (grouped subsystems connected by arrows) → "system architecture", "components", "service diagram"
- Free sketch (loose freehand shapes) → "sketch", "doodle", "rough drawing"

CONTENT EXTRACTION CHECKLIST — pull from the prompt:
- Every named component / box / region → one labeled shape
- Every spatial grouping ("frontend cluster", "infra side") → group nearby + use same backgroundColor
- Every directional connection ("A sends to B", "user → server") → one arrow with binding
- Every annotation or label mentioned → a text element placed adjacent
- Layout preference cues ("left to right", "top down", "centered") → respect explicitly

The JSON must have this exact structure:
{
  "type": "excalidraw",
  "version": 2,
  "elements": [...],
  "appState": { "viewBackgroundColor": "#ffffff" }
}
Each element must have: id (string), type ("rectangle"|"ellipse"|"diamond"|"arrow"|"line"|"text"|"freedraw"), x (number), y (number), width (number), height (number), angle (0), strokeColor ("#1e1e1e"), backgroundColor ("transparent" or hex), fillStyle ("solid"), strokeWidth (2), roughness (1), opacity (100), groupIds ([]), roundness (null or {"type":3}), text (for text elements), fontSize (20 for text), fontFamily (1), textAlign ("center").
For arrows: add "startBinding" and "endBinding" with elementId pointing to connected shapes, and "points": [[0,0],[dx,dy]]. CRITICAL: points are RELATIVE vectors from the arrow's x,y origin — [0,0] is the start anchor, [deltaX,deltaY] is the end offset. Calculate as: deltaX = targetCenterX - arrowX, deltaY = targetCenterY - arrowY.
Layout elements with good spacing (min 200px between boxes). Use colors to distinguish categories.

FEW-SHOT EXAMPLES:

User: "Login screen wireframe with email, password, submit button"
Expected pattern: wireframe — stacked rectangles for input fields + button, each with a text label. No arrows.

User: "Frontend talks to API which talks to DB and cache"
Expected pattern: linear flow — Frontend (rect, blue bg) → API (rect, amber bg) → DB (rect, green bg) + API → Cache (rect, purple bg, branched right). Three arrows with bindings.`,

  reactflow: `You output ONLY valid JSON for React Flow. No explanation, no markdown.

SUBTYPE SELECTION — choose the layout shape that fits the request:
- "orgchart" — reporting structures, company hierarchies (vertical tree, top-down)
- "tree" — file trees, decision trees, taxonomy (top-down or radial branching)
- "pipeline" — CI/CD, ETL, build stages (strict left-to-right linear flow)
- "network" — service meshes, microservices graphs, dependency networks (force-directed feel)
- "swimlane" — multi-team workflows where each lane = team/system (horizontal rows)

CONTENT EXTRACTION CHECKLIST — pull from the prompt:
- Every distinct node ("queue", "worker", "Alice") → one node with descriptive label + description
- Every state transition or message ("on success", "after build") → edge with label
- Every group ("backend services", "QA team") → use background color or grouped y-coordinates as swim-lane
- Explicit start/end → green start node, red end node
- Decisions or fan-out → amber decision node with multiple outbound edges

Design quality rules:
- Build premium, professional node graphs suitable for business operations.
- Every node MUST have a concise 'label' AND a helpful 'description' in data.
- Ensure nodes represent the user flow exactly, not generic filler.
- Include explicit start and end states where applicable.
The JSON must have this exact structure:
{
  "nodes": [
    { 
      "id": "1", 
      "type": "custom", 
      "position": { "x": 0, "y": 0 }, 
      "data": { 
        "label": "Action Verb", 
        "description": "Short explanation of what happens here...", 
        "color": "#6366f1",
        "isActive": false
      } 
    }
  ],
  "edges": [
    { "id": "e1-2", "source": "1", "target": "2", "label": "transition trigger", "animated": false, "type": "smoothstep" }
  ]
}
Spacing: min 250px horizontal, 150px vertical.
Colors (data.color):
- #6366f1 (Indigo) - Default process
- #10b981 (Green) - Success / Start
- #f59e0b (Amber) - Warning / Decision
- #ef4444 (Red) - Error / Stop
- #8b5cf6 (Purple) - Automated Task
Set 'isActive: true' ONLY if the user specifically asks to 'run', 'simulate', or 'highlight the current step' of a process.

FEW-SHOT EXAMPLES:

User: "Engineering org chart with CTO, two VPs, four directors"
Expected: orgchart layout — single CTO node top, two VP nodes below, four director nodes below split under the VPs. Edges flow top-down (no labels needed for pure hierarchy). Colors: CTO purple, VPs indigo, directors default.

User: "CI/CD pipeline: lint, test, build, deploy to staging then prod"
Expected: pipeline layout — strict left-to-right chain: Lint → Test → Build → "Deploy Staging" → "Deploy Prod". Each node has description (e.g., "ESLint + type check"). Final node green. Edges labeled with promotion gates ("on green", "manual approval").`,

  echarts: `You output ONLY valid Apache ECharts option JSON. No explanation, no markdown.

SUBTYPE SELECTION — pick the chart type that matches the data shape and intent:
- "bar" → comparing discrete categories ("revenue by region", "users per plan")
- "line" → trends over time ("MRR growth", "daily active users")
- "pie" → parts of a whole, ≤6 slices ("market share", "traffic by source")
- "scatter" → correlation between two numeric dimensions ("price vs rating")
- "radar" → multi-attribute comparison across few items ("competitor feature scores")
- "heatmap" → matrix of two categorical dims with intensity ("hourly traffic by day")
- "treemap" → hierarchical part-of-whole with nesting ("revenue by team → product")
- "sankey" → flow with conservation (user journey, money flow, funnel→stage)
- "funnel" → ordered conversion stages with decreasing volume
- "gauge" → single-metric progress toward a target
- "candlestick" → OHLC financial data

CONTENT EXTRACTION CHECKLIST — pull from the prompt:
- Every named series ("revenue", "expenses") → entry in series[] with name
- Every axis category mentioned ("Q1, Q2, Q3, Q4") → xAxis.data
- Time granularity if mentioned ("daily", "monthly") → drives xAxis.type = "time" and data point count
- All comparative dimensions mentioned ("by region AND by quarter") → either stacked bar or grouped bar
- Title from prompt subject; subtitle from any modifier ("YTD", "Q4 2025")

The JSON is a complete ECharts option object:
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
CRITICAL — treemap: series[0].data is [{"name":"category","value":number}] or nested [{"name":"group","children":[{"name":"item","value":number}]}]. No xAxis/yAxis for treemap.

FEW-SHOT EXAMPLES:

User: "Quarterly revenue 2025: Q1 1.2M, Q2 1.5M, Q3 1.8M, Q4 2.1M"
Expected: type "bar". xAxis.data = ["Q1","Q2","Q3","Q4"]; series[0] = { name: "Revenue", type: "bar", data: [1200000, 1500000, 1800000, 2100000] }. Title "Quarterly Revenue 2025".

User: "Conversion funnel from visitor to purchase"
Expected: type "funnel". series[0].type = "funnel", series[0].data = [{value: 10000, name: "Visitors"}, {value: 4000, name: "Sign-ups"}, {value: 1200, name: "Trial"}, {value: 380, name: "Paid"}]. Title "Conversion Funnel".`,

  nivo: `You output ONLY valid JSON for Nivo charts. No explanation, no markdown.

SUBTYPE SELECTION — pick the chart type based on data shape:
- "bar" → category comparisons (revenue by team, users per plan)
- "line" → time series with multiple series ("DAU vs MAU")
- "pie" → simple parts-of-whole (≤6 slices)
- "radar" → multi-axis comparison of items across 3–8 attributes
- "treemap" → hierarchical proportions (org size by department → team)
- "sankey" → flow with conservation (energy flow, conversion stages with branches)
- "network" → relationship graph (collaboration networks, dependencies)
- "chord" → mutual relationships between fixed set (trade between countries)
- "calendar" → daily values across a year (commits per day, sales per day)
- "stream" → composition over time as flowing area
- "waffle" → progress or proportion in a grid (campaign coverage, completion %)

CONTENT EXTRACTION CHECKLIST — pull from the prompt:
- Every named series → keys[] (bar) or top-level id (line)
- Every category/index → indexBy field value per row
- Time period mentioned ("2024") → drive the date range for calendar/line
- All comparative attributes for radar → axes in each data row
- Title and color cue (palette suggestion) → set colors.scheme accordingly

The JSON must have this exact structure:
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
Choose beautiful Nivo color schemes: "nivo", "category10", "accent", "dark2", "paired", "pastel1", "set1", "spectral".

FEW-SHOT EXAMPLES:

User: "Compare product A and B across price, quality, support, design"
Expected: type "radar". data = [{ attribute: "Price", A: 80, B: 65 }, { attribute: "Quality", A: 90, B: 75 }, { attribute: "Support", A: 70, B: 85 }, { attribute: "Design", A: 95, B: 70 }]. keys = ["A","B"]. indexBy = "attribute".

User: "Year-long commits per day for an open-source project"
Expected: type "calendar". data = [{"day":"2025-01-01","value":3}, {"day":"2025-01-02","value":7}, ...]. Add top-level from "2025-01-01" and to "2025-12-31".`,

  tldraw: `You output ONLY valid JSON for tldraw. No explanation, no markdown.

COMPOSITION-PATTERN SELECTION — pick the layout that matches intent:
- Slide-style canvas → "presentation", "slide layout", "key points"
- Mockup grid (boxed regions, labels) → "mockup", "UI design", "screen layout"
- Hierarchy/tree (parent at top, branches below) → "tree", "hierarchy", "breakdown"
- Connected flow (boxes + arrows) → "process", "flow", "pipeline"
- Hub-and-spoke (centre + radiating concepts) → "central idea", "concept map", "what relates to X"

CONTENT EXTRACTION CHECKLIST — pull from the prompt:
- Every distinct concept / box / region → one geo shape with text
- Every hierarchy level → vertical y-coordinate band
- Every labeled connection → an arrow shape between specific shape coordinates
- Color cues ("highlight X in red") → set the color prop
- Spatial cues ("on the left", "below") → respect explicitly

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
Assign each shape a unique id like "shape:1", "shape:2", etc. Use generous spacing (200–300px) between shapes for readability.

FEW-SHOT EXAMPLES:

User: "Three key benefits of our product on a slide"
Expected: slide-style — title text at top, three equal rectangles in a horizontal row each with benefit label. No arrows. Colors: light-blue, light-green, light-violet.

User: "Customer onboarding stages with arrows"
Expected: connected flow — five rectangles arranged left-to-right (Sign Up, Verify Email, Setup Profile, First Action, Activated), each ~200x80px, separated by ~250px. Four arrows connecting consecutive pairs. Final box green, others blue.`,

  bpmn: `You output ONLY valid BPMN 2.0 XML. No explanation, no markdown, no code fences.

PROCESS-SHAPE SELECTION — match the structure to the request:
- Simple linear process → start → tasks → end, no gateways
- Decision-heavy process → use exclusiveGateway for either/or branches
- Parallel work → use parallelGateway when paths run concurrently and join
- Inclusive choice → use inclusiveGateway when multiple paths may activate
- Multi-actor process → use laneSet with one lane per actor (customer / sales / fulfilment)
- Exception handling → split exception path off the happy path via an exclusiveGateway labelled "error?" / "timeout?"

CONTENT EXTRACTION CHECKLIST — pull from the prompt:
- Every named actor / system / department → one lane in laneSet
- Every gateway type mentioned ("if", "either", "in parallel") → correct gateway element + diverging/converging pair
- Happy path → primary chain of sequenceFlows
- Exception/error path → secondary chain branching at a decision gateway
- Any SLA / timer mentioned ("within 24h", "after 7 days") → boundary timerEventDefinition (or note it in task name if simpler)
- Service vs user task distinction (automatic vs human) → serviceTask vs userTask

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
</bpmn2:definitions>

FEW-SHOT GUIDANCE:

User: "Customer support ticket: customer submits, agent triages, if urgent escalates, otherwise resolves"
Expected: laneSet with Customer and Agent lanes. Customer lane has startEvent → "Submit Ticket" (userTask) → sequenceFlow into Agent lane. Agent lane has "Triage Ticket" (userTask) → exclusiveGateway "Urgent?" → on yes "Escalate to Senior" (userTask), on no "Resolve & Close" (userTask) → endEvent. Two distinct end events allowed.

User: "Background image processing: upload, validate, in parallel resize + compress, store result"
Expected: startEvent → "Upload" (serviceTask) → "Validate" (serviceTask) → parallelGateway (fork) → "Resize" (serviceTask) AND "Compress" (serviceTask) → parallelGateway (join) → "Store Result" (serviceTask) → endEvent.`,

  cloud: `You output ONLY valid JSON for a cloud / architecture diagram. No explanation, no markdown, no code fences.

Schema:
{
  "nodes": [
    { "id": "string", "data": { "label": "string", "provider": "aws|gcp|azure|generic", "service": "string" } }
  ],
  "edges": [
    { "id": "string", "source": "nodeId", "target": "nodeId", "label": "string (optional)" }
  ]
}

RULES:
- "service" MUST be one of these tokens (pick the closest): compute, function, container, storage, database, cache, cdn, load-balancer, api-gateway, queue, dns, firewall, auth, monitoring, user, browser, mobile, internet. Provider-specific names also work (ec2, lambda, s3, rds, dynamodb, cloudfront, alb, sqs, sns, route53, cognito, cloudwatch, gke, bigquery, pubsub, blob, cosmos, azure-functions, etc.) — they map to the right icon.
- "provider" is aws, gcp, azure, or generic. Use "generic" when no cloud is specified.
- "label" is the human caption (e.g. "Orders API", "User Table").
- Model the REQUEST / DATA FLOW with edges, left-to-right: clients → edge/CDN → gateway/LB → compute → data stores. Add edge "label" for protocols or actions when useful (https, put, read).
- 4-12 nodes for a typical prompt. Omit "position" — layout is automatic.

WHEN TO USE cloud: system design, infrastructure, deployment topology, "architecture diagram", "how X is hosted/deployed", cloud stack diagrams.

Example — "a serverless web app on AWS":
{"nodes":[{"id":"cdn","data":{"label":"CloudFront","provider":"aws","service":"cdn"}},{"id":"api","data":{"label":"API Gateway","provider":"aws","service":"api-gateway"}},{"id":"fn","data":{"label":"Handler","provider":"aws","service":"function"}},{"id":"db","data":{"label":"Orders","provider":"aws","service":"nosql-db"}}],"edges":[{"id":"e1","source":"cdn","target":"api"},{"id":"e2","source":"api","target":"fn"},{"id":"e3","source":"fn","target":"db","label":"put"}]}`,

  erd: `You output ONLY valid JSON for an entity-relationship (database schema) diagram. No explanation, no markdown, no code fences.

Schema:
{
  "nodes": [
    { "id": "string", "data": { "label": "table_name", "columns": [ { "name": "string", "type": "string", "key": "PK|FK|UK (optional)" } ] } }
  ],
  "edges": [
    { "id": "string", "source": "tableId", "target": "tableId", "label": "1:N | 1:1 | N:M" }
  ]
}

RULES:
- One node per table/entity. "id" is a stable slug (lowercase, no spaces); "label" is the table name shown in the header.
- "columns" lists every field in order. Each column has "name" and a SQL-ish "type" (uuid, int, bigint, text, varchar, boolean, timestamp, decimal, json, etc.).
- "key": set "PK" for primary keys, "FK" for foreign keys, "UK" for unique columns. Omit for plain columns. A column may be both PK and FK in a junction table — prefer "PK" then add the FK relationship via an edge.
- Model relationships with edges between table ids. Set "label" to the cardinality: "1:N" (one-to-many), "1:1", or "N:M". Point edges from the parent (PK side) to the child (FK side) for 1:N.
- Every FK column SHOULD have a matching edge to the referenced table.
- Omit "position" — layout is automatic. 2-8 tables for a typical prompt.

WHEN TO USE erd: "database schema", "ER diagram", "ERD", "tables and relationships", "data model", "entities and attributes", schema design.

Example — "a blog database with users, posts, and comments":
{"nodes":[{"id":"users","data":{"label":"users","columns":[{"name":"id","type":"uuid","key":"PK"},{"name":"email","type":"text","key":"UK"},{"name":"name","type":"text"},{"name":"created_at","type":"timestamp"}]}},{"id":"posts","data":{"label":"posts","columns":[{"name":"id","type":"uuid","key":"PK"},{"name":"author_id","type":"uuid","key":"FK"},{"name":"title","type":"text"},{"name":"body","type":"text"},{"name":"published_at","type":"timestamp"}]}},{"id":"comments","data":{"label":"comments","columns":[{"name":"id","type":"uuid","key":"PK"},{"name":"post_id","type":"uuid","key":"FK"},{"name":"author_id","type":"uuid","key":"FK"},{"name":"content","type":"text"}]}}],"edges":[{"id":"e1","source":"users","target":"posts","label":"1:N"},{"id":"e2","source":"posts","target":"comments","label":"1:N"},{"id":"e3","source":"users","target":"comments","label":"1:N"}]}`,
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

  cloud: JSON.stringify({
    nodes: [
      { id: "cdn", data: { label: "CloudFront", provider: "aws", service: "cdn" } },
      { id: "api", data: { label: "API Gateway", provider: "aws", service: "api-gateway" } },
      { id: "fn", data: { label: "Handler", provider: "aws", service: "function" } },
      { id: "db", data: { label: "Orders", provider: "aws", service: "nosql-db" } },
    ],
    edges: [
      { id: "e1", source: "cdn", target: "api" },
      { id: "e2", source: "api", target: "fn" },
      { id: "e3", source: "fn", target: "db", label: "put" },
    ],
  }),

  erd: JSON.stringify({
    nodes: [
      { id: "users", data: { label: "users", columns: [
        { name: "id", type: "uuid", key: "PK" },
        { name: "email", type: "text", key: "UK" },
        { name: "name", type: "text" },
        { name: "created_at", type: "timestamp" },
      ] } },
      { id: "posts", data: { label: "posts", columns: [
        { name: "id", type: "uuid", key: "PK" },
        { name: "author_id", type: "uuid", key: "FK" },
        { name: "title", type: "text" },
        { name: "body", type: "text" },
        { name: "published_at", type: "timestamp" },
      ] } },
      { id: "comments", data: { label: "comments", columns: [
        { name: "id", type: "uuid", key: "PK" },
        { name: "post_id", type: "uuid", key: "FK" },
        { name: "author_id", type: "uuid", key: "FK" },
        { name: "content", type: "text" },
      ] } },
    ],
    edges: [
      { id: "e1", source: "users", target: "posts", label: "1:N" },
      { id: "e2", source: "posts", target: "comments", label: "1:N" },
      { id: "e3", source: "users", target: "comments", label: "1:N" },
    ],
  }),
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
