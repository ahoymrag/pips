<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import * as THREE from 'three'

const emit = defineEmits(['done'])
const container = ref(null)

let renderer = null
let scene = null
let camera = null
let points = null
let animationId = null
let startMs = 0

const INTRO_MS = 5600

function finishIntro() {
  emit('done')
}

function animate(now) {
  animationId = requestAnimationFrame(animate)
  const elapsed = now - startMs
  const t = Math.min(1, elapsed / INTRO_MS)

  if (points) {
    points.rotation.z += 0.0009
    points.rotation.y += 0.00035
  }

  const speed = 0.16 + t * 1.55
  if (camera) {
    camera.position.z -= speed
    camera.fov = 65 + t * 24
    camera.updateProjectionMatrix()
  }

  if (renderer && scene && camera) renderer.render(scene, camera)
  if (t >= 1) finishIntro()
}

onMounted(() => {
  const w = window.innerWidth
  const h = window.innerHeight

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(w, h)
  container.value.appendChild(renderer.domElement)

  scene = new THREE.Scene()
  scene.fog = new THREE.FogExp2(0x090320, 0.035)

  camera = new THREE.PerspectiveCamera(65, w / h, 0.1, 900)
  camera.position.set(0, 0, 120)

  const starCount = 13000
  const positions = new Float32Array(starCount * 3)
  const colors = new Float32Array(starCount * 3)
  const colorA = new THREE.Color(0x6fd7ff)
  const colorB = new THREE.Color(0xdc7dff)
  const colorC = new THREE.Color(0xff9c9c)
  const mix = new THREE.Color()

  for (let i = 0; i < starCount; i++) {
    const i3 = i * 3
    const r = 30 + Math.random() * 220
    const a = Math.random() * Math.PI * 2
    const y = (Math.random() - 0.5) * 120
    positions[i3] = Math.cos(a) * r
    positions[i3 + 1] = y
    positions[i3 + 2] = Math.sin(a) * r - Math.random() * 380

    const pick = Math.random()
    if (pick < 0.35) mix.copy(colorA).lerp(colorB, Math.random())
    else if (pick < 0.7) mix.copy(colorB).lerp(colorC, Math.random())
    else mix.copy(colorC).lerp(colorA, Math.random())
    colors[i3] = mix.r
    colors[i3 + 1] = mix.g
    colors[i3 + 2] = mix.b
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  const mat = new THREE.PointsMaterial({
    size: 1.35,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
  })
  points = new THREE.Points(geo, mat)
  scene.add(points)

  startMs = performance.now()
  animate(startMs)
})

onUnmounted(() => {
  if (animationId) cancelAnimationFrame(animationId)
  if (renderer?.domElement?.parentNode === container.value) {
    container.value.removeChild(renderer.domElement)
  }
  renderer?.dispose()
})
</script>

<template>
  <div class="intro-wrap">
    <div ref="container" class="intro-canvas"></div>
    <div class="intro-overlay">
      <div class="intro-title">Entering The Glade Network</div>
      <button class="intro-skip" @click="finishIntro">Skip</button>
    </div>
  </div>
</template>

<style scoped>
.intro-wrap {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: radial-gradient(circle at center, #140836 0%, #060214 70%);
}

.intro-canvas {
  position: absolute;
  inset: 0;
}

.intro-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  padding-bottom: 36px;
  pointer-events: none;
}

.intro-title {
  font-size: 18px;
  color: #f6e9ff;
  text-shadow: 0 0 18px rgba(193, 133, 255, 0.7);
  margin-bottom: 12px;
}

.intro-skip {
  pointer-events: auto;
  border: 1px solid rgba(250, 230, 255, 0.4);
  border-radius: 999px;
  background: rgba(40, 20, 70, 0.6);
  color: #f7ecff;
  padding: 8px 16px;
  cursor: pointer;
  font-family: inherit;
}
</style>
