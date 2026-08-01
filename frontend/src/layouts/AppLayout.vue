<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { Component } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notifications'
import {
  LayoutDashboard, User, HeartPulse, Pill, FileBarChart2,
  MessageSquare, Bell, Users, AlertCircle, BarChart3, Globe,
  LogOut, ChevronDown, Menu, AlertTriangle, CheckCheck,
  BellOff, Settings, CalendarDays, ShieldCheck,
} from '@lucide/vue'

const route  = useRoute()
const router = useRouter()
const auth   = useAuthStore()
const notif  = useNotificationStore()

const drawerOpen = ref(true)
const rail       = ref(false)
const userMenu   = ref(false)

const pageTitle = computed(() => (route.meta.title as string) || 'SuiviConnect')

const roleLabel = computed(() => {
  if (auth.isAdmin)  return 'Administration'
  if (auth.isDoctor) return 'Espace Médecin'
  return 'Espace Patient'
})

const breadcrumbContext = computed(() => {
  if (auth.isAdmin)  return 'Admin'
  if (auth.isDoctor) return 'Médecin'
  return 'Patient'
})

interface NavItem { icon: Component; label: string; to: string; section: string | null; badge?: boolean }
interface NavGroup { section: string | null; items: NavItem[] }

const patientNav: NavItem[] = [
  { icon: LayoutDashboard, label: 'Tableau de bord',    to: '/patient/tableau-de-bord',    section: null },
  { icon: User,            label: 'Mon profil',         to: '/patient/profil',             section: null },
  { icon: HeartPulse,      label: 'Suivi hebdomadaire', to: '/patient/suivi-hebdomadaire', section: 'Santé' },
  { icon: Pill,            label: 'Médicaments',        to: '/patient/medicaments',        section: null },
  { icon: FileBarChart2,   label: 'Rapports',           to: '/patient/rapports',           section: null },
  { icon: MessageSquare,   label: 'Messages',           to: '/patient/messages',           section: 'Communication' },
  { icon: Bell,            label: 'Alertes',            to: '/patient/alertes',            section: null, badge: true },
  { icon: CalendarDays,    label: 'Rendez-vous',        to: '/patient/rendez-vous',        section: null },
]

const doctorNav: NavItem[] = [
  { icon: LayoutDashboard, label: 'Tableau de bord', to: '/medecin/tableau-de-bord', section: null },
  { icon: Users,           label: 'Patients',        to: '/medecin/patients',        section: null },
  { icon: CalendarDays,    label: 'Rendez-vous',     to: '/medecin/rendez-vous',     section: null },
  { icon: AlertCircle,     label: 'Alertes',         to: '/medecin/alertes',         section: null, badge: true },
  { icon: BarChart3,       label: 'Analytique',      to: '/medecin/analytique',      section: null },
  { icon: MessageSquare,   label: 'Messages',        to: '/medecin/messages',        section: 'Communication' },
  { icon: User,            label: 'Mon profil',      to: '/medecin/mon-profil',      section: null },
]

const overviewNav: NavItem[] = [
  { icon: Globe, label: "Vue d'ensemble", to: '/apercu', section: null },
]

const adminNav: NavItem[] = [
  { icon: ShieldCheck, label: 'Administration', to: '/apercu', section: null },
  { icon: Globe,       label: "Vue d'ensemble", to: '/apercu', section: null },
]

const navItems = computed(() => {
  if (auth.isAdmin)  return adminNav
  if (auth.isDoctor) return doctorNav
  if (route.path.startsWith('/apercu')) return overviewNav
  return patientNav
})

const navGroups = computed<NavGroup[]>(() => {
  const groups: NavGroup[] = []
  for (const item of navItems.value) {
    const last = groups[groups.length - 1]
    if (!last || (item.section !== null && item.section !== last.section)) {
      groups.push({ section: item.section, items: [item] })
    } else {
      last.items.push(item)
    }
  }
  return groups
})

function isActive(to: string) {
  return route.path === to || (to !== '/' && route.path.startsWith(to))
}

function toggleSidebar() {
  if (window.innerWidth < 960) {
    drawerOpen.value = !drawerOpen.value
  } else {
    rail.value = !rail.value
  }
}

