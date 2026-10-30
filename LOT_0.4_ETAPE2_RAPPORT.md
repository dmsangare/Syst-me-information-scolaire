# SIS-MALI - LOT 0.4 Etape 2 : Migration Playwright + Zod 4

**Date de cloture :** 2026-10-30 23:44:04
**Branche :** feat/ui-refonte-lot2
**Commit :** 3a2781d
**Point de depart :** LOT 0.4 etape 1 (commit ea50b64)

---

## 1. Resume executif

L'ETAPE 2 du LOT 0.4 a permis de :
- Remplacer puppeteer-core par playwright (compatible Zod 4)
- Migrer zod de 3.25.76 vers 4.6.7
- Corriger les 6 vulnerabilites HIGH restantes

**Resultat : 0 vulnerabilite HIGH, 8 LOW (au lieu de 21).**

**Statut global : LOT 0.4 ETAPE 2 TERMINE**

---

## 2. Migration Playwright (remplace Puppeteer)

### 2.1 Pourquoi cette migration

puppeteer-core depend de chromium-bidi, qui utilise Zod 3 en interne. Impossible de migrer vers Zod 4 sans remplacer Puppeteer.

Playwright (Microsoft) utilise son propre protocole (CDP via WebSocket) et ne depend pas de chromium-bidi ni de Zod.

### 2.2 Changements effectues

| Element | Avant | Apres |
|---------|-------|-------|
| Bibliotheque PDF | puppeteer-core 24.43.1 | playwright 1.64.1 |
| Dependance transitive | chromium-bidi 14.0.0 | Aucune |
| Module PDF | (repandu dans 10 fichiers) | PdfGeneratorService centralise |
| Fichiers utilitaires | 10 | 10 (migres) |
| Appels | 17 | 17 (mis a jour) |

### 2.3 PdfGeneratorService

Cree dans src/common/pdf/ :
- pdf-generator.service.ts : service encapsulant Playwright
- pdf.module.ts : module NestJS
- index.ts : exports

Methodes :
- generateFromHtml(html, options) : genere un PDF depuis du HTML
- generateFromUrl(url, options) : genere un PDF depuis une URL

### 2.4 Fichiers utilitaires migres

- report-card-pdf.util.ts
- annual-report-card-pdf.util.ts
- receipt-pdf.util.ts
- cash-session-pdf.util.ts
- assessment-export.util.ts
- admin-report-pdf.util.ts
- report-pdf.util.ts
- id-card-pdf.util.ts
- pdf.util.ts
- transfer-certificate.util.ts

### 2.5 Fichiers appelants mis a jour

- report-cards.controller.ts : 2 appels
- class-pdf.service.ts : 2 appels
- receipts.controller.ts : 1 appel
- cash-sessions.controller.ts : 1 appel
- assessments.controller.ts : 1 appel
- admin-reports.controller.ts : 2 appels
- reports.controller.ts : 5 appels
- students.service.ts : 2 appels
- transfers.service.ts : 1 appel

**Total : 17 appels**

### 2.6 Configuration nettoyee

- configuration.ts : suppression de executablePath: process.env.PUPPETEER_EXECUTABLE_PATH
- PUPPETEER_EXECUTABLE_PATH n'est plus necessaire (Playwright utilise son propre Chromium)

### 2.7 Test PDF

| Verification | Resultat |
|--------------|----------|
| Chromium installe | 118 Mo |
| Lancement Chromium | OK |
| Generation PDF | 38 642 octets |
| Fichier ecrit | test-playwright.pdf |

---

## 3. Migration Zod 4

### 3.1 Changements de version

| Package | Avant | Apres |
|---------|-------|-------|
| zod (api) | 3.25.76 | 4.6.7 |
| zod (web) | 3.25.76 | 4.6.7 |
| zod (shared) | 3.25.76 | 4.6.7 |
| overrides (racine) | absent | zod: ^4.6.7 |

### 3.2 ZodValidationPipe

Avant :
- import { ZodSchema, ZodError } from 'zod'
- constructor(private readonly schema: ZodSchema) {}
- return this.schema.parse(value)
- error.errors.map(...)

Apres :
- import { ZodType, ZodError } from 'zod'
- constructor(private readonly schema: ZodType<T>) {}
- return this.schema.parse(value) as T
- error.issues.map(...)

