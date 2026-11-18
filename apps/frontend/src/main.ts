import '@fontsource-variable/noto-sans-jp'
import './styles/main.css'
import { createApp } from 'vue'

import App from './App.vue'
import './composables/install.ts'
import { vuetify } from './plugins/vuetify.ts'
import { router } from './router/index.ts'
import { startAutoSync } from './stores/session.ts'

startAutoSync()
createApp(App).use(vuetify).use(router).mount('#app')
