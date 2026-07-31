import { IsString } from "class-validator";

export class AssignRiderDto {
  @IsString() orderId!: string;
  @IsString() riderId!: string;
}