### 3.3 DTOs migres

| Fichier | Changement |
|---------|-----------|
| users/dto/index.ts | .strict() -> z.strictObject() |
| expenses/dto/index.ts | .datetime() -> z.iso.datetime() |
| documents/dto/index.ts | z.record(z.any()) -> z.record(z.string(), z.any()) |
| export/dto/index.ts | z.record(z.any()) -> z.record(z.string(), z.any()) |
| verification/dto/index.ts | z.record(z.any()) -> z.record(z.string(), z.any()) |
| year-rollover/dto/index.ts | default({}) -> default({ classes: true, ... }) |

### 3.4 Types any explicites

| Fichier | Correction |
|---------|-----------|
| attendance.service.ts | .map((r: any) |
| grades.service.ts | .map((g: any) |
| invoices.service.ts | .reduce((sum: any, item: any) + .map((item: any) |
| notifications.service.ts | .map((recipientId: any) |

---

## 4. Resultats

### 4.1 Compilation

| Composant | Resultat |
|-----------|----------|
| Backend (apps/api) | OK |
| Frontend (apps/web) | OK |

### 4.2 Vulnerabilites

| Metrique | Avant | Apres |
|----------|-------|-------|
| Total | 21 (8 low, 4 mod, 9 high) | 8 low |
| HIGH | 9 | 0 |
| MODERATE | 4 | 0 |
| LOW | 8 | 8 |

### 4.3 Test PDF

| Test | Resultat |
|------|----------|
| Generation PDF | 38 642 octets |

---

## 5. Fichiers crees ou modifies

### Fichiers crees (3)

- apps/api/src/common/pdf/pdf-generator.service.ts
- apps/api/src/common/pdf/pdf.module.ts
- apps/api/src/common/pdf/index.ts

### Fichiers modifies (36)

Package.json :
- apps/api/package.json (playwright ajoute, puppeteer-core retire, zod 4)
- apps/web/package.json (zod 4)
- packages/shared/package.json (zod 4)
- package.json (racine, overrides.zod)
- package-lock.json (mis a jour)

Utilitaires PDF (10) :
- admin-report-pdf.util.ts
- assessment-export.util.ts
- cash-session-pdf.util.ts
- receipt-pdf.util.ts
- annual-report-card-pdf.util.ts
- report-card-pdf.util.ts
- report-pdf.util.ts
- id-card-pdf.util.ts
- pdf.util.ts
- transfer-certificate.util.ts

Appelants (9) :
- admin-reports.controller.ts
- assessments.controller.ts
- cash-sessions.controller.ts
- receipts.controller.ts
- class-pdf.service.ts
- report-cards.controller.ts
- reports.controller.ts
- students.service.ts
- transfers.service.ts

Zod (7) :
- zod-validation.pipe.ts
- documents/dto/index.ts
- expenses/dto/index.ts
- export/dto/index.ts
- users/dto/index.ts
- verification/dto/index.ts
- year-rollover/dto/index.ts

Configuration (1) :
- configuration.ts

Types any (4) :
- attendance.service.ts
- grades.service.ts
- invoices.service.ts
- notifications.service.ts

---

## 6. Etat Git

- Working tree : Propre
- Branche : feat/ui-refonte-lot2
- Commit : 3a2781d
- Fichiers commites : 39 (36 modifies + 3 nouveaux)

---

## 7. Recommandations pour la suite

### LOT 0.5 - Docker / PostgreSQL / Redis / Nginx
1. Retirer l'exposition des ports 5432 et 6379 sur 0.0.0.0
2. Nommer le volume Redis (sis-mali-redis-data)
3. Creer un reseau Docker dedie (sis-mali-network)

### LOT 0.6 - Tests et baseline
1. Tests de securite par role
2. Tests de charge adaptes a l'etablissement

---

## 8. Conclusion

L'ETAPE 2 du LOT 0.4 a permis de :
- Remplacer Puppeteer par Playwright (compatible Zod 4)
- Migrer Zod 3 -> 4 (tous les DTOs + pipe)
- Corriger les 6 vulnerabilites HIGH restantes
- Valider la generation PDF (38 Ko)

**Le projet est pret pour le LOT 0.5 (Docker/Nginx).**