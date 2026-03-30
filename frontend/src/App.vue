<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useScene } from './composables/useScene.js'
import { useDraggable } from './composables/useDraggable.js'
import GladeCanvas from './components/GladeCanvas.vue'
import PipOverlay from './components/PipOverlay.vue'
import ChatWindow from './components/ChatWindow.vue'
import CouncilButton from './components/CouncilButton.vue'
import NebulaIntro from './components/NebulaIntro.vue'
import TerminalWindow from './components/TerminalWindow.vue'
import { teleportNearTarget } from './three/camera.js'

const controlsPanelEl = ref(null)
const insightsPanelEl = ref(null)
const { dragStyles: controlsDragStyles, onMouseDown: onControlsMouseDown } = useDraggable(controlsPanelEl, { x: 0, y: 0 }, 'controls-panel-pos')
const { dragStyles: insightsDragStyles, onMouseDown: onInsightsMouseDown } = useDraggable(insightsPanelEl, { x: 0, y: 0 }, 'insights-panel-pos')

const insightsCollapsed = ref(false)
const controlsCollapsed = ref(false)
const dockCollapsed = ref(false)
const showSettings = ref(false)
const uiSettings = ref({
  showHud: true,
  showIntel: true,
  showDock: true,
  opacity: 0.75,
})

// Load UI settings
const savedUi = localStorage.getItem('pips-ui-settings')
if (savedUi) {
  try { uiSettings.value = { ...uiSettings.value, ...JSON.parse(savedUi) } } catch (e) {}
}

function saveUiSettings() {
  localStorage.setItem('pips-ui-settings', JSON.stringify(uiSettings.value))
}

function resetAllPositions() {
  localStorage.removeItem('controls-panel-pos')
  localStorage.removeItem('insights-panel-pos')
  localStorage.removeItem('pip-chat-pos')
  localStorage.removeItem('pip-overlay-pos')
  window.location.reload() // Quickest way to reset all states correctly
}

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
  capturedFairies,
  inventory,
  selectedSlot,
  onboardingStep,
  feedPip,
  selectGladeSlot,
  setMode,
  cycleMode,
  toggleBuildMode,
  selectToolByKey,
  spawnDynamicGlade,
  terminalOpen,
  toggleTerminal,
  nearbyPip,
  hydratePip,
} = useScene()
const chatWindow = ref(null)
const introVisible = ref(true)
const wizardName = ref('')
const wizardTheme = ref('Default')
const wizardProvider = ref('ollama')
const wizardModel = ref('claude-3-opus-20240229')
const WORLD_SIZE = 260
const WORLD_HALF = WORLD_SIZE / 2

// Computed property to avoid comparison operators in template
const showTutorial = computed(() => {
  const step = onboardingStep.value
  return step === 0 || step === 1 || step === 2 || step === 3 || step === 4
})

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
  if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return
  
  if (event.code === 'Backquote') {
    toggleTerminal()
    event.preventDefault()
    return
  }

  if (terminalOpen.value) return

  if (event.code === 'F1') { setMode('explore'); return }
  if (event.code === 'F2') { setMode('build'); return }
  if (event.code === 'F3') { setMode('playful'); return }
  if (event.code === 'F4') { setMode('wizard'); return }
  if (event.code === 'Tab') {
    event.preventDefault()
    cycleMode()
    return
  }
  if (event.code === 'KeyB') {
    toggleBuildMode()
    return
  }
  if (event.code === 'KeyQ') {
    cycleSlot(-1)
    return
  }
  if (event.code === 'KeyR') {
    cycleSlot(1)
    return
  }
  const key = event.key
  const keyCode = key.charCodeAt(0)
  const num = Number(key)

  // 1-9 handling: Context-dependent
  if (num >= 1 && num <= 9) {
    if (buildMode.value && num <= 5) {
      // Build tool selection
      selectToolByKey(key)
    } else {
      // Hotbar selection
      selectedSlot.value = num - 1
    }
    return
  } else if (key === '0') {
    selectedSlot.value = 9
    return
  }
  if (key === 'f' || key === 'F') {
    if (nearbyPip.value) {
      feedPip(nearbyPip.value.id)
      return
    }
  }
  if (key === 'h' || key === 'H') {
    if (nearbyPip.value) {
      hydratePip(nearbyPip.value.id)
      return
    }
  }
}