async function logout() {
  await auth.logout()
  router.push('/connexion')
}

onMounted(async () => {
  if (auth.isAuthenticated) {
    await notif.fetchNotifications()
    notif.initSocketListeners()
  }
})
</script>

<template>
  <v-app>
    <!-- ═══════ Sidebar ═══════ -->
    <v-navigation-drawer
      v-model="drawerOpen"
      :rail="rail"
      app
      permanent
      class="sidebar"
      :width="272"
      :rail-width="72"
    >
      <!-- Brand -->
      <div class="sb-brand" :class="{ 'sb-brand--rail': rail }">
        <div class="sb-logo">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M3 12h4l2-5 4 10 2-5h6" stroke="white" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div v-if="!rail" class="sb-brand__text">
          <span class="sb-brand__name">SuiviConnect</span>
          <span class="sb-brand__tag">Suivi médical connecté</span>
        </div>
      </div>

      <!-- Role badge -->
      <div v-if="!rail" class="sb-role">
        <span class="sb-role__dot" :class="auth.isAdmin ? 'sb-role__dot--purple' : auth.isDoctor ? 'sb-role__dot--blue' : 'sb-role__dot--green'" />
        <span class="sb-role__label">{{ roleLabel }}</span>
      </div>

      <!-- Nav -->
      <nav class="sb-nav" :class="{ 'sb-nav--rail': rail }">
        <template v-for="group in navGroups" :key="group.section || 'root'">
          <p v-if="group.section && !rail" class="sb-group-label">{{ group.section }}</p>
          <v-tooltip
            v-for="item in group.items"
            :key="item.to"
            :text="item.label"
            location="end"
            :disabled="!rail"
          >
            <template #activator="{ props: tipProps }">
              <router-link
                v-bind="tipProps"
                :to="item.to"
                class="sb-link"
                :class="{ 'sb-link--active': isActive(item.to), 'sb-link--rail': rail }"
              >
                <span class="sb-link__icon-wrap" :class="{ 'sb-link__icon-wrap--active': isActive(item.to) }">
                  <component :is="item.icon" :size="18" :stroke-width="1.75" />
                </span>
                <span v-if="!rail" class="sb-link__label">{{ item.label }}</span>
                <span
                  v-if="item.badge && notif.unreadCount > 0"
                  class="sb-badge"
                  :class="{ 'sb-badge--rail': rail }"
                >
                  {{ notif.unreadCount }}
                </span>
              </router-link>
            </template>
          </v-tooltip>
        </template>
      </nav>

      <!-- Footer -->
      <div class="sb-footer" :class="{ 'sb-footer--rail': rail }">
        <div v-if="!rail" class="sb-user">
          <div class="sb-user__avatar">{{ auth.displayName.charAt(0).toUpperCase() }}</div>
          <div class="sb-user__info">
            <p class="sb-user__name">{{ auth.displayName }}</p>
            <p class="sb-user__role">{{ auth.isAdmin ? 'Administrateur' : auth.isDoctor ? 'Médecin' : 'Patient' }}</p>
          </div>
        </div>
        <v-tooltip text="Déconnexion" location="end" :disabled="!rail">
          <template #activator="{ props: tipProps }">
            <button v-bind="tipProps" class="sb-logout" :class="{ 'sb-logout--rail': rail }" @click="logout">
              <LogOut :size="16" :stroke-width="1.75" />
              <span v-if="!rail">Déconnexion</span>
            </button>
          </template>
        </v-tooltip>
      </div>
    </v-navigation-drawer>

    <!-- ═══════ Top Bar ═══════ -->
    <v-app-bar app flat class="topbar" height="64" elevation="0">
      <div class="topbar__inner">
        <button class="topbar__toggle" aria-label="Menu" @click="toggleSidebar">
          <Menu :size="18" :stroke-width="1.75" color="#64748B" />
        </button>

        <div class="topbar__breadcrumb">
          <span class="topbar__context">{{ breadcrumbContext }}</span>
          <ChevronDown :size="13" :stroke-width="2" color="#CBD5E1" class="topbar__chevron" style="transform:rotate(-90deg)" />
          <span class="topbar__page">{{ pageTitle }}</span>
        </div>

        <div class="topbar__spacer" />

        <div class="topbar__actions">
          <router-link
            v-if="auth.isDoctor"
            to="/medecin/alertes"
            class="topbar__quick-link"
            title="Alertes"
          >
            <AlertTriangle :size="15" :stroke-width="1.75" />
            <span class="topbar__quick-label">Alertes</span>
          </router-link>

          <v-menu location="bottom end" :close-on-content-click="false" min-width="380">
            <template #activator="{ props }">
              <button v-bind="props" class="topbar__icon-btn" aria-label="Notifications">
                <Bell :size="18" :stroke-width="1.75" color="#64748B" />
                <span v-if="notif.unreadCount > 0" class="topbar__notif-badge">{{ notif.unreadCount }}</span>
              </button>
            </template>

            <div class="notif-panel">
              <div class="notif-panel__head">
                <div>
                  <p class="notif-panel__title">Notifications</p>
                  <p v-if="notif.unreadCount" class="notif-panel__sub">{{ notif.unreadCount }} non lue{{ notif.unreadCount > 1 ? 's' : '' }}</p>
                </div>
                <button v-if="notif.unreadCount" class="notif-panel__mark" @click="notif.markAllAsRead()">
                  <CheckCheck :size="12" :stroke-width="2" style="margin-right:4px" />Tout lire
                </button>
              </div>
              <div v-if="!notif.items.length" class="notif-panel__empty">
                <BellOff :size="36" :stroke-width="1.5" color="#CBD5E1" />
                <p>Aucune notification</p>
              </div>
              <div
                v-for="n in notif.items.slice(0, 6)"
                :key="n.id"
                class="notif-item"
                :class="{ 'notif-item--unread': !n.lu }"
                @click="notif.markAsRead(n.id)"
              >
                <div class="notif-item__icon" :class="{ 'notif-item__icon--unread': !n.lu }">
                  <Bell :size="15" :stroke-width="1.75" :color="!n.lu ? '#2563EB' : '#94A3B8'" />
                </div>
                <div class="notif-item__body">
                  <p class="notif-item__title">{{ n.titre }}</p>
                  <p class="notif-item__msg">{{ n.message }}</p>
                </div>
              </div>
            </div>
          </v-menu>

          <v-menu v-model="userMenu" location="bottom end" min-width="240">
            <template #activator="{ props }">
              <button v-bind="props" class="topbar__user">
                <div class="topbar__avatar">{{ auth.displayName.charAt(0).toUpperCase() }}</div>
                <div class="topbar__user-info">
                  <span class="topbar__user-name">{{ auth.displayName.split(' ')[0] }}</span>
                  <span class="topbar__user-role">{{ auth.isAdmin ? 'Admin' : auth.isDoctor ? 'Médecin' : 'Patient' }}</span>
                </div>
                <ChevronDown :size="14" :stroke-width="2" color="#94A3B8" class="topbar__user-chevron" />
              </button>
            </template>

            <div class="user-menu">
              <div class="user-menu__header">
                <div class="user-menu__avatar">{{ auth.displayName.charAt(0).toUpperCase() }}</div>
                <div>
                  <p class="user-menu__name">{{ auth.displayName }}</p>
                  <p class="user-menu__email">{{ auth.user?.email }}</p>
                </div>
              </div>
              <div class="user-menu__divider" />
              <router-link
                :to="auth.isAdmin ? '/apercu' : auth.isDoctor ? '/medecin/tableau-de-bord' : '/patient/profil'"
                class="user-menu__item"
                @click="userMenu = false"
              >
                <User :size="15" :stroke-width="1.75" />
                {{ auth.isAdmin ? "Vue d'ensemble" : auth.isDoctor ? 'Tableau de bord' : 'Mon profil' }}
              </router-link>
              <button class="user-menu__item user-menu__item--danger" @click="logout">
                <LogOut :size="15" :stroke-width="1.75" />
                Déconnexion
              </button>
            </div>
          </v-menu>
        </div>
      </div>
    </v-app-bar>

    <!-- ═══════ Main ═══════ -->
    <v-main class="app-main">
      <div class="app-main__inner">
        <router-view v-slot="{ Component }">
          <Transition name="fade" mode="out-in">
            <component :is="Component" />
          </Transition>
        </router-view>
      </div>
    </v-main>
  </v-app>
