# SIS-MALI - Gestion des secrets

**Derniere mise a jour :** 2026-10-30 17:45:51

---

## 1. Secrets utilises par SIS-MALI

SIS-MALI utilise plusieurs secrets critiques. Ils sont **tous** declares dans le fichier .env (non suivi par Git).

| Secret | Variable | Utilise par | Gravite si expose |
|--------|----------|-------------|-------------------|
| JWT Access Token | `JWT_SECRET` | Backend NestJS | CRITIQUE - usurpation de session |
| JWT Refresh Token | `JWT_REFRESH_SECRET` | Backend NestJS | CRITIQUE - renouvellement de session |
| Mot de passe PostgreSQL | `POSTGRES_PASSWORD` | Docker PostgreSQL | CRITIQUE - acces complet a la base |
| Mot de passe SUPER_ADMIN | `SUPER_ADMIN_PASSWORD` | Seed initial | CRITIQUE - acces admin |
| Mot de passe SMTP | `SMTP_PASSWORD` | Backend NestJS (emails) | MOYENNE - envoi d'emails |
| Cle SMS | `SMS_PROVIDER_KEY` | Backend NestJS (SMS) | MOYENNE - envoi de SMS |
| Cle WhatsApp | `WHATSAPP_PROVIDER_KEY` | Backend NestJS (WhatsApp) | MOYENNE - envoi de messages |

**Note :** les secrets `SMS_PROVIDER_KEY`, `WHATSAPP_PROVIDER_KEY` et `SMTP_PASSWORD` sont **optionnels** (integrations non implementees). Ils peuvent rester vides.

---

## 2. Generation des secrets

### 2.1 JWT_SECRET et JWT_REFRESH_SECRET

**Commande (Linux/Mac/WSL) :**

openssl rand -hex 64

**Commande (PowerShell Windows) :**

Utiliser la commande suivante pour generer 128 caracteres hexadecimaux :

