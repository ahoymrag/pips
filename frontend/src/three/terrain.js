import * as THREE from 'three'

export const COUNCIL_POSITION = { x: 0, y: 0.75, z: 0 }
export const trampolinePads = []

export function createTerrain(scene) {
  // Fantasy twilight sky - deep elvish blue-green
  scene.background = new THREE.Color(0x1a2a3a)

  // Mystical fog - cool forest mist
  scene.fog = new THREE.FogExp2(0x1e3328, 0.015)

  // Warm ambient light - enchanted golden fill
  const ambient = new THREE.AmbientLight(0xffe8b0, 0.6)
  scene.add(ambient)

  // Golden hour sun - warmer, more dramatic
  const sun = new THREE.DirectionalLight(0xffcc66, 1.6)
  sun.position.set(30, 60, 40)
  scene.add(sun)

  // Cool moonlight fill from opposite side
  const fill = new THREE.DirectionalLight(0x88aadd, 0.5)
  fill.position.set(-30, 20, -40)
  scene.add(fill)

  // Hemisphere light - golden sky to deep emerald ground
  const hemi = new THREE.HemisphereLight(0xffd48a, 0x2d6b3f, 0.7)
  scene.add(hemi)

  // Valley floor - rich emerald green
  const floorGeo = new THREE.PlaneGeometry(260, 260)
  const floorMat = new THREE.MeshLambertMaterial({ color: 0x2e8b57 })
  const floor = new THREE.Mesh(floorGeo, floorMat)
  floor.rotation.x = -Math.PI / 2
  floor.position.y = 0
  scene.add(floor)
  addMeasurementGrid(scene)

  // Ancient mountain ring - deep slate and mossy stone
  const mountainPalette = [0x4a5568, 0x5b6b4f, 0x6b5b7b, 0x3d5a4c, 0x5a4a6a]

  for (let x = -120; x <= 120; x += 4) {
    for (const z of [-120, 120]) {
      addMountain(scene, mountainPalette, x, z)
    }
  }
  for (let z = -116; z <= 116; z += 4) {
    for (const x of [-120, 120]) {
      addMountain(scene, mountainPalette, x, z)
    }
  }

  // Distant fog-wall mountains: communicates map boundary without harsh walls
  addDistantBoundary(scene)
  addBackgroundTerraces(scene)

  // Council stone - a glowing pale stone with a warm aura
  const stoneGeo = new THREE.BoxGeometry(1.5, 1.2, 1.5)
  const stoneMat = new THREE.MeshLambertMaterial({ color: 0x556b6b, emissive: 0x224433, emissiveIntensity: 0.2 })
  const stone = new THREE.Mesh(stoneGeo, stoneMat)
  stone.position.set(COUNCIL_POSITION.x, 0.6, COUNCIL_POSITION.z)
  scene.add(stone)

  // Small glowing accent on top of council stone
  const crystalGeo = new THREE.BoxGeometry(0.3, 0.5, 0.3)
  const crystalMat = new THREE.MeshLambertMaterial({ color: 0x44ffaa, emissive: 0x22ff88, emissiveIntensity: 0.6 })
  const crystal = new THREE.Mesh(crystalGeo, crystalMat)
  crystal.position.set(COUNCIL_POSITION.x, 1.45, COUNCIL_POSITION.z)
  crystal.rotation.y = Math.PI / 4
  scene.add(crystal)

  // Cozy farm corner
  addFarmDecor(scene)

  // Ancient forest trees (Middle Earth style)
  const treePositions = [
    [-10, 7], [8, -12], [-15, -8], [12, 10], [-6, 14],
    [18, -5], [-18, 3], [5, -18], [-12, 18], [14, 15],
    [-20, -15], [20, 8], [-8, -20], [22, -12], [-22, 12],
  ]

  treePositions.forEach(([tx, tz]) => {
    addTree(scene, tx, tz)
  })

  // Glowing fantasy flowers - bioluminescent
  const flowerColors = [0xff44aa, 0xffaa22, 0xaa44ff, 0x44ffaa, 0xff6644]
  for (let i = 0; i < 120; i++) {
    const color = flowerColors[Math.floor(Math.random() * flowerColors.length)]
    const mat = new THREE.MeshLambertMaterial({ color, emissive: color, emissiveIntensity: 0.4 })
    const size = 0.12 + Math.random() * 0.18
    const geo = new THREE.BoxGeometry(size, size, size)
    const flower = new THREE.Mesh(geo, mat)
    const fx = (Math.random() - 0.5) * 80
    const fz = (Math.random() - 0.5) * 80

    if (Math.abs(fx) < 3 && Math.abs(fz) < 3) continue

    flower.position.set(fx, size / 2, fz)
    flower.rotation.y = Math.random() * Math.PI
    scene.add(flower)
  }

  // Deep forest grass tufts
  const grassShades = [0x1a6b3a, 0x228b4a, 0x2d8b57, 0x3a9b5a, 0x1e7b42]
  const grassGeo = new THREE.BoxGeometry(0.25, 0.5, 0.25)

  for (let i = 0; i < 140; i++) {
    const shade = grassShades[Math.floor(Math.random() * grassShades.length)]
    const mat = new THREE.MeshLambertMaterial({ color: shade })
    const grass = new THREE.Mesh(grassGeo, mat)
    const gx = (Math.random() - 0.5) * 80
    const gz = (Math.random() - 0.5) * 80

    if (Math.abs(gx) < 3 && Math.abs(gz) < 3) continue

    grass.position.set(gx, 0.25, gz)
    grass.rotation.y = Math.random() * Math.PI
    scene.add(grass)
  }

  // Trampolines - glowing mushroom pads scattered through the glades
  addTrampolines(scene)
}