</template>

<style scoped>
/* Prevent Vuetify from clipping topbar / page actions */
:deep(.v-application),
:deep(.v-application__wrap),
:deep(.v-main) {
  overflow: visible !important;
}

/* ── Sidebar ── */
.sidebar {
  background: linear-gradient(180deg, #0B1120 0%, #0F172A 100%) !important;
  border-right: 1px solid rgba(255,255,255,0.06) !important;
}

/* Brand */
.sb-brand {
  display: flex; align-items: center; gap: 12px;
  padding: 20px 16px 14px; overflow: hidden;
}
.sb-brand--rail { justify-content: center; padding: 20px 0 14px; }

.sb-logo {
  width: 38px; height: 38px; border-radius: 11px; flex-shrink: 0;
  background: linear-gradient(135deg, #3B82F6, #1D4ED8);
  box-shadow: 0 4px 14px rgba(59,130,246,0.45);
  display: flex; align-items: center; justify-content: center;
}
.sb-brand__text { display: flex; flex-direction: column; min-width: 0; }
.sb-brand__name { font-size: 16px; font-weight: 800; color: #F8FAFC; letter-spacing: -0.04em; line-height: 1.2; }
.sb-brand__tag  { font-size: 10px; color: #475569; font-weight: 500; margin-top: 2px; }

/* Role */
.sb-role {
  display: flex; align-items: center; gap: 8px;
  margin: 0 16px 12px; padding: 8px 12px;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07);
  border-radius: 10px;
}
.sb-role__dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.sb-role__dot--blue   { background: #60A5FA; box-shadow: 0 0 8px rgba(96,165,250,0.7); }
.sb-role__dot--green  { background: #34D399; box-shadow: 0 0 8px rgba(52,211,153,0.7); }
.sb-role__dot--purple { background: #A78BFA; box-shadow: 0 0 8px rgba(167,139,250,0.7); }
.sb-role__label { font-size: 11px; font-weight: 600; color: #64748B; letter-spacing: 0.03em; }

/* Nav */
.sb-nav { flex: 1; padding: 6px 12px; overflow-y: auto; overflow-x: hidden; }
.sb-nav--rail { padding: 6px 8px; }
.sb-nav::-webkit-scrollbar { width: 3px; }
.sb-nav::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }

.sb-group-label {
  font-size: 10px; font-weight: 700; letter-spacing: 0.1em;
  text-transform: uppercase; color: #334155;
  padding: 14px 10px 6px; margin: 0;
}

.sb-link {
  display: flex; align-items: center; gap: 11px;
  padding: 10px 12px; border-radius: 11px; margin-bottom: 3px;
  color: #64748B; text-decoration: none;
  font-size: 14px; font-weight: 500;
  transition: background 0.13s, color 0.13s;
  position: relative;
}
.sb-link--rail { justify-content: center; padding: 10px; gap: 0; }
.sb-link:hover { background: rgba(255,255,255,0.06); color: #CBD5E1; }
.sb-link--active { background: rgba(37,99,235,0.15); color: #93C5FD; font-weight: 600; }

.sb-link__icon-wrap {
  width: 34px; height: 34px; border-radius: 9px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.13s;
}
.sb-link--active .sb-link__icon-wrap,
.sb-link__icon-wrap--active {
  background: rgba(37,99,235,0.25);
}
.sb-link__label { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.sb-badge {
  min-width: 20px; height: 20px; border-radius: 10px;
  background: #EF4444; color: white;
  font-size: 10px; font-weight: 700;
  display: flex; align-items: center; justify-content: center; padding: 0 5px; flex-shrink: 0;
}
.sb-badge--rail {
  position: absolute; top: 6px; right: 6px;
  min-width: 16px; height: 16px; font-size: 9px; padding: 0 3px;
}

/* Footer */
.sb-footer { border-top: 1px solid rgba(255,255,255,0.06); padding: 12px; }
.sb-footer--rail { padding: 12px 8px; }

.sb-user { display: flex; align-items: center; gap: 10px; padding: 4px 4px 12px; }
.sb-user__avatar {
  width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0;
  background: linear-gradient(135deg, #3B82F6, #7C3AED);
  color: white; font-size: 14px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
}
.sb-user__name { font-size: 13px; font-weight: 600; color: #E2E8F0; margin: 0 0 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sb-user__role { font-size: 11px; color: #475569; margin: 0; }

.sb-logout {
  display: flex; align-items: center; gap: 10px;
  width: 100%; padding: 10px 12px;
  background: transparent; border: none; border-radius: 10px;
  color: #475569; font-size: 13px; font-weight: 500; cursor: pointer;
  transition: background 0.13s, color 0.13s;
}
.sb-logout--rail { justify-content: center; padding: 10px; }
.sb-logout:hover { background: rgba(239,68,68,0.12); color: #F87171; }

/* ── Top bar ── */
.topbar {
  background: #FFFFFF !important;
  border-bottom: 1px solid #E2E8F0 !important;
  z-index: 1004 !important;
}

:deep(.topbar .v-toolbar__content) {
  padding: 0 !important;
  overflow: visible !important;
}

.topbar__inner {
  display: flex;
  align-items: center;
  width: 100%;
  height: 64px;
  padding: 0 20px 0 16px;
  gap: 8px;
  min-width: 0;
  box-sizing: border-box;
}

.topbar__toggle {
  width: 38px; height: 38px; border: 1px solid #E2E8F0; background: #FFFFFF;
  border-radius: 10px; cursor: pointer; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.13s, border-color 0.13s;
}
.topbar__toggle:hover { background: #F8FAFC; border-color: #CBD5E1; }

.topbar__breadcrumb {
  display: flex; align-items: center; gap: 6px;
  min-width: 0; flex-shrink: 1; overflow: hidden;
}
.topbar__context { font-size: 13px; font-weight: 500; color: #94A3B8; white-space: nowrap; }
.topbar__chevron { flex-shrink: 0; }
.topbar__page {
  font-size: 14px; font-weight: 700; color: #0F172A; letter-spacing: -0.01em;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

.topbar__spacer { flex: 1; min-width: 8px; }

.topbar__actions {
  display: flex; align-items: center; gap: 8px;
  flex-shrink: 0;
}

.topbar__quick-link {
  display: none; align-items: center; gap: 7px;
  padding: 8px 14px; border-radius: 10px; border: 1px solid #E2E8F0;
  background: #FFFFFF; text-decoration: none;
  font-size: 13px; font-weight: 600; color: #64748B;
  transition: all 0.13s; white-space: nowrap;
}
.topbar__quick-link:hover { border-color: #BFDBFE; color: #2563EB; background: #EFF6FF; }
@media (min-width: 1100px) { .topbar__quick-link { display: flex; } }

.topbar__icon-btn {
  position: relative; width: 38px; height: 38px; flex-shrink: 0;
  border: 1px solid #E2E8F0; background: #FFFFFF; border-radius: 10px;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: background 0.13s, border-color 0.13s;
}
.topbar__icon-btn:hover { background: #F8FAFC; border-color: #CBD5E1; }

.topbar__notif-badge {
  position: absolute; top: -5px; right: -5px;
  min-width: 18px; height: 18px; border-radius: 9px;
  background: #EF4444; color: white; font-size: 10px; font-weight: 700;
  display: flex; align-items: center; justify-content: center; padding: 0 4px;
  border: 2px solid white;
}

.topbar__user {
  display: flex; align-items: center; gap: 8px;
  padding: 5px 10px 5px 5px;
  border: 1px solid #E2E8F0; border-radius: 12px; background: #FFFFFF;
  cursor: pointer; flex-shrink: 0; max-width: 200px;
  transition: background 0.13s, border-color 0.13s;
}
.topbar__user:hover { background: #F8FAFC; border-color: #CBD5E1; }

.topbar__avatar {
  width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0;
  background: linear-gradient(135deg, #3B82F6, #6366F1);
  color: white; font-size: 13px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
}

.topbar__user-info {
  display: flex; flex-direction: column; text-align: left;
  min-width: 0; overflow: hidden;
}
.topbar__user-name {
  font-size: 13px; font-weight: 700; color: #0F172A; line-height: 1.2;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.topbar__user-role { font-size: 11px; color: #94A3B8; font-weight: 500; }
.topbar__user-chevron { flex-shrink: 0; }

@media (max-width: 768px) {
  .topbar__inner { padding: 0 12px 0 10px; }
  .topbar__user-info, .topbar__user-chevron { display: none; }
  .topbar__user { padding: 4px; border: 1px solid #E2E8F0; max-width: none; }
  .topbar__context { display: none; }
  .topbar__chevron { display: none; }
}

/* Notification panel */
.notif-panel {
  background: #FFFFFF; border-radius: 16px; border: 1px solid #E2E8F0;
  box-shadow: 0 12px 40px rgba(15,23,42,0.14); overflow: hidden; width: 380px;
}
.notif-panel__head {
  display: flex; align-items: flex-start; justify-content: space-between;
  padding: 16px 20px; border-bottom: 1px solid #F1F5F9;
}
.notif-panel__title { font-size: 15px; font-weight: 800; color: #0F172A; margin: 0 0 2px; }
.notif-panel__sub   { font-size: 12px; color: #94A3B8; margin: 0; }
.notif-panel__mark  { font-size: 12px; color: #2563EB; font-weight: 600; background: #EFF6FF; border: none; cursor: pointer; padding: 5px 10px; border-radius: 8px; }
.notif-panel__empty { display: flex; flex-direction: column; align-items: center; padding: 36px; gap: 8px; color: #94A3B8; font-size: 13px; }

.notif-item {
  display: flex; align-items: flex-start; gap: 12px;
  padding: 14px 20px; cursor: pointer; transition: background 0.12s;
  border-bottom: 1px solid #F8FAFC;
}
.notif-item:hover { background: #F8FAFC; }
.notif-item--unread { background: #F0F7FF; }
.notif-item__icon {
  width: 34px; height: 34px; border-radius: 10px; background: #F1F5F9;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.notif-item__icon--unread { background: #EFF6FF; }
.notif-item__title { font-size: 13px; font-weight: 700; color: #0F172A; margin-bottom: 3px; }
.notif-item__msg   { font-size: 12px; color: #64748B; line-height: 1.4; }

/* User menu */
.user-menu {
  background: #FFFFFF; border-radius: 16px; border: 1px solid #E2E8F0;
  box-shadow: 0 12px 40px rgba(15,23,42,0.14); overflow: hidden; padding: 8px;
}
.user-menu__header { display: flex; align-items: center; gap: 12px; padding: 12px; }
.user-menu__avatar {
  width: 40px; height: 40px; border-radius: 50%;
  background: linear-gradient(135deg, #3B82F6, #7C3AED);
  color: white; font-size: 16px; font-weight: 700;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.user-menu__name  { font-size: 14px; font-weight: 700; color: #0F172A; margin: 0 0 2px; }
.user-menu__email { font-size: 12px; color: #94A3B8; margin: 0; }
.user-menu__divider { height: 1px; background: #F1F5F9; margin: 4px 0; }
.user-menu__item {
  display: flex; align-items: center; gap: 10px;
  width: 100%; padding: 10px 12px; border-radius: 10px;
  font-size: 14px; font-weight: 500; color: #334155;
  text-decoration: none; background: none; border: none; cursor: pointer;
  transition: background 0.12s;
}
.user-menu__item:hover { background: #F8FAFC; }
.user-menu__item--danger { color: #EF4444; }
.user-menu__item--danger:hover { background: #FEF2F2; }

/* Main — restore Vuetify layout padding (global reset must not zero padding on *) */
.app-main {
  background: #F8FAFC !important;
  overflow: visible !important;
  padding-top: var(--v-layout-top) !important;
  padding-left: var(--v-layout-left) !important;
  padding-right: var(--v-layout-right) !important;
  padding-bottom: var(--v-layout-bottom) !important;
}
.app-main__inner {
  padding: 28px 32px 56px;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  overflow: visible;
}
@media (max-width: 768px) { .app-main__inner { padding: 20px 16px 40px; } }
</style>
