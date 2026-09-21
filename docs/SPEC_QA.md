# SuiviConnect — Spécifications QA / Critères d'acceptation

> Document destiné au testeur QA.  
> Chaque ligne est un critère **PASS / FAIL** vérifiable.  
> Dernière mise à jour : 2026-09-21 — v1.3 (ajout : blocage compte, RGPD suppression/export, corrections UI, états vides, responsive mobile)

---

## 0. Environnement de test — Infrastructure & limites connues

> ⚠️ **À lire avant de commencer les tests.** Ces comportements sont **normaux et attendus** — ce ne sont PAS des bugs applicatifs.

### 0.1 Architecture de déploiement

| Composant | Technologie | Environnement |
|-----------|-------------|---------------|
| Frontend | Vue 3 + Vite | Cloudflare Pages (CDN mondial, toujours actif) |
| Backend API | Node.js + Express | Render — plan gratuit |
| Base de données | PostgreSQL | Render — plan gratuit (1 GB max) |
| Temps réel | Socket.io | Hébergé sur le même backend Render |
| Emails | Nodemailer + SMTP Gmail | Dépend de la connectivité SMTP |

---

### 0.2 Limites du plan Render gratuit (à NE PAS signaler comme bugs)

| Comportement | Cause | Classification |
|---|---|---|
| **Premier chargement lent (20–50 s)** | Le serveur "dort" après 15 min d'inactivité (cold start) | ℹ️ Normal — infrastructure |
| **Notifications temps réel absentes si API froide** | Socket.io nécessite que le backend soit actif | ℹ️ Normal — relancer une requête réveille le serveur |
| **Pas de push notifications hors-ligne** | Render gratuit s'arrête → ne peut pas envoyer de notifications quand inactif | ℹ️ Hors scope v1 — voir section 16 |
| **Lenteur occasionnelle sous charge** | Ressources limitées plan gratuit (512 MB RAM, CPU partagé) | ℹ️ Normal — infrastructure |

> **Astuce testeur :** Avant de commencer les tests, ouvrir l'app et attendre la première réponse API (max 50 s). Une fois "chauffée", toutes les réponses sont < 1 s.

---

### 0.3 Notifications — Comportement attendu

| Scénario | Comportement attendu | À tester ? |
|---|---|---|
| Utilisateur connecté, page ouverte | Notification in-app en temps réel ✅ | **OUI** |
| Utilisateur connecté, autre onglet actif | Notification au retour sur l'onglet ✅ | **OUI** |
| Utilisateur déconnecté / navigateur fermé | Aucune notification reçue | ℹ️ Normal — hors scope v1 |
| Push navigateur (notification système OS) | Non disponible en v1 | ❌ Ne pas tester |

---

### 0.4 Données de test (comptes préconfigurés)

| Rôle | Email | Mot de passe | Données disponibles |
|------|-------|--------------|---------------------|
| Patient | `jean.dupont@suivi.fr` | `Demo1234!` | 16 suivis, risque LOW, stade III |
| Patient | `marie.bernard@suivi.fr` | `Demo1234!` | 16 suivis, risque MODERATE, stade II |
| Patient | `pierre.leroy@suivi.fr` | `Demo1234!` | 16 suivis, risque HIGH, stade II |
| Médecin | `dr.martin@suivi.fr` | `Demo1234!` | 3 patients assignés, ordonnances, RDV |
| Admin | `admin@suivi-connect.fr` | `Admin@SuiviConnect2024!` | Vue d'ensemble uniquement |

> **Note :** Si un compte est supprimé lors des tests RGPD, relancer `npx prisma db seed` dans le backend pour réinitialiser les données.

---

## 1. Navigateurs supportés (scope des tests)

### 1.1 Support général de l'application

