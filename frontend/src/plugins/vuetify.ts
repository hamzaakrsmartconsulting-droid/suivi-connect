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
    defaultTheme: 'suiviConnect',
    themes: {
      suiviConnect: {
        dark: false,
        colors: {
          primary: '#1677C8',
          secondary: '#16B8A6',
          accent: '#16B8A6',
          error: '#E11D48',
          warning: '#D97706',
          info: '#1677C8',
          success: '#16B8A6',
          background: '#F5FAFC',
          surface: '#FFFFFF',
          'on-primary': '#FFFFFF',
          'on-secondary': '#FFFFFF',
          'on-background': '#18324A',
          'on-surface': '#18324A',
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
      style: 'font-weight: 600; letter-spacing: -0.01em; text-transform: none; font-family: Manrope, Plus Jakarta Sans, system-ui, sans-serif;',
    },
    VTextField: {
      variant: 'outlined',
      density: 'comfortable',
      rounded: 'lg',
      hideDetails: 'auto',
      color: 'primary',
    },
    VSelect: {
      variant: 'outlined',
      density: 'comfortable',
      rounded: 'lg',
      hideDetails: 'auto',
      color: 'primary',
    },
    VChip: {
      rounded: 'lg',
    },
    VDataTable: {
      density: 'comfortable',
      style: 'font-family: Manrope, Plus Jakarta Sans, system-ui, sans-serif; font-size: 14px;',
    },
    VProgressLinear: {
      rounded: true,
      height: 6,
      color: 'primary',
    },
    VProgressCircular: {
      color: 'primary',
    },
  },
})
