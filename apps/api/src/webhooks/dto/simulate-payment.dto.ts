import { IsEnum, IsInt, IsPositive, IsString } from "class-validator";

export enum SimulatePaymentPurpose {
  delivery_payment = "delivery_payment",
  cash_remittance = "cash_remittance",
}

export class SimulatePaymentDto {
  @IsEnum(SimulatePaymentPurpose) purpose!: SimulatePaymentPurpose;
  @IsString() referenceId!: string;
  @IsInt() @IsPositive() amountKobo!: number;
}
