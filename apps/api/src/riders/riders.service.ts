import { randomBytes } from "node:crypto";
import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";
import { LedgerService } from "../ledger/ledger.service";
import { AuditLogService } from "../common/audit-log.service";
import { notificationsKit } from "../kits/notifications-kit";
import type { CreateApplicationDto } from "./dto/create-application.dto";

const BCRYPT_ROUNDS = 12;

function generateTempPassword(): string {
  return randomBytes(9).toString("base64url"); // 12 chars, url-safe
}

@Injectable()
export class RidersService {
  constructor(
    private prisma: PrismaService,
    private ledger: LedgerService,
    private audit: AuditLogService,
  ) {}

  /** Public — no auth (marketing site funnel, 04_PRD_Rider onboarding). */
  async apply(dto: CreateApplicationDto) {
    return this.prisma.riderApplication.create({
      data: {
        fullName: dto.fullName,
        phone: dto.phone,
        city: dto.city,
        state: dto.state,
        vehicle: dto.vehicle,
        hasLicence: dto.hasLicence,
      },
    });
  }

  async listApplications(status?: "applied" | "approved" | "rejected") {
    return this.prisma.riderApplication.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Creates the rider's login directly (own JWT auth now — no Auth Admin
   * API to call). Ops supplies/confirms the email since the application
   * form itself never collected one (marketing site — 02_PRD_Marketing).
   * A temp password is generated and emailed; the rider should change it
   * after first login (no forced-reset flow yet — noted as a follow-up).
   */
  async approve(input: { applicationId: string; email: string; actorId: string }) {
    const application = await this.prisma.riderApplication.findUnique({ where: { id: input.applicationId } });
    if (!application) throw new NotFoundException("Application not found");
    if (application.status !== "applied") {
      throw new BadRequestException(`Application is ${application.status}, not applied`);
    }

    const existingUser = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (existingUser) throw new ConflictException("An account with this email already exists");

    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, BCRYPT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        fullName: application.fullName,
        phone: application.phone,
        role: "rider",
      },
    });

    const rider = await this.prisma.rider.create({
      data: {
        userId: user.id,
        applicationId: application.id,
        vehicle: application.vehicle,
        city: application.city,
        state: application.state,
        hasLicence: application.hasLicence,
        status: "active",
      },
    });

    await this.ledger.ensureAccount({ type: "rider_wallet", ownerType: "rider", ownerId: rider.id });
    await this.ledger.ensureAccount({ type: "cash_in_transit", ownerType: "rider", ownerId: rider.id });

    await this.prisma.riderApplication.update({
      where: { id: application.id },
      data: { status: "approved", reviewedById: input.actorId, reviewedAt: new Date() },
    });

    await this.audit.record({
      actorId: input.actorId,
      action: "approve_rider",
      entityType: "rider",
      entityId: rider.id,
      detail: { applicationId: application.id, email: input.email },
    });

    // Best-effort — a failed email doesn't undo account creation; Ops can
    // relay the temp password out-of-band if delivery fails.
    try {
      const { Notifier, createTransports } = await notificationsKit();
      const notifier = new Notifier(createTransports(process.env as Record<string, string | undefined>));
      await notifier.notify(
        "account_approved",
        [{ profileId: user.id, email: input.email, phone: application.phone, name: application.fullName }],
        ["email"],
        { role: "rider" },
      );
    } catch (err) {
      console.error("Rider approval email failed to send", err);
    }

    return { rider, tempPassword };
  }

  async reject(applicationId: string, reason: string, actorId: string) {
    const application = await this.prisma.riderApplication.findUnique({ where: { id: applicationId } });
    if (!application) throw new NotFoundException("Application not found");
    if (application.status !== "applied") {
      throw new BadRequestException(`Application is ${application.status}, not applied`);
    }
    const updated = await this.prisma.riderApplication.update({
      where: { id: applicationId },
      data: { status: "rejected", reviewedById: actorId, reviewedAt: new Date(), rejectReason: reason },
    });
    await this.audit.record({
      actorId,
      action: "reject_rider",
      entityType: "rider_application",
      entityId: applicationId,
      detail: { reason },
    });
    return updated;
  }

  async listRiders() {
    return this.prisma.rider.findMany({
      include: { user: { select: { fullName: true, phone: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async setStatus(riderId: string, status: "active" | "suspended", actorId: string) {
    const updated = await this.prisma.rider.update({ where: { id: riderId }, data: { status } });
    await this.audit.record({
      actorId,
      action: "set_rider_status",
      entityType: "rider",
      entityId: riderId,
      detail: { status },
    });
    return updated;
  }

  async findOwn(userId: string) {
    const rider = await this.prisma.rider.findUnique({
      where: { userId },
      include: { user: { select: { fullName: true, phone: true, email: true } } },
    });
    if (!rider) throw new NotFoundException("No rider profile for this user");
    return rider;
  }

  async updateOwnProfile(
    userId: string,
    input: {
      city?: string;
      state?: string;
      bankName?: string;
      bankCode?: string;
      bankAccountNo?: string;
      bankAccountName?: string;
    },
  ) {
    return this.prisma.rider.update({ where: { userId }, data: input });
  }
}
