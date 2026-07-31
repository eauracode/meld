import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from "class-validator";

export enum RegisterRole {
  merchant = "merchant",
  // rider registration happens via approve-rider-application, not self-serve
  ops_agent = "ops_agent",
  ops_admin = "ops_admin",
}

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @MinLength(2)
  fullName!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsEnum(RegisterRole)
  role!: RegisterRole;

  // merchant-only fields, required when role === merchant
  @IsOptional()
  @IsString()
  businessName?: string;
}