function addMountain(scene, palette, x, z) {
  const height = 3 + Math.random() * 5
  const color = palette[Math.floor(Math.random() * palette.length)]
  const geo = new THREE.BoxGeometry(2, height, 2)
  const mat = new THREE.MeshLambertMaterial({ color })
  const mountain = new THREE.Mesh(geo, mat)
  mountain.position.set(x, height / 2, z)
  scene.add(mountain)

  // Snow cap on taller mountains
  if (height > 5) {
    const capGeo = new THREE.BoxGeometry(2.1, 0.5, 2.1)
    const capMat = new THREE.MeshLambertMaterial({ color: 0xddeeff })
    const cap = new THREE.Mesh(capGeo, capMat)
    cap.position.set(x, height - 0.25, z)
    scene.add(cap)
  }
}

function addDistantBoundary(scene) {
  const farPalette = [0x2a3a4a, 0x3a4a3a, 0x2a2a3a, 0x3a3a4a]
  const ringRadius = 150
  const count = 140

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2
    const x = Math.cos(angle) * ringRadius + (Math.random() - 0.5) * 2
    const z = Math.sin(angle) * ringRadius + (Math.random() - 0.5) * 2
    const width = 2.8 + Math.random() * 2.2
    const depth = 2.8 + Math.random() * 2.2
    const height = 10 + Math.random() * 12
    const color = farPalette[Math.floor(Math.random() * farPalette.length)]

    const geo = new THREE.BoxGeometry(width, height, depth)
    const mat = new THREE.MeshLambertMaterial({
      color,
      transparent: true,
      opacity: 0.55,
    })
    const mountain = new THREE.Mesh(geo, mat)
    mountain.position.set(x, height / 2, z)
    scene.add(mountain)
  }
}

function addBackgroundTerraces(scene) {
  const levelColors = [0x2a3a2a, 0x1e2e2e, 0x1a2a1a]
  for (let level = 0; level < 3; level++) {
    const radius = 170 + level * 22
    const height = 14 + level * 5
    const count = 160 + level * 35
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2
      const x = Math.cos(angle) * radius
      const z = Math.sin(angle) * radius
      const geo = new THREE.BoxGeometry(2, height + (i % 3), 2)
      const mat = new THREE.MeshLambertMaterial({
        color: levelColors[level],
        transparent: true,
        opacity: 0.22 + level * 0.08,
      })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.set(x, geo.parameters.height / 2, z)
      scene.add(mesh)
    }
  }
}

