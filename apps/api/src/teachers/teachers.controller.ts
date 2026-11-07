import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { TeachersService } from './teachers.service';

@Controller('teachers')
@UseGuards(JwtAuthGuard)
export class TeachersController {
  constructor(private service: TeachersService) {}

  @Get()
  @RequirePermissions('teacher:view')
  findAll(@Req() req: any, @Query() query: any) {
    return this.service.findAll(req.user.schoolId, query);
  }

  @Get('subjects')
  @RequirePermissions('teacher:view')
  getSubjects(@Req() req: any) {
    return this.service.getSubjects(req.user.schoolId);
  }

  @Get('classes')
  @RequirePermissions('teacher:view')
  getClasses(@Req() req: any) {
    return this.service.getClasses(req.user.schoolId);
  }

  @Get('academic-years')
  @RequirePermissions('teacher:view')
  getAcademicYears(@Req() req: any) {
    return this.service.getAcademicYears(req.user.schoolId);
  }

  @Get('available')
  @RequirePermissions('teacher:view')
  findAvailable(
    @Req() req: any,
    @Query('includeLinked') includeLinked?: string,
  ) {
    return this.service.findAvailable(
      req.user.schoolId,
      includeLinked === 'true',
    );
  }

  @Get(':id')
  @RequirePermissions('teacher:view')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.service.findOne(req.user.schoolId, id);
  }

  @Get(':id/assigned')
  @RequirePermissions('teacher:view')
  getAssigned(@Req() req: any, @Param('id') id: string, @Query('academicYearId') academicYearId?: string) {
    return this.service.getAssignedClasses(req.user.schoolId, id, academicYearId);
  }

  @Get(':id/assigned-subjects')
  @RequirePermissions('teacher:view')
  getAssignedSubjects(@Req() req: any, @Param('id') id: string, @Query('academicYearId') academicYearId?: string) {
    return this.service.getAssignedSubjects(req.user.schoolId, id, academicYearId);
  }

  @Get(':id/specialties')
  @RequirePermissions('teacher:view')
  getSpecialties(@Req() req: any, @Param('id') id: string) {
    return this.service.getSpecialties(req.user.schoolId, id);
  }

  @Post()
  @RequirePermissions('teacher:create')
  create(@Req() req: any, @Body() dto: any) {
    return this.service.create(req.user.schoolId, dto);
  }

  @Patch(':id')
  @RequirePermissions('teacher:update')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.service.update(req.user.schoolId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('teacher:delete')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.service.remove(req.user.schoolId, id);
  }

  @Post(':id/assign')
  @RequirePermissions('teacher:update')
  assign(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.service.assignSubject(req.user.schoolId, id, dto);
  }

  @Delete(':id/assign/:assignmentId')
  @RequirePermissions('teacher:update')
  removeAssignment(
    @Req() req: any,
    @Param('id') id: string,
    @Param('assignmentId') assignmentId: string,
  ) {
    return this.service.removeAssignment(req.user.schoolId, id, assignmentId);
  }

  @Post(':id/specialties')
  @RequirePermissions('teacher:update')
  addSpecialty(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.service.addSpecialty(req.user.schoolId, id, dto);
  }

  @Delete(':id/specialties/:specialtyId')
  @RequirePermissions('teacher:update')
  removeSpecialty(
    @Req() req: any,
    @Param('id') id: string,
    @Param('specialtyId') specialtyId: string,
  ) {
    return this.service.removeSpecialty(req.user.schoolId, id, specialtyId);
  }
}