import { Module } from "@nestjs/common";
import { AttendanceController } from "./attendance.controller";
import { AttendanceService } from "./attendance.service";
import { DailyAttendanceController } from "./daily-attendance.controller";
import { DailyAttendanceService } from "./daily-attendance.service";
import { AttendanceStudentController } from "./attendance-student.controller";
import { AttendanceStudentService } from "./attendance-student.service";

@Module({
  controllers: [
    AttendanceController,
    DailyAttendanceController,
    AttendanceStudentController,
  ],
  providers: [
    AttendanceService,
    DailyAttendanceService,
    AttendanceStudentService,
  ],
  exports: [AttendanceService, DailyAttendanceService],
})
export class AttendanceModule {}