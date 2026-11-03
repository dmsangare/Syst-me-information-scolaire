import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("=== Creation des comptes de test RBAC ===\n");

  const school = await prisma.school.findFirst();
  if (!school) { console.error("Aucune ecole trouvee"); process.exit(1); }
  console.log("Ecole :", school.name, "(" + school.id + ")\n");

  const directorRole = await prisma.role.findUnique({ where: { code: "DIRECTOR" } });
  const supervisorRole = await prisma.role.findUnique({ where: { code: "SUPERVISOR" } });
  if (!directorRole || !supervisorRole) {
    console.error("Roles DIRECTOR ou SUPERVISOR introuvables");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash("Test@2026", 10);

  // Directeur de test
  const directorEmail = "director.test@sis-mali.local";
  const existingDirector = await prisma.user.findUnique({ where: { email: directorEmail } });
  let directorId: string;
  if (existingDirector) {
    directorId = existingDirector.id;
    console.log("Directeur existant :", directorEmail, "(" + directorId.substring(0,8) + "...)");
  } else {
    const d = await prisma.user.create({
      data: {
        schoolId: school.id,
        email: directorEmail,
        passwordHash,
        firstName: "Directeur",
        lastName: "Test",
        status: "ACTIVE",
        mustChangePassword: false,
      },
    });
    directorId = d.id;
    console.log("Directeur cree :", directorEmail, "(" + directorId.substring(0,8) + "...)");
  }

  // Lien role DIRECTOR (idempotent)
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: directorId, roleId: directorRole.id } },
    update: {},
    create: { userId: directorId, roleId: directorRole.id },
  });
  console.log("  Role DIRECTOR assigne\n");

  // Censeur de test
  const supervisorEmail = "censor.test@sis-mali.local";
  const existingSupervisor = await prisma.user.findUnique({ where: { email: supervisorEmail } });
  let supervisorId: string;
  if (existingSupervisor) {
    supervisorId = existingSupervisor.id;
    console.log("Censeur existant :", supervisorEmail, "(" + supervisorId.substring(0,8) + "...)");
  } else {
    const s = await prisma.user.create({
      data: {
        schoolId: school.id,
        email: supervisorEmail,
        passwordHash,
        firstName: "Censeur",
        lastName: "Test",
        status: "ACTIVE",
        mustChangePassword: false,
      },
    });
    supervisorId = s.id;
    console.log("Censeur cree :", supervisorEmail, "(" + supervisorId.substring(0,8) + "...)");
  }

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: supervisorId, roleId: supervisorRole.id } },
    update: {},
    create: { userId: supervisorId, roleId: supervisorRole.id },
  });
  console.log("  Role SUPERVISOR assigne\n");

  console.log("=== Termine ===");
  console.log("Comptes de test :");
  console.log("  Directeur :", directorEmail, "/ Test@2026");
  console.log("  Censeur   :", supervisorEmail, "/ Test@2026");
  console.log("  Enseignant:", "koumtra@epi.ml", "/ Koumb@tr@2026!");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());