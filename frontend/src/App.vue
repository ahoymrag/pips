<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useScene } from './composables/useScene.js'
import GladeCanvas from './components/GladeCanvas.vue'
import PipOverlay from './components/PipOverlay.vue'
import ChatWindow from './components/ChatWindow.vue'
import CouncilButton from './components/CouncilButton.vue'
import NebulaIntro from './components/NebulaIntro.vue'
import { teleportNearTarget } from './three/camera.js'

const {
  currentMode,
  modeDefinitions,
  buildMode,
  playfulMode,
  selectedTool,
  farmTools,
  farmStats,
  farmSpawnNotice,
  activeGlade,
  gladeSlots,
  gladeSummaries,
  playerPosition,
  selectGladeSlot,
  setMode,
  cycleMode,
  toggleBuildMode,
  selectToolByKey,
} = useScene()
const chatWindow = ref(null)
const introVisible = ref(true)
const WORLD_SIZE = 260
const WORLD_HALF = WORLD_SIZE / 2

const gladeTrendRows = computed(() => {
  return gladeSummaries.value.map((g) => {
    const spawnPressure = Math.max(0, 1 - Math.min(1, g.nextSpawnIn / 45))
    const raw = g.growthRate * 0.55 + g.pips * 0.16 + g.farmBlocks * 0.1 + spawnPressure * 0.45
    const score = Math.max(0.12, Math.min(1, raw / 3))
    const label = score > 0.72 ? 'Rising' : score > 0.45 ? 'Steady' : 'Slow'
    return { ...g, score, label }
  })
})

function onKeyDown(event) {
  if (event.metaKey || event.ctrlKey || event.altKey) return
  if (event.code === 'F1') { setMode('explore'); return }
  if (event.code === 'F2') { setMode('build'); return }
  if (event.code === 'F3') { setMode('playful'); return }
  if (event.code === 'Tab') {
    event.preventDefault()
    cycleMode()
    return
  }
  if (event.code === 'KeyB') {
    toggleBuildMode()
    return
  }
  const key = event.key
  if (key < '1' || key > '6') return
  if (buildMode.value && key <= '5') {
    selectToolByKey(key)
    return
  }
  const glade = selectGladeSlot(Number(key) - 1)
  if (glade) {
    teleportNearTarget(glade.center.x, glade.center.z)
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown)
})

function focusChat() {
  chatWindow.value?.focusInput()
}

function onSelectGladeSlot(idx) {
  const glade = selectGladeSlot(idx)
  if (glade) teleportNearTarget(glade.center.x, glade.center.z)
}

function onSelectGladeById(gladeId) {
  const idx = gladeSlots.value.findIndex((g) => g.id === gladeId)
  if (idx !== -1) onSelectGladeSlot(idx)
}

function onIntroDone() {
  introVisible.value = false
}

function mapPercentX(x) {
  return ((x + WORLD_HALF) / WORLD_SIZE) * 100
}

function mapPercentY(z) {
  return ((z + WORLD_HALF) / WORLD_SIZE) * 100
}
</script>

