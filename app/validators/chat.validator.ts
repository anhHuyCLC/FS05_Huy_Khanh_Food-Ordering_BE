import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

class MessageHistory {
  @IsNotEmpty({ message: "Role is required in history" })
  @IsIn(["user", "assistant"], { message: "Role must be either 'user' or 'assistant'" })
  role!: "user" | "assistant";

  @IsOptional()
  @IsString({ message: "content must be a string" })
  content?: string;
}

export class ChatValidator {
  @IsNotEmpty({ message: "Message is required" })
  @IsString({ message: "Message must be a string" })
  message!: string;

  @IsOptional()
  @IsArray({ message: "History must be an array" })
  @ValidateNested({ each: true })
  @Type(() => MessageHistory)
  history?: MessageHistory[];
}