function onWheel(event) {
  cycleSlot(event.deltaY > 0 ? 1 : -1)
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('wheel', onWheel)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('wheel', onWheel)
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
  <TerminalWindow />

  <div class="crosshair"></div>

  <!-- Interaction Prompt -->
  <div v-if="nearbyPip" class="interaction-prompt">
    <div class="prompt-pip-info">
      <span class="prompt-dot" :style="{ backgroundColor: nearbyPip.color }"></span>
      <strong>{{ nearbyPip.name }}</strong>
    </div>
    <div class="prompt-keys">
      <div class="prompt-key-row"><span class="keycap">F</span> Feed Fruit</div>
      <div class="prompt-key-row"><span class="keycap">H</span> Hydrate</div>
    </div>
    <div class="prompt-stats">
      <div class="stat-bar"><div class="stat-fill hunger" :style="{ width: nearbyPip.hunger + '%' }"></div></div>
      <div class="stat-bar"><div class="stat-fill thirst" :style="{ width: nearbyPip.thirst + '%' }"></div></div>
    </div>
  </div>

  <!-- Tutorial Overlay -->
  <div v-if="showTutorial" class="tutorial-overlay">
    <div v-if="onboardingStep === 0" class="tut-card">
      <h2>Welcome to the Glade!</h2>
      <p>A giant <strong>Nebula</strong> has appeared to guide you.</p>
      <p>Watch it shrink and get ready...</p>
    </div>
    <div v-if="onboardingStep === 2" class="tut-card">
      <p>Follow Nebula to the <strong>Infrastructure Forge</strong>!</p>
      <p>Use <strong>WASD</strong> to move and <strong>Shift</strong> to sprint.</p>
    </div>
    <div v-if="onboardingStep === 3" class="tut-card highlight">
      <p>Nebula is hungry! Select the <strong>Pip Treat (5)</strong> from your hotbar and click on Nebula to feed it.</p>
    </div>
    <div v-if="onboardingStep === 4" class="tut-card">
      <p>Great job! You've learned the basics.</p>
      <button @click="onboardingStep = 5" class="action-btn">Start Orchestration</button>
    </div>
  </div>

  <!-- Minecraft Hotbar -->
  <div class="hotbar-wrap">
     <div 
        v-for="(item, idx) in inventory" 
        :key="idx" 
        class="hotbar-slot"
        :class="{ active: selectedSlot === idx }"
        @click="selectedSlot = idx"
     >
        <span v-if="item" class="item-icon" :title="item.label">{{ item.icon }}</span>
        <span class="slot-number">{{ idx + 1 }}</span>
     </div>
  </div>
  
  <div
    v-if="uiSettings.showHud"
    ref="controlsPanelEl"
    class="controls-panel panel game-panel"
    :class="{ collapsed: controlsCollapsed }"
    :style="{ ...controlsDragStyles(), opacity: uiSettings.opacity }"
  >
    <div class="panel-header draggable" @mousedown="onControlsMouseDown">
      <div class="controls-title" style="margin-bottom: 0;">HUD</div>
      <button class="close-btn" @click.stop="controlsCollapsed = !controlsCollapsed">
        {{ controlsCollapsed ? '+' : '−' }}
      </button>
    </div>
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

    <div class="controls-title behavior-title">Controls</div>
    <div class="wasd-grid">
      <span class="keycap key-w">W</span>
      <span class="keycap key-a">A</span>
      <span class="keycap key-s">S</span>
      <span class="keycap key-d">D</span>
    </div>
    <div class="control-line"><span class="keycap key-wide">Shift</span> Sprint</div>
    <div class="control-line"><span class="keycap key-wide">Space</span> Jump</div>
    <div class="control-line"><span class="keycap key-wide">Ctrl/C</span> Crouch</div>
    <div class="control-line"><span class="keycap key-wide">E</span> Release</div>
    <div class="control-line"><span class="keycap key-wide">1-9</span> Slots</div>
    <div class="control-line"><span class="keycap key-wide">Q/R</span> Cycle Slot</div>
    <div class="control-line"><span class="keycap key-wide">Wheel</span> Cycle Slot</div>
    <div class="control-line"><span class="keycap key-wide">Tab</span> Modes</div>

    <template v-if="currentMode === 'explore'">
      <div class="controls-title behavior-title">Explore</div>
      <div class="status-chip">{{ activeGlade?.name }}</div>
      <div class="status-meta">{{ activeGlade?.theme }} · {{ activeGlade?.project }}</div>
    </template>

    <template v-else-if="currentMode === 'build'">
      <div class="controls-title behavior-title">Build</div>
      <div class="control-line"><span class="keycap key-wide">B</span> Toggle build</div>
      <div class="control-line">Click in district zone to place</div>
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
        Cap: <strong>{{ farmStats.capacity }}</strong> ·
        Growth: <strong>x{{ farmStats.growthRate.toFixed(2) }}</strong><br />
        Next spawn: <strong>{{ Math.ceil(farmStats.nextSpawnIn) }}s</strong>
      </div>
      <div class="last-action" v-if="farmSpawnNotice">{{ farmSpawnNotice }}</div>
    </template>

    <template v-else-if="playfulMode">
      <div class="controls-title behavior-title">Playful</div>
      <div class="control-line"><span class="keycap key-wide">Space</span> Rise</div>
      <div class="control-line"><span class="keycap key-wide">Ctrl</span> Dive</div>
      <div class="control-line"><span class="keycap key-wide">Shift</span> Boost</div>
      <div class="last-action">Arcade flight tuning enabled.</div>
      <div class="last-action" style="color: #ffccf9; font-weight: 700;">
        ✨ Fairies Caught: {{ capturedFairies }}<br/>
        <span style="font-size: 11px; font-weight: 700; color: #fff;">Tool: {{ inventory[selectedSlot]?.label || 'Unarmed' }}</span><br/>
        <span style="font-size: 10px; opacity: 0.8;">Left-Click to use power!</span><br/>
        <span style="font-size: 10px; opacity: 0.8;">Right-Click to drop crate!</span>
      </div>
    </template>

    <template v-else-if="currentMode === 'wizard'">
      <div class="controls-title behavior-title">Project Wizard</div>
      <div class="control-line">Create a new Glade dynamically</div>
      <div class="wizard-mockup" style="margin-top: 12px; display: flex; flex-direction: column; gap: 8px;">
        <input v-model="wizardName" type="text" placeholder="Project Name" class="chat-input" style="width: 100%; border-radius: 4px;" />
        <select v-model="wizardTheme" class="chat-input" style="width: 100%; border-radius: 4px; padding: 4px; cursor: pointer;">
           <option value="Default">Meadow Theme</option>
           <option value="Cyber Land">Cyber Theme</option>
           <option value="Media Land">Media Theme</option>
           <option value="Cinema Land">Cinema Theme</option>
           <option value="Magic Land">Magic Theme</option>
        </select>
        
        <label style="font-size: 11px; margin-top: 4px; color: #b9cbed;">Agent Provider:</label>
        <select v-model="wizardProvider" class="chat-input" style="width: 100%; border-radius: 4px; padding: 4px; cursor: pointer;">
           <option value="anthropic">Anthropic (Claude)</option>
           <option value="openai">OpenAI (GPT-4)</option>
           <option value="ollama">Ollama (Local)</option>
           <option value="glade">Glade (Mock)</option>
        </select>

        <label style="font-size: 11px; margin-top: 2px; color: #b9cbed;">Model Name:</label>
        <input v-model="wizardModel" type="text" placeholder="claude-3-opus-20240229" class="chat-input" style="width: 100%; border-radius: 4px;" />

        <button class="chat-send" style="width: 100%; border-radius: 4px; margin-top: 8px;" @click="spawnDynamicGlade(wizardName, wizardTheme, wizardProvider, wizardModel)">Spawn Project</button>
      </div>
    </template>
  </div>
  <div
    v-if="uiSettings.showIntel"
    ref="insightsPanelEl"
    class="insights-panel panel game-panel"
    :class="{ collapsed: insightsCollapsed }"
    :style="{ ...insightsDragStyles(), opacity: uiSettings.opacity }"
  >
    <div class="panel-header draggable" @mousedown="onInsightsMouseDown">
      <div class="controls-title" style="margin-bottom: 0;">District Intel</div>
      <button class="close-btn" @click.stop="insightsCollapsed = !insightsCollapsed">
        {{ insightsCollapsed ? '+' : '−' }}
      </button>
    </div>
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
    <div class="controls-title" style="margin-top: 10px;">Map</div>
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

  <div v-if="uiSettings.showDock" class="roster-dock panel game-panel" :class="{ collapsed: dockCollapsed }" :style="{ opacity: uiSettings.opacity }">
    <div class="panel-header" style="margin-bottom: 6px;">
      <div class="controls-title" style="margin-bottom: 0;">District Dock</div>
      <button class="close-btn" @click.stop="dockCollapsed = !dockCollapsed">
        {{ dockCollapsed ? '+' : '−' }}
      </button>
    </div>
    <div v-if="!dockCollapsed" class="roster-row">
      <button
        v-for="(glade, idx) in gladeSlots"
        :key="glade.id"
        class="roster-slot"
        :class="{ active: activeGlade?.id === glade.id }"
        @click="onSelectGladeSlot(idx)"
      >
        <span class="slot-name">{{ glade.name }}</span>
        <span class="slot-theme">{{ glade.theme }}</span>
        <span class="slot-action">Visit District</span>
      </button>
    </div>
  </div>

  <div v-if="currentMode === 'about'" class="about-overlay panel game-panel">
    <div class="about-content">
      <h2 style="font-size: 24px; margin-bottom: 24px; color: #f6e9ff; text-shadow: 0 0 10px rgba(193,133,255,0.7);">How Pips Connects to Agents</h2>
      <p>Pips serves as a visual 3D interface for your underlying AI processes and project management backends. Think of each <strong>"Pip"</strong> as a dedicated socket or API connection to an LLM running either locally or in the cloud.</p>
      <p>When you interact with a Pip, Pips takes your input and sends a payload to the backend server. The backend passes the project context and your prompt to the specialized LLM agent assigned to that Pip (like an Editor, or SysAdmin) for processing.</p>
      <p>The response is streamed back to the frontend and displayed as chat bubbles natively in the world. By distributing these agents into distinct <strong>"Glades"</strong>, Pips allows you to visually orchestrate and containerize the context of multiple agents operating simultaneously across your projects!</p>
      <button class="council-btn" style="margin-top: 32px;" @click="setMode('explore')">Return to Network</button>
    </div>
  </div>

  <NebulaIntro v-if="introVisible" @done="onIntroDone" />
</template>

<style scoped>
.about-overlay {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 90%;
  max-width: 650px;
  z-index: 50;
  padding: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  background: linear-gradient(180deg, rgba(25, 32, 46, 0.96), rgba(17, 23, 35, 0.98));
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8), inset 0 0 0 1px rgba(180, 210, 255, 0.15);
}
.about-content p {
  color: #d8c8e8;
  font-size: 16px;
  line-height: 1.6;
  margin-bottom: 16px;
}
.about-content strong {
  color: #f6e9ff;
}
</style>
