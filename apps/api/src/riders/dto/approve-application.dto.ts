import { IsEmail, IsOptional } from "class-validator";

export class ApproveApplicationDto {
  // Optional override — defaults to the email the rider gave on their
  // application. Only needed if ops has to correct a typo'd address.
  @IsOptional()
  @IsEmail()
  email?: string;
}
