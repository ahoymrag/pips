import * as THREE from 'three'

const pipMeshMap = new Map()

// Soft anime pastel palette
const PIP_COLORS = [
  0xf8a0a0, 0xa0c8f8, 0xa8e0a8, 0xf8d888, 0xd0a0e8,
  0xf8c090, 0x88d8d8, 0xc8a8f0, 0xf8a0c0, 0xb8d888,
]

export function getPipMeshMap() {
  return pipMeshMap
}

export function createPipMeshes(pips, scene) {
  pips.forEach((pip, index) => {
    if (pipMeshMap.has(pip.id)) return
    const group = buildPipGroup(pip, index)
    scene.add(group)
    pipMeshMap.set(pip.id, group)
  })
}

export function syncPipMeshes(pips, scene) {
  const currentIds = new Set(pips.map((p) => p.id))

  for (const [id, group] of pipMeshMap) {
    if (!currentIds.has(id)) {
      scene.remove(group)
      pipMeshMap.delete(id)
    }
  }

  pips.forEach((pip, index) => {
    if (!pipMeshMap.has(pip.id)) {
      const group = buildPipGroup(pip, index)
      scene.add(group)
      pipMeshMap.set(pip.id, group)
    }

    const mesh = pipMeshMap.get(pip.id)
    if (pip.position_x !== undefined) {
      mesh.userData.baseX = pip.position_x
      mesh.userData.baseZ = pip.position_z
    }
  })
}

export function updatePipAnimations(time) {
  let i = 0
  for (const [, group] of pipMeshMap) {
    // Gentle floating bob - very soft and dreamy
    const bob = Math.sin(time * 1.5 + i * 1.3) * 0.08
    group.position.y = group.userData.baseY + bob

    // Soft swaying
    group.rotation.y = Math.sin(time * 0.6 + i * 2.1) * 0.08
    group.rotation.z = Math.sin(time * 0.8 + i * 1.7) * 0.02

    // Animate blush opacity subtly
    const blushes = group.userData.blushes
    if (blushes) {
      const blushIntensity = 0.15 + Math.sin(time * 1.2 + i * 0.8) * 0.05
      blushes.forEach(b => {
        b.material.emissiveIntensity = blushIntensity
      })
    }

    i++
  }
}

function buildPipGroup(pip, index) {
  const group = new THREE.Group()

  const color = pip.color
    ? new THREE.Color(pip.color)
    : new THREE.Color(PIP_COLORS[index % PIP_COLORS.length])

  // Body - slightly rounded look by using a larger body
  const bodyGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8)
  const bodyMat = new THREE.MeshLambertMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.08,
  })
  const body = new THREE.Mesh(bodyGeo, bodyMat)
  group.add(body)

  // Soft highlight on top (anime light reflection)
  const highlightGeo = new THREE.BoxGeometry(0.35, 0.05, 0.35)
  const highlightMat = new THREE.MeshLambertMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 0.3,
    transparent: true,
    opacity: 0.4,
  })
  const highlight = new THREE.Mesh(highlightGeo, highlightMat)
  highlight.position.set(-0.1, 0.41, -0.1)
  group.add(highlight)

  // Big sparkly anime eyes (larger, rounder feel)
  const eyeGeo = new THREE.BoxGeometry(0.2, 0.22, 0.05)
  const eyeMat = new THREE.MeshLambertMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 0.15,
  })

  const leftEye = new THREE.Mesh(eyeGeo, eyeMat)
  leftEye.position.set(-0.15, 0.08, 0.41)
  group.add(leftEye)

  const rightEye = new THREE.Mesh(eyeGeo, eyeMat)
  rightEye.position.set(0.15, 0.08, 0.41)
  group.add(rightEye)

  // Large dark pupils
  const pupilGeo = new THREE.BoxGeometry(0.12, 0.14, 0.05)
  const pupilMat = new THREE.MeshLambertMaterial({ color: 0x222233 })

  const leftPupil = new THREE.Mesh(pupilGeo, pupilMat)
  leftPupil.position.set(-0.15, 0.06, 0.44)
  group.add(leftPupil)

  const rightPupil = new THREE.Mesh(pupilGeo, pupilMat)
  rightPupil.position.set(0.15, 0.06, 0.44)
  group.add(rightPupil)

  // Anime eye sparkle (small white reflection)
  const sparkleGeo = new THREE.BoxGeometry(0.05, 0.05, 0.02)
  const sparkleMat = new THREE.MeshLambertMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 0.6,
  })

  const leftSparkle = new THREE.Mesh(sparkleGeo, sparkleMat)
  leftSparkle.position.set(-0.1, 0.12, 0.47)
  group.add(leftSparkle)

  const rightSparkle = new THREE.Mesh(sparkleGeo, sparkleMat)
  rightSparkle.position.set(0.2, 0.12, 0.47)
  group.add(rightSparkle)

  // Blush cheeks (soft pink glow)
  const blushGeo = new THREE.BoxGeometry(0.12, 0.08, 0.05)
  const blushColor = 0xff8888
  const leftBlush = new THREE.Mesh(
    blushGeo,
    new THREE.MeshLambertMaterial({
      color: blushColor,
      emissive: blushColor,
      emissiveIntensity: 0.15,
      transparent: true,
      opacity: 0.6,
    })
  )
  leftBlush.position.set(-0.25, -0.05, 0.41)
  group.add(leftBlush)

  const rightBlush = new THREE.Mesh(
    blushGeo,
    new THREE.MeshLambertMaterial({
      color: blushColor,
      emissive: blushColor,
      emissiveIntensity: 0.15,
      transparent: true,
      opacity: 0.6,
    })
  )
  rightBlush.position.set(0.25, -0.05, 0.41)
  group.add(rightBlush)

  group.userData.blushes = [leftBlush, rightBlush]

  // Small smile (tiny dark line)
  const smileGeo = new THREE.BoxGeometry(0.12, 0.03, 0.02)
  const smileMat = new THREE.MeshLambertMaterial({ color: 0x553344 })
  const smile = new THREE.Mesh(smileGeo, smileMat)
  smile.position.set(0, -0.1, 0.42)
  group.add(smile)

  // Position
  const px = pip.position_x !== undefined ? pip.position_x : -8 + (index % 5) * 4
  const pz = pip.position_z !== undefined ? pip.position_z : -4 + Math.floor(index / 5) * 4
  const py = 0.6

  group.position.set(px, py, pz)
  group.userData.baseX = px
  group.userData.baseY = py
  group.userData.baseZ = pz
  group.userData.pipId = pip.id
  group.userData.pipName = pip.name

  return group
}
