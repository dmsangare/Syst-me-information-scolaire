# SIS-MALI - LOT 0.2 : Audit de securite et corrections

**Date de cloture :** 2026-10-30 17:26:01
**Branche :** feat/ui-refonte-lot2
**Point de depart :** fb2afbb (tag pre-lot0)

---

## 1. Resume executif

Le LOT 0.2 a couvert l'audit de securite du backend NestJS et la correction des failles identifiees. **5 failles** ont ete corrigees, reparties en **5 commits atomiques**. Les compilations backend et frontend sont OK, et **104 tests unitaires/integration passent**.

**Statut global : LOT 0.2 TERMINE**

---

## 2. Failles identifiees et corrigees

| # | Faille | Gravite | Fichier(s) | Commit |
|---|--------|---------|-----------|--------|
| #3b | teacher-assignments sans filtrage schoolId (fuite cross-ecole) | CRITIQUE | teacher-assignments.service.ts + teacher-assignments.controller.ts | d7293e7 |
| #6 | users.controller.update avec dto: any (pas de validation) | ELEVEE | users.controller.ts + users/dto/index.ts (nouveau) | 5f9212e |
| #7 | users.service.update : dto.schoolId non valide | ELEVEE | users.service.ts | 20fb04b |
| #8 | image/svg+xml autorise dans les uploads (XSS stocke) | MOYENNE | schools.service.ts | b5c7fd3 |
| #10 | Doublons dans common/guards/index.ts | FAIBLE | common/guards/index.ts | 309e960 |

---

### Detail des corrections

#### #3b - teacher-assignments cross-ecole

**Probleme :** le service TeacherAssignmentsService ne filtrait pas par schoolId. Un utilisateur authentifie pouvait voir, creer et supprimer des affectations dans n'importe quelle ecole.

**Correction :**
- Ajout de @UseGuards(SchoolScopeGuard) sur le controleur.
- Ajout de CurrentUserPayload dans chaque methode du service.
- Methode privee assertResourceBelongsToSchool() qui verifie que teacher, class, subject, academicYear appartiennent bien a l'ecole de l'utilisateur.
- findAll() filtre par teacher.schoolId (relation).
- findOne() verifie l'appartenance de l'affectation.
- create(), createBulk(), remove(), removeBulk() valident toutes les ressources.

#### #6 - users.controller.update sans validation

**Probleme :** @Body() dto: any permettait de passer n'importe quel champ, y compris schoolId, password, mustChangePassword.

**Correction :**
- Creation de apps/api/src/users/dto/index.ts avec UpdateUserSchema (Zod, strict).
- Champs autorises : firstName, lastName, email, phone, status, roleIds.
- Champs retires : schoolId, password, mustChangePassword.
- Application du ZodValidationPipe sur users.controller.update.

#### #7 - users.service.update : schoolId non valide

**Probleme :** dto.schoolId etait utilise dans userRole.createMany sans validation. Combine a #6, un utilisateur pouvait assigner un role a un utilisateur d'une autre ecole.

**Correction :**
- Stockage du retour de getTargetOrFail() dans const target.
- Utilisation de target.schoolId au lieu de dto.schoolId.
- getTargetOrFail() fait deja assertSchoolAccess(caller, target.schoolId) (validation implicite).

#### #8 - SVG autorise (XSS stocke)

**Probleme :** image/svg+xml etait dans la liste MIME autorisee pour uploadLogo et uploadImage. Un SVG malveillant pouvait contenir du JavaScript execute dans le navigateur des autres utilisateurs.

**Correction :**
- Retrait de image/svg+xml des 2 listes MIME.
- Formats autorises : image/png, image/jpeg, image/jpg.

#### #10 - Doublons dans guards/index.ts

**Probleme :** 5 exports dupliques dans common/guards/index.ts (11 lignes au lieu de 6).

**Correction :** reecriture du fichier avec les 6 exports uniques.

---

## 3. Failles non corrigees (documentees pour LOT 0.3+)

| Faille | Gravite | Raison |
|--------|---------|--------|
| Exposition PostgreSQL sur 0.0.0.0:5432 | ELEVEE | A corriger au LOT 0.5 (Docker) |
| Exposition Redis sur 0.0.0.0:6379 | ELEVEE | A corriger au LOT 0.5 (Docker) |
| Volume Redis anonyme (280e63...) | MOYENNE | A corriger au LOT 0.5 (Docker) |
| Reseau Docker bridge par defaut | MOYENNE | A corriger au LOT 0.5 (Docker) |
| .env racine (2760 o) - secrets a auditer | MOYENNE | A corriger au LOT 0.3 (secrets) |

---

## 4. Fausses alertes (verifiees et ecartees)

L'audit initial avait identifie 10 failles. **5 se sont revelees etre de fausses alertes** apres lecture de app.module.ts :

| # | Fausse alerte | Realite |
|---|--------------|---------|
| #1 | PermissionsGuard jamais applique | Global via APP_GUARD |
| #2 | JwtAuthGuard pas global | Global via APP_GUARD |
| #4 | MustChangePasswordGuard jamais applique | Global via APP_GUARD |
| #5 | UserThrottlerGuard jamais applique | Global via APP_GUARD |
| #9 | @RequirePermissions decoratif | Actif via PermissionsGuard global |

