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

const buildTime = __BUILD_TIME__
const commitName = __COMMIT_NAME__

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
    <div class="build-info">
      BUILD: {{ buildTime }} | {{ commitName }}
    </div>
    <div ref="container" class="intro-canvas"></div>
    <div class="intro-overlay">
      <div class="intro-title-wrap">
        <div class="title-layers">
          <div class="title-layer layer-asian layer-3">グレイド・ネットワークへようこそ</div>
          <div class="title-layer layer-asian layer-2">グレイド・ネットワークへようこそ</div>
          <div class="title-layer layer-asian layer-1">グレイド・ネットワークへようこそ</div>
          <div class="title-layer layer-english">WELCOME TO THE GLADE NETWORK</div>
        </div>
      </div>
      <div class="intro-text">
        Welcome to Pips, your interactive portfolio and project management universe, visualized as a lush, 3D environment. Here, your real-world projects—like Ahoy Indie Media and The Film Project—are represented as dynamic island worlds called Glades. Each Glade is inhabited by AI agents, or "Pips," dedicated to specific roles within your teams. You can oversee operations, brainstorm with agents, and build out your team's infrastructure all in real-time. Step into the vortex and watch your projects come to life!
      </div>
      <button class="intro-skip" @click="finishIntro">Enter Network</button>
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

.build-info {
  position: fixed;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 8.5px;
  color: rgba(180, 160, 255, 0.4);
  font-family: 'JetBrains Mono', 'Courier New', monospace;
  letter-spacing: 1px;
  text-transform: uppercase;
  z-index: 1000;
  pointer-events: none;
  white-space: nowrap;
}

.intro-title-wrap {
  position: relative;
  display: flex;
  justify-content: center;
  margin-bottom: 48px;
  width: 100%;
}

.title-layers {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 160px;
}

.title-layer {
  text-transform: uppercase;
  font-style: italic;
  font-weight: 950;
  white-space: nowrap;
  line-height: 1;
  pointer-events: none;
}

.layer-english {
  position: relative;
  z-index: 40;
  font-size: clamp(72px, 9vw, 110px);
  color: #fff;
  -webkit-text-stroke: 3px #000;
  letter-spacing: -2px;
  text-shadow: 0 0 30px rgba(255, 255, 255, 0.3);
  transform: skewX(-10deg);
}

.layer-asian {
  position: absolute;
  font-size: clamp(80px, 12vw, 140px);
  opacity: 0.8;
  filter: blur(1px);
  transform: skewX(-10deg);
}

.layer-1 {
  z-index: 30;
  color: #ff0055;
  transform: skewX(-10deg) translate(8px, 8px);
}

.layer-2 {
  z-index: 20;
  color: #00f2ff;
  transform: skewX(-10deg) translate(-8px, -8px);
}

.layer-3 {
  z-index: 10;
  color: #7000ff;
  transform: skewX(-10deg) translate(0px, 0px);
  filter: blur(4px);
  opacity: 0.6;
}





.intro-text {
  font-size: 15px;
  color: #e0d5ff;
  max-width: 620px;
  text-align: center;
  line-height: 1.7;
  margin-bottom: 32px;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.9);
  pointer-events: auto;
  opacity: 0.9;
}

.intro-skip {
  pointer-events: auto;
  border: 1px solid rgba(250, 230, 255, 0.4);
  border-radius: 999px;
  background: rgba(40, 20, 70, 0.6);
  color: #f7ecff;
  padding: 10px 24px;
  cursor: pointer;
  font-family: inherit;
  font-weight: 600;
  transition: all 0.2s ease;
  backdrop-filter: blur(4px);
}

.intro-skip:hover {
  background: rgba(100, 40, 160, 0.8);
  border-color: #fff;
  transform: scale(1.05);
}

</style>
