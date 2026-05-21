export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatRequestPayload {
  message: string;
  history?: ChatMessage[];
}

export interface ChatResponsePayload {
  success: boolean;
  answer: string;
}
