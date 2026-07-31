import { IsOptional, IsString, MinLength } from "class-validator";

export class RegisterWarehouseDto {
  @IsString() @MinLength(1) name!: string;
  @IsString() @MinLength(2) state!: string;
  @IsOptional() @IsString() address?: string;
}