| Navigateur | Version min | Statut | Priorité test |
|------------|-------------|--------|---------------|
| **Chrome** | 110+ | ✅ Supporté complet | 🔴 Obligatoire |
| **Edge** | 110+ (Chromium) | ✅ Supporté complet | 🔴 Obligatoire |
| **Firefox** | 110+ | ✅ Supporté complet | 🔴 Obligatoire |
| **Safari** | 16+ | ✅ Supporté complet | 🔴 Obligatoire |
| **Chrome Mobile (Android)** | Dernière stable | ✅ Supporté complet | 🔴 Obligatoire |
| **Safari Mobile (iOS)** | 16+ | ✅ Supporté complet | 🔴 Obligatoire |
| Internet Explorer | Toute version | ❌ Non supporté | ❌ Ne pas tester |

### 1.2 Support par fonctionnalité

| Fonctionnalité | Chrome | Edge | Firefox | Safari | Mobile |
|----------------|--------|------|---------|--------|--------|
| Connexion / Auth | ✅ | ✅ | ✅ | ✅ | ✅ |
| Tableaux de bord | ✅ | ✅ | ✅ | ✅ | ✅ |
| Suivi hebdomadaire | ✅ | ✅ | ✅ | ✅ | ✅ |
| Messagerie texte | ✅ | ✅ | ✅ | ✅ | ✅ |
| Notifications temps réel | ✅ | ✅ | ✅ | ✅ | ✅ |
| Téléchargement PDF | ✅ | ✅ | ✅ | ✅ | ✅ |
| Export RGPD (JSON) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Responsive / Mobile | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Audio / Vidéo (WebRTC)** | ✅ | ✅ | ✅ | ⚠️ | ⚠️ |

> **Note Audio/Vidéo uniquement :** Les appels WebRTC (micro/caméra) nécessitent une permission explicite de l'utilisateur. Sur Safari et iOS, une configuration HTTPS est obligatoire — fonctionne en production (Cloudflare HTTPS), peut échouer en local HTTP. Ce comportement est **lié au navigateur, pas à l'application**.

### 1.3 Matrice de test recommandée

| Priorité | Navigateur | Quoi tester |
|----------|------------|-------------|
| 🔴 P1 | Chrome | 100% des fonctionnalités |
| 🔴 P1 | Edge | 100% des fonctionnalités |
| 🔴 P1 | Chrome Mobile | Interface responsive, formulaires, navigation |
| 🟡 P2 | Firefox | Toutes les fonctionnalités sauf appel A/V |
| 🟡 P2 | Safari Desktop | Toutes les fonctionnalités sauf appel A/V |
| 🟡 P2 | Safari iOS | Interface responsive, formulaires, navigation |

---

## 2. Authentification

### 2.1 Connexion (Patient & Médecin)

| Critère | Attendu | PASS si |
|---------|---------|---------|
| Email invalide | Erreur formulaire | Message "Email invalide" affiché |
| Email inconnu | Erreur serveur | Message "Email ou mot de passe incorrect" |
| Mauvais mot de passe | Erreur serveur | Message "Email ou mot de passe incorrect. N tentatives restantes" |
| Rate limiting | > 20 tentatives / 15 min | Réponse HTTP 429, message "Trop de tentatives, réessayez plus tard" |
| **Blocage compte** | **5 mauvais mots de passe consécutifs** | **Bannière orange 🔒 "Compte temporairement bloqué. Réessayez dans N minutes"** |
| **Déblocage automatique** | **Après 15 minutes** | **Connexion possible à nouveau** |
| Connexion réussie PATIENT | Redirection | `/patient/tableau-de-bord` |
| Connexion réussie MÉDECIN | Redirection | `/medecin/tableau-de-bord` |
| Connexion réussie ADMIN | Redirection | `/apercu` |
| Inactivité 30 min | Auto-déconnexion | Redirection `/connexion` avec message "Votre session a expiré après 30 minutes d'inactivité" |

> **Note perf :** Le backend est hébergé sur Render (plan gratuit). Un cold start de 20–30 s est possible si l'API est inactive depuis > 15 min. Une fois chauffée, les réponses sont < 1 s. Ce n'est pas un bug.

### 2.2 Inscription

