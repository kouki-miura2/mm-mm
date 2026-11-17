import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi-svg'
import { ja } from 'vuetify/locale'

export const vuetify = createVuetify({
  locale: { locale: 'ja', messages: { ja } },
  icons: { defaultSet: 'mdi', aliases, sets: { mdi } },
  theme: {
    // Vuetify 4 の既定は system。デザインはライトのみ
    defaultTheme: 'light',
    themes: {
      light: {
        dark: false,
        colors: {
          primary: '#2F5BD3',
          'primary-darken-1': '#1E3F9E',
          background: '#F4F5F7',
          surface: '#FFFFFF',
          'surface-light': '#F0F2F5',
          'surface-variant': '#2B2F36',
          'on-surface-variant': '#FFFFFF',
          'on-background': '#1A1D21',
          'on-surface': '#1A1D21',
          error: '#C62828',
          success: '#2E7D4F',
          info: '#2F5BD3',
        },
        variables: {
          'border-color': '#1A1D21',
          'border-opacity': 0.12,
          // 補足テキストもコントラスト 4.5:1 を確保する
          'medium-emphasis-opacity': 0.72,
        },
      },
    },
  },
  defaults: {
    VBtn: { rounded: 'lg', class: 'mm-btn' },
    VTextField: { variant: 'outlined', density: 'comfortable', color: 'primary' },
    VTextarea: { variant: 'outlined', color: 'primary' },
    VCheckbox: { color: 'primary', density: 'comfortable', hideDetails: true },
    VCard: { rounded: 'xl' },
    VList: { bgColor: 'transparent' },
    VSnackbar: { color: 'surface-variant', rounded: 'lg' },
  },
})
