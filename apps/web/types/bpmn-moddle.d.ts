declare module "bpmn-moddle" {
  export interface ModdleElement {
    $type: string;
    [key: string]: unknown;
  }
  export class BpmnModdle {
    fromXML(xml: string): Promise<{ rootElement: ModdleElement; warnings: unknown[] }>;
    toXML(element: ModdleElement, opts?: { format?: boolean }): Promise<{ xml: string }>;
  }
}
