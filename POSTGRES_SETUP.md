# 🐘 Guide de Configuration PostgreSQL

Suivez ces étapes pour activer la base de données de votre projet :

### 1. Créer la base de données
Une fois PostgreSQL installé, ouvrez l'outil **pgAdmin 4** :
1.  Connectez-vous à votre serveur (mot de passe requis).
2.  Clic droit sur **Databases** → **Create** → **Database...**.
3.  Nom : **`registry_db`**.
4.  Cliquez sur **Save**.

### 2. Configurer le projet
Ouvrez le fichier **`backend/.env`** et modifiez la ligne 2 :
```bash
DATABASE_URL=postgresql://postgres:VOTRE_MOT_DE_PASSE@localhost:5432/registry_db
```
*Remplacez `VOTRE_MOT_DE_PASSE` par celui que vous avez choisi lors de l'installation de PostgreSQL.*

### 3. Initialiser les tables
Ouvrez votre terminal dans le dossier **`backend`** et tapez :
```bash
node src/config/init-db.js
```
*Si vous voyez "✅ Users table initialized successfully", c'est gagné !*

### 4. Lancer le serveur
Enfin, relancez votre serveur :
```bash
npm start
```

---
**Besoin d'aide ?** Dites-moi si vous avez un message d'erreur à l'étape 3 !
