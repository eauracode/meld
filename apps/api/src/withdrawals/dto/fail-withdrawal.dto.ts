import { IsString, MinLength } from "class-validator";

export class FailWithdrawalDto {
  @IsString() @MinLength(1) reason!: string;
}