| Critère | Règle | PASS si |
|---------|-------|---------|
| Format email | RFC 5322 | Champ rejeté si email invalide |
| Mot de passe | Min 8 caractères | Erreur si < 8 caractères |
| Nom complet | Min 2 caractères | Erreur si < 2 caractères |
| Âge (patient) | 18–120 ans entier | Erreur si hors plage |
| Taille (patient) | 100–250 cm | Erreur si hors plage |
| Date de procédure (patient) | Obligatoire | Erreur si absente |
| Spécialité (médecin) | Min 2 caractères | Erreur si absente |
| Email déjà utilisé | Unique en base | HTTP 409 + message d'erreur |
| Compte créé | Pas d'auto-connexion | Redirection vers `/connexion?registered=1` |

### 2.3 Mot de passe oublié / Réinitialisation

| Critère | Règle | PASS si |
|---------|-------|---------|
| Soumission email | Même réponse si email connu ou inconnu (anti-énumération) | Message affiché : *"Si cet email existe, un lien de réinitialisation a été envoyé"* |
| Email de reset reçu | Lien envoyé par email si compte existe | Email reçu avec lien contenant token unique |
| Durée de validité du lien | **1 heure** exactement | Après 1h → erreur *"Token invalide ou expiré"* |
| Usage unique | Le lien ne peut être utilisé **qu'une seule fois** | Après reset réussi → le même lien est rejeté |
| Nouveau mot de passe | Min 8 caractères | Erreur si < 8 caractères |
| Confirmation de reset | Message de succès | *"Mot de passe réinitialisé avec succès"* affiché |
| Après reset | Pas d'auto-connexion | L'utilisateur doit se reconnecter manuellement |

### 2.4 Session

| Critère | Valeur |
|---------|--------|
| Access token | Expire après **15 minutes** |
| Refresh token | Expire après **7 jours** |
| Renouvellement | Automatique (transparent) sur requête 401 |
| Déconnexion manuelle | Invalide le refresh token côté serveur |
| Inactivité | Auto-logout après **30 minutes** sans interaction souris/clavier |

---

## 3. Rôles et permissions

| Route | PATIENT | MÉDECIN | ADMIN |
|-------|---------|---------|-------|
| `/patient/*` | ✅ | ❌ redirect | ❌ redirect |
| `/medecin/*` | ❌ redirect | ✅ | ❌ redirect |
| `/apercu` | ❌ redirect | ❌ redirect | ✅ |
| `/connexion` | redirect dashboard | redirect dashboard | redirect dashboard |

---

## 4. Profil patient

| Champ | Modifiable | Obligatoire | Règle |
|-------|------------|-------------|-------|
| Nom complet | ✅ | ✅ | Min 2 caractères |
| Âge | ✅ | ✅ | 18–120 ans |
| Taille | ✅ | ✅ | 100–250 cm |
| Profession | ✅ | ❌ | Optionnel |
| Date de procédure | ❌ (non modifiable post-inscription) | ✅ | — |

---

## 5. Suivi hebdomadaire

### 5.1 Valeurs acceptées

| Champ | Type | Min | Max | Unité |
|-------|------|-----|-----|-------|
| Poids | Décimal | > 0 | — | kg |
| Tension systolique | Entier | 60 | 250 | mmHg |
| Tension diastolique | Entier | 40 | 150 | mmHg |
| LDL | Décimal | > 0 | — | g/L |
| Activité physique | Entier | 0 | — | minutes/semaine |
| Médicaments pris | Entier | 0 | — | — |
| Médicaments total | Entier | 0 | — | — |
| Tabac | Booléen | — | — | oui/non |
| Diabète | Booléen | — | — | oui/non |
| Notes | Texte | — | — | Optionnel |

### 5.2 Règles métier

| Critère | Règle |
|---------|-------|
| Fréquence | **1 seul suivi par semaine** (clé `semaine` unique par patient) |
| Modification après soumission | **Non autorisée** en v1 |
| Suppression | **Non autorisée** en v1 |
| Déclenchement risque | Le score de risque est **recalculé automatiquement** à chaque soumission |
| Notification médecin | Le médecin reçoit une notification in-app à chaque soumission |

### 5.3 Contrôle de cohérence tension artérielle

