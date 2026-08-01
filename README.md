# Suivi Médical Cardiaque

Plateforme de suivi médical pour patients en rééducation cardiaque.

## Stack

- **Frontend** : Vue 3 + Vuetify 3 + Vite
- **Backend** : Node.js + Express + Prisma
- **Base de données** : PostgreSQL

## Démarrage rapide

### Prérequis

- Node.js 20+
- Docker (pour PostgreSQL)

### 1. Base de données

```bash
docker compose up -d
```

### 2. Backend

```bash
cd backend
cp ../.env.example .env
npm install
npx prisma migrate dev
npm run seed
npm run dev
```

API disponible sur `http://localhost:3000`

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Application disponible sur `http://localhost:5173`

## Comptes de démonstration

| Rôle    | Email                    | Mot de passe |
|---------|--------------------------|--------------|
| Médecin | dr.martin@suivi.fr       | Demo1234!    |
| Patient | jean.dupont@suivi.fr     | Demo1234!    |
| Patient | marie.bernard@suivi.fr   | Demo1234!    |
| Patient | pierre.leroy@suivi.fr    | Demo1234!    |

## Fonctionnalités

- Authentification (connexion, inscription, mot de passe oublié)
- Tableau de bord patient avec graphiques de santé
- Suivi hebdomadaire médical
- Gestion des médicaments et rappels
- Tableau de bord médecin avec alertes et prédiction de risque
- Messagerie sécurisée médecin-patient
- Notifications temps réel
- Export PDF des rapports
