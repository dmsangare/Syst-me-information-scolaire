/**
 * SIS-MALI — Database Seed (PRODUCTION)
 *
 * Ce seed cree UNIQUEMENT :
 *   1. Les roles systeme (RBAC)
 *   2. Les permissions (matrice module:action)
 *   3. La matrice role-permission
 *   4. UN SEUL utilisateur : le Super Admin
 *
 * Aucune donnee de demonstration (eleves, classes, notes, paiements, etc.).
 * Le Super Admin cree lui-meme l'ecole, l'annee scolaire, les niveaux,
 * les matieres et tous les utilisateurs via l'interface de l'application.
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

// ============================================================
// PERMISSION MATRIX
// ============================================================

const MODULES = [
  'school',
  'academic_year',
  'level',
  'class',
  'student',
  'parent',
  'enrollment',
  'teacher',
  'subject',
  'assignment',
  'timetable',
  'attendance',
  'assessment',
  'grade',
  'report_card',
  'exam',
  'fee',
  'invoice',
  'payment',
  'cash',
  'document',
  'notification',
  'report',
  'user',
  'role',
  'audit',
  'backup',
  'settings',
] as const;

const ACTIONS = [
  'view',
  'create',
  'update',
  'delete',
  'validate',
  'export',
  'print',
  'lock',
  'close',
  'cancel',
  'archive',
  'restore',
] as const;

const ROLE_MATRIX: Record<string, { modules: string[]; actions: string[]; extras?: string[] } | 'all'> = {
  SUPER_ADMIN: 'all',
  DIRECTOR: {
    modules: MODULES.filter((m) => m !== 'backup'),
    actions: [...ACTIONS],
    extras: [
      'coefficient:view',
      'coefficient:edit',
      'coefficient:manage',
    ],
  },
  SECRETARY: {
    modules: ['student', 'parent', 'enrollment', 'document'],
    actions: ['view', 'create', 'update', 'export', 'print'],
  },
  TEACHER: {
    modules: ['student', 'assessment', 'grade', 'attendance', 'report_card', 'school', 'level', 'class', 'subject', 'timetable'],
    actions: ['view', 'create', 'update'],
    extras: [
      'coefficient:view',
    ],
  },
  ACCOUNTANT: {
    // Perimetre strict caissier / comptable :
    //   - fee / invoice / payment / cash / report : modules natifs
    //   - student:view + student:export : recherche eleve et export situation
    //   - class:view + level:view + academic_year:view : filtres de recherche
    //   - payment:cancel + invoice:cancel : annulation (traçabilite obligatoire)
    // AUCUN acces a : attendance, grade, assessment, enrollment, teacher,
    //                 parent, notification, timetable, document, exam, role,
    //                 user, school (sauf via settings:view pour l'UI)
    modules: ['fee', 'invoice', 'payment', 'cash', 'report'],
    actions: ['view', 'create', 'update', 'validate', 'export', 'print', 'close'],
    extras: [
      'student:view',
      'student:export',
      'class:view',
      'level:view',
      'academic_year:view',
      'payment:cancel',
      'invoice:cancel',
    ],
  },
  SUPERVISOR: {
    modules: ['student', 'attendance'],
    actions: ['view', 'create'],
    extras: [
      'coefficient:view',
      'coefficient:edit',
    ],
  },
  PARENT: {
    modules: ['student', 'grade', 'report_card', 'attendance', 'invoice', 'payment'],
    actions: ['view', 'print'],
  },
  STUDENT: {
    modules: ['grade', 'report_card', 'attendance'],
    actions: ['view'],
  },
};

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Administrateur',
  DIRECTOR: 'Direction',
  SECRETARY: 'Secrétariat',
  TEACHER: 'Enseignant',
  ACCOUNTANT: 'Comptable / Caissier',
  SUPERVISOR: 'Surveillant',
  PARENT: 'Parent / Tuteur',
  STUDENT: 'Élève',
};

// ============================================================
// MAIN SEED FUNCTION
// ============================================================

async function main() {
  console.log('🌱 SIS-MALI — Seed production (vierge)\n');

  // --- 1. Roles ---
  console.log('📋 Creating roles...');
  const roles: Record<string, { id: string }> = {};
  for (const code of Object.keys(ROLE_LABELS)) {
    const role = await prisma.role.upsert({
      where: { code },
      update: { name: ROLE_LABELS[code] },
      create: {
        code,
        name: ROLE_LABELS[code],
        description: `Rôle système : ${ROLE_LABELS[code]}`,
        isSystem: true,
      },
    });
    roles[code] = role;
  }

  // --- 2. Permissions ---
  console.log('🔐 Creating permissions...');
  const permissions: Record<string, { id: string }> = {};
  for (const module of MODULES) {
    for (const action of ACTIONS) {
      const code = `${module}:${action}`;
      const perm = await prisma.permission.upsert({
        where: { code },
        update: {},
        create: {
          code,
          module,
          action,
          description: `${action} sur ${module}`,
        },
      });
      permissions[code] = perm;
    }
  }


  // --- 2bis. Permissions DEDIEES (hors croisement module x action) ---
  // Ces permissions sont volontairement hors MODULES/ACTIONS pour ne pas
  // elargir les droits des roles existants. Elles sont assignees via un
  // script one-shot (scripts/assign-coefficient-perms.ts) + ROLE_MATRIX extras.
  console.log('[DEDICATED] Creating dedicated coefficient permissions...');
  const dedicatedPermissions: Array<{ code: string; module: string; action: string; description: string }> = [
    { code: 'coefficient:view',   module: 'coefficient', action: 'view',   description: 'Consulter les coefficients' },
    { code: 'coefficient:edit',   module: 'coefficient', action: 'edit',   description: 'Modifier les coefficients (creation/mise a jour)' },
    { code: 'coefficient:manage', module: 'coefficient', action: 'manage', description: 'Gerer les coefficients (suppression + delegation)' },
  ];
  for (const def of dedicatedPermissions) {
    const perm = await prisma.permission.upsert({
      where: { code: def.code },
      update: {},
      create: def,
    });
    permissions[def.code] = perm;
  }

  // --- 3. Role-Permission matrix (IDEMPOTENT + PROTEGE) ---
  // Regle metier : le seed ne touche a la matrice RBAC QUE si l'ecole n'a
  // jamais ete initialisee (aucun rolePermission existant).
  // Apres la 1ere passe, les personnalisations du client sont sacrees.
  const existingRolePerms = await prisma.rolePermission.count();
  const isFirstRbacSetup = existingRolePerms === 0;

  if (!isFirstRbacSetup) {
    console.log(
      `⏭️  RBAC deja initialise (${existingRolePerms} role_permissions existants)`,
    );
    console.log('    Les permissions existantes sont preservees.');
    console.log('    Pour forcer la re-application : vider la table role_permissions.');
    console.log('');
  } else {
    console.log('🔗 Linking roles to permissions (premiere initialisation)…');
  }

  if (isFirstRbacSetup) {
    for (const [roleCode, config] of Object.entries(ROLE_MATRIX)) {
    const roleId = roles[roleCode].id;
    const targetModules = config === 'all' ? MODULES : config.modules;
    const targetActions = config === 'all' ? ACTIONS : config.actions;

    for (const module of targetModules) {
      for (const action of targetActions) {
        const permCode = `${module}:${action}`;
        if (!permissions[permCode]) continue;
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId,
              permissionId: permissions[permCode].id,
            },
          },
          update: {},
          create: { roleId, permissionId: permissions[permCode].id },
        });
      }
    }

    // Extras : permissions ciblees hors croisement modules x actions
    if (config !== 'all' && config.extras) {
      for (const permCode of config.extras) {
        if (!permissions[permCode]) continue;
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId,
              permissionId: permissions[permCode].id,
            },
          },
          update: {},
          create: { roleId, permissionId: permissions[permCode].id },
        });
      }
    }
  }
  } // fin if (isFirstRbacSetup)

  // --- 4. Super Admin (seul utilisateur cree) ---
  console.log('\n👤 Creating Super Admin...');

  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@sis-mali.local';
  const superAdminFirstname = process.env.SUPER_ADMIN_FIRSTNAME || 'Super';
  const superAdminLastname = process.env.SUPER_ADMIN_LASTNAME || 'Admin';
  const seedPassword =
    process.env.SUPER_ADMIN_PASSWORD ||
    `${randomBytes(9).toString('base64url')}Aa1!`;
  const passwordHash = await bcrypt.hash(seedPassword, 12);

  const superAdmin = await prisma.user.upsert({
    where: { email: superAdminEmail },
    update: {},
    create: {
      schoolId: null,
      email: superAdminEmail,
      passwordHash,
      firstName: superAdminFirstname,
      lastName: superAdminLastname,
      status: 'ACTIVE',
      mustChangePassword: true,
    },
  });

  // Lier le role SUPER_ADMIN
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: superAdmin.id,
        roleId: roles['SUPER_ADMIN'].id,
      },
    },
    update: {},
    create: {
      userId: superAdmin.id,
      roleId: roles['SUPER_ADMIN'].id,
    },
  });

  // --- 5. Categories de depenses par defaut (pour chaque ecole) ---
  console.log('\n📂 Creating default expense categories...');

  const DEFAULT_EXPENSE_CATEGORIES = [
    { code: 'SALAIRES',    name: 'Salaires',              emoji: '\u{1F4BC}' },
    { code: 'FOURNITURES', name: 'Fournitures scolaires', emoji: '\u{1F4DA}' },
    { code: 'ENTRETIEN',   name: 'Entretien et nettoyage',emoji: '\u{1F9F9}' },
    { code: 'ELECTRICITE', name: 'Electricite',           emoji: '\u{1F4A1}' },
    { code: 'LOYER',       name: 'Loyer',                 emoji: '\u{1F3E0}' },
    { code: 'REPARATIONS', name: 'Reparations',           emoji: '\u{1F527}' },
    { code: 'TRANSPORT',   name: 'Transport',             emoji: '\u{1F697}' },
    { code: 'GARDIEN',     name: 'Gardiennage',           emoji: '\u{1F6E1}\uFE0F' },
    { code: 'SANTE',       name: 'Sante',                 emoji: '\u{1F48A}' },
    { code: 'AUTRE',       name: 'Autre',                 emoji: '\u{1F4E6}' },
  ];

  const schools = await prisma.school.findMany({ select: { id: true, name: true } });
  let totalCategories = 0;

  for (const school of schools) {
    for (const cat of DEFAULT_EXPENSE_CATEGORIES) {
      await prisma.expenseCategory.upsert({
        where: { schoolId_code: { schoolId: school.id, code: cat.code } },
        update: { name: cat.name, emoji: cat.emoji },
        create: {
          schoolId: school.id,
          code: cat.code,
          name: cat.name,
          emoji: cat.emoji,
          isActive: true,
          isSystem: true,
        },
      });
      totalCategories++;
    }
    console.log(`   ✓ ${school.name} : ${DEFAULT_EXPENSE_CATEGORIES.length} categories`);
  }
  console.log(`\n📂 ${totalCategories} categories au total pour ${schools.length} ecole(s).`);

  // --- 6. Resume ---
  console.log('\n✅ Seed completed successfully!\n');
  console.log('============================================================');
  console.log('🔑 CREDENTIALS SUPER ADMIN (a changer a la 1ere connexion)');
  console.log('============================================================');
  console.log(`   Email      : ${superAdminEmail}`);
  console.log(`   Mot de passe : ${seedPassword}`);
  console.log('');
  console.log('⚠️  Ce mot de passe ne sera plus affiche. Notez-le maintenant.');
  console.log('============================================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });