import { IsNotEmpty, IsOptional, IsString, IsArray, IsUUID, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

export class TaggedItemDto {
  @IsNotEmpty({ message: "menuItemId không được trống" })
  @IsString({ message: "menuItemId phải là chuỗi" })
  menuItemId!: string;

  @IsNotEmpty({ message: "Tên món ăn không được trống" })
  @IsString({ message: "Tên món ăn phải là chuỗi" })
  name!: string;
}

export class CreatePostValidator {
  @IsNotEmpty({ message: "Nội dung bài viết không được trống" })
  @IsString({ message: "Nội dung phải là chuỗi" })
  content!: string;

  @IsOptional()
  @IsArray({ message: "mediaUrls phải là mảng" })
  mediaUrls?: string[];

  @IsOptional()
  @IsUUID("4", { message: "restaurantId phải là UUID hợp lệ" })
  restaurantId?: string;

  @IsOptional()
  @IsArray({ message: "taggedItems phải là mảng" })
  @ValidateNested({ each: true })
  @Type(() => TaggedItemDto)
  taggedItems?: TaggedItemDto[];
}

export class CreateCommentValidator {
  @IsNotEmpty({ message: "Nội dung bình luận không được trống" })
  @IsString({ message: "Nội dung bình luận phải là chuỗi" })
  content!: string;
}

export class CreateReportValidator {
  @IsNotEmpty({ message: "Lý do báo cáo không được để trống" })
  @IsString({ message: "Lý do báo cáo phải là chuỗi" })
  reason!: string;
}
