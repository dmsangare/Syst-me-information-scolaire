# SIS-MALI - Corrections a appliquer aux conteneurs Docker locaux

**Date :** 2026-10-31
**Contexte :** Le LOT 0.5 a securise les fichiers de production (docker-compose.yml, docker-compose.prod.yml, nginx.conf). Les conteneurs locaux de developpement (sis-mali-postgres-local, sis-mali-redis-local) necessitent des corrections manuelles qui n'ont PAS ete appliquees pour ne pas interrompre le developpement en cours.

---

## 1. Etat actuel des conteneurs locaux

| Conteneur | Image | Port expose | Volume |
|-----------|-------|-------------|--------|
| sis-mali-postgres-local | postgres:16-alpine | 0.0.0.0:5432 (LAN) | sis-mali-postgres-data (nomme) |
| sis-mali-redis-local | redis:7-alpine | 0.0.0.0:6379 (LAN) | 280e63... (anonyme) |

**Problemes :**
1. PostgreSQL et Redis sont exposes sur 0.0.0.0 (accessibles depuis le LAN).
2. Le volume Redis est anonyme (risque de perte si le conteneur est supprime).

---

## 2. Corrections a appliquer

### 2.1 Prerequis

- Arreter le developpement en cours (fermer les terminaux qui utilisent la base).
- Sauvegarder la base (dump + volumes).
- Prevoir 5-10 minutes d'interruption.

### 2.2 Procedure

#### Etape 1 - Sauvegarder la base

Dump PostgreSQL :

docker exec sis-mali-postgres-local pg_dump -U sis_user -d sis_mali -Fc -f /tmp/sis_mali_backup.dump
docker cp sis-mali-postgres-local:/tmp/sis_mali_backup.dump ./backup_local.dump

Sauvegarder le volume Redis :

docker run --rm -v 280e63563c117794fc7ad914a3dd209b1cb357bbc3a08ea9d4df3d3da48684c9:/data -v ${PWD}:/backup alpine tar czf /backup/redis_backup.tar.gz -C /data .

---

#### Etape 2 - Arreter et supprimer les conteneurs

docker stop sis-mali-postgres-local sis-mali-redis-local
docker rm sis-mali-postgres-local sis-mali-redis-local

#### Etape 3 - Recreer les conteneurs avec les bons parametres

PostgreSQL (port lie a 127.0.0.1) :

docker run -d --name sis-mali-postgres-local -e POSTGRES_DB=sis_mali -e POSTGRES_USER=sis_user -e POSTGRES_PASSWORD=SisMali_Dev_2026!Secure -v sis-mali-postgres-data:/var/lib/postgresql/data -p 127.0.0.1:5432:5432 postgres:16-alpine

Redis (port lie a 127.0.0.1, volume nomme) :

docker run -d --name sis-mali-redis-local -v sis-mali-redis-data:/data -p 127.0.0.1:6379:6379 redis:7-alpine redis-server --appendonly yes

#### Etape 4 - Verifier

Verifier que les conteneurs tournent :

docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

Verifier que PostgreSQL est accessible depuis l'hote :

docker exec sis-mali-postgres-local psql -U sis_user -d sis_mali -c "SELECT 1;"

Verifier que Redis est accessible :

docker exec sis-mali-redis-local redis-cli ping

Resultat attendu :

NAMES                     STATUS         PORTS
sis-mali-postgres-local   Up X seconds   127.0.0.1:5432->5432/tcp
sis-mali-redis-local      Up X seconds   127.0.0.1:6379->6379/tcp

Les ports sont maintenant lies a 127.0.0.1 (accessibles uniquement depuis l'hote, pas depuis le LAN).

---

## 3. Verification

| Element | Avant | Apres |
|---------|-------|-------|
| Port PostgreSQL | 0.0.0.0:5432 | 127.0.0.1:5432 |
| Port Redis | 0.0.0.0:6379 | 127.0.0.1:6379 |
| Volume Redis | anonyme (280e63...) | sis-mali-redis-data |
| Acces LAN | Oui | Non |

---

## 4. Impact

- Aucune perte de donnees (volumes conserves).
- Aucune modification du code (les conteneurs utilisent les memes variables d'environnement).
- Les outils locaux (DBeaver, psql, redis-cli) continuent de fonctionner depuis l'hote (via localhost).
- Le backend NestJS continue de fonctionner (il utilise DATABASE_URL et REDIS_URL qui pointent vers localhost).

---

## 5. Quand appliquer ces corrections ?

A planifier :
- En fin de journee (apres le dernier commit).
- Le week-end.
- Avant une mise en production.

Ne pas appliquer :
- Pendant une session de developpement active.
- Si des tests sont en cours.
- Si des jobs Redis sont en attente.

---

## 6. Notes

- Les fichiers docker-compose.yml et docker-compose.prod.yml ont deja ete corriges (ports lies a 127.0.0.1, healthchecks, Puppeteer supprime).
- Ce document concerne uniquement les conteneurs lances manuellement (docker run) en local.
- Une fois les corrections appliquees, ce document peut etre supprime ou archive.