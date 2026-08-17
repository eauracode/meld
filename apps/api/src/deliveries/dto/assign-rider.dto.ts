import { IsInt, IsString, Min } from "class-validator";

export class AssignRiderDto {
  @IsString() orderId!: string;
  @IsString() riderId!: string;
  /** Dispatcher-set at assignment time (no more automatic fee-rules resolution). */
  @IsInt() @Min(1) deliveryFeeKobo!: number;
  /** Independent of deliveryFeeKobo — validated server-side to be ≤ it. */
  @IsInt() @Min(0) riderPayoutKobo!: number;
}
