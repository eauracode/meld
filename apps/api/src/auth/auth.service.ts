import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";
import type { RegisterDto } from "./dto/register.dto";
import type { LoginDto } from "./dto/login.dto";

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException("An account with this email already exists");

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        fullName: dto.fullName,
        phone: dto.phone,
        role: dto.role,
      },
    });

    // Merchants self-serve sign up pending_approval (03_PRD_Merchant §2); Ops
    // staff are created directly active (invited by another admin in practice —
    // open self-serve for ops_admin/ops_agent is a v1 simplification pending a
    // real staff-invite flow).
    if (dto.role === "merchant") {
      // merchant_payable ledger account is created on approval, not here — a
      // pending merchant has no ledger presence yet (mirrors approve_merchant()).
      await this.prisma.merchant.create({
        data: {
          userId: user.id,
          businessName: dto.businessName ?? dto.fullName,
          contactPerson: dto.fullName,
          phone: dto.phone,
          email: dto.email,
          status: "pending_approval",
        },
      });
    }

    return this.issueToken(user.id, user.role);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException("Invalid email or password");

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException("Invalid email or password");

    return this.issueToken(user.id, user.role);
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, fullName: true, email: true, phone: true },
    });
    if (!user) throw new NotFoundException("User not found");
    return user;
  }

  private issueToken(userId: string, role: string) {
    const accessToken = this.jwt.sign({ sub: userId, role });
    return { accessToken, userId, role };
  }
}
