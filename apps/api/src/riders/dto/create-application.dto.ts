import { IsBoolean, IsEnum, IsString, Matches, MinLength } from "class-validator";

export enum VehicleTypeDto {
  bike = "bike",
  car = "car",
  van = "van",
}

export class CreateApplicationDto {
  @IsString() @MinLength(2) fullName!: string;
  @Matches(/^[0-9+\-\s()]{7,20}$/) phone!: string;
  @IsString() city!: string;
  @IsString() state!: string;
  @IsEnum(VehicleTypeDto) vehicle!: VehicleTypeDto;
  @IsBoolean() hasLicence!: boolean;
}
