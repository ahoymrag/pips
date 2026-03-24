import { computed, ref, readonly } from 'vue'

const selectedPip = ref(null)
const pips = ref([])
const councilActive = ref(false)
const chatOpen = ref(false)
const currentMode = ref('explore')
const selectedTool = ref('nest')
const farmBlocks = ref([])
const farmStats = ref(makeEmptyFarmStats())
const farmSpawnNotice = ref('')
const activeGladeId = ref('glade-ahoy')
const playerPosition = ref({ x: 0, z: 0 })

let nextFarmPipId = 1000
const gladeSlots = ref(seedGlades())
const spawnTimersByGlade = ref(Object.fromEntries(gladeSlots.value.map((g) => [g.id, 45])))

const farmTools = [
  { key: '1', id: 'nest', label: 'Nest', color: '#d9b38c' },
  { key: '2', id: 'lantern', label: 'Lantern', color: '#ffd27f' },
  { key: '3', id: 'totem', label: 'Totem', color: '#c5b3e6' },
  { key: '4', id: 'archive', label: 'Archive', color: '#9fd3d8' },
  { key: '5', id: 'remove', label: 'Remove', color: '#e09494' },
]

const modeDefinitions = [
  { id: 'explore', key: 'F1', label: 'Explore' },
  { id: 'build', key: 'F2', label: 'Build' },
  { id: 'playful', key: 'F3', label: 'Playful' },
  { id: 'wizard', key: 'F4', label: 'Wizard' },
  { id: 'about', key: 'F5', label: 'About' },
]

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function findActiveGlade() {
  return gladeSlots.value.find((g) => g.id === activeGladeId.value) || null
}

function getGladeById(gladeId) {
  return gladeSlots.value.find((g) => g.id === gladeId) || null
}

function updateActiveFarmStats() {
  farmStats.value = recomputeFarmStatsForGlade(activeGladeId.value)
}

