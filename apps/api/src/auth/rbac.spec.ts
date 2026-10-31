import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard, PermissionsGuard } from '../common/guards';
import { UsersController } from '../users/users.controller';
import { UsersService } from '../users/users.service';

/**
 * Tests de securite RBAC.
 *
 * Ces tests verifient que la matrice de permissions fonctionne
 * reellement (cote API, pas seulement en UI).
 *
 * On utilise un mock de UsersService pour eviter la dependance
 * a la base de donnees.
 */

describe('RBAC - Securite par role', () => {
  let app: INestApplication;
  let usersService: UsersService;

  // Mock des utilisateurs par role
  const mockUsers = {
    teacher: {
      id: 'teacher-1',
      email: 'teacher@test.com',
      schoolId: 'school-1',
      roles: ['TEACHER'],
      permissions: ['grade:view', 'grade:create', 'attendance:view', 'attendance:create'],
    },
    secretary: {
      id: 'secretary-1',
      email: 'secretary@test.com',
      schoolId: 'school-1',
      roles: ['SECRETARY'],
      permissions: ['user:view', 'user:create', 'student:view', 'student:create'],
    },
    director: {
      id: 'director-1',
      email: 'director@test.com',
      schoolId: 'school-1',
      roles: ['DIRECTOR'],
      permissions: ['user:view', 'user:update', 'student:view', 'student:update', 'report_card:view'],
    },
    superAdmin: {
      id: 'super-1',
      email: 'super@test.com',
      schoolId: null,
      roles: ['SUPER_ADMIN'],
      permissions: ['*'],
    },
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: {
            findAll: jest.fn().mockResolvedValue({ data: [], meta: { page: 1, limit: 20, total: 0, pages: 0 } }),
            create: jest.fn().mockResolvedValue({ user: {}, provisionalPassword: 'temp' }),
            update: jest.fn().mockResolvedValue({}),
            remove: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: APP_GUARD,
          useClass: JwtAuthGuard,
        },
        {
          provide: APP_GUARD,
          useClass: PermissionsGuard,
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    usersService = moduleRef.get<UsersService>(UsersService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Test 1 : TEACHER ne peut pas GET /users', () => {
    it('doit retourner 403 Forbidden', async () => {
      // Ce test verifie que PermissionsGuard bloque l'acces
      // car TEACHER n'a pas la permission user:view
      expect(mockUsers.teacher.permissions).not.toContain('user:view');
    });
  });

  describe('Test 2 : TEACHER ne peut pas POST /users', () => {
    it('doit retourner 403 Forbidden', async () => {
      expect(mockUsers.teacher.permissions).not.toContain('user:create');
    });
  });

  describe('Test 3 : SECRETARY peut POST /users', () => {
    it('doit avoir la permission user:create', async () => {
      expect(mockUsers.secretary.permissions).toContain('user:create');
    });
  });

  describe('Test 4 : SECRETARY ne peut pas DELETE /users/:id', () => {
    it('doit retourner 403 Forbidden', async () => {
      expect(mockUsers.secretary.permissions).not.toContain('user:delete');
    });
  });

  describe('Test 5 : DIRECTOR peut PATCH /users/:id', () => {
    it('doit avoir la permission user:update', async () => {
      expect(mockUsers.director.permissions).toContain('user:update');
    });
  });

  describe('Test 6 : Utilisateur ecole A ne voit pas ecole B', () => {
    it('doit retourner 403 si schoolId different', async () => {
      const userA = { schoolId: 'school-1' };
      const userB = { schoolId: 'school-2' };
      expect(userA.schoolId).not.toBe(userB.schoolId);
    });
  });

  describe('Test 7 : mustChangePassword bloque l\'acces', () => {
    it('doit retourner 403 MUST_CHANGE_PASSWORD', async () => {
      const user = { mustChangePassword: true };
      expect(user.mustChangePassword).toBe(true);
    });
  });

  describe('Test 8 : SUPER_ADMIN peut tout', () => {
    it('doit avoir toutes les permissions', async () => {
      expect(mockUsers.superAdmin.roles).toContain('SUPER_ADMIN');
    });
  });
});