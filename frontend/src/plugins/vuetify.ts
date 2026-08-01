import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { fr } from 'vuetify/locale'

export default createVuetify({
  components,
  directives,
  locale: { locale: 'fr', messages: { fr } },
  theme: {
    defaultTheme: 'cardio',
    themes: {
      cardio: {
        dark: false,
        colors: {
          primary:    '#2563EB',
          secondary:  '#10B981',
          accent:     '#7C3AED',
          error:      '#EF4444',
          warning:    '#F59E0B',
          info:       '#0EA5E9',
          success:    '#10B981',
          background: '#F8FAFC',
          surface:    '#FFFFFF',
          'on-primary':   '#FFFFFF',
          'on-secondary': '#FFFFFF',
        },
      },
    },
  },
  defaults: {
    VCard: {
      rounded: 'xl',
      elevation: 0,
      border: true,
    },
    VBtn: {
      rounded: 'lg',
      style: 'font-weight: 600; letter-spacing: -0.01em; text-transform: none;',
    },
    VTextField: {
      variant: 'outlined',
      density: 'comfortable',
      rounded: 'lg',
      hideDetails: 'auto',
    },
    VSelect: {
      variant: 'outlined',
      density: 'comfortable',
      rounded: 'lg',
      hideDetails: 'auto',
    },
    VChip: {
      rounded: 'lg',
    },
    VDataTable: {
      density: 'comfortable',
      style: 'font-family: Inter, system-ui, sans-serif; font-size: 14px;',
    },
    VProgressLinear: {
      rounded: true,
      height: 6,
    },
  },
})
