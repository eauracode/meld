import { IsEnum, IsString } from "class-validator";

export enum VirtualAccountPurposeDto {
  delivery_payment = "delivery_payment",
  cash_remittance = "cash_remittance",
}

export class GenerateVaDto {
  @IsEnum(VirtualAccountPurposeDto) purpose!: VirtualAccountPurposeDto;
  @IsString() referenceId!: string;
}