<template>
  <GladeCanvas />
  <PipOverlay @focus-chat="focusChat" />
  <ChatWindow ref="chatWindow" />
  <CouncilButton />
  <div class="controls-panel panel">
    <div class="controls-title">Mode</div>
    <div class="mode-chips">
      <button
        v-for="mode in modeDefinitions"
        :key="mode.id"
        class="mode-chip"
        :class="{ active: currentMode === mode.id }"
        @click="setMode(mode.id)"
      >
        {{ mode.key }} {{ mode.label }}
      </button>
    </div>

    <div class="controls-title behavior-title">Movement</div>
    <div class="wasd-grid">
      <span class="keycap key-w">W</span>
      <span class="keycap key-a">A</span>
      <span class="keycap key-s">S</span>
      <span class="keycap key-d">D</span>
    </div>
    <div class="control-line"><span class="keycap key-wide">Shift</span> Sprint</div>
    <div class="control-line"><span class="keycap key-wide">Click</span> Select agent</div>
    <div class="control-line"><span class="keycap key-wide">RMB</span> Hold to look</div>
    <div class="control-line"><span class="keycap key-wide">1-6</span> Jump glades</div>
    <div class="control-line"><span class="keycap key-wide">Tab</span> Cycle mode</div>

    <template v-if="currentMode === 'explore'">
      <div class="controls-title behavior-title">Explore</div>
      <div class="control-line">{{ activeGlade?.name }} · {{ activeGlade?.theme }}</div>
      <div class="control-line">Project: {{ activeGlade?.project }}</div>
      <div class="control-line">Roam and check how this garden grows.</div>
    </template>

    <template v-else-if="currentMode === 'build'">
      <div class="controls-title behavior-title">Build</div>
      <div class="control-line"><span class="keycap key-wide">B</span> Toggle build</div>
      <div class="control-line">Click in farm zone to place blocks</div>
      <div class="controls-title behavior-title">Farm Tools</div>
      <div class="behavior-list">
        <div
          v-for="tool in farmTools"
          :key="tool.id"
          class="behavior-row"
          :class="{ active: buildMode && selectedTool === tool.id }"
        >
          <span class="keycap behavior-key">{{ tool.key }}</span>
          <span>{{ tool.label }}</span>
        </div>
      </div>
      <div class="last-action">
        Tool: <strong>{{ selectedTool }}</strong><br />
        Capacity: <strong>{{ farmStats.capacity }}</strong> |
        Growth: <strong>x{{ farmStats.growthRate.toFixed(2) }}</strong><br />
        Next pip: <strong>{{ Math.ceil(farmStats.nextSpawnIn) }}s</strong><br />
        Scale: <strong>1 block = 1 meter</strong>
      </div>
      <div class="last-action" v-if="farmSpawnNotice">{{ farmSpawnNotice }}</div>
    </template>

    <template v-else-if="playfulMode">
      <div class="controls-title behavior-title">Playful</div>
      <div class="control-line"><span class="keycap key-wide">Space</span> Rise</div>
      <div class="control-line"><span class="keycap key-wide">Ctrl</span> Dive</div>
      <div class="control-line"><span class="keycap key-wide">Shift</span> Boost glide</div>
      <div class="control-line">Try swooping over mountains and farm.</div>
      <div class="last-action">Nintendo-feel mode: floaty speed, air control, gentle camera lean.</div>
    </template>
  </div>
  <div class="insights-panel panel">
    <div class="controls-title">Glade Growth</div>
    <div
      v-for="row in gladeTrendRows"
      :key="row.id"
      class="trend-row"
      :class="{ active: activeGlade?.id === row.id }"
    >
      <div class="trend-header">
        <span>{{ row.name }}</span>
        <span>{{ row.label }}</span>
      </div>
      <div class="trend-track">
        <div class="trend-fill" :style="{ width: `${Math.round(row.score * 100)}%`, backgroundColor: row.color }"></div>
      </div>
    </div>
    <div class="controls-title" style="margin-top: 10px;">Minimap</div>
    <div class="mini-map">
      <button
        v-for="g in gladeSlots"
        :key="`mini-${g.id}`"
        class="mini-dot"
        :class="{ active: activeGlade?.id === g.id }"
        :style="{ left: `${mapPercentX(g.center.x)}%`, top: `${mapPercentY(g.center.z)}%`, backgroundColor: g.color }"
        :title="`${g.name} (${g.theme})`"
        @click="onSelectGladeById(g.id)"
      ></button>
      <div
        class="mini-player"
        :style="{ left: `${mapPercentX(playerPosition.x)}%`, top: `${mapPercentY(playerPosition.z)}%` }"
      ></div>
    </div>
  </div>

  <div class="roster-dock panel">
    <div class="controls-title" style="margin-bottom: 6px;">Glade Dock (1-6)</div>
    <div class="roster-row">
      <button
        v-for="(glade, idx) in gladeSlots"
        :key="glade.id"
        class="roster-slot"
        :class="{ active: activeGlade?.id === glade.id }"
        @click="onSelectGladeSlot(idx)"
      >
        <span class="slot-key">{{ idx + 1 }}</span>
        <span class="slot-name">{{ glade.name }}</span>
        <span class="slot-empty">{{ glade.theme }}</span>
      </button>
    </div>
  </div>
  <NebulaIntro v-if="introVisible" @done="onIntroDone" />
</template>
