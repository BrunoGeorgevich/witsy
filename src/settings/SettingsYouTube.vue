
<template>
  <div>
    <div class="description">
      This plugin allows LLM engines to download transcripts of YouTube videos.
    </div>
    <div class="group">
      <label>Enabled</label>
      <input type="checkbox" v-model="enabled" @change="save" />
    </div>
  </div>
</template>

<script setup lang="ts">

import { ref } from 'vue'
import { store } from '../services/store'

const enabled = ref(false)

const load = () => {
  enabled.value = store.config.plugins.youtube.enabled || false
}

const save = () => {
  store.config.plugins.youtube.enabled = enabled.value
  store.saveSettings()
}

defineExpose({ load })

</script>

<style scoped>
@import '../../css/dialog.css';
@import '../../css/tabs.css';
@import '../../css/form.css';
@import '../../css/panel.css';
</style>

