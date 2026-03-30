<script setup>
import { ref, onMounted, nextTick, watch } from 'vue'
import { useScene } from '../composables/useScene.js'

const { 
  terminalOpen, 
  toggleTerminal, 
  activeGlade, 
  pips, 
  gladeSlots,
  selectGladeSlot,
  spawnDynamicGlade,
  removePip,
  placeFarmBlock,
  createPip
} = useScene()

const userInput = ref('')
const terminalHistory = ref([
  { type: 'system', content: 'PIPS OS v1.0.4 - Initializing...' },
  { type: 'system', content: 'Connection established to The Glade Collective.' },
  { type: 'system', content: 'Type "help" for a list of commands.' },
])

const inputRef = ref(null)
const historyRef = ref(null)

function focusInput() {
  inputRef.value?.focus()
}

watch(terminalOpen, (isOpen) => {
  if (isOpen) {
    nextTick(() => focusInput())
  }
})

const scrollToBottom = () => {
  nextTick(() => {
    if (historyRef.value) {
      historyRef.value.scrollTop = historyRef.value.scrollHeight
    }
  })
}

async function handleCommand() {
  const fullCmd = userInput.value.trim()
  if (!fullCmd) return
  
  terminalHistory.value.push({ type: 'user', content: fullCmd })
  const [cmd, ...args] = fullCmd.split(' ')
  userInput.value = ''

  switch (cmd.toLowerCase()) {
    case 'help':
      terminalHistory.value.push({ type: 'system', content: 'Available commands:' })
      terminalHistory.value.push({ type: 'system', content: '  ls                 - List pips in active glade' })
      terminalHistory.value.push({ type: 'system', content: '  cd [index]         - Select glade by index (1-8)' })
      terminalHistory.value.push({ type: 'system', content: '  pip [name] [color] - Create a new pip here' })
      terminalHistory.value.push({ type: 'system', content: '  rm [pip_id]        - Remove a pip by ID' })
      terminalHistory.value.push({ type: 'system', content: '  glade [name] [theme] - Create a new dynamic glade' })
      terminalHistory.value.push({ type: 'system', content: '  build [type] [x] [z] - Place a farm block' })
      terminalHistory.value.push({ type: 'system', content: '  tp [x] [z]         - Teleport to world coordinates' })
      terminalHistory.value.push({ type: 'system', content: '  whoami             - Show current session info' })
      terminalHistory.value.push({ type: 'system', content: '  claude [prompt]    - Ask The Architect to modify the world' })
      terminalHistory.value.push({ type: 'system', content: '  clear              - Clear terminal history' })
      terminalHistory.value.push({ type: 'system', content: '  exit               - Close terminal' })
      break

    case 'ls':
      const localPips = pips.value.filter(p => p.gladeId === activeGlade.value?.id)
      terminalHistory.value.push({ type: 'system', content: `Pips in ${activeGlade.value?.name || 'Unknown'}:` })
      if (localPips.length === 0) {
        terminalHistory.value.push({ type: 'system', content: '  (No pips found)' })
      } else {
        localPips.forEach(p => {
          terminalHistory.value.push({ type: 'system', content: `  > ${p.name} [${p.id}] (${p.model})` })
        })
      }
      break

    case 'cd':
      const idx = parseInt(args[0]) - 1
      if (!isNaN(idx) && gladeSlots.value[idx]) {
        selectGladeSlot(idx)
        terminalHistory.value.push({ type: 'system', content: `Navigated to ${gladeSlots.value[idx].name}.` })
      } else {
        terminalHistory.value.push({ type: 'error', content: 'Invalid glade index.' })
      }
      break

    case 'pip':
      const name = args[0] || 'Nomad'
      const color = args[1] || '#ffffff'
      if (activeGlade.value) {
        createPip(
          name, 
          color, 
          activeGlade.value.center.x + (Math.random() - 0.5) * 4, 
          activeGlade.value.center.z + (Math.random() - 0.5) * 4, 
          'Born from the command line.', 
          activeGlade.value.id,
          'glade',
          'terminal-born'
        )
        terminalHistory.value.push({ type: 'system', content: `Spawned pip "${name}" in ${activeGlade.value.name}.` })
      }
      break

    case 'rm':
      const id = args[0]
      if (removePip(id)) {
        terminalHistory.value.push({ type: 'system', content: `Pip ${id} removed successfully.` })
      } else {
        terminalHistory.value.push({ type: 'error', content: `Pip ${id} not found.` })
      }
      break

    case 'glade':
      const gName = args[0] || 'New Sector'
      const gTheme = args[1] || 'Default'
      const newGlade = spawnDynamicGlade(gName, gTheme)
      terminalHistory.value.push({ type: 'system', content: `Dynamic glade "${gName}" initialized at center spatial coordinates.` })
      break

    case 'build':
      const bType = args[0]
      const bX = parseFloat(args[1]) || (activeGlade.value?.center.x || 0)
      const bZ = parseFloat(args[2]) || (activeGlade.value?.center.z || 0)
      if (placeFarmBlock(bType, bX, bZ)) {
        terminalHistory.value.push({ type: 'system', content: `Placed ${bType} at (${bX.toFixed(1)}, ${bZ.toFixed(1)}).` })
      } else {
        terminalHistory.value.push({ type: 'error', content: `Failed to place ${bType}. Check if position is within glade zone.` })
      }
      break

    case 'teleport':
    case 'tp':
      const tx = parseFloat(args[0])
      const tz = parseFloat(args[1])
      if (!isNaN(tx) && !isNaN(tz)) {
        import('../three/camera.js').then(m => {
          m.teleportNearTarget(tx, tz)
          terminalHistory.value.push({ type: 'system', content: `Teleported to sequence coordinates (${tx}, ${tz}).` })
        })
      } else {
        terminalHistory.value.push({ type: 'error', content: 'Usage: tp [x] [z]' })
      }
      break

    case 'clear':
      terminalHistory.value = [{ type: 'system', content: 'Terminal history cleared.' }]
      break

    case 'whoami':
      terminalHistory.value.push({ type: 'system', content: 'USER: Architect_01' })
      terminalHistory.value.push({ type: 'system', content: 'PRIVILEGE: ROOT' })
      terminalHistory.value.push({ type: 'system', content: `LOCATION: ${activeGlade.value?.id || 'Unknown'}` })
      break

    case 'exit':
      toggleTerminal()
      break

    case 'claude':
      const prompt = args.join(' ')
      if (!prompt) {
        terminalHistory.value.push({ type: 'error', content: 'No prompt provided for Claude.' })
        break
      }
      terminalHistory.value.push({ type: 'system', content: '>>> Pinging The Glade Architect...' })
      await callClaude(prompt)
      break

    default:
      terminalHistory.value.push({ type: 'error', content: `Command not found: ${cmd}` })
  }
  
  scrollToBottom()
}

