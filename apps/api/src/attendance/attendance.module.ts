import { Module } from "@nestjs/common";
import { AttendanceController } from "./attendance.controller";
import { AttendanceService } from "./attendance.service";
import { DailyAttendanceController } from "./daily-attendance.controller";
import { DailyAttendanceService } from "./daily-attendance.service";
import { AttendanceStudentController } from "./attendance-student.controller";
import { AttendanceStudentService } from "./attendance-student.service";
import { AttendanceAlertsController } from "./attendance-alerts.controller";
import { AttendanceAlertsService } from "./attendance-alerts.service";

@Module({
  controllers: [
    AttendanceController,
    DailyAttendanceController,
    AttendanceStudentController,
    AttendanceAlertsController,
  ],
  providers: [
    AttendanceService,
    DailyAttendanceService,
    AttendanceStudentService,
    AttendanceAlertsService,
  ],
  exports: [AttendanceService, DailyAttendanceService],
})
export class AttendanceModule {}