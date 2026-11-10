# SIS-MALI — Système d'Information Scolaire

Application de gestion scolaire pour les établissements du Mali.

## Stack

- **Backend** : NestJS 11 + TypeScript + Prisma
- **Base de données** : PostgreSQL 16
- **Cache / Queue** : Redis 7
- **Frontend** : React 18 + Vite + TailwindCSS
- **PDF / Excel** : puppeteer-core (Chromium system) + exceljs (côté backend)
- **Déploiement** : Docker + Docker Compose + Nginx

## Installation rapide (Ubuntu LTS 22.04 / 24.04)

```bash
git clone https://github.com/dmsangare/Syst-me-information-scolaire.git
cd Syst-me-information-scolaire
cp .env.example .env
nano .env
sudo ./install.sh
```

Durée : 15-30 min selon débit réseau.

## Accès par défaut

| Service | URL |
|---|---|
| Interface Web | http://IP-SERVEUR/ |
| API REST | http://IP-SERVEUR/api/v1 |
| Swagger | http://IP-SERVEUR/api/docs |

## Comptes de démonstration

Le mot de passe initial est **généré automatiquement** à la fin de `npm run prisma:seed`
(ou défini via la variable d'environnement `SEED_PASSWORD`).

Il est affiché **une seule fois** dans la console lors du seed.

**Il doit être changé à la première connexion** (obligatoire).

| Email | Rôle |
|---|---|
| admin@sis-mali.local | Super Admin |
| director@sis-mali.local | Direction |
| accountant@sis-mali.local | Comptabilité |
| teacher@sis-mali.local | Enseignant |
| supervisor@sis-mali.local | Surveillant |
| secretary@sis-mali.local | Secrétariat |

## Structure

```
apps/api        Backend NestJS
apps/web        Frontend React
apps/worker     Jobs async (PDF)
packages/shared Types + Zod schemas
prisma/         Schéma + migrations
install.sh      Installation auto
update.sh       Mise à jour
backup.sh       Sauvegarde
```

## Modules

### Administration
Établissement, années scolaires, classes, utilisateurs, rôles, audit.

### Scolarité
Élèves, tuteurs, inscriptions, transferts, enseignants, matières, emploi du temps.

### Pédagogie
Présences, évaluations, notes, bulletins, examens.

### Rapports administratifs
Référentiel des modèles, rapports de rentrée / statistiques / personnel /
infrastructures / situation annuelle / fin d'année, workflow de validation
(brouillon → soumis → validé → transmis → réception confirmée), bordereau
automatique, archivage, calendrier des échéances, tableau de bord,
export PDF/Excel, mode institutionnel CAP/Académie (dormant par défaut).

### Examens d'État (DEF / BAC)
Sessions d'examen, dossiers candidats par classe, pièces justificatives
(acte de naissance, certificat scolarité, photo, frais), workflow
dossier (9 statuts CDC 12.3), transmission au CAP/Académie, suivi des
réceptions.

### Finance
Grille tarifaire, factures, paiements, caisse, rapports.

## Sauvegardes

Le module de sauvegarde permet de créer, télécharger et restaurer des sauvegardes complètes (base + documents).

### Fonctionnalités

- Sauvegarde manuelle (bouton dans Paramètres → Sauvegardes)
- Sauvegarde automatique (heure quotidienne configurable, rétention 7j / 4sem / 12mo)
- Téléchargement : DB (.sql.gz), documents (.tar.gz), checksum (.sha256)
- Restauration avec double confirmation (saisir RESTAURER)
- Checksum SHA-256 vérifié avant restauration
- Backup de sécurité automatique avant chaque restauration

### Format des fichiers

storage/backups/
- backup-YYYY-MM-DD_HH-MM-SS-DB.sql.gz
- backup-YYYY-MM-DD_HH-MM-SS-FILES.tar.gz
- backup-YYYY-MM-DD_HH-MM-SS.sha256

### Safety Backup

Un backup de sécurité est créé avant chaque restauration. ATTENTION : ce backup
est écrasé par la restauration elle-même (la restauration écrase TOUTE la base,
y compris la table backups). Il est utile si la restauration échoue AVANT
l'écrasement DB. Pour conserver une copie, créer manuellement un backup avant.

### Sécurité

- SUPER_ADMIN : créer, restaurer, supprimer
- PROMOTEUR : consulter, télécharger
- DIRECTOR : aucun accès
- Restaurations tracées dans audit_logs
- Une seule restauration à la fois (protection anti-double-clic)

### Stockage

Les backups sont dans storage/backups/. Recommandation : copier ce dossier
régulièrement vers un stockage externe (NAS, cloud) via une tâche cron système.

## Sécurité

- Mots de passe hashés bcrypt (cost 12)
- JWT access (15 min) + refresh (7 jours)
- RBAC granulaire (8 rôles, 28 modules, 11 actions)
- Audit automatique
- Rate limiting (100 req/min)

## Licence

Propriétaire — SIS-MALI 2026
