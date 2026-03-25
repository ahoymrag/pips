<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as THREE from 'three'
import { createTerrain } from '../three/terrain.js'
import { createCamera, updateCamera, resizeCamera, cleanupCamera, getCamera, getIsLocked } from '../three/camera.js'
import { createPipMeshes, syncPipMeshes, updatePipAnimations, updatePipEyeTracking, getPipMeshMap } from '../three/pips.js'
import { pickPip } from '../three/picking.js'
import { updateGathering, isGathering } from '../three/gathering.js'
import { useScene } from '../composables/useScene.js'

const container = ref(null)
const {
  pips,
  selectPip,
  buildMode,
  currentMode,
  activeGlade,
  gladeSlots,
  selectedTool,
  farmBlocks,
  placeFarmBlock,
  tickFarm,
  setPlayerPosition,
  fairies,
  capturedFairies,
  pokeballs,
  spawnFairy,
  captureFairy,
  inventory,
  selectedSlot,
  equipHat,
} = useScene()

let renderer = null
let scene = null
let camera = null
let clock = null
let animationId = null
const raycaster = new THREE.Raycaster()
const pointer = new THREE.Vector2()
const farmBlockMeshes = new Map()
const farmZoneMeshes = new Map()
const signpostMeshes = []
let companionMesh = null
const fairyMeshes = new Map()
const pokeballsInFlight = []

function isInActiveFarmZone(x, z) {
  const zone = activeGlade.value?.zone
  if (!zone) return false
  return x >= zone.minX && x <= zone.maxX && z >= zone.minZ && z <= zone.maxZ
}

function screenPointer(event, locked) {
  if (locked) {
    pointer.set(0, 0)
    return
  }
  const rect = renderer.domElement.getBoundingClientRect()
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
}

function getGroundPoint(event, locked) {
  if (!camera || !renderer) return null
  screenPointer(event, locked)
  raycaster.setFromCamera(pointer, camera)
  const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
  const hit = new THREE.Vector3()
  return raycaster.ray.intersectPlane(ground, hit) ? hit : null
}

function syncFarmBlockMeshes() {
  if (!scene) return
  const seen = new Set(farmBlocks.value.map((b) => b.id))

  for (const [id, mesh] of farmBlockMeshes) {
    if (!seen.has(id)) {
      scene.remove(mesh)
      farmBlockMeshes.delete(id)
    }
  }

  for (const block of farmBlocks.value) {
    if (farmBlockMeshes.has(block.id)) continue
    const mesh = createFarmBlockMesh(block)
    scene.add(mesh)
    farmBlockMeshes.set(block.id, mesh)
  }
}

function createFarmBlockMesh(block) {
  let geo = new THREE.BoxGeometry(1, 0.7, 1)
  let color = 0xd9b38c
  if (block.type === 'lantern') {
    geo = new THREE.BoxGeometry(0.6, 1.2, 0.6)
    color = 0xffd27f
  } else if (block.type === 'totem') {
    geo = new THREE.BoxGeometry(0.9, 1.5, 0.9)
    color = 0xc5b3e6
  } else if (block.type === 'archive') {
    geo = new THREE.BoxGeometry(1.2, 0.9, 1.2)
    color = 0x9fd3d8
  }
  const mat = new THREE.MeshLambertMaterial({ color, emissive: color, emissiveIntensity: 0.08 })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.set(block.x, geo.parameters.height / 2, block.z)
  return mesh
}

function updateCompanion(elapsed) {
  if (!companionMesh || !camera) return
  const forward = new THREE.Vector3()
  camera.getWorldDirection(forward)
  forward.y = 0
  forward.normalize()
  const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize()
  const target = new THREE.Vector3()
    .copy(camera.position)
    .addScaledVector(forward, -1.6)
    .addScaledVector(right, 0.75)
  companionMesh.position.x += (target.x - companionMesh.position.x) * 0.12
  companionMesh.position.z += (target.z - companionMesh.position.z) * 0.12
  companionMesh.position.y = 0.48 + Math.sin(elapsed * 3.2) * 0.05
}

