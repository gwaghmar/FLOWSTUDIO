type IncomingMessage = {
  role?: string;
  content?: unknown;
  parts?: Array<{ type?: string; text?: string }>;
};

export type ChatTurn = { role: "user" | "assistant"; content: string };

export function messageText(m: IncomingMessage | undefined): string {
  if (!m) return "";
  if (Array.isArray(m.parts)) {
    return m.parts
      .filter((p) => p?.type === "text")
      .map((p) => p.text ?? "")
      .join("");
  }
  return typeof m.content === "string" ? m.content : "";
}

export function lastUserText(messages: IncomingMessage[] | undefined): string {
  if (!messages?.length) return "";
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") return messageText(messages[i]).trim();
  }
  return "";
}

export function toChatTurns(messages: IncomingMessage[] | undefined): ChatTurn[] {
  if (!messages?.length) return [];
  return messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({ role: m.role as ChatTurn["role"], content: messageText(m).trim() }))
    .filter((t) => t.content.length > 0);
}
