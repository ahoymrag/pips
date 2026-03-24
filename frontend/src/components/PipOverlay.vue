<script setup>
import { ref, watch } from 'vue'
import { useScene } from '../composables/useScene.js'

const {
  selectedPip,
  deselectPip,
  openChat,
  closeChat,
} = useScene()
const menuView = ref('menu')

const emit = defineEmits(['focus-chat'])

function onTalk() {
  openChat()
  emit('focus-chat')
}

function onBackToMenu() {
  closeChat()
  menuView.value = 'menu'
}

watch(
  () => selectedPip.value?.id,
  () => {
    menuView.value = 'menu'
  }
)
</script>

<template>
  <div v-if="selectedPip" class="pip-overlay panel">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span
          class="status-dot"
          :style="{ backgroundColor: selectedPip.color || '#e06060' }"
        ></span>
        <strong style="font-size: 16px;">{{ selectedPip.name || 'Unknown Pip' }}</strong>
      </div>
      <button class="close-btn" @click="deselectPip">&times;</button>
    </div>

    <div style="font-size: 12px; opacity: 0.7; margin-bottom: 8px;">
      {{ selectedPip.provider || 'openai' }} / {{ selectedPip.model || 'gpt-4' }}
    </div>

    <div v-if="selectedPip.personality" style="font-size: 13px; margin-bottom: 12px; line-height: 1.4;">
      "{{ selectedPip.personality }}"
    </div>

    <div style="font-size: 12px; margin-bottom: 12px;">
      Status:
      <span :style="{ color: selectedPip.status === 'active' ? '#6be07a' : '#e0c040' }">
        {{ selectedPip.status || 'idle' }}
      </span>
    </div>

    <div v-if="menuView === 'menu'" style="display: flex; flex-direction: column; gap: 8px;">
      <button class="send-btn" @click="menuView = 'details'" style="width: 100%;">Inspect</button>
      <button class="send-btn" @click="onTalk" style="width: 100%;">Talk</button>
      <button class="send-btn" @click="deselectPip" style="opacity: 0.6; width: 100%;">Close</button>
    </div>

    <div v-else style="display: flex; flex-direction: column; gap: 10px;">
      <div style="font-size: 12px; opacity: 0.85; line-height: 1.5;">
        <strong>About {{ selectedPip.name }}</strong><br />
        <span>
          {{ selectedPip.personality || 'A mysterious glade creature.' }}
        </span>
      </div>
      <div style="display: flex; gap: 8px;">
        <button class="send-btn" @click="onTalk" style="flex: 1;">Talk</button>
        <button class="send-btn" @click="onBackToMenu" style="opacity: 0.7; flex: 1;">Back</button>
      </div>
    </div>
  </div>
</template>
