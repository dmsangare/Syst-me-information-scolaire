export interface JustifyAbsenceDto {
  decision: "ACCEPTED" | "REJECTED";
  reason: string;
  observation?: string;
}
