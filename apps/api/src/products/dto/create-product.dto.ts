import { IsInt, IsOptional, IsString, Min, MinLength } from "class-validator";

export class CreateProductDto {
  @IsOptional() @IsString() sku?: string;
  @IsString() @MinLength(1) name!: string;
  @IsOptional() @IsInt() @Min(0) reorderLevel?: number;
}
