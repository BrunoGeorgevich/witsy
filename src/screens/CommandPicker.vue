<template>
  <div class="commands">
    <div class="app" v-if="sourceApp">
      <img class="icon" :src="iconData" /> Working with {{ sourceApp.name }}
    </div>
    <div class="list" ref="list"> <div class="command" v-for="command in commands" :key="command.id" :class="{ selected: selected?.id == command.id }" @mousemove="onMouseMove(command)" @click="onRunCommand($event, command)">
        <div class="icon">{{ command.icon }}</div>
        <div class="label">{{ command.label }}</div>
        <div class="shortcut" v-if="command.shortcut">{{ command.shortcut }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

import { anyDict, Command, ExternalApp } from '../types'
import { ref, Ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { store } from '../services/store'

// load store
store.loadSettings()
store.loadCommands()

let showParams: anyDict = {}
const props = defineProps({
  extra: Object
})

const list: Ref<HTMLElement | null> = ref(null)
const commands: Ref<Command[]> = ref([])
const selected: Ref<Command | null> = ref(null)
const sourceApp: Ref<ExternalApp | null> = ref(null)

const iconData = computed(() => {
  const iconContents = window.api.file.readIcon(sourceApp.value.icon)
  return `data:${iconContents.mimeType};base64,${iconContents.contents}`
})

onMounted(() => {

  // shortcuts work better at document level
  document.addEventListener('keydown', onKeyDown)
  document.addEventListener('keyup', onKeyUp)
  document.addEventListener('blur', onClose)

  // events
  window.api.on('show', onShow)

  // query params
  if (props.extra) {
    onShow(props.extra)
  }

})

onUnmounted(() => {
  document.removeEventListener('keydown', onKeyDown)
  document.removeEventListener('keyup', onKeyUp)
  window.api.off('show', onShow)
})

const onShow = (params?: anyDict) => {
  //console.log('CommandPicker.onShow', JSON.stringify(params))
  store.loadCommands()
  showParams = params
  sourceApp.value = showParams?.sourceApp ? window.api.file.getAppInfo(showParams.sourceApp.path) : null
  commands.value = store.commands.filter(command => command.state == 'enabled')
  selected.value = commands.value[0]
}

const onKeyDown = (event: KeyboardEvent) => {
  if (event.key == 'Enter') {
    if (selected.value) {
      onRunCommand(event, selected.value)
    }
  } else if (event.key == 'ArrowDown') {
    const index = commands.value.indexOf(selected.value)
    if (index < commands.value.length - 1) {
      selected.value = commands.value[index + 1]
    }
  } else if (event.key == 'ArrowUp') {
    const index = commands.value.indexOf(selected.value)
    if (index > 0) {
      selected.value = commands.value[index - 1]
    }
  }


  ensureVisible()
}

const ensureVisible = () => {
  nextTick(() => {
    const selectedEl = list.value?.querySelector('.selected')
    if (selectedEl) {
      scrollToBeVisible(selectedEl, list.value)
    }
  })
}

const onKeyUp = (event: KeyboardEvent) => {
  if (event.key == 'Escape') {
    onClose()
  } else {
    for (const command of commands.value) {
      if (command.shortcut?.toLowerCase() === event.key.toLowerCase()) {
        onRunCommand(event, command)
        break
      }
    }
  }
}

const onMouseMove = (command: Command) => {
  if (selected.value?.id != command.id) {
    selected.value = command
    ensureVisible()
  }
}

const onClose = () => {
  window.api.commands.closePicker(showParams.sourceApp)
}

const onRunCommand = (event: MouseEvent | KeyboardEvent, command: Command) => {
  window.api.commands.run({
    textId: showParams.textId,
    sourceApp: showParams.sourceApp,
    command: JSON.parse(JSON.stringify(command))
  })
}

const scrollToBeVisible = function (ele, container) {
  const eleTop = ele.offsetTop - container.offsetTop;
  const eleBottom = eleTop + ele.clientHeight;

  const containerTop = container.scrollTop;
  const containerBottom = containerTop + container.clientHeight;

  if (eleTop < containerTop) {
    // Scroll to the top of container
    container.scrollTop -= containerTop - eleTop;
  } else if (eleBottom > containerBottom) {
    // Scroll to the bottom of container
    container.scrollTop += eleBottom - containerBottom;
  }
};

</script>

<style scoped>
::-webkit-scrollbar {
  display: none;
}

.commands {
  box-sizing: border-box;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--window-bg-color);
  color: var(--text-color);
  padding: 10px;
}

.app {
  display: flex;
  flex-direction: row;
  background-color: var(--source-app-bg-color);
  color: var(--source-app-text-color);
  border-radius: 6px;
  align-items: center;
  padding: 2px 8px;
  margin-bottom: 8px;
  font-size: 10pt;
  font-weight: 500;

  .icon {
    width: 24px;
    height: 24px;
    margin-right: 4px;
  }
}

.list {
  overflow: auto;
}

.command {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 4px 8px;
  font-size: 10pt;
  font-family: -apple-system;
}

.commands:has(.app) .command:first-child {
  padding-top: 2px;
}

.command.selected {
  background-color: var(--highlight-color);
  color: var(--highlighted-color);
  border-radius: 6px;
}

.icon {
  flex: 0 0 24px;
  font-size: 13pt;
  text-align: center;
  margin-right: 4px;
}

.windows .icon {
  font-size: 12pt;
  font-family: 'NotoColorEmojiLimited'
}

.label {
  flex: 1;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}

.shortcut {
  margin-top: -3px;
  display: inline-block;
  border: 1px solid var(--icon-color);
  color: var(--icon-color);
  border-radius: 4px;
  font-size: 8pt;
  text-transform: capitalize;
  padding: 0px 4px;
  margin-right: 8px
}

.action {
  color: var(--icon-color);
}

.command.selected {

  .shortcut,
  .action {
    color: var(--highlighted-color);
  }

  .shortcut {
    border-color: var(--highlighted-color);
  }
}
</style>