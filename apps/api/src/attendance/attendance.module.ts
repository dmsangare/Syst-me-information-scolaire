import { Module } from "@nestjs/common";
import { AttendanceController } from "./attendance.controller";
import { AttendanceService } from "./attendance.service";
import { DailyAttendanceController } from "./daily-attendance.controller";
import { DailyAttendanceService } from "./daily-attendance.service";

@Module({
  controllers: [AttendanceController, DailyAttendanceController],
  providers: [AttendanceService, DailyAttendanceService],
  exports: [AttendanceService, DailyAttendanceService],
})
export class AttendanceModule {}