| Critère | Règle | PASS si |
|---------|-------|---------|
| Cohérence sys/dia | Tension systolique **doit être strictement supérieure** à la diastolique | Formulaire rejette si sys ≤ dia |
| Exemple PASS | sys = 128, dia = 82 | Soumission acceptée |
| Exemple FAIL | sys = 80, dia = 90 | Erreur affichée : *"La tension systolique doit être supérieure à la diastolique"* |

---

## 6. Score de risque cardiovasculaire

### 6.1 Algorithme de calcul (score sur 100)

| Facteur | Condition | Points ajoutés |
|---------|-----------|----------------|
| Tension artérielle | ≥ 140 mmHg systolique OU ≥ 90 diastolique | +25 |
| Tension artérielle | 130–139 sys OU 85–89 dia | +12 |
| LDL cholestérol | > 1,6 g/L | +20 |
| LDL cholestérol | 1,3–1,6 g/L | +10 |
| IMC | ≥ 30 (obésité) | +15 |
| IMC | 25–29,9 (surpoids) | +8 |
| Tabagisme actif | oui | +20 |
| Diabète | oui | +15 |
| Adhésion médicaments | < 70 % | +15 |
| Activité physique | < 90 min/semaine | +10 |

### 6.2 Niveaux de risque

| Score | Niveau affiché |
|-------|----------------|
| 0 – 24 | LOW (Faible) |
| 25 – 49 | MODERATE (Modéré) |
| 50 – 74 | HIGH (Élevé) |
| 75 – 100 | VERY_HIGH (Très élevé) |

> Si aucun suivi enregistré : score = 50, niveau = MODERATE par défaut.

---

## 7. Alertes automatiques

Déclenchées automatiquement à chaque soumission de suivi hebdomadaire.

| Condition | Type | Sévérité |
|-----------|------|----------|
| Tension ≥ 160/100 mmHg | BLOOD_PRESSURE | CRITICAL |
| Tension ≥ 140/90 mmHg | BLOOD_PRESSURE | HIGH |
| LDL > 1,9 g/L | LDL | HIGH |
| LDL 1,6 – 1,9 g/L | LDL | MEDIUM |
| Adhésion médicaments < 50 % | MEDICATION | HIGH |
| Adhésion médicaments 50–69 % | MEDICATION | MEDIUM |
| Activité physique < 60 min | ACTIVITY | LOW |
| Prise de poids > +2 kg vs semaine précédente | WEIGHT | MEDIUM |

### Règles d'affichage et cycle de vie

| Critère | Comportement | PASS si |
|---------|-------------|---------|
| Visibilité patient | Le patient voit ses propres alertes dans l'onglet Alertes | Alertes listées avec sévérité et message |
| Visibilité médecin | Le médecin voit les alertes **non lues** de tous ses patients | Alertes non lues visibles dans le dashboard médecin |
| Marquage "lu" | Le **patient** marque une alerte comme lue (une par une ou toutes) | Alerte disparaît de la liste "non lue" |
| Disparition | L'alerte disparaît de la liste active quand marquée comme lue | PASS : alerte absente des alertes actives après action |
| Résolution manuelle médecin | ❌ Pas de bouton "résoudre" côté médecin en v1 | Médecin consulte et agit hors-app si besoin |
| Accusé de réception | ❌ Non disponible en v1 | — |
| Auto-disparition | ❌ Les alertes ne disparaissent **jamais automatiquement** | Une alerte reste jusqu'à être marquée lue |
| Priorisation affichage | Ordre décroissant de sévérité | CRITICAL en premier, puis HIGH, MEDIUM, LOW |
| Plusieurs alertes simultanées | Toutes affichées, pas de fusion | Chaque alerte est une ligne indépendante |

---

## 8. Notifications

### 8.1 Type de notifications

| Critère | Comportement |
|---------|-------------|
| Canal | **In-app uniquement** via Socket.io (temps réel) — **pas** de push navigateur, **pas** d'email |
| Affichage | Badge de notification dans la barre de navigation |
| Marquage lu | Notification par notification ou toutes à la fois |

### 8.2 Événements déclencheurs

