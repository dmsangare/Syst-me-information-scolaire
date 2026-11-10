import { Module } from "@nestjs/common";
import { AttendanceController } from "./attendance.controller";
import { AttendanceService } from "./attendance.service";
import { DailyAttendanceController } from "./daily-attendance.controller";
import { DailyAttendanceService } from "./daily-attendance.service";
import { AttendanceStudentController } from "./attendance-student.controller";
import { AttendanceStudentService } from "./attendance-student.service";
import { AttendanceAlertsController } from "./attendance-alerts.controller";
import { AttendanceAlertsService } from "./attendance-alerts.service";
import { ParentContactsController } from "./parent-contacts.controller";
import { ParentContactsService } from "./parent-contacts.service";

@Module({
  controllers: [
    AttendanceController,
    DailyAttendanceController,
    AttendanceStudentController,
    AttendanceAlertsController,
    ParentContactsController,
  ],
  providers: [
    AttendanceService,
    DailyAttendanceService,
    AttendanceStudentService,
    AttendanceAlertsService,
    ParentContactsService,
  ],
  exports: [
    AttendanceService,
    DailyAttendanceService,
    AttendanceStudentService,  // ✅ NOUVEAU : exporté pour ReportCardsModule
  ],
})
export class AttendanceModule {}