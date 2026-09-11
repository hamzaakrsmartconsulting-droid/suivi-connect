<script setup lang="ts">
import { ref, type Component } from 'vue'
import Pictogram from '@/components/ui/Pictogram.vue'
import {
  Rocket, LayoutDashboard, Users, ClipboardList, Pill, FileText,
  CalendarDays, MessageSquare, Bell, UserRound, Stethoscope,
} from '@lucide/vue'

const active = ref('debut')

const sections: { id: string; label: string; icon: Component }[] = [
  { id: 'debut',       label: 'Premiers pas',     icon: Rocket },
  { id: 'tableau',     label: 'Tableau de bord',  icon: LayoutDashboard },
  { id: 'patients',    label: 'Gestion patients', icon: Users },
  { id: 'suivi',       label: 'Suivis hebdo',     icon: ClipboardList },
  { id: 'medicaments', label: 'Prescriptions',    icon: Pill },
  { id: 'ordonnances', label: 'Ordonnances',      icon: FileText },
  { id: 'rdv',         label: 'Rendez-vous',      icon: CalendarDays },
  { id: 'messages',    label: 'Messages',         icon: MessageSquare },
  { id: 'alertes',     label: 'Alertes',          icon: Bell },
  { id: 'profil',      label: 'Mon profil',       icon: UserRound },
]
</script>

<template>
  <div class="guide-page">
    <div class="guide-hero">
      <Pictogram :icon="Stethoscope" tone="brand" size="lg" />
      <div>
        <h1 class="guide-hero__title">Guide médecin</h1>
        <p class="guide-hero__sub">Maîtrisez toutes les fonctionnalités de SuiviConnect</p>
      </div>
    </div>

    <div class="guide-layout">
      <nav class="guide-nav">
        <button
          v-for="s in sections" :key="s.id"
          class="guide-nav__item"
          :class="{ 'guide-nav__item--active': active === s.id }"
          @click="active = s.id"
        >
          <Pictogram :icon="s.icon" :tone="active === s.id ? 'teal' : 'blue'" size="sm" />
          <span>{{ s.label }}</span>
        </button>
      </nav>

      <div class="guide-content">
        <section v-if="active === 'debut'">
          <h2 class="sec-title">Premiers pas</h2>
          <p class="sec-desc">Connectez-vous avec vos identifiants médecin. Votre espace est séparé de celui des patients.</p>
          <div class="tip-card">
            <Pictogram :icon="Users" tone="teal" size="sm" />
            <p>Vos patients vous sont déjà assignés. Ouvrez <strong>Patients</strong> pour consulter leurs dossiers.</p>
          </div>
        </section>

        <section v-else-if="active === 'tableau'">
          <h2 class="sec-title">Tableau de bord</h2>
          <p class="sec-desc">Vue synthétique : patients suivis, alertes actives, risque et rendez-vous du jour.</p>
        </section>

        <section v-else-if="active === 'patients'">
          <h2 class="sec-title">Gestion des patients</h2>
          <p class="sec-desc">Liste, score de risque, alertes et accès au dossier complet.</p>
        </section>

        <section v-else-if="active === 'suivi'">
          <h2 class="sec-title">Suivis hebdomadaires</h2>
          <p class="sec-desc">Consultez les mesures soumises chaque semaine et ajoutez vos notes cliniques.</p>
        </section>

        <section v-else-if="active === 'medicaments'">
          <h2 class="sec-title">Prescriptions</h2>
          <p class="sec-desc">Ajoutez ou ajustez les traitements directement depuis la fiche patient.</p>
        </section>

        <section v-else-if="active === 'ordonnances'">
          <h2 class="sec-title">Ordonnances</h2>
          <p class="sec-desc">Générez, signez et transmettez des ordonnances PDF sécurisées.</p>
        </section>

        <section v-else-if="active === 'rdv'">
          <h2 class="sec-title">Rendez-vous</h2>
          <p class="sec-desc">Planifiez, modifiez et suivez les consultations (présentiel, téléphone, vidéo).</p>
        </section>

        <section v-else-if="active === 'messages'">
          <h2 class="sec-title">Messagerie sécurisée</h2>
          <p class="sec-desc">Échangez en temps réel avec vos patients, avec option d’appel audio/vidéo.</p>
        </section>

        <section v-else-if="active === 'alertes'">
          <h2 class="sec-title">Alertes automatiques</h2>
          <p class="sec-desc">Le moteur clinique signale les anomalies (tension, LDL, adhésion…) en temps réel.</p>
        </section>

        <section v-else>
          <h2 class="sec-title">Mon profil</h2>
          <p class="sec-desc">Mettez à jour votre identité professionnelle et votre signature.</p>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.guide-page { width: 100%; font-family: var(--font-base); }
.guide-hero {
  display: flex; align-items: center; gap: 16px;
  margin-bottom: 28px; padding: 22px 24px;
  background: linear-gradient(135deg, #E8F3FB, #E6F8F6);
  border: 1px solid #D7E5EE; border-radius: 20px;
}
.guide-hero__title { margin: 0 0 4px; font-size: 22px; font-weight: 800; color: #18324A; letter-spacing: -0.03em; }
.guide-hero__sub { margin: 0; font-size: 14px; color: #5B738A; font-weight: 500; }

.guide-layout { display: grid; grid-template-columns: 260px 1fr; gap: 20px; }
@media (max-width: 900px) { .guide-layout { grid-template-columns: 1fr; } }

.guide-nav {
  display: flex; flex-direction: column; gap: 6px;
  background: #fff; border: 1px solid #D7E5EE; border-radius: 18px; padding: 12px;
  height: fit-content; box-shadow: var(--shadow-sm);
}
.guide-nav__item {
  display: flex; align-items: center; gap: 10px;
  width: 100%; text-align: left; border: none; background: transparent;
  padding: 10px 12px; border-radius: 12px; cursor: pointer;
  font-size: 13px; font-weight: 600; color: #2A4560; font-family: inherit;
  transition: background 0.15s, color 0.15s;
}
.guide-nav__item:hover { background: #F5FAFC; }
.guide-nav__item--active { background: #E6F8F6; color: #0E9A8B; }

.guide-content {
  background: #fff; border: 1px solid #D7E5EE; border-radius: 18px;
  padding: 28px; min-height: 360px; box-shadow: var(--shadow-sm);
}
.sec-title { margin: 0 0 8px; font-size: 20px; font-weight: 800; color: #18324A; letter-spacing: -0.02em; }
.sec-desc { margin: 0 0 18px; font-size: 14px; color: #5B738A; line-height: 1.6; }
.tip-card {
  display: flex; gap: 12px; align-items: flex-start;
  padding: 14px 16px; border-radius: 14px; background: #E8F3FB; border: 1px solid #B9D9F2;
  font-size: 13px; color: #2A4560; line-height: 1.5;
}
.tip-card p { margin: 0; }
</style>
