import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/connexion' },
    { path: '/connexion',              name: 'login',          component: () => import('@/views/auth/LoginView.vue'),          meta: { guest: true } },
    { path: '/inscription',            name: 'register',       component: () => import('@/views/auth/RegisterView.vue'),       meta: { guest: true } },
    { path: '/mot-de-passe-oublie',    name: 'forgot-password',component: () => import('@/views/auth/ForgotPasswordView.vue'),meta: { guest: true } },
    { path: '/reinitialiser-mot-de-passe', name: 'reset-password', component: () => import('@/views/auth/ResetPasswordView.vue'), meta: { guest: true } },

    // Admin: global overview — ADMIN role only
    {
      path: '/apercu',
      component: () => import('@/layouts/AppLayout.vue'),
      meta: { requiresAuth: true, role: 'ADMIN' },
      children: [
        {
          path: '',
          name: 'global-overview',
          component: () => import('@/views/overview/GlobalDashboardView.vue'),
          meta: { title: "Vue d'ensemble", role: 'ADMIN' },
        },
      ],
    },

    // Patient space
    {
      path: '/patient',
      component: () => import('@/layouts/AppLayout.vue'),
      meta: { requiresAuth: true, role: 'PATIENT' },
      children: [
        { path: '', redirect: '/patient/tableau-de-bord' },
        { path: 'tableau-de-bord', name: 'patient-dashboard',    component: () => import('@/views/patient/DashboardView.vue'),      meta: { title: 'Tableau de bord' } },
        { path: 'profil',          name: 'patient-profile',       component: () => import('@/views/patient/ProfileView.vue'),        meta: { title: 'Mon profil' } },
        { path: 'suivi-hebdomadaire', name: 'patient-followup',   component: () => import('@/views/patient/FollowUpView.vue'),       meta: { title: 'Suivi hebdomadaire' } },
        { path: 'medicaments',     name: 'patient-medications',   component: () => import('@/views/patient/MedicationsView.vue'),    meta: { title: 'Médicaments' } },
        { path: 'rapports',        name: 'patient-reports',       component: () => import('@/views/patient/ReportsView.vue'),        meta: { title: 'Rapports' } },
        { path: 'messages',        name: 'patient-messages',      component: () => import('@/views/patient/MessagesView.vue'),       meta: { title: 'Messages' } },
        { path: 'alertes',         name: 'patient-alerts',        component: () => import('@/views/patient/AlertsView.vue'),         meta: { title: 'Alertes' } },
        { path: 'rendez-vous',     name: 'patient-appointments',  component: () => import('@/views/patient/AppointmentsView.vue'),   meta: { title: 'Rendez-vous' } },
      ],
    },

    // Doctor space
    {
      path: '/medecin',
      component: () => import('@/layouts/AppLayout.vue'),
      meta: { requiresAuth: true, role: 'DOCTOR' },
      children: [
        { path: '', redirect: '/medecin/tableau-de-bord' },
        { path: 'tableau-de-bord', name: 'doctor-dashboard',     component: () => import('@/views/doctor/DashboardView.vue'),       meta: { title: 'Tableau de bord' } },
        { path: 'patients',        name: 'doctor-patients',       component: () => import('@/views/doctor/PatientsView.vue'),        meta: { title: 'Patients' } },
        { path: 'patients/:id',    name: 'doctor-patient-detail', component: () => import('@/views/doctor/PatientDetailView.vue'),   meta: { title: 'Détail patient' } },
        { path: 'alertes',         name: 'doctor-alerts',         component: () => import('@/views/doctor/AlertsView.vue'),          meta: { title: 'Alertes' } },
        { path: 'analytique',      name: 'doctor-analytics',      component: () => import('@/views/doctor/AnalyticsView.vue'),       meta: { title: 'Analytique' } },
        { path: 'messages',        name: 'doctor-messages',       component: () => import('@/views/doctor/MessagesView.vue'),        meta: { title: 'Messages' } },
        { path: 'rendez-vous',     name: 'doctor-appointments',   component: () => import('@/views/doctor/AppointmentsView.vue'),   meta: { title: 'Rendez-vous' } },
        { path: 'mon-profil',      name: 'doctor-profile',        component: () => import('@/views/doctor/ProfileView.vue'),         meta: { title: 'Mon profil' } },
      ],
    },
  ],
})

function homeFor(role: string) {
  if (role === 'ADMIN')   return '/apercu'
  if (role === 'DOCTOR')  return '/medecin/tableau-de-bord'
  return '/patient/tableau-de-bord'
}

router.beforeEach((to) => {
  const auth = useAuthStore()
  auth.initFromStorage()

  const role = auth.user?.role

  // Redirect authenticated users away from guest pages
  if (to.meta.guest && auth.isAuthenticated && role) {
    return homeFor(role)
  }

  // Redirect unauthenticated users to login
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return '/connexion'
  }

  // Role mismatch — redirect to the correct home
  if (to.meta.role && role && role !== to.meta.role) {
    return homeFor(role)
  }

  return true
})

export default router
