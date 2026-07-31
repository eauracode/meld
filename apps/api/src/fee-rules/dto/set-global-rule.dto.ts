import { IsInt, IsObject, IsPositive } from "class-validator";

export class SetGlobalRuleDto {
  @IsInt() @IsPositive() intrastateFeeKobo!: number;
  @IsObject() byState!: Record<string, number>;
  @IsInt() @IsPositive() fallbackFeeKobo!: number;
}