function updateFairies(delta, elapsed) {
  if (!scene) return
  
  // Sync fairy meshes (cleanup removed ones)
  const currentFairyIds = new Set(fairies.value.map(f => f.id))
  for (const [id, mesh] of fairyMeshes) {
    if (!currentFairyIds.has(id)) {
      scene.remove(mesh)
      fairyMeshes.delete(id)
    }
  }

  // Update/Create
  fairies.value.forEach(fairy => {
    let mesh = fairyMeshes.get(fairy.id)
    if (!mesh) {
       const group = new THREE.Group()
       const core = new THREE.Mesh(
          new THREE.SphereGeometry(0.12, 8, 8),
          new THREE.MeshLambertMaterial({ color: fairy.color, emissive: fairy.color, emissiveIntensity: 1 })
       )
       group.add(core)
       
       const glow = new THREE.Mesh(
          new THREE.SphereGeometry(0.3, 8, 8),
          new THREE.MeshLambertMaterial({ color: fairy.color, transparent: true, opacity: 0.35 })
       )
       group.add(glow)
       
       mesh = group
       scene.add(mesh)
       fairyMeshes.set(fairy.id, mesh)
    }
    
    // Smooth movement
    const targetX = fairy.x + Math.sin(elapsed * 0.5 + fairy.speed * 10) * 8
    const targetZ = fairy.z + Math.cos(elapsed * 0.4 + fairy.speed * 10) * 8
    
    mesh.position.x += (targetX - mesh.position.x) * 0.05
    mesh.position.z += (targetZ - mesh.position.z) * 0.05
    mesh.position.y = fairy.y + Math.sin(elapsed * 2 + fairy.speed) * 0.5
    
    // Rotate glow
    mesh.children[1].scale.setScalar(1 + Math.sin(elapsed * 4) * 0.2)
  })
}

function createCaptureEffect(pos, color) {
  const group = new THREE.Group()
  for (let i = 0; i < 8; i++) {
    const p = new THREE.Mesh(
      new THREE.SphereGeometry(0.05),
      new THREE.MeshBasicMaterial({ color })
    )
    const angle = (i / 8) * Math.PI * 2
    p.userData.vel = new THREE.Vector3(Math.cos(angle), Math.sin(i), Math.sin(angle)).multiplyScalar(0.1)
    group.add(p)
  }
  group.position.copy(pos)
  scene.add(group)
  
  const startTime = clock.getElapsedTime()
  const duration = 0.8
  
  const tick = () => {
    const age = clock.getElapsedTime() - startTime
    if (age > duration) {
      scene.remove(group)
      return
    }
    group.children.forEach(p => {
      p.position.add(p.userData.vel)
      p.scale.multiplyScalar(0.95)
    })
    requestAnimationFrame(tick)
  }
  tick()
}

