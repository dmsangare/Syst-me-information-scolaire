# SIS-MALI — LOT 1 : Rapport de cadrage

**Date :** 2026-10-31
**Branche :** feat/ui-refonte-lot2
**Commit de départ :** e9d95d9
**Référence :** Cahier des charges SIS-MALI v1.0 + collectes 1 à 5

---

## 1. Objet du cadrage

Vérifier, sans modifier le code fonctionnel, l'état réel du moteur de bulletins
et produire un plan de travail défendable pour un produit commercial.

Ce rapport documente **ce qui a été vérifié**, **ce qui ne l'a pas été**, et
**les décisions prises par défaut** (à valider explicitement avant exécution).

---

## 2. Sources analysées

| Source | Taille | Nature |
|---|---|---|
| `docs/BULLETINS-SPEC.md` | 4970 o | Spécification v3 |
| `docs/BULLETINS-AUDIT.md` | 5102 o | Audit BLOC 5 |
| Cahier des charges cible | ~15 000 o | Référentiel commercial |
| 28 fichiers `report-cards/` | — | Code moteur |
| 49 tests `calculation/` | — | Couverture existante |
| `receipt-pdf.util.ts` | — | QR reçus |

---

## 3. Constats majeurs

### 3.1 Ce qui est déjà fait et prouvé (preuves collectées)
- Moteur de calcul 1er/2e cycle opérationnel (`first-cycle.ts`, `second-cycle.ts`)
- 49 tests calcul + 21 cas conformance
- QR code bulletins + reçus implémenté (`report-cards.service.ts` l.861/918, `receipt-pdf.util.ts` l.48)
- `normalize.ts` conforme DEC-3
- `decision.ts` avec seuils configurables (pas codés en dur)
- `grading-rules.ts` garde-fou anti-mélange cycles (`isTermAllowedForCycle`)
- Jest + Playwright installés (`apps/api/jest.config.js` présent)

### 3.2 Ce qui est partiel
- Cas DEF : moteur OK (aucun calcul DEF), invariant non testé
- `normalize.ts` : valeur non testée (seulement "exposé")
- Coefficients par niveau : non testés
- Compositions paramétrables : non prouvé
- Absence injustifiée : non testée
- Arrivée en cours d'année : absente

### 3.3 Ce qui est absent (hors LOT 1)
- 13 ajouts de schéma (BLOC 6) → prérequis LOT 2
- Règles de sécurité avancées (validation notes, `GradeAudit`)
- Front React graphiques
- Régressions R1–R6

### 3.4 Ce qui est inexact documentairement
- `BULLETINS-AUDIT.md` : « Jest NON INSTALLÉ » (faux depuis LOT 0.6)
- Doublons `GUIDE-UTILISATEUR.md` / `GUIDE_UTILISATEUR.md`

---

## 4. Décisions de cadrage prises (par défaut, à valider)

| # | Question | Décision |
|---|---|---|
| Q1 | Périmètre LOT 1 | **Option C** — corrections uniquement si test prouve l'écart |
| Q2 | Migrations Prisma | **Option B** — hors LOT 1, prérequis LOT 2 |
| Q3 | Front React | **Option B** — hors LOT 1, LOT 1B séparé |
| Q4 | Cas DEF | **Option A** — test invariant ajouté |
| Q5 | Numérotation | **Option A** — historique conservé, LOT 0.6 = sous-étape LOT 0 CDC |

---

## 5. Risques identifiés

| Risque | Impact | Mitigation |
|---|---|---|
| G2 révèle 6 rouges → G3 long | Délai | G3 séquencé, rollback possible |
| Migration BLOC 6 repoussée | Fonctionnel | Documenté prérequis LOT 2 |
| Règles sécurité non testées en LOT 1 | Commercial | Documenté comme dette LOT 2 |
| PDF 1er cycle sans domaines | Commercial | Signalé hors scope LOT 1 (front) |
| Dépendance `qrcode` non vérifiée en runtime | Technique | G1.4 vérifie visuellement |

---

## 6. Engagements pour la suite

- Chaque correction G3 → **test de non-régression**
- Chaque livrable → **preuve d'exécution**
- Chaque commit → **message défendable**
- Aucune migration destructive
- Aucune modification sans backup + tag Git
- Aucune fonctionnalité supprimée

---

## 7. Ce que ce cadrage ne fait pas

- Ne modifie aucun calcul
- Ne lance aucune migration
- Ne touche pas au front
- Ne démarre pas LOT 1 (uniquement planification)
- Ne prétend pas que les règles de sécurité sont couvertes (elles ne le sont pas)

---

## 8. Réserves explicites

### 8.1 Vérifications non exécutées dans cette session
- Ré-exécution des 112 tests (résultats rapportés du LOT 0.6)
- Ré-exécution de la restauration PostgreSQL (validée au LOT 0.6)
- Ré-exécution de la génération PDF (validée au LOT 0.6)

### 8.2 Vérifications partielles
- QR code : implémentation vérifiée dans le code, **rendu visuel non vérifié**
- `VerifiableDocument` : utilisé dans le code, **modèle Prisma non localisé**
- Page publique de vérification QR : **non cherchée**

### 8.3 Corrections de forme
- Coquille `VERIFY_EN1` dans un script de re-vérification (pas dans le repo)
  → le fichier réel `docs/VERIFY_ENV.ps1` est intact

---

## 9. Prochaine étape

Le plan `LOT_1_PLAN.md` définit 5 groupes homogènes (G1→G5).
L'exécution du G1 (baseline) peut démarrer après validation explicite
des 5 décisions par défaut (§4).

---

**Fin du rapport de cadrage.**
