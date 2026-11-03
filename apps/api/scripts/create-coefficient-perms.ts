import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("=== Creation des 3 permissions coefficient:* ===");
  const defs = [
    { code: "coefficient:view",   module: "coefficient", action: "view",   description: "Consulter les coefficients" },
    { code: "coefficient:edit",   module: "coefficient", action: "edit",   description: "Modifier les coefficients (creation/mise a jour)" },
    { code: "coefficient:manage", module: "coefficient", action: "manage", description: "Gerer les coefficients (suppression + delegation)" },
  ];
  for (const def of defs) {
    const perm = await prisma.permission.upsert({
      where: { code: def.code },
      update: {},
      create: def,
    });
    console.log("  [OK] " + perm.code + " (id=" + perm.id.substring(0, 8) + "...)");
  }
  console.log("\n=== Termine ===");
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());