| Événement | Qui reçoit | PASS si |
|-----------|-----------|---------|
| Patient soumet un suivi hebdomadaire | Médecin(s) du patient | Notification apparaît en temps réel dans l'interface médecin |
| Alerte détectée (tension, LDL, etc.) | Médecin(s) du patient | Notification apparaît avec le détail de l'alerte |
| Nouveau message reçu | Destinataire (patient ou médecin) | Notification apparaît en temps réel |
| Médecin change le stade de rééducation | Patient concerné | Notification apparaît dans l'interface patient |

> **Note :** Les notifications nécessitent que l'utilisateur soit **connecté et que la page soit ouverte**. Pas de push hors-ligne en v1.

---

## 9. Médicaments

| Critère | Règle |
|---------|-------|
| Ajout (patient) | Nom, dosage, fréquence obligatoires |
| Modification (patient) | ✅ Autorisée |
| Suppression (patient) | ✅ Autorisée (passe en inactif, visible dans "Traitements terminés") |
| Réactivation traitement arrêté | ❌ Non disponible en v1 |
| Historique | Médicaments inactifs visibles dans section "Terminé" |
| Ordonnance médecin | PDF téléchargeable depuis onglet Médicaments |
| Doublons | ❌ Pas de contrôle automatique en v1 |
| Saisie | Libre (pas de liste standardisée) |
| Date de fin | Optionnelle |
| Signature ordonnance | Signature textuelle uniquement — **pas** une signature électronique légale |

---

## 10. Rendez-vous

| Critère | Règle |
|---------|-------|
| Création | Patient et médecin peuvent créer |
| Types | Cabinet / Téléconsultation / Téléphonique |
| Confirmation | ✅ Possible |
| Annulation | ✅ Possible |
| Modification | ✅ Possible |
| Conflits horaires | Pas de contrôle automatique en v1 |
| Fuseau horaire | Europe/Paris uniquement en v1 |

---

## 10. Messagerie

| Critère | Règle |
|---------|-------|
| Envoi texte | ✅ |
| Taille max message | Non limitée en v1 |
| Pièces jointes | ❌ Non disponible en v1 |
| Historique | ✅ Conservé |
| Suppression message | ❌ Non disponible en v1 |
| Audio / Vidéo | Interface présente (WebRTC) — nécessite permissions micro/caméra |
| Navigateurs A/V | Chrome et Edge uniquement |

---

## 12. Rapport PDF patient

### 12.1 Contenu du PDF (structure exacte)

| Section | Données incluses |
|---------|-----------------|
| En-tête | Titre "Rapport de Suivi Cardiaque" + date de génération |
| Informations patient | Nom, âge, taille, profession, date de procédure, stade de rééducation |
| Score de santé | Score /100, niveau de risque (LOW/MODERATE/HIGH/VERY_HIGH), liste des facteurs de risque |
| Historique des mesures | Tableau des **8 derniers suivis** : semaine, poids, tension, LDL, activité |
| Médicaments actifs | Liste : nom – dosage (fréquence) |

### 12.2 Règles techniques

| Critère | Valeur | PASS si |
|---------|--------|---------|
| Nom du fichier téléchargé | `rapport-[nom-patient]-[date].pdf` ex: `rapport-jean-dupont-2026-09-21.pdf` | Fichier nommé avec nom du patient et date du jour |
| Format | PDF standard | Fichier ouvrable dans tout lecteur PDF |
| Taille max | Aucune limite définie en v1 | — |
| Accès | Patient uniquement (son propre rapport) | HTTP 403 si autre patient tente d'accéder |
| Données manquantes | Sections absentes si aucune donnée (ex: 0 médicament → section médicaments absente) | PDF généré sans erreur |

### 12.3 Critères de test

| Test | PASS si |
|------|---------|
| Télécharger le rapport | Fichier `rapport-suivi.pdf` téléchargé |
| Vérifier le contenu | Nom du patient correct, score affiché, au moins 1 suivi dans le tableau |
| Rapport sans suivi | PDF généré sans tableau de mesures (section absente) |

---

## 14. Admin

| Critère | Comportement actuel |
|---------|---------------------|
| Accès | `/apercu` — vue statistique globale uniquement |
| Navigation | 1 seul lien "Vue d'ensemble" → `/apercu` |
| Création de patients | Via inscription publique (`/inscription`) — pas de création directe depuis l'interface admin en v1 |
| Gestion utilisateurs | ❌ Hors scope v1 |