function addMeasurementGrid(scene) {
  // Scientific readability: 1 block = 1 meter, 5m and 10m major lines.
  const minor = new THREE.GridHelper(260, 260, 0x1a5a3a, 0x1a5a3a)
  minor.position.y = 0.01
  minor.material.opacity = 0.08
  minor.material.transparent = true
  scene.add(minor)

  const major = new THREE.GridHelper(260, 26, 0x2a7a4a, 0x2a7a4a)
  major.position.y = 0.015
  major.material.opacity = 0.14
  major.material.transparent = true
  scene.add(major)
}

function addTree(scene, x, z) {
  // Ancient thick trunk - dark bark
  const trunkGeo = new THREE.BoxGeometry(0.6, 3.5, 0.6)
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x3d2b1f })
  const trunk = new THREE.Mesh(trunkGeo, trunkMat)
  trunk.position.set(x, 1.75, z)
  scene.add(trunk)

  // Roots spreading at base
  for (let r = 0; r < 3; r++) {
    const rootGeo = new THREE.BoxGeometry(0.3, 0.25, 1.2)
    const root = new THREE.Mesh(rootGeo, trunkMat)
    const angle = (r / 3) * Math.PI * 2 + Math.random() * 0.5
    root.position.set(x + Math.cos(angle) * 0.5, 0.12, z + Math.sin(angle) * 0.5)
    root.rotation.y = angle
    scene.add(root)
  }

  // Lush fantasy canopy - deep emerald and golden-green
  const canopyColors = [0x1a8a3a, 0x228b22, 0x2d9b3a, 0x4aaa2a, 0x338833]
  const canopySize = 2.2 + Math.random() * 1.5

  for (let i = 0; i < 16; i++) {
    const cColor = canopyColors[Math.floor(Math.random() * canopyColors.length)]
    const size = 0.7 + Math.random() * 0.6
    const cGeo = new THREE.BoxGeometry(size, size, size)
    const cMat = new THREE.MeshLambertMaterial({ color: cColor, emissive: cColor, emissiveIntensity: 0.12 })
    const leaf = new THREE.Mesh(cGeo, cMat)

    const lx = x + (Math.random() - 0.5) * canopySize
    const ly = 3.2 + Math.random() * 2.0
    const lz = z + (Math.random() - 0.5) * canopySize

    leaf.position.set(lx, ly, lz)
    leaf.rotation.set(Math.random() * 0.3, Math.random() * Math.PI, Math.random() * 0.3)
    scene.add(leaf)
  }

  // Glowing firefly-like particles near tree
  for (let i = 0; i < 3; i++) {
    const sparkGeo = new THREE.BoxGeometry(0.06, 0.06, 0.06)
    const sparkColor = 0xffdd44
    const sparkMat = new THREE.MeshLambertMaterial({ color: sparkColor, emissive: sparkColor, emissiveIntensity: 0.9 })
    const spark = new THREE.Mesh(sparkGeo, sparkMat)
    spark.position.set(
      x + (Math.random() - 0.5) * 3,
      0.5 + Math.random() * 3,
      z + (Math.random() - 0.5) * 3
    )
    scene.add(spark)
  }
}

function addFarmDecor(scene) {
  const districts = [
    { x: -60, z: -40, color: 0x4a3a2a },
    { x: 60, z: -40, color: 0x3a4a3a },
    { x: -60, z: 40, color: 0x4a4a2a },
    { x: 60, z: 40, color: 0x3a3a4a },
    { x: 0, z: -70, color: 0x4a3a4a },
    { x: 0, z: 70, color: 0x2a4a3a },
  ]

  for (const district of districts) {
    addDistrictFarm(scene, district.x, district.z, district.color)
  }
}

