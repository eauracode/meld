import { IsInt, IsPositive } from "class-validator";

export class RequestWithdrawalDto {
  @IsInt() @IsPositive() amountKobo!: number;
}
