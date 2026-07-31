import { IsString, MinLength } from "class-validator";

export class FailDeliveryDto {
  @IsString() @MinLength(1) reason!: string;
}