async function callClaude(prompt) {
  try {
    const response = await fetch('http://localhost:8000/api/agents/terminal-agent/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: prompt })
    })
    
    if (!response.ok) {
       // Fallback for demo if backend isn't ready
       setTimeout(() => {
          terminalHistory.value.push({ type: 'assistant', content: 'I am simulating a world change. I see you want to modify The Glade. I have spawned a special "AI Observation Pip" for you.' })
          const aiPip = {
            id: `pip-ai-${Date.now()}`,
            name: 'Claude Shadow',
            color: '#d185ff',
            personality: 'A fragment of Claude in the world.',
            provider: 'anthropic',
            model: 'claude-3-opus',
            status: 'idle',
            position_x: activeGlade.value?.center.x || 0,
            position_z: activeGlade.value?.center.z || 0,
            gladeId: activeGlade.value?.id || 'glade-wild',
          }
          pips.value.push(aiPip)
          scrollToBottom()
       }, 1000)
       return
    }

    const data = await response.json()
    terminalHistory.value.push({ type: 'assistant', content: data.content })
    
    // Check if Claude returned structured commands (hypothetical)
    if (data.content.includes('```json')) {
       // logic to parse and execute commands
    }
  } catch (err) {
    terminalHistory.value.push({ type: 'error', content: 'Network error or backend unreachable. Using local simulation mode.' })
    // Simulate
    setTimeout(() => {
       terminalHistory.value.push({ type: 'assistant', content: 'Claude Local: "I have acknowledged your command. The world is yours to shape."' })
       scrollToBottom()
    }, 800)
  }
}
</script>

