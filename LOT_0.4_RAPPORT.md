# SIS-MALI - LOT 0.4 : Architecture et dependances

**Date de cloture :** 2026-10-30 18:36:36
**Branche :** feat/ui-refonte-lot2
**Commit :** c3e1a68
**Point de depart :** LOT 0.3 (commit ce40972)

---

## 1. Resume executif

Le LOT 0.4 a couvert l'audit de l'architecture et des dependances. **4 corrections** de `package.json` ont ete appliquees, et **6 vulnerabilites** ont ete corrigees via `npm audit fix`. Les compilations backend et frontend sont OK, et **104 tests passent**.

**Statut global : LOT 0.4 TERMINE (phase 1)**

---

## 2. Versions installées (avant LOT 0.4)

### 2.1 Runtime et infrastructure

| Composant | Version |
|-----------|---------|
| Node.js | v20.20.2 (LTS) |
| npm | 10.8.2 |
| Docker Engine | 29.9.2 |
| Docker Compose | v5.6.1 |
| PostgreSQL | 16.15 (postgres:16-alpine) |
| Redis | 7.4.12 (redis:7-alpine) |

### 2.2 Backend (apps/api)

- **NestJS 11.2.7** (derniere version majeure)
- **TypeScript 5.9.3** (derniere version stable)
- **Prisma 5.22.0** (CLI et Client, apres correction)
- **bcryptjs 2.4.3** -> **3.0.3** (apres correction)

### 2.3 Frontend (apps/web)

- **React 18.3.1**
- **Vite 5.4.21**
- **Tailwind CSS 3.4.19**
- **lucide-react 0.314.0** -> **0.500.0** (apres correction)

---

## 3. Corrections appliquees

| # | Correction | Fichier | Avant | Apres |
|---|-----------|---------|-------|-------|
| 1 | Ajout de prisma CLI | apps/api/package.json | (absent) | 5.22.0 |
| 2 | Alignement @prisma/client | apps/api/package.json | ^5.10.0 | ^5.22.0 |
| 3 | Mise a jour bcryptjs | apps/api/package.json | ^2.4.3 | ^3.0.2 (installe 3.0.3) |
| 4 | Mise a jour lucide-react | apps/web/package.json | ^0.314.0 | ^0.500.0 |

---

## 4. Vulnerabilites corrigees (npm audit fix)

| Package | Severite | Avant | Apres | CVE |
|---------|----------|-------|-------|-----|
| multer | HIGH | 2.4.0 | 2.5.0 | DoS via async fileFilter |
| qs | MODERATE | 6.16.0 | corrige | DoS via arrayFormat comma |
| fast-uri | MODERATE | 3.1.8 | corrige | URI scheme spoofing |
| postcss-selector-parser | MODERATE | 6.1.4 | corrige | CPU exhaustion |
| extract-zip | HIGH | (vulnerable) | corrige | Arbitrary file writes |

**Resultat : 21 -> 15 vulnerabilites (8 low, 1 moderate, 6 high)**

---

## 5. Vulnerabilites restantes (necessitent Zod 4)

| Package | Severite | Correctif | Raison |
|---------|----------|-----------|--------|
| zod | HIGH | zod@4.6.7 | Breaking change Zod 3 -> 4 |
| chromium-bidi | HIGH | (via zod) | Indirect |
| puppeteer-core | HIGH | (via @puppeteer/browsers) | Indirect |
| @puppeteer/browsers | HIGH | (via extract-zip) | Indirect |

**Decision :** ces vulnerabilites necessitent une migration Zod 3 -> 4, planifiee dans un **lot dedie** (hors LOT 0.4 phase 1).

---

## 6. Matrice de compatibilite

### 6.1 Court terme (fait dans LOT 0.4)

| Package | Version cible | Statut |
|---------|---------------|--------|
| prisma (CLI) | 5.22.0 | Fait |
| @prisma/client | ^5.22.0 | Fait |
| bcryptjs | ^3.0.2 | Fait |
| lucide-react | ^0.500.0 | Fait |

### 6.2 Moyen terme (LOT 0.5+)