**Lecon :** toujours lire la configuration globale (app.module.ts) avant de conclure a une faille.

---

## 5. Fichiers crees ou modifies

### Fichiers crees
- apps/api/src/users/dto/index.ts (nouveau) - UpdateUserSchema et UpdateUserDto

### Fichiers modifies
- apps/api/src/teacher-assignments/teacher-assignments.service.ts
- apps/api/src/teacher-assignments/teacher-assignments.controller.ts
- apps/api/src/users/users.controller.ts
- apps/api/src/users/users.service.ts
- apps/api/src/schools/schools.service.ts
- apps/api/src/common/guards/index.ts

### Backups
Tous les fichiers modifies ont ete sauvegardes dans :
C:\Users\dmsan\Documents\AppEcole\_backups\lot0.2-20261030-1646\

---

## 6. Commits

- 309e960 chore(guards): supprime les exports dupliques de index.ts
- b5c7fd3 fix(security): retire image/svg+xml des uploads (XSS stocke)
- 20fb04b fix(security): valide schoolId dans users.service.update
- 5f9212e fix(security): valide le body de PATCH /users/:id avec Zod
- d7293e7 fix(security): teacher-assignments filtre par schoolId
- fb2afbb wip: sauvegarde etat de travail avant LOT 0 (tag pre-lot0)

---

## 7. Resultats de compilation

| Composant | Resultat |
|-----------|----------|
| Backend (apps/api) - npx tsc --noEmit | OK |
| Frontend (apps/web) - npx tsc --noEmit | OK |

---

## 8. Resultats des tests

| Metrique | Valeur |
|----------|--------|
| Suites de tests | 9 / 9 |
| Tests | 104 / 104 |
| Echecs | 0 |
| Duree | 18,7 s |

### Suites de tests executees
- annual-results.service.integration.spec.ts
- dashboard.service.integration.spec.ts
- report-cards.service.integration.spec.ts
- report-cards/calculation/conformance.spec.ts
- report-cards/calculation/first-cycle.spec.ts (1er cycle - LOT 1)
- report-cards/calculation/second-cycle.spec.ts (2nd cycle - LOT 1)
- report-cards/calculation/common.spec.ts
- report-cards/calculation/decision.spec.ts
- report-cards/iscomplete.diagnostic.spec.ts

**Aucune regression.**

---

## 9. Etat Git

- Working tree : Propre
- Branche : feat/ui-refonte-lot2
- HEAD : 309e960
- Dernier tag : pre-lot0 (sur fb2afbb)

---

## 10. Recommandations pour la suite

### LOT 0.3 - Gestion des secrets
1. Auditer le .env racine (2760 o).
2. Verifier .env.example (sans secret).
3. Scanner l'historique Git pour secrets exposes.
4. Ajouter les regles .gitignore manquantes.

### LOT 0.5 - Docker / PostgreSQL / Redis / Nginx
1. Retirer l'exposition des ports 5432 (PostgreSQL) et 6379 (Redis) sur 0.0.0.0.
2. Nommer le volume Redis (sis-mali-redis-data) au lieu de l'anonyme 280e63...
3. Creer un reseau Docker dedie (sis-mali-network) au lieu du bridge par defaut.
4. Verifier les healthchecks.
5. Verifier la configuration Nginx.

### LOT 0.6 - Tests de securite
1. Ecrire des tests d'integration par role :
   - TEACHER ne peut pas GET /users.
   - TEACHER ne peut pas POST /users.
   - SECRETARY peut POST /users mais pas DELETE /users/:id.
   - DIRECTOR peut PATCH /users/:id mais pas DELETE /users/:id.
   - Utilisateur ecole A ne voit pas donnees ecole B.
   - mustChangePassword bloque bien l'acces.

### LOT 1 - Bulletins
1. Les tests existants (first-cycle.spec.ts, second-cycle.spec.ts, decision.spec.ts, conformance.spec.ts) sont une excellente base.
2. Verifier les cas de test obligatoires du cahier des charges (11 cas).
3. S'appuyer sur l'oracle independant pour valider les calculs.

---

## 11. Risques residuels

| Risque | Gravite | Mitigation |
|--------|---------|-----------|
| PostgreSQL/Redis exposes sur le LAN | ELEVEE | LOT 0.5 |
| Volume Redis anonyme (perte possible) | MOYENNE | LOT 0.5 |
| Secrets non audites dans .env | MOYENNE | LOT 0.3 |
| Pas de tests de securite par role | MOYENNE | LOT 0.6 |

---

## 12. Conclusion

Le LOT 0.2 a permis de corriger 5 failles de securite sans regression :
- Compilation backend OK
- Compilation frontend OK
- 104 tests passent
- Working tree propre
- 5 commits atomiques

**Le backend est plus sur qu'avant le LOT 0.2.** Les failles restantes (exposition Docker, secrets) seront traitees aux LOT 0.3 et 0.5.

**Le projet est pret pour la suite.**