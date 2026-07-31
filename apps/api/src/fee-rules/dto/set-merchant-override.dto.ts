import { IsInt, IsPositive } from "class-validator";

export class SetMerchantOverrideDto {
  @IsInt() @IsPositive() flatFeeKobo!: number;
}
