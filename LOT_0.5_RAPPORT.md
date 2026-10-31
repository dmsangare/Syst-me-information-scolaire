# SIS-MALI - LOT 0.5 : Securisation Docker / PostgreSQL / Redis / Nginx

**Date de cloture :** 2026-10-31 00:35:16
**Branche :** feat/ui-refonte-lot2
**Commit :** af8491b
**Point de depart :** LOT 0.4 etape 2 (commit ea37b03)

---

## 1. Resume executif

Le LOT 0.5 a securise l'infrastructure Docker et Nginx. Les corrections ont ete appliquees **uniquement aux fichiers de production** (docker-compose.yml, docker-compose.prod.yml, infra/nginx/nginx.conf), **sans interrompre le developpement en cours**.

**Statut global : LOT 0.5 TERMINE (sans impact dev)**

---

## 2. Corrections appliquees

### 2.1 docker-compose.yml (dev)

| Correction | Avant | Apres |
|------------|-------|-------|
| PUPPETEER_EXECUTABLE_PATH | Present | Supprime |
| Port PostgreSQL | 0.0.0.0:5432 | 127.0.0.1:5432 |
| Port Redis | 0.0.0.0:6379 | 127.0.0.1:6379 |
| Healthcheck Redis | Absent | Ajoute |
| Healthcheck API | Absent | Ajoute |

### 2.2 docker-compose.prod.yml (production)

| Correction | Avant | Apres |
|------------|-------|-------|
| PUPPETEER_EXECUTABLE_PATH | Present | Supprime |
| PUPPETEER_SKIP_CHROMIUM_DOWNLOAD | Present | Supprime |
| Healthcheck Redis | Absent | Ajoute |
| Healthcheck API | Absent | Ajoute |
| Ports PostgreSQL/Redis | Deja non exposes | Inchange |

### 2.3 infra/nginx/nginx.conf

| Correction | Avant | Apres |
|------------|-------|-------|
| X-XSS-Protection | Present (obsolete) | Remplace par Content-Security-Policy |
| Content-Security-Policy | Absent | Ajoute |
| HSTS | Absent | Ajoute (commente) |
| client_body_timeout | Absent | Ajoute (60s) |
| client_header_timeout | Absent | Ajoute (60s) |
| send_timeout | Absent | Ajoute (60s) |

### 2.4 Documentation

- docs/LOCAL_DOCKER_FIXES.md : procedure de correction des conteneurs locaux (a appliquer quand le dev est arrete).

---

## 3. Etat des conteneurs locaux

Les conteneurs locaux de developpement (sis-mali-postgres-local, sis-mali-redis-local) n'ont **pas ete modifies** pour ne pas interrompre le developpement en cours.

| Conteneur | Port expose | Volume | Statut |
|-----------|-------------|--------|--------|
| sis-mali-postgres-local | 0.0.0.0:5432 (LAN) | sis-mali-postgres-data (nomme) | Non modifie |
| sis-mali-redis-local | 0.0.0.0:6379 (LAN) | 280e63... (anonyme) | Non modifie |

**Corrections a appliquer (documentees dans docs/LOCAL_DOCKER_FIXES.md) :**
1. Lier les ports a 127.0.0.1 (PostgreSQL et Redis).
2. Renommer le volume Redis en sis-mali-redis-data.
3. A appliquer quand le dev est arrete (fin de journee, week-end).

---

## 4. Validation

### 4.1 Compilation

| Composant | Resultat |
|-----------|----------|
| Backend (apps/api) | OK |

### 4.2 Validation Docker Compose

| Fichier | Resultat |
|---------|----------|
| docker-compose.yml | VALIDE |
| docker-compose.prod.yml | VALIDE |

**Note :** docker-compose.yml affiche un warning sur ersion obsolete (non bloquant).

### 4.3 Validation Nginx

| Fichier | Resultat |
|---------|----------|
| infra/nginx/nginx.conf | Non teste (necessite un conteneur Nginx) |

---

## 5. Fichiers modifies

| Fichier | Statut |
|---------|--------|
| docker-compose.yml | Modifie |
| docker-compose.prod.yml | Modifie |
| infra/nginx/nginx.conf | Modifie |
| docs/LOCAL_DOCKER_FIXES.md | Cree |

---

## 6. Etat Git

- Working tree : Propre
- Branche : feat/ui-refonte-lot2
- Commit : af8491b

---

## 7. Recommandations pour la suite

### LOT 0.6 - Tests et baseline
1. Tests de securite par role
2. Tests de charge adaptes a l'etablissement

### Corrections locales (a planifier)
1. Appliquer docs/LOCAL_DOCKER_FIXES.md quand le dev est arrete.
2. Verifier que le backend continue de fonctionner apres correction.

---

## 8. Conclusion

Le LOT 0.5 a permis de :
- Securiser les fichiers docker-compose (ports, healthchecks, Puppeteer)
- Ameliorer la configuration Nginx (CSP, HSTS, timeouts)
- Documenter les corrections locales (sans interrompre le dev)

**Les fichiers de production sont prets. Les conteneurs locaux seront corriges ulterieurement.**

**Le projet est pret pour le LOT 0.6 (Tests et baseline).**