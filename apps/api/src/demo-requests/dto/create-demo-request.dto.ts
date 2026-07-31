import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class CreateDemoRequestDto {
  @IsString() @MinLength(2) name!: string;
  @IsOptional() @IsString() businessName?: string;
  @IsEmail() email!: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() @MaxLength(2000) message?: string;
}