export function useScene() {
  const buildMode = computed(() => currentMode.value === 'build')
  const playfulMode = computed(() => currentMode.value === 'playful')
  const activeGlade = computed(() => findActiveGlade())
  const gladeSummaries = computed(() =>
    gladeSlots.value.map((g) => ({
      id: g.id,
      name: g.name,
      project: g.project,
      theme: g.theme,
      color: g.color,
      pips: pips.value.filter((p) => p.gladeId === g.id).length,
      farmBlocks: farmBlocks.value.filter((b) => b.gladeId === g.id).length,
      growthRate: recomputeFarmStatsForGlade(g.id).growthRate,
      nextSpawnIn: spawnTimersByGlade.value[g.id] ?? 45,
    }))
  )
  const totalPips = computed(() => pips.value.length)

  function selectGladeSlot(slotIdx) {
    const glade = gladeSlots.value[slotIdx]
    if (!glade) return null
    activeGladeId.value = glade.id
    updateActiveFarmStats()
    return glade
  }

  function setPlayerPosition(x, z) {
    playerPosition.value = { x, z }
  }

  function selectPip(pip) {
    selectedPip.value = pip
    chatOpen.value = false
  }

  function deselectPip() {
    selectedPip.value = null
    chatOpen.value = false
  }

  function triggerGathering() {
    councilActive.value = !councilActive.value
  }

  function setPips(newPips) {
    pips.value = clone(newPips)
  }

  function updatePipInList(updatedPip) {
    const idx = pips.value.findIndex((p) => p.id === updatedPip.id)
    if (idx !== -1) {
      pips.value[idx] = { ...pips.value[idx], ...updatedPip }
      if (selectedPip.value?.id === updatedPip.id) {
        selectedPip.value = pips.value[idx]
      }
    }
  }

  function openChat() {
    if (selectedPip.value) chatOpen.value = true
  }

  function closeChat() {
    chatOpen.value = false
  }

  function setMode(modeId) {
    const valid = modeDefinitions.some((m) => m.id === modeId)
    if (!valid) return false
    currentMode.value = modeId
    farmSpawnNotice.value = modeId === 'build'
      ? 'Build mode enabled'
      : modeId === 'playful'
        ? 'Playful mode enabled'
        : modeId === 'wizard'
        ? 'Wizard mode enabled'
        : modeId === 'about'
        ? 'About mode enabled'
        : 'Explore mode enabled'
    return true
  }

  function cycleMode() {
    const idx = modeDefinitions.findIndex((m) => m.id === currentMode.value)
    const next = modeDefinitions[(idx + 1) % modeDefinitions.length]
    setMode(next.id)
  }

  function toggleBuildMode() {
    if (currentMode.value === 'build') setMode('explore')
    else setMode('build')
  }

  function selectToolByKey(key) {
    const tool = farmTools.find((item) => item.key === key)
    if (!tool) return false
    selectedTool.value = tool.id
    return true
  }

  function recomputeFarmStats() {
    updateActiveFarmStats()
  }

  function placeFarmBlock(type, x, z) {
    const gridX = Math.round(x)
    const gridZ = Math.round(z)
    const exists = farmBlocks.value.find(
      (b) => b.gladeId === activeGladeId.value && b.x === gridX && b.z === gridZ
    )

    if (type === 'remove') {
      if (!exists) return false
      farmBlocks.value = farmBlocks.value.filter((b) => b.id !== exists.id)
      recomputeFarmStats()
      return true
    }

    if (exists) return false
    farmBlocks.value.push({
      id: `farm-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
      type,
      x: gridX,
      z: gridZ,
      gladeId: activeGladeId.value,
    })
    recomputeFarmStats()
    return true
  }

  function tickFarm(deltaSeconds) {
    for (const glade of gladeSlots.value) {
      const gladeStats = recomputeFarmStatsForGlade(glade.id)
      let timer = spawnTimersByGlade.value[glade.id] ?? 45
      if (gladeStats.capacity <= 0) {
        spawnTimersByGlade.value[glade.id] = 45
        continue
      }

      timer -= deltaSeconds * gladeStats.growthRate
      if (timer > 0) {
        spawnTimersByGlade.value[glade.id] = timer
        continue
      }

      const farmPips = pips.value.filter((p) => p.source === 'farm' && p.gladeId === glade.id)
      if (farmPips.length >= gladeStats.capacity) {
        spawnTimersByGlade.value[glade.id] = 20
        continue
      }

      const personalities = [
        { key: 'calm', score: gladeStats.calmBias + 1, text: 'Calm and gentle, loves tending the glade.' },
        { key: 'bold', score: gladeStats.boldBias + 1, text: 'Bold and adventurous, always seeks quests.' },
        { key: 'curious', score: gladeStats.curiousBias + 1, text: 'Curious and bright, fascinated by everyone.' },
      ]
      const total = personalities.reduce((sum, p) => sum + p.score, 0)
      let roll = Math.random() * total
      let chosen = personalities[0]
      for (const p of personalities) {
        roll -= p.score
        if (roll <= 0) {
          chosen = p
          break
        }
      }

      const names = ['Poppy', 'Milo', 'Nori', 'Luma', 'Kiko', 'Rin', 'Tavi', 'Mochi']
      const name = names[Math.floor(Math.random() * names.length)] + ` ${nextFarmPipId % 100}`
      pips.value.push({
        id: `farm-pip-${nextFarmPipId++}`,
        name,
        color: ['#f3a6a6', '#9bcaf7', '#a4dbad', '#e9cc8d'][Math.floor(Math.random() * 4)],
        personality: chosen.text,
        provider: 'glade',
        model: 'farmborn',
        status: 'idle',
        position_x: glade.center.x + (Math.random() - 0.5) * 8,
        position_z: glade.center.z + (Math.random() - 0.5) * 8,
        source: 'farm',
        gladeId: glade.id,
      })
      spawnTimersByGlade.value[glade.id] = 45
      if (glade.id === activeGladeId.value) {
        farmSpawnNotice.value = `New farm pip in ${glade.name}: ${name} (${chosen.key})`
      }
    }
    updateActiveFarmStats()
  }

  function spawnDynamicGlade(name, themeStr) {
    const gladeCount = gladeSlots.value.length
    const radius = 160 + (gladeCount * 10)
    const angle = gladeCount * 1.3
    const x = Math.round(Math.cos(angle) * radius)
    const z = Math.round(Math.sin(angle) * radius)
    
    const colors = {
      'Cyber Land': '#63cdda',
      'Media Land': '#f8a5c2',
      'Cinema Land': '#f5cd79',
      'Magic Land': '#d2b4de',
      'Default': '#a8db92'
    }
    const color = colors[themeStr] || colors['Default']
    
    const newId = 'glade-dyn-' + Date.now()
    const newGlade = createGlade(newId, name || 'New Project', 'custom', themeStr || 'Default', color, { x, z }, [
       makePip('Planner', '#ffffff', x - 2, z - 2, 'Eager to organize.', newId),
    ])
    
    gladeSlots.value.push(newGlade)
    pips.value.push(...clone(newGlade.pips))
    spawnTimersByGlade.value[newId] = 45
    activeGladeId.value = newId
    updateActiveFarmStats()
    setMode('explore')
    return newGlade
  }

  return {
    selectedPip: readonly(selectedPip),
    pips,
    councilActive,
    chatOpen,
    currentMode,
    modeDefinitions,
    buildMode,
    playfulMode,
    selectedTool,
    farmTools,
    farmBlocks,
    farmStats,
    farmSpawnNotice,
    activeGladeId,
    activeGlade,
    gladeSlots,
    gladeSummaries,
    totalPips,
    playerPosition,
    selectGladeSlot,
    setPlayerPosition,
    selectPip,
    deselectPip,
    triggerGathering,
    setPips,
    updatePipInList,
    openChat,
    closeChat,
    setMode,
    cycleMode,
    toggleBuildMode,
    selectToolByKey,
    placeFarmBlock,
    tickFarm,
    spawnDynamicGlade,
  }
}

function seedGlades() {
  return [
    createGlade('glade-ahoy', 'Ahoy Glade', 'ahoy', 'Flower Land', '#f2b7cf', { x: -60, z: -40 }, [
      makePip('Sprig', '#f08aac', -66, -42, 'Cheerful and collaborative.', 'glade-ahoy'),
      makePip('Lily', '#86dca3', -58, -35, 'Organized and supportive.', 'glade-ahoy'),
    ]),
    createGlade('glade-forge', 'Forge Glade', 'infra', 'Lava Land', '#ef9a6f', { x: 60, z: -40 }, [
      makePip('Cinder', '#f0805f', 56, -38, 'Fast, bold, and practical.', 'glade-forge'),
      makePip('Basalt', '#7a6262', 64, -44, 'Steady and defensive.', 'glade-forge'),
    ]),
    createGlade('glade-amber', 'Amber Glade', 'design', 'Autumn Land', '#e0b26f', { x: -60, z: 40 }, [
      makePip('Maple', '#d38b4d', -66, 36, 'Reflective and balanced.', 'glade-amber'),
      makePip('Acorn', '#ba8b62', -56, 45, 'Patient and detail-oriented.', 'glade-amber'),
    ]),
    createGlade('glade-dusk', 'Dusk Glade', 'product', 'Sunset Land', '#c9a0ff', { x: 60, z: 40 }, [
      makePip('Nova', '#d58cff', 56, 44, 'Visionary and strategic.', 'glade-dusk'),
      makePip('Ray', '#ffb88f', 64, 37, 'Warm communicator and planner.', 'glade-dusk'),
    ]),
    createGlade('glade-frost', 'Frost Glade', 'research', 'Mist Land', '#9ec9ef', { x: 0, z: -70 }, [
      makePip('Drift', '#8abbe8', -4, -74, 'Analytical and curious.', 'glade-frost'),
      makePip('Halo', '#b0d8ff', 4, -66, 'Calm and evidence-driven.', 'glade-frost'),
    ]),
    createGlade('glade-wild', 'Wildcard Glade', 'experiments', 'Meadow Land', '#a8db92', { x: 0, z: 70 }, [
      makePip('Moss', '#84c677', 2, 68, 'Playful and experimental.', 'glade-wild'),
    ]),
    createGlade('glade-ahoy-media', 'Ahoy Indie Media', 'ahoy-media', 'Media Land', '#f8a5c2', { x: -120, z: 0 }, [
      makePip('Director', '#f78fb3', -122, -2, 'Creative and visionary.', 'glade-ahoy-media'),
      makePip('Editor', '#e77f98', -118, 5, 'Detail-oriented and focused.', 'glade-ahoy-media'),
    ]),
    createGlade('glade-cpc', 'CPC Web Admin', 'cpc', 'Cyber Land', '#63cdda', { x: 120, z: 0 }, [
      makePip('SysAdmin', '#3dc1d3', 118, 3, 'Vigilant and precise.', 'glade-cpc'),
      makePip('Dev', '#1e90ff', 123, -5, 'Logical and efficient.', 'glade-cpc'),
    ]),
    createGlade('glade-film', 'The Film Project', 'film', 'Cinema Land', '#f5cd79', { x: 0, z: 120 }, [
      makePip('Writer', '#f19066', -3, 118, 'Imaginative and poetic.', 'glade-film'),
      makePip('Producer', '#c44569', 4, 122, 'Driven and practical.', 'glade-film'),
    ]),
  ]
}

function createGlade(id, name, project, theme, color, center, gladePips) {
  return {
    id,
    name,
    project,
    theme,
    color,
    center,
    zone: {
      minX: center.x - 8,
      maxX: center.x + 8,
      minZ: center.z - 8,
      maxZ: center.z + 8,
    },
    pips: gladePips,
  }
}

function makePip(name, color, x, z, personality, gladeId) {
  return {
    id: `pip-${name.toLowerCase()}-${Math.random().toString(16).slice(2, 6)}`,
    name,
    color,
    personality,
    provider: 'glade',
    model: 'native',
    status: 'idle',
    position_x: x,
    position_z: z,
    gladeId,
  }
}

function makeEmptyFarmStats() {
  return {
    capacity: 0,
    growthRate: 1.0,
    calmBias: 0,
    boldBias: 0,
    curiousBias: 0,
    nextSpawnIn: 45,
  }
}

function recomputeFarmStatsForGlade(gladeId) {
  const stats = makeEmptyFarmStats()
  for (const block of farmBlocks.value) {
    if (block.gladeId !== gladeId) continue
    if (block.type === 'nest') stats.capacity += 1
    if (block.type === 'lantern') stats.growthRate += 0.25
    if (block.type === 'totem') {
      stats.boldBias += 1
      stats.curiousBias += 1
    }
    if (block.type === 'archive') stats.calmBias += 2
  }
  stats.nextSpawnIn = spawnTimersByGlade.value[gladeId] ?? 45
  return stats
}

pips.value = gladeSlots.value.flatMap((g) => clone(g.pips))
updateActiveFarmStats()
