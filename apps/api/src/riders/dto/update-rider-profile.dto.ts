import { IsOptional, IsString } from "class-validator";

export class UpdateRiderProfileDto {
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() state?: string;
  @IsOptional() @IsString() bankName?: string;
  @IsOptional() @IsString() bankCode?: string;
  @IsOptional() @IsString() bankAccountNo?: string;
  @IsOptional() @IsString() bankAccountName?: string;
}
