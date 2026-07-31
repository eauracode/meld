import { IsOptional, IsString, MinLength } from "class-validator";

export class UpdateMerchantProfileDto {
  @IsString()
  @MinLength(2)
  businessName!: string;

  @IsOptional() @IsString() contactPerson?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() pickupAddress?: string;
  @IsOptional() @IsString() pickupState?: string;
  @IsOptional() @IsString() bankName?: string;
  @IsOptional() @IsString() bankCode?: string;
  @IsOptional() @IsString() bankAccountNo?: string;
  @IsOptional() @IsString() bankAccountName?: string;
}