---

## 15. RGPD (nouveau — implémenté v1.3)

| Critère | Règle | PASS si |
|---------|-------|---------|
| **Export données patient** | Patient peut télécharger toutes ses données | Bouton "Télécharger mes données" dans Profil patient → fichier `mes-donnees-[nom]-[date].json` téléchargé |
| **Export données médecin** | Médecin peut télécharger toutes ses données | Bouton "Télécharger mes données" dans Profil médecin → fichier JSON téléchargé |
| **Suppression compte patient** | Patient peut supprimer son compte avec confirmation mot de passe | Modal de confirmation → saisie mot de passe → suppression + déconnexion + redirection `/connexion` |
| **Suppression compte médecin** | Médecin peut supprimer son compte | Idem patient |
| **Mauvais mot de passe** | Suppression refusée si mot de passe incorrect | Message "Mot de passe incorrect" dans la modal, compte non supprimé |
| **Irréversibilité** | Après suppression, impossible de se reconnecter | HTTP 401 si tentative de connexion avec l'email supprimé |
| **Cascade** | Toutes les données liées supprimées | Suivis, médicaments, alertes, messages, RDV effacés |

---

## 16. Hors scope v1 (ne pas tester)

- MFA (authentification multi-facteurs)
- Pièces jointes dans la messagerie
- Signature électronique légale (ordonnance = signature textuelle uniquement)
- Gestion automatique des conflits horaires dans l'agenda
- Fuseaux horaires multiples
- Réaffectation d'un patient à un autre médecin

---

## 17. Checklist retest (bugs rapportés — à revérifier)

| # | Bug signalé | Fix appliqué | À vérifier |
|---|-------------|--------------|------------|
| 1 | Admin : 2 liens identiques → `/apercu` | ✅ Corrigé | 1 seul lien "Vue d'ensemble" visible côté Admin |
| 2 | Pas de déconnexion automatique si inactif | ✅ Corrigé | Laisser la session ouverte 30 min sans action → redirection `/connexion` avec message d'expiration |
| 3 | Temps de connexion/charge long | ℹ️ Expliqué | Cold start Render (plan gratuit) : 20–30 s si API froide. Pas un bug applicatif. |
| 4 | Créer un patient depuis l'Admin | ℹ️ Clarifié | Hors scope v1 — inscription via `/inscription` uniquement |
| 5 | Mauvais mot de passe rechargait la page | ✅ Corrigé | Message d'erreur affiché sans rechargement |
| 6 | Tables de données illisibles sur mobile | ✅ Corrigé | Scroll horizontal sur toutes les tables (suivis, patients, agenda) |
| 7 | Pages blanches si API échoue | ✅ Corrigé | Bannière d'erreur rouge + bouton "Réessayer" sur toutes les vues |
| 8 | Listes vides sans message | ✅ Corrigé | Message "Aucun élément disponible" sur toutes les listes vides |
| 9 | Badges risque en anglais (LOW/HIGH) | ✅ Corrigé | Badges en français : Faible / Modéré / Élevé / Très élevé |
| 10 | Icônes dashboard patient invisibles | ✅ Corrigé | Icônes des cartes de santé affichées correctement |
| 11 | Label Mute inversé dans appel vidéo | ✅ Corrigé | "Activé" quand micro actif, "Désactivé" quand muet |
| 12 | Alertes "Tout marquer lu" ne persistait pas | ✅ Corrigé | Appel API effectif, persisté en base de données |
| 13 | Pages Mot de passe oublié / Réinitialisation visuellement incohérentes | ✅ Corrigé | Design identique à la page de connexion |
| 14 | Formulaire inscription non responsive | ✅ Corrigé | Champs empilés sur mobile |
| 15 | Panel notifications débordait sur mobile | ✅ Corrigé | Limité à la largeur de l'écran |
| 16 | Menu latéral écrasait le contenu sur mobile | ✅ Corrigé | Drawer en mode overlay sur mobile (se ferme au tap) |
