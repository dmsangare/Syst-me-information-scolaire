# SIS-MALI — LOT 1 : Bulletin V1 — Plan de travail

**Date :** 2026-10-31
**Branche :** feat/ui-refonte-lot2
**Commit de départ :** e9d95d9 (clôture LOT 0.6)
**Référence :** Cahier des charges cible SIS-MALI v1.0 §8 LOT 1

---

## 1. Objectif métier

Livrer un **moteur de bulletins fiable, défendable et traçable**, conforme au
système pédagogique malien, prêt à être présenté à une école cliente.

**Garantie client :** aucun bulletin produit par SIS-MALI ne peut être
contesté sur le plan mathématique, pédagogique ou documentaire.

---

## 2. Périmètre

### In-scope (LOT 1)
- Baseline de non-régression du moteur existant (49 tests calcul + 112 tests globaux)
- Renforcement des tests manquants (DEF, normalize, dispense, absence injustifiée, arrivée en cours d'année, coefficients par niveau, compositions paramétrables)
- Corrections ciblées **uniquement** si un test prouve un écart
- Mise à jour documentaire (audit obsolète, doublons, prérequis schéma)
- Production des preuves client (conformité pédagogique, recette, garanties)

### Out-of-scope (explicitement exclu)
- **Migrations Prisma** (BLOC 6, 13 ajouts) → documentées comme prérequis LOT 2
- **Front React** (graphiques, écrans) → LOT 1B séparé
- **Régressions R1–R6** (spec §4) → documentées comme hors scope
- **LOT 2 à 5** du CDC (RBAC, admin, pédagogie étendue, recette)
- Aucune réécriture du moteur
- Aucune suppression de fonctionnalité

---

## 3. Architecture actuelle du moteur (état vérifié)

### Couche calcul (`apps/api/src/report-cards/calculation/`)
| Fichier | Taille | Rôle |
|---|---|---|
| `common.ts` | 2747 o | Arrondi, rang, cycle, moyennes |
| `first-cycle.ts` | 2298 o | Règles 1er cycle (notes /10) |
| `second-cycle.ts` | 3667 o | Règles 2e cycle (notes /20, coef) |
| `decision.ts` | 855 o | Décision annuelle (ADMIS/REDOUBLE/A_EXAMINER/INCOMPLET) |
| `normalize.ts` | 444 o | Normalisation de barème (DEC-3) |

### Couche métier
- `annual-calc.ts` (5678 o)
- `grading-rules.ts` (2457 o) — `CYCLE_RULES`, `scaledThreshold`, `isTermAllowedForCycle`
- `report-cards.service.ts` — orchestration + QR code
- `annual-results.service.ts` — résultats annuels

### Couche PDF
- `report-card-pdf.util.ts` (individuel)
- `annual-report-card-pdf.util.ts` (annuel)
- `class-pdf.service.ts` (collectif, 9142 o)

### QR code
- `qrcode` ^1.5.4 installée
- Génération dans `report-cards.service.ts` lignes 861, 918
- Reçus dans `payments/utils/receipt-pdf.util.ts` ligne 48
- `VerifiableDocument` utilisé pour traçabilité

### Tests existants (49 dans calculation/)
| Fichier | Tests |
|---|---|
| `common.spec.ts` | 12 |
| `first-cycle.spec.ts` | 6 |
| `second-cycle.spec.ts` | 7 |
| `decision.spec.ts` | 3 |
| `conformance.spec.ts` | 21 |

---

## 4. Règles du 1er cycle (CDC §5)

- Classes 1ère à 6ème année
- Notes sur 10, sans coefficient
- Compositions mensuelles octobre → juin
- **Formule :** M_A = Σ(i=1..9) Mi / 9
- Nombre de compositions **paramétrable** (pas codé en dur)
- États : réalisée, justifiée, injustifiée, non organisée, dispense, arrivée en cours
- Décision annuelle sur bulletin annuel uniquement

### Mapping règles → tests existants
| Règle | Tests | Statut |
|---|---|---|
| Moyenne simple /10 | `test 1`, `test 6d`, `[1]`, `[2]`, `[3]` | ✅ |
| 9 compositions, annuel | `test 2`, `test 8` | ✅ |
| Absences/dispensés exclus | `test 7e`, `[4]`, `[5]`, `[6]` | ✅ |
| Incomplet ≠ 0 | `test 8`, `[8]` | ✅ |
| Compositions paramétrables | — | ⚠️ À tester (G2) |
| Absence injustifiée | — | ⚠️ À tester (G2) |
| Arrivée en cours d'année | — | ⚠️ À tester (G2) |

---

## 5. Règles du 2e cycle (CDC §5)

- Classes 7ème à 9ème année
- Notes sur 20, avec coefficients
- 3 trimestres
- **Formule matière :** M_matière = Σ(note × coef_éval) / Σ(coef_éval)
- **Formule générale :** M_G = Σ(M_matière × C_matière) / Σ(C_matière)
- Coefficients **indépendants par niveau**
- DEF en 9ème = examen d'État **distinct** des bulletins

### Mapping règles → tests existants
| Règle | Tests | Statut |
|---|---|---|
| Notes /20 avec coef | `test 6f`, `[9]`, `[10]`, `[12]` | ✅ |
| Coefficients appliqués une fois | `test 5`, `[16a/b/c]` | ✅ |
| 3 trimestres, moyenne annuelle | `test 3`, `test 4a`, `test 4b`, `[13]`, `[14]`, `[15]` | ✅ |
| Coefficients par niveau | — | ⚠️ À tester (G2) |
| DEF distinct | — | ⚠️ À tester (G2) |

---

## 6. Tableau des 11 cas obligatoires (CDC §9)

| # | Cas | Test existant | Statut | Action LOT 1 |
|---|---|---|---|---|
| 1 | Élève toutes compositions | `test 2`, `[3]` | ✅ | — |
| 2 | Absence justifiée | `test 7e`, `[4]` | ✅ | — |
| 3 | Absence injustifiée | — | ❌ | G2.4 |
| 4 | Dispense | — | ❌ | G2.3 |
| 5 | Élève transféré en cours d'année | — | ❌ | G2.5 |
| 6 | Notes manquantes | `test 8`, `[8]` | ✅ | — |
| 7 | Classe plusieurs matières | `test 3`, `[10]` | ✅ | — |
| 8 | Coefficients différents | `[12]`, `[16a/b/c]` | ✅ | — |
| 9 | Élève en passage | `[19]` | ✅ | — |
| 10 | Élève en redoublement | `[20]` | ✅ | — |
| 11 | Candidat DEF | — | ❌ | G2.1 |

**Bilan : 7/11 couverts, 4 à ajouter en G2.**

---

## 7. Règles de sécurité (CDC §3)

| Règle | Existant | Test | Action LOT 1 |
|---|---|---|---|
| Enseignant ne valide pas ses notes | `Grade.status` à ajouter | — | Documenté prérequis LOT 2 |
| Note validée non modifiable | `Grade.status` à ajouter | — | Documenté prérequis LOT 2 |
| Correction tracée | `GradeAudit` à ajouter | — | Documenté prérequis LOT 2 |
| Caissier ne supprime pas paiement | À vérifier | — | À vérifier LOT 2 |
| Comptable ne supprime pas trace | À vérifier | — | À vérifier LOT 2 |
| Secrétaire ne décide pas passage | RBAC à vérifier | Partiel | À tester LOT 2 |
| Directeur valide opérations | RBAC à vérifier | Partiel | À tester LOT 2 |
| SUPER_ADMIN ≠ contournement | RBAC à vérifier | Partiel | À tester LOT 2 |

**Constat : les règles de sécurité dépendent des 13 ajouts de schéma (BLOC 6).**
Elles sont donc **hors scope LOT 1**, documentées comme prérequis LOT 2.

---

## 8. Anomalies consolidées

| # | Anomalie | Gravité | Action |
|---|---|---|---|
| A1 | `BULLETINS-AUDIT.md` obsolète (Jest) | Doc | G4.1 |
| A2 | Cas DEF sans test invariant | Test | G2.1 |
| A3 | `normalize.ts` testé superficiellement | Test | G2.2 |
| A4 | Écart 12 tests spec vs 21 conformance | Doc | G4.4 |
| A5 | Doublons guide utilisateur | Doc | G4.2 |
| A6 | 13 ajouts schéma non exécutés | Schéma | G4.3 (doc prérequis LOT 2) |
| A7 | Régressions R1–R6 non traitées | Doc | G4.4 |
| A8 | Modèle `VerifiableDocument` non localisé | Code | G1.4 (vérification) |

---

## 9. Ordre des travaux — 5 groupes homogènes

### G1 — Baseline « zéro régression » (1 h, risque nul)
- G1.1 Capturer les 112 tests (rapport texte)
- G1.2 Capturer les 21 cas conformance
- G1.3 Générer 1 PDF 1er cycle + 1 PDF 2e cycle + 1 reçu (échantillons)
- G1.4 Vérifier visuellement la présence du QR dans les PDF
- G1.5 Documenter les 8 anomalies
**Commit :** `test(baseline): capture l'etat initial du moteur bulletins avant LOT 1`

### G2 — Tests de couverture manquante (3-4 h, risque faible)
- G2.1 Test invariant DEF distinct (2 tests)
- G2.2 Tests valeur `normalize.ts` (3 tests)
- G2.3 Test dispense `Grade.isExempt` (1 test)
- G2.4 Test absence injustifiée (1 test)
- G2.5 Test arrivée en cours d'année (1 test)
- G2.6 Test coefficients indépendants par niveau (2 tests)
- G2.7 Test compositions paramétrables (2 tests)
**Total : 12 tests.** Certains seront rouges (preuve d'écart).
**Commit :** `test(bulletins): ajoute 12 tests de couverture manquante (LOT 1 G2)`

### G3 — Corrections ciblées (0-6 h, risque moyen)
**Condition :** corriger uniquement ce que G2 a révélé rouge.
- G3.1 à G3.6 : corrections ciblées (si rouge)
- G3.7 : si aucun rouge → G3 vide, on passe à G4
**Backup + tag Git avant modifications.**
**Commit :** `fix(bulletins): corrige les ecarts detectes par les tests LOT 1 G2`

### G4 — Documentation et cohérence (1-2 h, risque nul)
- G4.1 Mise à jour `BULLETINS-AUDIT.md`
- G4.2 Fusion doublons guide utilisateur
- G4.3 `docs/BULLETINS-SCHEMA-PREREQ.md` (13 ajouts pour LOT 2)
- G4.4 `docs/BULLETINS-REGRESSIONS-HORS-SCOPE.md` (R1–R6)
- G4.5 `LOT_1_RAPPORT_FINAL.md`
**Commit :** `docs(bulletins): met a jour la documentation et cloture LOT 1`

### G5 — Preuves client (2-3 h, risque nul)
- G5.1 `docs/CONFORMITE_PEDAGOGIQUE.md` — tableau 11 cas + règles sécurité
- G5.2 `docs/PROCEDURE_RECETTE_CLIENT.md` — checklist recette
- G5.3 `reports/LOT1_demo/` — bulletins d'exemple + journal d'audit
- G5.4 `docs/GARANTIES_PRODUIT.md` — ce que l'app garantit / ne garantit pas
**Commit :** `docs(client): ajoute les preuves de conformite pour la recette`

---

## 10. Critères d'acceptation

| Domaine | Condition |
|---|---|
| Compilation | API + front sans erreur |
| Tests | Tous verts (112 + 12 nouveaux) |
| Conformance | 21 cas + 4 nouveaux cas = 25 au vert |
| Pédagogie | 11/11 cas obligatoires couverts |
| PDF | Lisibles, QR visible, données exactes |
| Git | 5 commits atomiques, working tree propre |
| Documentation | 4 documents produits (AUDIT, SCHEMA, REGRESSIONS, RAPPORT_FINAL) |
| Preuves client | 4 artefacts produits (CONFORMITE, RECETTE, DEMO, GARANTIES) |

---

## 11. Stratégie de tests

- **Unitaires** (Jest) sur `calculation/` — 61 tests après G2
- **Intégration** sur `report-cards.service.integration.spec.ts`
- **E2E PDF** (Playwright) — 1 PDF 1er cycle + 1 PDF 2e cycle
- **Oracle indépendant** — `conformance.spec.ts` (21 cas CdC)
- **Cas de non-régression** — chaque correction G3 = 1 test rouge qui passe au vert

---

## 12. Stratégie de sauvegarde et retour arrière

- **Avant G3 :** tag Git `lot1-before-fixes` + backup BDD
- **Avant chaque modification de calcul :** `git tag` local
- **Rollback :** `git reset --hard lot1-before-fixes` + restauration BDD
- **Aucune migration destructive** dans LOT 1
- **Procédure documentée** dans `LOT_1_RAPPORT_FINAL.md`

---

## 13. Ce que le client peut exiger à la fin du LOT 1

- Un bulletin 1er cycle et un bulletin 2e cycle **défendables** devant un inspecteur
- La preuve que les **11 cas pédagogiques** sont couverts
- La preuve que les **QR codes** sont présents et fonctionnels
- Un **rapport de conformité** signé (interne)
- Une **procédure de recette** pour valider l'installation

---

**Fin du plan LOT 1.**
