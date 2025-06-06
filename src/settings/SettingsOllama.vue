
<template>
  <div>
    <div class="group">
      <label>Chat model</label>
      <select v-model="chat_model" :disabled="chat_models.length == 0" @change="save">
        <option v-for="model in chat_models" :key="model.id" :value="model.id">
          {{ model.name }}
        </option>
      </select>
      <button @click.prevent="onDelete"><BIconTrash /></button>
      <button @click.prevent="onRefresh">{{ refreshLabel }}</button>
    </div>
    <OllamaModelPull :pullable-models="getChatModels" info-url="https://ollama.com/library" info-text="Browse models" @done="onRefresh"/>
    <div class="group">
      <label>API Base URL</label>
      <input v-model="baseURL" :placeholder="defaults.engines.ollama.baseURL" @keydown.enter.prevent="save" @change="save"/>
    </div>
  </div>
</template>

<script setup lang="ts">

import { ref } from 'vue'
import { store } from '../services/store'
import { getChatModels } from '../llms/ollama'
import { Ollama } from 'multi-llm-ts'
import Dialog from '../composables/dialog'
import LlmFactory from '../llms/llm'
import defaults from '../../defaults/settings.json'
import OllamaModelPull from '../components/OllamaModelPull.vue'

const baseURL = ref(null)
const refreshLabel = ref('Refresh')
const chat_model = ref(null)
const chat_models = ref([])

const load = () => {
  baseURL.value = store.config.engines.ollama?.baseURL || ''
  chat_models.value = store.config.engines.ollama?.models?.chat || []
  chat_model.value = store.config.engines.ollama?.model?.chat || ''
}

const onDelete = () => {
  
  Dialog.show({
    target: document.querySelector('dialog'),
    title: 'Are you sure you want to delete this model?',
    text: 'You can\'t undo this action.',
    confirmButtonText: 'Delete',
    showCancelButton: true,
  }).then(async (result) => {
    if (result.isConfirmed) {
      const ollama = new Ollama(store.config.engines.ollama)
      await ollama.deleteModel(chat_model.value)
      onRefresh()
    }
  })

}

const onRefresh = async () => {
  refreshLabel.value = 'Refreshing…'
  setTimeout(() => getModels(), 500)
}

const setEphemeralRefreshLabel = (text: string) => {
  refreshLabel.value = text
  setTimeout(() => refreshLabel.value = 'Refresh', 2000)
}

const getModels = async () => {

  // load
  const llmFactory = new LlmFactory(store.config)
  let success = await llmFactory.loadModels('ollama')
  if (!success) {
    chat_models.value = []
    setEphemeralRefreshLabel('Error!')
    return
  }

  // reload
  store.saveSettings()
  load()

  // done
  setEphemeralRefreshLabel('Done!')

}

const save = () => {
  store.config.engines.ollama.baseURL = baseURL.value
  store.config.engines.ollama.model.chat = chat_model.value
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
