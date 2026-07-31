import { IsInt, IsPositive, IsString, MinLength } from "class-validator";

export class CreateAdjustmentDto {
  @IsString() debitAccountId!: string;
  @IsString() creditAccountId!: string;
  @IsInt() @IsPositive() amountKobo!: number;
  @IsString() @MinLength(3) reason!: string;
}
