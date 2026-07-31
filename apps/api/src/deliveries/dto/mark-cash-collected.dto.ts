import { IsInt, IsPositive } from "class-validator";

export class MarkCashCollectedDto {
  @IsInt() @IsPositive() amountKobo!: number;
}