function throwPokeball(event) {
  if (!camera || !scene) return
  
  const ball = new THREE.Group()
  const top = new THREE.Mesh(
    new THREE.SphereGeometry(0.15, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshLambertMaterial({ color: 0xff3333 })
  )
  const bottom = new THREE.Mesh(
    new THREE.SphereGeometry(0.15, 12, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
    new THREE.MeshLambertMaterial({ color: 0xffffff })
  )
  ball.add(top)
  ball.add(bottom)
  
  const dir = new THREE.Vector3()
  camera.getWorldDirection(dir)
  
  ball.position.copy(camera.position).addScaledVector(dir, 1)
  scene.add(ball)
  
  const velocity = dir.clone().multiplyScalar(15)
  pokeballsInFlight.push({ mesh: ball, velocity, life: 3 })
}

function updatePokeballs(delta) {
  for (let i = pokeballsInFlight.length - 1; i >= 0; i--) {
    const ball = pokeballsInFlight[i]
    ball.mesh.position.addScaledVector(ball.velocity, delta)
    ball.velocity.y -= 9.8 * delta // Gravity
    ball.life -= delta
    
    if (ball.mesh.position.y < 0) {
       ball.mesh.position.y = 0
       ball.velocity.y *= -0.5 // Bounce
    }
    
    // Check collisions with fairies
    fairies.value.forEach(fairy => {
      const fMesh = fairyMeshes.get(fairy.id)
      if (fMesh && ball.mesh.position.distanceTo(fMesh.position) < 1.2) {
         createCaptureEffect(fMesh.position, fairy.color)
         if (captureFairy(fairy.id)) {
            // captureFairy handles state removal, which updateFairies will cleanup
            ball.life = -1 // Remove ball
         }
      }
    })
    
    if (ball.life <= 0) {
      scene.remove(ball.mesh)
      pokeballsInFlight.splice(i, 1)
    }
  }
}

function createSignpost(glade) {
  const group = new THREE.Group()
  const post = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 2.0, 0.24),
    new THREE.MeshLambertMaterial({ color: 0x8f6b44 })
  )
  post.position.y = 1
  group.add(post)

  const labelCanvas = document.createElement('canvas')
  labelCanvas.width = 512
  labelCanvas.height = 128
  const ctx = labelCanvas.getContext('2d')
  ctx.fillStyle = 'rgba(255, 247, 232, 0.92)'
  ctx.fillRect(0, 0, 512, 128)
  ctx.strokeStyle = 'rgba(92, 74, 60, 0.9)'
  ctx.lineWidth = 6
  ctx.strokeRect(3, 3, 506, 122)
  ctx.fillStyle = '#5a463a'
  ctx.font = 'bold 40px sans-serif'
  ctx.fillText(glade.name, 22, 52)
  ctx.font = '26px sans-serif'
  ctx.fillText(`${glade.theme} · ${glade.project}`, 22, 96)

  const tex = new THREE.CanvasTexture(labelCanvas)
  const board = new THREE.Mesh(
    new THREE.PlaneGeometry(4.2, 1.1),
    new THREE.MeshLambertMaterial({ map: tex, transparent: true })
  )
  board.position.set(0, 2.2, 0)
  group.add(board)

  group.position.set(glade.center.x, 0, glade.center.z - 10.5)
  group.userData.gladeId = glade.id
  return group
}

function onCanvasClick(event) {
  const locked = getIsLocked()
  const cam = getCamera()
  const meshMap = getPipMeshMap()
  if (!cam || !renderer) return

  if (buildMode.value) {
    const hit = getGroundPoint(event, locked)
    if (hit && isInActiveFarmZone(hit.x, hit.z)) {
      placeFarmBlock(selectedTool.value, hit.x, hit.z)
      return
    }
  }

  // Right click or special key for pokeball? 
  // Let's use left click if shift is held, or maybe just left click for pokeball in playful mode
  if (currentMode.value === 'playful') {
    throwPokeball(event)
    return
  }

  const pipId = pickPip(event, cam, meshMap, renderer, locked)
  if (pipId !== null) {
    const pip = pips.value.find((p) => p.id === pipId)
    if (pip) {
      // If we have a hat selected, apply it instead of selecting
      const currentItem = inventory.value[selectedSlot.value]
      if (currentItem && currentItem.type === 'hat') {
        equipHat(pip.id, currentItem)
        return
      }
      selectPip(pip)
    }
  }
}

function onResize() {
  if (!renderer || !container.value) return
  const w = window.innerWidth
  const h = window.innerHeight
  renderer.setSize(w, h)
  resizeCamera(w, h)
}

function animate() {
  animationId = requestAnimationFrame(animate)

  const delta = clock.getDelta()
  const elapsed = clock.getElapsedTime()

  updateCamera(delta, { mode: currentMode.value })
  updatePipAnimations(elapsed)
  updatePipEyeTracking(camera)

  if (isGathering.value) {
    updateGathering(delta, getPipMeshMap())
  }
  tickFarm(delta)
  updateCompanion(elapsed)
  updateFairies(delta, elapsed)
  updatePokeballs(delta)
  
  if (fairies.value.length < 5 && Math.random() < 0.01) {
    spawnFairy()
  }
  if (camera) {
    setPlayerPosition(camera.position.x, camera.position.z)
  }

  renderer.render(scene, camera)
}

