import { z } from "zod";

/**
 * Validation for the two tables this surface may write to
 * (07_DATABASE_SCHEMA.sql: rider_applications, demo_requests).
 * Mirrors the enum/column constraints exactly so a passing client-side
 * validation and the eventual Postgres insert never disagree.
 */

export const vehicleTypeSchema = z.enum(["bike", "car", "van"]);

export const riderApplicationSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name"),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s()]{7,20}$/, "Enter a valid phone number"),
  city: z.string().trim().min(2, "Enter your city"),
  state: z.string().trim().min(2, "Select your state"),
  vehicle: vehicleTypeSchema,
  hasLicence: z.boolean(),
});
export type RiderApplicationInput = z.infer<typeof riderApplicationSchema>;

export const demoRequestSchema = z.object({
  name: z.string().trim().min(2, "Enter your name"),
  businessName: z.string().trim().optional().or(z.literal("")),
  email: z.string().trim().email("Enter a valid email"),
  phone: z.string().trim().optional().or(z.literal("")),
  message: z.string().trim().max(2000).optional().or(z.literal("")),
});
export type DemoRequestInput = z.infer<typeof demoRequestSchema>;
