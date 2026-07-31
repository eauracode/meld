import { IsInt, IsString, MinLength, NotEquals } from "class-validator";

export class AdjustStockDto {
  @IsString() productId!: string;
  @IsString() warehouseId!: string;
  @IsInt() @NotEquals(0) change!: number;
  @IsString() @MinLength(1) reason!: string;
}