function addDistrictFarm(scene, centerX, centerZ, soilColor) {
  const half = 9
  const minX = centerX - half
  const maxX = centerX + half
  const minZ = centerZ - half
  const maxZ = centerZ + half

  const soil = new THREE.Mesh(
    new THREE.PlaneGeometry((maxX - minX) + 2, (maxZ - minZ) + 2),
    new THREE.MeshLambertMaterial({ color: soilColor })
  )
  soil.rotation.x = -Math.PI / 2
  soil.position.set(centerX, 0.01, centerZ)
  scene.add(soil)

  const fenceMat = new THREE.MeshLambertMaterial({ color: 0x5a3a2a })
  const postGeo = new THREE.BoxGeometry(0.22, 0.8, 0.22)
  const railGeo = new THREE.BoxGeometry(1.0, 0.12, 0.12)
  const fMinX = minX - 1
  const fMaxX = maxX + 1
  const fMinZ = minZ - 1
  const fMaxZ = maxZ + 1

  for (let x = fMinX; x <= fMaxX; x += 1) {
    addFencePost(scene, postGeo, fenceMat, x, fMinZ)
    addFencePost(scene, postGeo, fenceMat, x, fMaxZ)
  }
  for (let z = fMinZ + 1; z < fMaxZ; z += 1) {
    addFencePost(scene, postGeo, fenceMat, fMinX, z)
    addFencePost(scene, postGeo, fenceMat, fMaxX, z)
  }

  for (let x = fMinX + 0.5; x < fMaxX; x += 1) {
    addFenceRail(scene, railGeo, fenceMat, x, fMinZ)
    addFenceRail(scene, railGeo, fenceMat, x, fMaxZ)
  }

  const railGeoSide = new THREE.BoxGeometry(0.12, 0.12, 1.0)
  for (let z = fMinZ + 0.5; z < fMaxZ; z += 1) {
    addFenceRail(scene, railGeoSide, fenceMat, fMinX, z)
    addFenceRail(scene, railGeoSide, fenceMat, fMaxX, z)
  }
}

function addFencePost(scene, geo, mat, x, z) {
  const post = new THREE.Mesh(geo, mat)
  post.position.set(x, 0.4, z)
  scene.add(post)
}

function addFenceRail(scene, geo, mat, x, z) {
  const rail = new THREE.Mesh(geo, mat)
  rail.position.set(x, 0.55, z)
  scene.add(rail)
}

function addTrampolines(scene) {
  // Mushroom trampolines scattered through the world
  const positions = [
    [-5, 12], [14, -8], [-18, -14], [10, 20], [-25, 5],
    [22, -18], [-8, -25], [28, 12], [-30, -8], [6, -30],
    [35, 0], [-15, 30], [0, 25], [-35, -20], [20, -28],
    [40, 15], [-40, 10], [15, 35], [-20, -35], [30, -25],
  ]
  const capColors = [0xff2266, 0xff6622, 0xaa22ff, 0x22aaff, 0xff22aa, 0x22ffaa]

  positions.forEach(([px, pz]) => {
    const color = capColors[Math.floor(Math.random() * capColors.length)]

    // Stem
    const stemGeo = new THREE.CylinderGeometry(0.2, 0.3, 0.6, 8)
    const stemMat = new THREE.MeshLambertMaterial({ color: 0xeeddcc })
    const stem = new THREE.Mesh(stemGeo, stemMat)
    stem.position.set(px, 0.3, pz)
    scene.add(stem)

    // Cap (the bouncy part) - wide flat cylinder
    const capGeo = new THREE.CylinderGeometry(1.0, 1.2, 0.3, 12)
    const capMat = new THREE.MeshLambertMaterial({ color, emissive: color, emissiveIntensity: 0.35 })
    const cap = new THREE.Mesh(capGeo, capMat)
    cap.position.set(px, 0.75, pz)
    scene.add(cap)

    // Glowing spots on cap
    for (let s = 0; s < 4; s++) {
      const spotGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.05, 6)
      const spotMat = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.6 })
      const spot = new THREE.Mesh(spotGeo, spotMat)
      const angle = (s / 4) * Math.PI * 2 + Math.random() * 0.5
      spot.position.set(px + Math.cos(angle) * 0.5, 0.92, pz + Math.sin(angle) * 0.5)
      scene.add(spot)
    }

    // Register pad for collision
    trampolinePads.push({ x: px, z: pz, radius: 1.2 })
  })
}