[System.BitConverter]::ToString([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(64)).Replace('-','').ToLower()

**Regles :**
- Minimum 64 caracteres (256 bits).
- Ne JAMAIS reutiliser le meme secret pour JWT_SECRET et JWT_REFRESH_SECRET.
- Renouveler tous les 6 mois (ou immediatement si expose).

---

### 2.2 POSTGRES_PASSWORD

**Commande (Linux/Mac/WSL) :**

openssl rand -base64 32

**Regles :**
- Minimum 32 caracteres.
- Eviter les caracteres speciaux problematiques pour l'URL (@, :, /, ?, #, [, ]).
- Si le mot de passe contient des caracteres speciaux, URL-encoder dans DATABASE_URL.

**Exemple d'URL-encodage :**

Mot de passe brut  : P@ssw0rd!
Mot de passe encode : P%40ssw0rd%21
DATABASE_URL        : postgresql://user:P%40ssw0rd%21@localhost:5432/db

### 2.3 SUPER_ADMIN_PASSWORD

**Regles :**
- Minimum 12 caracteres.
- Doit contenir : majuscules, minuscules, chiffres, symboles.
- Note : si SUPER_ADMIN_PASSWORD est vide, le seed genere automatiquement un mot de passe aleatoire de 16 caracteres (12 aleatoires + Aa1!). Ce mot de passe est affiche une seule fois dans les logs du seed. Notez-le.

---

## 3. Procedure de rotation des secrets

### 3.1 Prerequis

Avant toute rotation :
1. Sauvegarder la base de donnees (LOT 0.1).
2. Sauvegarder le fichier .env actuel.
3. Prevenir les utilisateurs (fenetre de maintenance).
4. Verifier que les services peuvent redemarrer.

### 3.2 Rotation JWT_SECRET / JWT_REFRESH_SECRET

**Impact :** tous les utilisateurs connectes seront deconnectes (leurs jetons deviennent invalides).

**Procedure :**
1. Generer un nouveau secret (voir section 2.1).
2. Mettre a jour .env.
3. Redemarrer le backend NestJS (docker compose restart api).
4. Les utilisateurs devront se reconnecter.

**Frequence recommandee :** tous les 6 mois.

### 3.3 Rotation POSTGRES_PASSWORD

**Impact :** le backend perd la connexion a la base tant que le mot de passe n'est pas mis a jour dans PostgreSQL.

**Procedure :**
1. Generer un nouveau mot de passe (voir section 2.2).
2. Mettre a jour le mot de passe dans PostgreSQL :
   ALTER USER sis_user WITH PASSWORD 'nouveau_mot_de_passe';
3. Mettre a jour .env :
   - POSTGRES_PASSWORD=nouveau_mot_de_passe
   - DATABASE_URL=postgresql://sis_user:nouveau_mot_de_passe@...
4. Redemarrer le backend (docker compose restart api).
5. Verifier que la connexion fonctionne (healthcheck).

**Frequence recommandee :** tous les 12 mois (ou immediatement si expose).

### 3.4 Rotation SUPER_ADMIN_PASSWORD

**Impact :** le compte SUPER_ADMIN doit etre mis a jour.

**Procedure :**
1. Se connecter avec le compte SUPER_ADMIN actuel.
2. Aller dans Parametres > Mon compte > Changer le mot de passe.
3. Saisir l'ancien et le nouveau mot de passe.
4. Le systeme met a jour le hash dans la base.

**Note :** ne pas modifier SUPER_ADMIN_PASSWORD dans .env apres la premiere installation (le seed ne s'execute qu'une fois).

**Frequence recommandee :** tous les 6 mois.

### 3.5 Rotation des autres secrets

| Secret | Procedure |
|--------|-----------|
| SMTP_PASSWORD | Mettre a jour .env, redemarrer le backend |
| SMS_PROVIDER_KEY | Mettre a jour .env, redemarrer le backend |
| WHATSAPP_PROVIDER_KEY | Mettre a jour .env, redemarrer le backend |

---

## 4. Que faire en cas d'exposition

### 4.1 Identifier le perimetre

1. Quel secret a ete expose ?
2. Ou a-t-il ete expose ? (Git, logs, capture d'ecran, etc.)
3. Depuis quand ? (date de la fuite)
4. Qui y a eu acces ?

### 4.2 Mesures immediates

1. Revoquer le secret (rotation immediate).
2. Verifier les logs pour detecter une utilisation malveillante.
3. Notifier les utilisateurs si des donnees personnelles sont concernees (obligation legale au Mali - APDP).
4. Documenter l'incident dans un rapport.

### 4.3 Verification post-incident

1. Auditer les acces recents (auditLog).
2. Verifier l'integrite des donnees.
3. Renforcer les procedures (2FA, rotation plus frequente).

---

## 5. Bonnes pratiques

1. Ne jamais committer .env dans Git (deja protege par .gitignore).
2. Ne jamais partager de secrets par email, SMS ou chat non chiffre.
3. Utiliser un gestionnaire de mots de passe pour les secrets d'equipe.
4. Renouveler les secrets regulierement.
5. Limiter l'acces aux secrets (principe du moindre privilege).
6. Journaliser les acces aux secrets (audit).
7. Tester la restauration apres chaque rotation.

---

## 6. Verification de la configuration

Pour verifier que .env est coherent avec .env.example, un script dedie est disponible.

### 6.1 Script de verification

Le script docs/VERIFY_ENV.ps1 compare les NOMS de variables (pas les valeurs) entre .env et .env.example.

Pour l'executer :

Ouvrir PowerShell a la racine du projet et lancer :

powershell -ExecutionPolicy Bypass -File docs\VERIFY_ENV.ps1

### 6.2 Resultat attendu

Le script affiche :

- Le nombre de variables dans .env
- Le nombre de variables dans .env.example
- Les variables presentes dans .env mais absentes de .env.example
- Les variables presentes dans .env.example mais absentes de .env

Si les deux listes sont vides, la configuration est coherente.

---

**Fin du document.**