import * as THREE from 'three'

export const COUNCIL_POSITION = { x: 0, y: 0.75, z: 0 }
export function createTerrain(scene) {
  // Soft anime sky - warm sunset gradient feel
  scene.background = new THREE.Color(0xf5e6d3)

  // Dreamy fog - soft and warm
  scene.fog = new THREE.FogExp2(0xf0e2d6, 0.02)

  // Warm ambient light - soft anime fill
  const ambient = new THREE.AmbientLight(0xffeedd, 0.8)
  scene.add(ambient)

  // Golden hour sun
  const sun = new THREE.DirectionalLight(0xffd4a0, 1.2)
  sun.position.set(30, 60, 40)
  scene.add(sun)

  // Soft cool fill from opposite side (anime rim-light feel)
  const fill = new THREE.DirectionalLight(0xc8d8ff, 0.4)
  fill.position.set(-30, 20, -40)
  scene.add(fill)

  // Hemisphere light for soft sky/ground bounce
  const hemi = new THREE.HemisphereLight(0xffeeb1, 0xb0e0a8, 0.5)
  scene.add(hemi)

  // Valley floor - soft pastel green
  const floorGeo = new THREE.PlaneGeometry(260, 260)
  const floorMat = new THREE.MeshLambertMaterial({ color: 0xa8d8a8 })
  const floor = new THREE.Mesh(floorGeo, floorMat)
  floor.rotation.x = -Math.PI / 2
  floor.position.y = 0
  scene.add(floor)
  addMeasurementGrid(scene)

  // Soft mountain ring - lavender and dusty rose tones
  const mountainPalette = [0xc8b8d8, 0xd4c4e0, 0xbba8cc, 0xd0b8c8, 0xc0b0d0]

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
  const stoneMat = new THREE.MeshLambertMaterial({ color: 0xe8ddd0, emissive: 0x443322, emissiveIntensity: 0.15 })
  const stone = new THREE.Mesh(stoneGeo, stoneMat)
  stone.position.set(COUNCIL_POSITION.x, 0.6, COUNCIL_POSITION.z)
  scene.add(stone)

  // Small glowing accent on top of council stone
  const crystalGeo = new THREE.BoxGeometry(0.3, 0.5, 0.3)
  const crystalMat = new THREE.MeshLambertMaterial({ color: 0xffd4e8, emissive: 0xff88aa, emissiveIntensity: 0.4 })
  const crystal = new THREE.Mesh(crystalGeo, crystalMat)
  crystal.position.set(COUNCIL_POSITION.x, 1.45, COUNCIL_POSITION.z)
  crystal.rotation.y = Math.PI / 4
  scene.add(crystal)

  // Cozy farm corner (Pokemon/Stardew-inspired)
  addFarmDecor(scene)

  // Cherry blossom trees (blocky anime style)
  const treePositions = [
    [-10, 7], [8, -12], [-15, -8], [12, 10], [-6, 14],
    [18, -5], [-18, 3], [5, -18], [-12, 18], [14, 15],
    [-20, -15], [20, 8], [-8, -20], [22, -12], [-22, 12],
  ]

  treePositions.forEach(([tx, tz]) => {
    addTree(scene, tx, tz)
  })

  // Soft flower patches scattered across the glade
  const flowerColors = [0xffb8d0, 0xffd4a0, 0xd4b8ff, 0xfff0b0, 0xb8e8d0]
  for (let i = 0; i < 80; i++) {
    const color = flowerColors[Math.floor(Math.random() * flowerColors.length)]
    const mat = new THREE.MeshLambertMaterial({ color, emissive: color, emissiveIntensity: 0.1 })
    const size = 0.15 + Math.random() * 0.15
    const geo = new THREE.BoxGeometry(size, size, size)
    const flower = new THREE.Mesh(geo, mat)
    const fx = (Math.random() - 0.5) * 65
    const fz = (Math.random() - 0.5) * 65

    if (Math.abs(fx) < 3 && Math.abs(fz) < 3) continue

    flower.position.set(fx, size / 2, fz)
    flower.rotation.y = Math.random() * Math.PI
    scene.add(flower)
  }

  // Gentle grass tufts - lighter pastel greens
  const grassShades = [0x90c890, 0xa8d898, 0x80c080, 0xb8e0a8, 0x98d098]
  const grassGeo = new THREE.BoxGeometry(0.25, 0.4, 0.25)

  for (let i = 0; i < 100; i++) {
    const shade = grassShades[Math.floor(Math.random() * grassShades.length)]
    const mat = new THREE.MeshLambertMaterial({ color: shade })
    const grass = new THREE.Mesh(grassGeo, mat)
    const gx = (Math.random() - 0.5) * 70
    const gz = (Math.random() - 0.5) * 70

    if (Math.abs(gx) < 3 && Math.abs(gz) < 3) continue

    grass.position.set(gx, 0.2, gz)
    grass.rotation.y = Math.random() * Math.PI
    scene.add(grass)
  }
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
    const capMat = new THREE.MeshLambertMaterial({ color: 0xfff8f0 })
    const cap = new THREE.Mesh(capGeo, capMat)
    cap.position.set(x, height - 0.25, z)
    scene.add(cap)
  }
}