<template>
  <div 
    v-if="terminalOpen" 
    class="terminal-overlay"
    @click.self="toggleTerminal"
  >
    <div class="terminal-container" @click.stop>
      <div class="terminal-header" @mousedown="$emit('drag-start')">
        <div class="header-led"></div>
        <div class="header-title">PIPS_TERMINAL_ROOT@THE_GLADE</div>
        <div class="header-controls">
          <button @click="toggleTerminal">_</button>
          <button @click="terminalHistory = []">□</button>
          <button class="close" @click="toggleTerminal">×</button>
        </div>
      </div>
      
      <div class="terminal-history" ref="historyRef">
        <div 
          v-for="(msg, idx) in terminalHistory" 
          :key="idx" 
          class="line"
          :class="msg.type"
        >
          <span v-if="msg.type === 'user'" class="prompt">$</span>
          <span v-if="msg.type === 'system'" class="prompt">#</span>
          <span v-if="msg.type === 'assistant'" class="prompt">CLAUDE></span>
          <span v-if="msg.type === 'error'" class="prompt">ERR!</span>
          <span class="content" v-html="msg.content"></span>
        </div>
      </div>
      
      <div class="terminal-input-row" @click="focusInput">
        <span class="prompt-arrow">></span>
        <input 
          ref="inputRef"
          v-model="userInput" 
          type="text" 
          spellcheck="false"
          autofocus
          @keydown.enter="handleCommand"
          @keydown.esc="toggleTerminal"
        />
        <div class="cursor-block"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.terminal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.terminal-container {
  width: 900px;
  height: 600px;
  background: #0d1117;
  border: 1px solid #30363d;
  box-shadow: 0 20px 60px rgba(0,0,0,0.8), 0 0 40px rgba(133, 224, 255, 0.1);
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  font-family: 'Fira Code', 'Courier New', Courier, monospace;
}

.terminal-header {
  background: #161b22;
  border-bottom: 1px solid #30363d;
  height: 32px;
  display: flex;
  align-items: center;
  padding: 0 12px;
  gap: 12px;
}

.header-led {
  width: 8px;
  height: 8px;
  background: #238636;
  border-radius: 50%;
  box-shadow: 0 0 6px #238636;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}

.header-title {
  color: #8b949e;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
  flex: 1;
}

.header-controls {
  display: flex;
  gap: 8px;
}

.header-controls button {
  background: none;
  border: none;
  color: #484f58;
  font-size: 14px;
  cursor: pointer;
  padding: 0 4px;
}

.header-controls button:hover {
  color: #c9d1d9;
}

.header-controls button.close:hover {
  color: #f85149;
}

.terminal-history {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  scrollbar-width: thin;
  scrollbar-color: #30363d transparent;
}

.line {
  line-height: 1.5;
  font-size: 14px;
  word-break: break-all;
}

.user { color: #85e0ff; }
.system { color: #8b949e; }
.assistant { color: #d2a8ff; }
.error { color: #f85149; }

.prompt {
  margin-right: 8px;
  opacity: 0.7;
  font-weight: bold;
}

.terminal-input-row {
  background: #0d1117;
  border-top: 1px solid #30363d;
  height: 48px;
  display: flex;
  align-items: center;
  padding: 0 16px;
  gap: 12px;
}

.prompt-arrow {
  color: #238636;
  font-weight: bold;
}

.terminal-input-row input {
  background: none;
  border: none;
  color: #c9d1d9;
  flex: 1;
  font-family: inherit;
  font-size: 14px;
  outline: none;
}

.cursor-block {
  width: 8px;
  height: 18px;
  background: #238636;
  animation: blink 1s step-end infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

/* Custom Scrollbar */
::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-thumb {
  background: #30363d;
  border-radius: 3px;
}
</style>
