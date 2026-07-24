export type CanvasDocument = { version: 1; shapes: CanvasShape[] };

export type BaseShape = {
  id: string;
  x: number;
  y: number;
  rotation?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  frameId?: string | null;
  locked?: boolean;
  text?: {
    content: string;
    fontSize?: number;
    fontFamily?: string;
    align?: "left" | "center" | "right";
    color?: string;
    bold?: boolean;
  };
};

export type RectShape = BaseShape & { type: "rectangle"; width: number; height: number; cornerRadius?: number };
export type EllipseShape = BaseShape & { type: "ellipse"; width: number; height: number };
export type DiamondShape = BaseShape & { type: "diamond"; width: number; height: number };
export type StickyShape = BaseShape & { type: "sticky"; width: number; height: number };
export type TextShape = BaseShape & { type: "text"; width: number; height: number };
export type FrameShape = BaseShape & { type: "frame"; width: number; height: number; name?: string };

export type ArrowEndpoint =
  | { x: number; y: number }
  | { shapeId: string; anchor?: "top" | "right" | "bottom" | "left" | "center" | "auto" };

export type ArrowShape = BaseShape & {
  type: "arrow" | "line";
  start: ArrowEndpoint;
  end: ArrowEndpoint;
};

export type CanvasShape = RectShape | EllipseShape | DiamondShape | StickyShape | TextShape | FrameShape | ArrowShape;

export function createEmptyDocument(): CanvasDocument {
  return { version: 1, shapes: [] };
}

export function parseFreeformSource(source: string): CanvasDocument {
  try {
    const parsed = JSON.parse(source);
    if (typeof parsed === "object" && parsed !== null && "version" in parsed && "shapes" in parsed) {
      if (Array.isArray(parsed.shapes)) {
        return parsed as CanvasDocument;
      }
    }
  } catch {
    // fall through to empty document
  }
  return createEmptyDocument();
}

export function serializeFreeformDocument(doc: CanvasDocument): string {
  return JSON.stringify(doc);
}

export function getShapeBounds(shape: CanvasShape): { x: number; y: number; width: number; height: number } {
  if (shape.type === "arrow" || shape.type === "line") {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  const s = shape as Exclude<CanvasShape, ArrowShape>;
  return { x: s.x, y: s.y, width: s.width, height: s.height };
}

export function isBoundEndpoint(endpoint: ArrowEndpoint): endpoint is { shapeId: string; anchor?: "top" | "right" | "bottom" | "left" | "center" | "auto" } {
  return "shapeId" in endpoint;
}

export function resolveArrowEndpoint(doc: CanvasDocument, endpoint: ArrowEndpoint): { x: number; y: number } {
  if (!isBoundEndpoint(endpoint)) {
    return endpoint as { x: number; y: number };
  }

  const shape = doc.shapes.find((s) => s.id === endpoint.shapeId);
  if (!shape) {
    return { x: 0, y: 0 };
  }

  const bounds = getShapeBounds(shape);
  const anchor = endpoint.anchor ?? "center";

  switch (anchor) {
    case "top":
      return { x: bounds.x + bounds.width / 2, y: bounds.y };
    case "bottom":
      return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height };
    case "left":
      return { x: bounds.x, y: bounds.y + bounds.height / 2 };
    case "right":
      return { x: bounds.x + bounds.width, y: bounds.y + bounds.height / 2 };
    case "center":
    case "auto":
    default:
      return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
  }
}

export function generateShapeId(prefix = "s"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function validateFreeformRefs(doc: CanvasDocument): string[] {
  const errors: string[] = [];
  const idSet = new Set<string>();

  // Check for duplicate IDs
  for (const shape of doc.shapes) {
    if (idSet.has(shape.id)) {
      errors.push(`Duplicate shape id: ${shape.id}`);
    }
    idSet.add(shape.id);
  }

  // Check frameId references and arrow shape references
  for (const shape of doc.shapes) {
    if (shape.frameId && shape.frameId !== null) {
      const frameExists = doc.shapes.some((s) => s.id === shape.frameId && s.type === "frame");
      if (!frameExists) {
        errors.push(`Shape ${shape.id} has frameId "${shape.frameId}" which is not a frame`);
      }
    }

    if (shape.type === "arrow" || shape.type === "line") {
      const arrowShape = shape as ArrowShape;
      if (isBoundEndpoint(arrowShape.start)) {
        const startRef = arrowShape.start as { shapeId: string };
        const startExists = doc.shapes.some((s) => s.id === startRef.shapeId);
        if (!startExists) {
          errors.push(`Arrow ${shape.id} start references missing shape "${startRef.shapeId}"`);
        }
      }
      if (isBoundEndpoint(arrowShape.end)) {
        const endRef = arrowShape.end as { shapeId: string };
        const endExists = doc.shapes.some((s) => s.id === endRef.shapeId);
        if (!endExists) {
          errors.push(`Arrow ${shape.id} end references missing shape "${endRef.shapeId}"`);
        }
      }
    }
  }

  return errors;
}
