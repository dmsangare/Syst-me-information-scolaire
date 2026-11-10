import { Controller, Post, Get, Body, HttpCode, HttpStatus, Req, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { AuthGuard } from "@nestjs/passport";
import { Request } from "express";
import { AuthService } from "./auth.service";
import { LoginSchema, ChangePasswordSchema } from "./dto";
import { ZodValidationPipe } from "../common/pipes";
import { Public, CurrentUser, AllowNoPermissions } from "../common/decorators";

@ApiTags("Authentication")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ auth: { limit: 5, ttl: 15 * 60_000 } })
  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Connexion (email ou telephone)" })
  async login(
    @Body(new ZodValidationPipe(LoginSchema)) dto: { identifier: string; password: string },
    @Req() req: Request,
  ) {
    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0] || req.ip || null;
    const ua = req.headers["user-agent"] || null;
    return this.authService.login(dto.identifier, dto.password, ip, ua);
  }

  @Public()
  @UseGuards(AuthGuard("jwt-refresh"))
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Rafraichir le token d acces" })
  async refresh(@Req() req: Request) {
    const user = (req as any).user as { id: string; tokenId: string };
    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0] || req.ip || null;
    const ua = req.headers["user-agent"] || null;
    return this.authService.refresh(user.id, user.tokenId, ip, ua);
  }

  @AllowNoPermissions()
  @ApiBearerAuth("access-token")
  @Post("logout")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Deconnexion" })
  async logout(@CurrentUser("id") userId: string) {
    return this.authService.logout(userId);
  }

  @AllowNoPermissions()
  @ApiBearerAuth("access-token")
  @Get("me")
  @ApiOperation({ summary: "Profil de l utilisateur connecte" })
  async me(@CurrentUser("id") userId: string) {
    return this.authService.me(userId);
  }

  @AllowNoPermissions()
  @ApiBearerAuth("access-token")
  @Post("password/change")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Changer le mot de passe" })
  async changePassword(
    @CurrentUser("id") userId: string,
    @Body(new ZodValidationPipe(ChangePasswordSchema))
    dto: { currentPassword: string; newPassword: string; confirmPassword: string },
  ) {
    return this.authService.changePassword(userId, dto.currentPassword, dto.newPassword);
  }
}