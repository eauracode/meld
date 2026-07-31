import { IsEmail } from "class-validator";

export class ApproveApplicationDto {
  @IsEmail()
  email!: string;
}
