import { IsInt, IsPositive, IsString } from "class-validator";

export class ReceiveInventoryDto {
  @IsString() productId!: string;
  @IsString() warehouseId!: string;
  @IsInt() @IsPositive() quantity!: number;
}
