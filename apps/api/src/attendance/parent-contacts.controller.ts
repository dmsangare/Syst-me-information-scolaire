import {
  Controller, Get, Post, Body, Param, UseGuards, BadRequestException,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { ParentContactsService } from "./parent-contacts.service";
import { RequirePermissions, CurrentUser, CurrentUserPayload } from "../common/decorators";
import { SchoolScopeGuard } from "../common/guards";

@ApiTags("ParentContacts")
@ApiBearerAuth("access-token")
@Controller("attendance/contacts")
@UseGuards(SchoolScopeGuard)
export class ParentContactsController {
  constructor(private readonly service: ParentContactsService) {}

  @Post()
  @RequirePermissions("attendance:update")
  @ApiOperation({ summary: "Enregistrer un contact parent" })
  async create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: any,
  ) {
    if (!user.schoolId) throw new BadRequestException("Ecole introuvable");
    if (!dto.studentId || !dto.method || !dto.result) {
      throw new BadRequestException("studentId, method et result obligatoires");
    }
    return this.service.create(user.schoolId, user.id, dto);
  }

  @Get("student/:studentId")
  @RequirePermissions("attendance:view")
  @ApiOperation({ summary: "Historique des contacts d'un élève" })
  async findByStudent(
    @CurrentUser() user: CurrentUserPayload,
    @Param("studentId") studentId: string,
  ) {
    if (!user.schoolId) throw new BadRequestException("Ecole introuvable");
    return this.service.findByStudent(user.schoolId, studentId);
  }
}