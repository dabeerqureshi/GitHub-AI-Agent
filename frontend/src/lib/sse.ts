/**
 * Server-Sent Events (SSE) streaming client.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface StreamCallbacks {
  onStatus?: (data: { step: string; message?: string; tool?: string }) => void;
  onPlan?: (data: { plan: string[]; intent: string }) => void;
  onToolCall?: (data: { tool: string; arguments: any }) => void;
  onToolResult?: (data: { tool: string; result: any }) => void;
  onApprovalRequired?: (data: { approval: any }) => void;
  onResponse?: (data: { content: string; message: any }) => void;
  onError?: (error: any) => void;
  onDone?: (data: { status: string; metadata?: any }) => void;
}

export async function streamMessage(
  conversationId: string,
  content: string,
  activeRepo: string | undefined,
  callbacks: StreamCallbacks
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/v1/chat/conversations/${conversationId}/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify({ content, active_repo: activeRepo }),
  });

  if (!response.ok) {
    throw new Error(`Stream request failed: ${response.statusText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("Response body is not readable");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    let currentEvent = "message";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (trimmed.startsWith("event:")) {
        currentEvent = trimmed.replace("event:", "").trim();
      } else if (trimmed.startsWith("data:")) {
        const rawData = trimmed.replace("data:", "").trim();
        try {
          const parsed = JSON.parse(rawData);

          switch (currentEvent) {
            case "status":
              callbacks.onStatus?.(parsed);
              break;
            case "plan":
              callbacks.onPlan?.(parsed);
              break;
            case "tool_call":
              callbacks.onToolCall?.(parsed);
              break;
            case "tool_result":
              callbacks.onToolResult?.(parsed);
              break;
            case "approval_required":
              callbacks.onApprovalRequired?.(parsed);
              break;
            case "response":
              callbacks.onResponse?.(parsed);
              break;
            case "done":
              callbacks.onDone?.(parsed);
              break;
            case "error":
              callbacks.onError?.(parsed);
              break;
          }
        } catch (e) {
          console.error("Failed to parse SSE event data", rawData, e);
        }
      }
    }
  }
}
