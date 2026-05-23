import { ApiV1Controller } from "./apiV1.controller";
import { AiService } from "@services/ai.service";
import { ChatContextService } from "@services/chatContext.service";
import { ChatValidator } from "@validators/chat.validator";
import { ChatResponsePayload } from "../../../types/chat.types";

export class ChatControllerV1 extends ApiV1Controller {
  private aiService = new AiService();
  private chatContextService = new ChatContextService();

  /**
   * Handles POST /api/v1/chat
   * Takes user message and history, returns AI response enriched with live DB context.
   */
  async create() {
    try {
      // Validate incoming request body
      const data = await this.params(ChatValidator).permit("message", "history");

      // Load live DB context (restaurants, menus, top-rated items)
      // Wrapped in try/catch so a DB hiccup doesn't break the whole chat
      let dbContext: string | undefined;
      try {
        const ctx = await this.chatContextService.getContext();
        dbContext = this.chatContextService.formatContextForPrompt(ctx);
        console.log(
          `[ChatController] DB context loaded — ${ctx.totalRestaurants} restaurants, ${ctx.totalMenuItems} menu items`
        );
      } catch (ctxError) {
        console.error("[ChatController] Failed to load DB context, continuing without it:", ctxError);
      }

      // Generate response from AI service with DB context injected into system prompt
      const answer = await this.aiService.generateChatResponse(
        data.message,
        data.history || [],
        dbContext
      );

      const responsePayload: ChatResponsePayload = {
        success: true,
        answer,
      };

      this.renderJson(responsePayload);
    } catch (error: any) {
      console.error("[ChatController] Error processing chat request:", error);

      // Check if it's a validation error
      if (error.name === "ValidationError" || error.status === 400) {
        this.renderJson(
          {
            success: false,
            message: "Invalid request data",
            errors: error.errors || error.message,
          },
          400
        );
        return;
      }

      // Handle other errors (like AI provider errors, timeout)
      this.renderJson(
        {
          success: false,
          message: "An error occurred while processing the chat request",
        },
        500
      );
    }
  }
}
