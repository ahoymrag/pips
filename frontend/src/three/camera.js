import * as THREE from 'three'

let camera = null
let domEl = null

const velocity = new THREE.Vector3()
const direction = new THREE.Vector3()
const euler = new THREE.Euler(0, 0, 0, 'YXZ')
const WORLD_UP = new THREE.Vector3(0, 1, 0)

const BASE_FOV = 78
const SPRINT_FOV = 86
const EYE_HEIGHT = 1.65

const keys = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  shift: false,
  up: false,
  down: false,
}

let isLocked = false
let lookDragActive = false
let yaw = 0
let pitch = 0
let moveTime = 0

export function createCamera(renderer, domElement) {
  camera = new THREE.PerspectiveCamera(
    BASE_FOV,
    window.innerWidth / window.innerHeight,
    0.1,
    200
  )
  camera.position.set(15, EYE_HEIGHT, 15)
  yaw = -Math.PI * 0.75
  pitch = -0.12
  camera.quaternion.setFromEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ'))

  domEl = domElement

  // Always-visible cursor mode: hold right mouse to look
  domElement.addEventListener('contextmenu', onContextMenu)
  domElement.addEventListener('mousedown', onMouseDown)
  document.addEventListener('mouseup', onMouseUp)

  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('keydown', onKeyDown)
  document.addEventListener('keyup', onKeyUp)

  return camera
}

export function getCamera() {
  return camera
}

export function getIsLocked() {
  return isLocked
}

export function requestCursorLock() {
  // No-op in always-visible cursor mode.
}

export function teleportNearTarget(x, z, targetY = EYE_HEIGHT) {
  if (!camera) return
  camera.position.set(x + 1.8, targetY, z + 1.8)
  const dx = x - camera.position.x
  const dz = z - camera.position.z
  yaw = Math.atan2(-dx, -dz)
  pitch = -0.08
  euler.set(pitch, yaw, 0)
  camera.quaternion.setFromEuler(euler)
}

export function updateCamera(delta, options = {}) {
  if (!camera) return
  const mode = options.mode || 'explore'
  const playful = mode === 'playful'

  const moveSpeed = playful
    ? (keys.shift ? 19 : 12)
    : (keys.shift ? 12.5 : 8.2)
  const acceleration = playful ? 52 : 40
  const damping = playful ? 7 : 11

  // Direction from keys
  direction.set(0, 0, 0)
  if (keys.forward) direction.z -= 1
  if (keys.backward) direction.z += 1
  if (keys.left) direction.x -= 1
  if (keys.right) direction.x += 1
  direction.normalize()

  // Rotate direction to camera facing
  const forward = new THREE.Vector3()
  camera.getWorldDirection(forward)
  forward.y = 0
  forward.normalize()

  const right = new THREE.Vector3()
  right.crossVectors(forward, WORLD_UP).normalize()

  const moveDir = new THREE.Vector3()
  moveDir.addScaledVector(forward, -direction.z)
  moveDir.addScaledVector(right, direction.x)

  // FPS-style acceleration + damping
  velocity.x += moveDir.x * acceleration * delta
  velocity.z += moveDir.z * acceleration * delta

  const dampingFactor = Math.max(0, 1 - damping * delta)
  velocity.x *= dampingFactor
  velocity.z *= dampingFactor

  // Clamp horizontal velocity for predictable movement feel
  const horizontalSpeed = Math.hypot(velocity.x, velocity.z)
  if (horizontalSpeed > moveSpeed) {
    const scale = moveSpeed / horizontalSpeed
    velocity.x *= scale
    velocity.z *= scale
  }

  // Apply velocity
  camera.position.x += velocity.x * delta
  camera.position.z += velocity.z * delta

  // Vertical motion in playful mode (flight)
  if (playful) {
    const verticalTarget = (keys.up ? 1 : 0) + (keys.down ? -1 : 0)
    const riseSpeed = keys.shift ? 13 : 8.5
    velocity.y += verticalTarget * riseSpeed * delta
    velocity.y *= Math.max(0, 1 - 5.5 * delta)
    camera.position.y += velocity.y * delta
    camera.position.y = THREE.MathUtils.clamp(camera.position.y, 1.2, 18)
  }

  // Clamp bounds
  camera.position.x = THREE.MathUtils.clamp(camera.position.x, -130, 130)
  camera.position.z = THREE.MathUtils.clamp(camera.position.z, -130, 130)

  // Subtle head bob in grounded modes
  if (!playful) {
    const isMoving = direction.lengthSq() > 0
    if (isMoving) {
      moveTime += delta * (keys.shift ? 12 : 9)
    } else {
      moveTime = 0
    }
    const bobAmount = isMoving ? Math.sin(moveTime) * 0.028 : 0
    camera.position.y = EYE_HEIGHT + bobAmount
  }

  // FOV tuning: stronger playful boost
  const playfulFov = keys.shift ? 98 : 90
  const targetFov = playful ? playfulFov : (keys.shift ? SPRINT_FOV : BASE_FOV)
  camera.fov += (targetFov - camera.fov) * Math.min(1, delta * 10)

  // Light playful camera lean on strafes for Nintendo-like motion feel
  if (playful) {
    const targetRoll = (keys.left ? 0.06 : 0) + (keys.right ? -0.06 : 0)
    euler.setFromQuaternion(camera.quaternion)
    euler.z += (targetRoll - euler.z) * Math.min(1, delta * 8)
    camera.quaternion.setFromEuler(euler)
  }

  camera.updateProjectionMatrix()
}

function onMouseMove(e) {
  if (!lookDragActive || !camera) return

  const sensitivity = 0.0018
  yaw -= e.movementX * sensitivity
  pitch -= e.movementY * sensitivity
  pitch = THREE.MathUtils.clamp(pitch, -Math.PI / 2.4, Math.PI / 2.4)
  euler.set(pitch, yaw, 0)
  camera.quaternion.setFromEuler(euler)
}

function onMouseDown(e) {
  if (e.button === 2) {
    lookDragActive = true
  }
}

function onMouseUp(e) {
  if (e.button === 2) {
    lookDragActive = false
  }
}

function onContextMenu(e) {
  e.preventDefault()
}

function onKeyDown(e) {
  switch (e.code) {
    case 'KeyW': keys.forward = true; break
    case 'KeyS': keys.backward = true; break
    case 'KeyA': keys.left = true; break
    case 'KeyD': keys.right = true; break
    case 'ShiftLeft':
    case 'ShiftRight': keys.shift = true; break
    case 'Space': keys.up = true; break
    case 'ControlLeft':
    case 'ControlRight': keys.down = true; break
    case 'KeyL':
      requestCursorLock()
      break
  }
}

function onKeyUp(e) {
  switch (e.code) {
    case 'KeyW': keys.forward = false; break
    case 'KeyS': keys.backward = false; break
    case 'KeyA': keys.left = false; break
    case 'KeyD': keys.right = false; break
    case 'ShiftLeft':
    case 'ShiftRight': keys.shift = false; break
    case 'Space': keys.up = false; break
    case 'ControlLeft':
    case 'ControlRight': keys.down = false; break
  }
}

export function resizeCamera(width, height) {
  if (!camera) return
  camera.aspect = width / height
  camera.updateProjectionMatrix()
}

export function cleanupCamera() {
  if (domEl) {
    domEl.removeEventListener('contextmenu', onContextMenu)
    domEl.removeEventListener('mousedown', onMouseDown)
  }
  document.removeEventListener('mouseup', onMouseUp)
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('keydown', onKeyDown)
  document.removeEventListener('keyup', onKeyUp)
}
