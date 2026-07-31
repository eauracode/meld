import { IsEnum, IsInt, IsOptional, IsPositive } from "class-validator";

export enum FeeBorneByDto {
  customer = "customer",
  merchant = "merchant",
}

export class ApproveMerchantDto {
  @IsEnum(FeeBorneByDto)
  feeBorneBy!: FeeBorneByDto;

  @IsOptional()
  @IsInt()
  @IsPositive()
  overrideFlatFeeKobo?: number;
}