function addDistantBoundary(scene) {
  const farPalette = [0xb8adbe, 0xc5bac9, 0xb1a5bb, 0xccc1d1]
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
  const levelColors = [0xb6a6be, 0xa697b1, 0x9689a4]
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
  const minor = new THREE.GridHelper(260, 260, 0xbfd7b3, 0xbfd7b3)
  minor.position.y = 0.01
  minor.material.opacity = 0.12
  minor.material.transparent = true
  scene.add(minor)

  const major = new THREE.GridHelper(260, 26, 0x7ea27f, 0x7ea27f)
  major.position.y = 0.015
  major.material.opacity = 0.18
  major.material.transparent = true
  scene.add(major)
}

function addTree(scene, x, z) {
  // Trunk - warm brown
  const trunkGeo = new THREE.BoxGeometry(0.4, 2.5, 0.4)
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0xc8a882 })
  const trunk = new THREE.Mesh(trunkGeo, trunkMat)
  trunk.position.set(x, 1.25, z)
  scene.add(trunk)

  // Cherry blossom canopy - soft pink cloud of blocks
  const blossomColors = [0xffb8c8, 0xffc8d8, 0xffa8b8, 0xffd0d8, 0xffbcd0]
  const canopySize = 1.8 + Math.random() * 1.2

  for (let i = 0; i < 12; i++) {
    const bColor = blossomColors[Math.floor(Math.random() * blossomColors.length)]
    const size = 0.6 + Math.random() * 0.5
    const bGeo = new THREE.BoxGeometry(size, size, size)
    const bMat = new THREE.MeshLambertMaterial({ color: bColor, emissive: bColor, emissiveIntensity: 0.08 })
    const blossom = new THREE.Mesh(bGeo, bMat)

    const bx = x + (Math.random() - 0.5) * canopySize
    const by = 2.5 + Math.random() * 1.5
    const bz = z + (Math.random() - 0.5) * canopySize

    blossom.position.set(bx, by, bz)
    blossom.rotation.set(
      Math.random() * 0.3,
      Math.random() * Math.PI,
      Math.random() * 0.3
    )
    scene.add(blossom)
  }

  // Falling petals (small scattered blocks near tree base)
  for (let i = 0; i < 4; i++) {
    const petalGeo = new THREE.BoxGeometry(0.1, 0.05, 0.1)
    const petalMat = new THREE.MeshLambertMaterial({ color: 0xffccd8, emissive: 0xffccd8, emissiveIntensity: 0.15 })
    const petal = new THREE.Mesh(petalGeo, petalMat)
    petal.position.set(
      x + (Math.random() - 0.5) * 3,
      0.05 + Math.random() * 1.5,
      z + (Math.random() - 0.5) * 3
    )
    petal.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI)
    scene.add(petal)
  }
}

function addFarmDecor(scene) {
  const districts = [
    { x: -60, z: -40, color: 0xd8a67f },
    { x: 60, z: -40, color: 0xca8f7b },
    { x: -60, z: 40, color: 0xcaa67d },
    { x: 60, z: 40, color: 0xd4a589 },
    { x: 0, z: -70, color: 0xbca7cf },
    { x: 0, z: 70, color: 0xa9c995 },
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

  const fenceMat = new THREE.MeshLambertMaterial({ color: 0x9d774f })
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