onMounted(() => {
  // Renderer - soft anime tone mapping
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.1
  renderer.outputColorSpace = THREE.SRGBColorSpace
  container.value.appendChild(renderer.domElement)

  // Scene
  scene = new THREE.Scene()
  createTerrain(scene)

  // Farm zone markers for all glade districts
  for (const glade of gladeSlots.value) {
    const zone = glade.zone
    const zoneGeo = new THREE.PlaneGeometry(
      zone.maxX - zone.minX + 1,
      zone.maxZ - zone.minZ + 1
    )
    const zoneMat = new THREE.MeshLambertMaterial({
      color: new THREE.Color(glade.color),
      transparent: true,
      opacity: 0.16,
    })
    const zoneMesh = new THREE.Mesh(zoneGeo, zoneMat)
    zoneMesh.rotation.x = -Math.PI / 2
    zoneMesh.position.set(
      (zone.minX + zone.maxX) / 2,
      0.02,
      (zone.minZ + zone.maxZ) / 2
    )
    scene.add(zoneMesh)
    farmZoneMeshes.set(glade.id, zoneMesh)

    const signpost = createSignpost(glade)
    scene.add(signpost)
    signpostMeshes.push(signpost)
  }

  // Camera
  camera = createCamera(renderer, renderer.domElement)

  // Clock
  clock = new THREE.Clock()

  // Create pip meshes from current state
  if (pips.value.length > 0) {
    createPipMeshes(pips.value, scene)
  }

  // Tiny companion pip (player proxy for cozy world presence)
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.42, 0.42),
    new THREE.MeshLambertMaterial({ color: 0xf9d39d, emissive: 0xa06c5a, emissiveIntensity: 0.08 })
  )
  companionMesh = new THREE.Group()
  companionMesh.add(body)
  const eye = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.06, 0.04),
    new THREE.MeshLambertMaterial({ color: 0x222233 })
  )
  eye.position.set(0.08, 0.03, 0.22)
  companionMesh.add(eye)
  const eye2 = eye.clone()
  eye2.position.x = -0.08
  companionMesh.add(eye2)
  companionMesh.position.set(13.5, 0.48, 13.5)
  scene.add(companionMesh)

  // Start loop
  animate()

  // Resize handler
  window.addEventListener('resize', onResize)
})

watch(
  () => pips.value,
  (newPips) => {
    if (scene && newPips) {
      syncPipMeshes(newPips, scene)
    }
  },
  { deep: true }
)

watch(
  () => farmBlocks.value,
  () => {
    syncFarmBlockMeshes()
  },
  { deep: true }
)

watch(
  () => activeGlade.value?.id,
  () => {
    for (const glade of gladeSlots.value) {
      const mesh = farmZoneMeshes.get(glade.id)
      if (mesh) {
        mesh.material.opacity = activeGlade.value?.id === glade.id ? 0.28 : 0.12
      }
    }
    for (const sign of signpostMeshes) {
      sign.visible = true
      sign.children.forEach((child) => {
        if (child.material) {
          child.material.opacity = sign.userData.gladeId === activeGlade.value?.id ? 1 : 0.72
          child.material.transparent = true
        }
      })
    }
  }
)

onUnmounted(() => {
  if (animationId) cancelAnimationFrame(animationId)
  cleanupCamera()
  window.removeEventListener('resize', onResize)
  if (renderer) {
    renderer.dispose()
    if (container.value && renderer.domElement.parentNode === container.value) {
      container.value.removeChild(renderer.domElement)
    }
  }
})
</script>

<template>
  <div ref="container" class="glade-canvas" @click="onCanvasClick"></div>
</template>

<style scoped>
.glade-canvas {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 0;
}
</style>