| Package | Version actuelle | Version cible | Justification |
|---------|------------------|---------------|---------------|
| postgres:16-alpine | 16.15 | postgres:17-alpine | PostgreSQL 17 stable |
| Node.js | v20.20.2 | v22.x (LTS) | Support long terme |
| npm | 10.8.2 | 11.x | Dernieres fonctionnalites |

### 6.3 Long terme (hors LOT 0)

| Package | Version actuelle | Version cible | Justification |
|---------|------------------|---------------|---------------|
| React | 18.3.1 | 19.x | Migration majeure |
| Vite | 5.4.21 | 6.x | Migration majeure |
| Tailwind | 3.4.19 | 4.x | Migration majeure |
| Prisma | 5.22.0 | 6.x | Migration majeure |
| Zod | 3.25.76 | 4.x | Migration majeure (vulnerabilites HIGH) |

---

## 7. Tests executes

### 7.1 Compilation

| Composant | Resultat |
|-----------|----------|
| Backend (apps/api) - npx tsc --noEmit | OK |
| Frontend (apps/web) - npx tsc --noEmit | OK |

### 7.2 Tests unitaires et integration

| Metrique | Valeur |
|----------|--------|
| Suites de tests | 9 / 9 |
| Tests | 104 / 104 |
| Echecs | 0 |
| Duree | 11,267 s |

**Aucune regression.**

---

## 8. Architecture verifiee

- Monorepo npm avec workspaces (api, web, worker, packages/shared)
- Un seul package-lock.json a la racine (reproductibilite)
- NestJS 11 (derniere version majeure)
- React 18 + Vite 5 + Tailwind 3 (versions stables)
- Prisma 5.22.0 (CLI et Client alignes)
- PostgreSQL 16.15 + Redis 7.4.12 (images Docker)

---

## 9. Plan de migration restant

### Etape 2 - Migration Zod 4 (lot dedie)
1. Migrer tous les DTOs Zod 3 -> 4 (auth, schools, users, subject-domains, etc.)
2. Adapter les ZodValidationPipe
3. Recompiler + retester
4. Corriger les vulnerabilites HIGH restantes

### Phase 2 - Infrastructure (LOT 0.5)
1. PostgreSQL 16 -> 17 (dump/restore)
2. Node.js 20 -> 22 (LTS)
3. npm 10 -> 11

### Phase 3 - Frameworks (hors LOT 0)
1. React 18 -> 19
2. Vite 5 -> 6
3. Tailwind 3 -> 4
4. Prisma 5 -> 6

---

## 10. Etat Git

- Working tree : Propre
- Branche : feat/ui-refonte-lot2
- Commit : c3e1a68
- Fichiers commites :
  - apps/api/package.json (modifie)
  - apps/web/package.json (modifie)
  - package-lock.json (mis a jour)

---

## 11. Recommandations pour la suite

### Etape 2 - Migration Zod 4 (priorite haute)
1. Planifier un lot dedie pour migrer Zod 3 -> 4
2. Corriger les 6 vulnerabilites HIGH restantes

### LOT 0.5 - Docker / PostgreSQL / Redis / Nginx
1. Retirer l'exposition des ports 5432 et 6379 sur 0.0.0.0
2. Nommer le volume Redis (sis-mali-redis-data)
3. Creer un reseau Docker dedie (sis-mali-network)

### LOT 0.6 - Tests et baseline
1. Tests de securite par role
2. Tests de charge adaptes a l'etablissement

---

## 12. Conclusion

Le LOT 0.4 (phase 1) a permis de :
- Auditer completement les dependances
- Corriger 4 anomalies de package.json
- Corriger 6 vulnerabilites via npm audit fix
- Documenter les vulnerabilites restantes (Zod 4)
- Verifier l'absence de regression (104 tests)

**Les versions critiques sont a jour et les vulnerabilites corrigeables le sont.** Les 6 vulnerabilites HIGH restantes necessitent une migration Zod 4, planifiee dans un lot dedie.

**Le projet est pret pour l'Etape 2 (migration Zod 4) ou le LOT 0.5 (Docker/Nginx).**