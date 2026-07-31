import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MinLength,
  ValidateNested,
} from "class-validator";

export enum PaymentTypeDto {
  prepaid = "prepaid",
  cod = "cod",
}

export class OrderItemDto {
  @IsString() productId!: string;
  @IsInt() @IsPositive() quantity!: number;
}

export class CreateOrderDto {
  @IsString() @MinLength(2) customerName!: string;
  @IsString() customerPhone!: string;
  @IsString() deliveryAddress!: string;
  @IsString() deliveryState!: string;
  @IsOptional() @IsString() deliveryArea?: string;
  @IsInt() @IsPositive() orderValueKobo!: number;
  @IsEnum(PaymentTypeDto) paymentType!: PaymentTypeDto;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];
}
