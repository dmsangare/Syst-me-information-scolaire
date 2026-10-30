import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  HttpCode, HttpStatus, UseGuards, BadRequestException,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { UsersService } from "./users.service";
import { CurrentUser, CurrentUserPayload, RequirePermissions } from "../common/decorators";
import { SchoolScopeGuard } from "../common/guards";
import { isSuperAdmin } from "../common/utils";
import { PaginationDto } from "../common/dto/pagination.dto";
import { ZodValidationPipe } from "../common/pipes";
import { UpdateUserSchema, UpdateUserDto } from "./dto";

@ApiTags("Users")
@ApiBearerAuth("access-token")
@Controller("users")
@UseGuards(SchoolScopeGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // IMPORTANT : /roles doit etre AVANT /:id
  @Get("roles")
  @RequirePermissions("user:view")
  @ApiOperation({ summary: "Liste des roles disponibles" })
  async listRoles(@CurrentUser() user: CurrentUserPayload) {
    return this.usersService.listRoles(user);
  }

  @Get()
  @RequirePermissions("user:view")
  @ApiOperation({ summary: "Liste des utilisateurs" })
  async findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: PaginationDto,
  ) {
    const schoolId = user.roles.includes("SUPER_ADMIN") ? null : user.schoolId;
    return this.usersService.findAll(schoolId, query.page, query.limit, query.q);
  }

  @Get(":id")
  @RequirePermissions("user:view")
  @ApiOperation({ summary: "Detail d un utilisateur" })
  async findOne(@Param("id") id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.usersService.findOne(id, user);
  }

  @Post()
  @RequirePermissions("user:create")
  @ApiOperation({ summary: "Creer un utilisateur" })
  async create(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Body() dto: {
      schoolId?: string;
      email?: string;
      phone?: string;
      password?: string;
      firstName: string;
      lastName: string;
      roleIds: string[];
      teacherId?: string;
      guardianId?: string;
    },
  ) {
    if (dto.password !== undefined && dto.password.length > 0 && dto.password.length < 8) {
      throw new BadRequestException("Le mot de passe doit contenir au moins 8 caracteres");
    }
    if (!dto.roleIds || dto.roleIds.length === 0) {
      throw new BadRequestException("Au moins un role est requis");
    }

    // Non-SUPER_ADMIN : toujours rattache a son ecole.
    // SUPER_ADMIN : peut choisir l'ecole (dto.schoolId) ou aucune.
    const schoolId = isSuperAdmin(currentUser)
      ? dto.schoolId
      : currentUser.schoolId!;

    return this.usersService.create({
      ...dto,
      schoolId: schoolId || undefined,
    }, currentUser);
  }

  @Patch(":id")
  @RequirePermissions("user:update")
  @ApiOperation({ summary: "Modifier un utilisateur" })
  async update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(UpdateUserSchema)) dto: UpdateUserDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.usersService.update(id, dto, user);
  }

  @Post(":id/reset-password")
  @RequirePermissions("user:update")
  @ApiOperation({ summary: "Reinitialiser le mot de passe" })
  async resetPassword(
    @Param("id") id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.usersService.resetPassword(id, user);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions("user:delete")
  @ApiOperation({ summary: "Supprimer un utilisateur" })
  async remove(@Param("id") id: string, @CurrentUser() user: CurrentUserPayload) {
    await this.usersService.remove(id, user);
  }
}
