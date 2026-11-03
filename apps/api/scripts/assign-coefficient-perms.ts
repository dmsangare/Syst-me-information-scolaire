/**
 * Script one-shot d'assignation des permissions coefficient:* aux roles.
 * Idempotent : peut etre relance sans risque.
 *
 * Utilisation :
 *   npx ts-node scripts/assign-coefficient-perms.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ASSIGNMENTS: Array<{ roleCode: string; permissionCodes: string[] }> = [
  { roleCode: "DIRECTOR",   permissionCodes: ["coefficient:view", "coefficient:edit", "coefficient:manage"] },
  { roleCode: "SUPERVISOR", permissionCodes: ["coefficient:view", "coefficient:edit"] },
  { roleCode: "TEACHER",    permissionCodes: ["coefficient:view"] },
];

async function main() {
  console.log("=== Assignation des permissions coefficient:* ===");

  // 1. Verifier que les 3 permissions existent
  const permCodes = ["coefficient:view", "coefficient:edit", "coefficient:manage"];
  const existingPerms = await prisma.permission.findMany({
    where: { code: { in: permCodes } },
  });

  if (existingPerms.length !== permCodes.length) {
    console.error("ERREUR : les permissions n'existent pas toutes en base. Lancez `npm run prisma:seed` d'abord.");
    console.error("Trouvees :", existingPerms.map((p) => p.code));
    console.error("Attendues :", permCodes);
    process.exit(1);
  }

  const permByCode = new Map(existingPerms.map((p) => [p.code, p]));
  console.log("Permissions trouvees :", existingPerms.map((p) => p.code).join(", "));

  // 2. Assigner aux roles
  let totalAdded = 0;
  let totalSkipped = 0;

  for (const { roleCode, permissionCodes } of ASSIGNMENTS) {
    const role = await prisma.role.findUnique({ where: { code: roleCode } });
    if (!role) {
      console.warn("Role introuvable :", roleCode, "— skip");
      continue;
    }

    console.log("\nRole", roleCode, "(" + role.id + ")");
    for (const pCode of permissionCodes) {
      const perm = permByCode.get(pCode);
      if (!perm) {
        console.warn("  Permission introuvable :", pCode);
        continue;
      }

      const existing = await prisma.rolePermission.findUnique({
        where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
      });

      if (existing) {
        console.log("  [DEJA] ", pCode);
        totalSkipped++;
      } else {
        await prisma.rolePermission.create({
          data: { roleId: role.id, permissionId: perm.id },
        });
        console.log("  [AJOUT] ", pCode);
        totalAdded++;
      }
    }
  }

  console.log("\n=== Resume ===");
  console.log("Ajoutees :", totalAdded);
  console.log("Deja presentes :", totalSkipped);
}

main()
  .catch((e) => {
    console.error("Erreur :", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());