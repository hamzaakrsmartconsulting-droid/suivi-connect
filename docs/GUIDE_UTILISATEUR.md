# SuiviConnect — Guide utilisateur

## 1. Présentation

**SuiviConnect** est une plateforme web de suivi médical connecté. Elle permet aux patients de transmettre leurs données de santé chaque semaine, et aux médecins de les surveiller, analyser et intervenir en temps utile.

---

## 2. Accès à la plateforme

| Action | Adresse |
|--------|---------|
| Connexion | /connexion |
| Inscription | /inscription |
| Mot de passe oublié | /mot-de-passe-oublie |

**Mode démonstration :** sur l'écran de connexion, vous pouvez activer le mode démo pour explorer l'application sans backend.

---

## 3. Guide Patient

### 3.1 Tableau de bord
**Chemin :** /patient/tableau-de-bord

- Vue synthétique : poids, tension, LDL, activité physique
- Score cardiaque et niveau de risque
- Recommandations et prochains rendez-vous
- Médicaments du jour

### 3.2 Suivi hebdomadaire
**Chemin :** /patient/suivi-hebdomadaire

Chaque semaine, renseignez :
- Poids (kg)
- Tension artérielle (systolique / diastolique)
- LDL (g/L)
- Activité physique (minutes)
- Prise des médicaments (nombre pris / total)
- Tabac, diabète
- Notes complémentaires

**Conseil :** complétez ce formulaire chaque semaine pour un suivi fiable.

### 3.3 Médicaments
**Chemin :** /patient/medicaments

- Consulter vos traitements actifs
- Ajouter, modifier ou supprimer un médicament
- Définir des rappels (heure, jours de la semaine)

### 3.4 Alertes
**Chemin :** /patient/alertes

- Notifications automatiques (tension, LDL, activité, médicaments…)
- Marquer une alerte comme lue
- Marquer toutes les alertes comme lues

### 3.5 Messages
**Chemin :** /patient/messages

- Échange sécurisé avec votre médecin référent

### 3.6 Rapports
**Chemin :** /patient/rapports

- Consultation de vos rapports de suivi

### 3.7 Mon profil
**Chemin :** /patient/profil

- Informations personnelles : âge, taille, profession
- Date de procédure, séjour de rééducation
- Stade de rééducation recommandé

---

## 4. Guide Médecin

### 4.1 Tableau de bord
**Chemin :** /medecin/tableau-de-bord

- Nombre total de patients
- Alertes actives et patients à risque élevé
- Alertes récentes et activités des patients

### 4.2 Liste des patients
**Chemin :** /medecin/patients

- Recherche par nom ou stade
- Colonnes : patient, âge, stade, niveau de risque, alertes
- Bouton **Voir** → ouvre la fiche détaillée du patient

### 4.3 Détail patient
**Chemin :** /medecin/patients/:id

- Profil complet (âge, taille, profession, procédure, séjour rééducation)
- Indicateurs clés : tension, activité, LDL, poids
- Évaluation du risque et facteurs identifiés
- Médicaments en cours
- Alertes récentes
- Historique des suivis hebdomadaires
- Modification du stade de rééducation (Stade I à IV)
- Export PDF du rapport patient

### 4.4 Alertes
**Chemin :** /medecin/alertes

- Filtres par gravité (critique, élevé, moyen, faible)
- Recherche par patient
- Marquage des alertes comme traitées

### 4.5 Analytique
**Chemin :** /medecin/analytique

- Statistiques agrégées : adhésion médicamenteuse, contrôle tensionnel, objectifs atteints
- Évolution de la patientèle

### 4.6 Messages
**Chemin :** /medecin/messages

- Communication directe avec les patients

---

## 5. Niveaux de risque

| Niveau | Signification |
|--------|---------------|
| LOW | Risque faible |
| MODERATE | Risque modéré — surveillance renforcée |
| HIGH | Risque élevé — intervention recommandée |
| VERY_HIGH | Risque très élevé — action urgente |

---

## 6. Types d'alertes

- **Tension artérielle** — Valeur anormale détectée
- **LDL** — Cholestérol hors objectif
- **Poids** — Variation significative
- **Médicaments** — Faible adhésion au traitement
- **Activité** — Activité physique insuffisante
- **Général** — Autre alerte

---

## 7. Bonnes pratiques

**Pour les patients :**
- Saisir le suivi hebdomadaire de façon régulière
- Consulter les alertes et contacter le médecin si nécessaire
- Maintenir la liste des médicaments à jour
- Respecter les rappels de prise médicamenteuse

**Pour les médecins :**
- Traiter les alertes critiques en priorité
- Vérifier l'évolution via les graphiques et l'historique
- Ajuster le stade de rééducation selon la progression
- Répondre aux messages patients dans les délais appropriés

---

*SuiviConnect — Suivi médical connecté*
