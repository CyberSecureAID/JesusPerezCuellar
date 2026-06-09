/*
  ============================================================
  CYBER PORTFOLIO — F05 · js/robot/RobotHead.js
  ============================================================
  ESTADO: ✅ COMPLETADO
  VERSIÓN: 1.0.0
  FASE: 2 de 8

  DESCRIPCIÓN:
    Construcción procedural de la cabeza del robot con Three.js r128.
    Sin archivos externos (.glb/.gltf) — 100% geometría programática.
    Materiales PBR (MeshStandardMaterial), ojos emisivos con glow,
    panel HUD facial con líneas de escaneo y detalles técnicos.

  DEPENDENCIAS:
    → RobotCore.js (F04) — window.RobotCore debe estar inicializado

  API PÚBLICA:
    RobotHead.init()         → construye y añade el robot a la escena
    RobotHead.getHead()      → THREE.Group raíz de la cabeza
    RobotHead.getEyes()      → { left, right } — Mesh de los ojos
    RobotHead.getJaw()       → Mesh de la mandíbula (para animar)
    RobotHead.setEyeColor(hex)
    RobotHead.setEyeIntensity(val)
    RobotHead.isReady()      → boolean

  ESTRUCTURA DEL OBJETO 3D:
    robotGroup (THREE.Group)
      └─ headGroup (THREE.Group)  ← punto de rotación para tracking
           ├─ cranium              — caja craneal principal
           ├─ facePanel            — panel frontal plano con detalle
           ├─ eyeLeft / eyeRight   — esferas emisivas
           ├─ pupilLeft / pupilRight — discos interiores
           ├─ brow                 — placa supraorbital
           ├─ jaw                  — mandíbula inferior (animable)
           ├─ earLeft / earRight   — módulos laterales
           ├─ neck                 — cilindro de cuello
           ├─ antennae[]           — antenas en la corona
           ├─ scanLines[]          — líneas HUD sobre la cara
           └─ glowRings[]          — anillos de glow orbital

  PRÓXIMO ARCHIVO: F06 · js/robot/RobotTracking.js
  ============================================================
*/

'use strict';

const RobotHead = (() => {

  /* ── Estado privado ───────────────────────────────────────── */
  let _ready      = false;
  let _robotGroup = null;   // grupo raíz completo (incluye cuello)
  let _headGroup  = null;   // solo la cabeza (rota en tracking)
  let _eyes       = { left: null, right: null };
  let _pupils     = { left: null, right: null };
  let _jaw        = null;
  let _eyeMaterials = [];

  /* ── Helpers de color desde variables.css ─────────────────── */
  function _css(v) {
    return getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  }

  /* ── Materiales compartidos ───────────────────────────────── */
  function _makeMat(opts) {
    return new THREE.MeshStandardMaterial(opts);
  }

  /* Material principal del cuerpo — metal oscuro con micro-relieve */
  function _bodyMat() {
    return _makeMat({
      color:     0x0d0d18,
      metalness: 0.92,
      roughness: 0.18,
      envMapIntensity: 0.6,
    });
  }

  /* Material de panel — metal ligeramente más claro */
  function _panelMat() {
    return _makeMat({
      color:     0x12121f,
      metalness: 0.85,
      roughness: 0.25,
    });
  }

  /* Material de acento — borde cian muy tenue */
  function _accentMat() {
    const cyan = new THREE.Color(_css('--js-color-cyan') || '#00ffff');
    return _makeMat({
      color:     cyan.clone().multiplyScalar(0.08),
      metalness: 0.7,
      roughness: 0.4,
      emissive:  cyan.clone().multiplyScalar(0.15),
    });
  }

  /* Material de ojo emisivo */
  function _eyeMat(intensity) {
    const cyan = new THREE.Color(_css('--js-color-cyan') || '#00ffff');
    const mat = _makeMat({
      color:             cyan,
      emissive:          cyan,
      emissiveIntensity: intensity || 1.8,
      metalness:         0.0,
      roughness:         0.0,
    });
    _eyeMaterials.push(mat);
    return mat;
  }

  /* ── CRANIO ───────────────────────────────────────────────── */
  function _buildCranium() {
    // Caja craneal — BoxGeometry levemente achatada
    const geo = new THREE.BoxGeometry(1.1, 0.9, 0.95, 2, 2, 2);

    // Deformar vértices para suavizar las esquinas sin usar
    // BufferGeometryUtils (no disponible en r128 CDN)
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      // Redondear esquinas empujando los vértices hacia el centro
      const len = Math.sqrt(x*x + y*y + z*z);
      const bevel = 0.07;
      pos.setXYZ(
        i,
        x * (1 - bevel * Math.abs(x / 0.55)),
        y * (1 - bevel * Math.abs(y / 0.45)),
        z * (1 - bevel * Math.abs(z / 0.475))
      );
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();

    const mesh = new THREE.Mesh(geo, _bodyMat());
    mesh.name = 'cranium';
    return mesh;
  }

  /* ── PANEL FRONTAL ────────────────────────────────────────── */
  function _buildFacePanel() {
    // Panel plano sobre la cara del cranio — crea profundidad visual
    const geo  = new THREE.BoxGeometry(0.82, 0.65, 0.04);
    const mesh = new THREE.Mesh(geo, _panelMat());
    mesh.position.set(0, 0.0, 0.475);
    mesh.name = 'facePanel';
    return mesh;
  }

  /* ── OJOS ─────────────────────────────────────────────────── */
  function _buildEyes() {
    const eyeGeo    = new THREE.SphereGeometry(0.085, 16, 16);
    const pupilGeo  = new THREE.CircleGeometry(0.04, 12);

    const xOffset   = 0.22;
    const yPos      =  0.08;
    const zPos      =  0.50;

    ['left', 'right'].forEach((side, i) => {
      const x = (i === 0 ? -1 : 1) * xOffset;

      // Globo ocular
      const eyeMesh = new THREE.Mesh(eyeGeo, _eyeMat(1.8));
      eyeMesh.position.set(x, yPos, zPos);
      eyeMesh.name = `eye_${side}`;
      _eyes[side] = eyeMesh;

      // Pupila — disco interior oscuro con punto de luz
      const pupilMat = _makeMat({
        color:             0x000000,
        emissive:          new THREE.Color(_css('--js-color-cyan') || '#00ffff'),
        emissiveIntensity: 0.6,
        metalness:         0,
        roughness:         1,
      });
      const pupilMesh = new THREE.Mesh(pupilGeo, pupilMat);
      pupilMesh.position.set(x, yPos, zPos + 0.086);
      pupilMesh.name = `pupil_${side}`;
      _pupils[side] = pupilMesh;
    });
  }

  /* ── CEJAS / PLACA SUPRAORBITAL ───────────────────────────── */
  function _buildBrow() {
    const geo  = new THREE.BoxGeometry(0.7, 0.055, 0.055);
    const mesh = new THREE.Mesh(geo, _accentMat());
    mesh.position.set(0, 0.21, 0.485);
    mesh.name = 'brow';
    return mesh;
  }

  /* ── MANDÍBULA ────────────────────────────────────────────── */
  function _buildJaw() {
    const geo  = new THREE.BoxGeometry(0.88, 0.22, 0.85);
    const mat  = _makeMat({
      color:     0x0a0a15,
      metalness: 0.88,
      roughness: 0.22,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(0, -0.56, 0);
    mesh.name = 'jaw';
    _jaw = mesh;
    return mesh;
  }

  /* ── OREJAS / MÓDULOS LATERALES ───────────────────────────── */
  function _buildEars() {
    const group = new THREE.Group();
    group.name = 'ears';

    [-1, 1].forEach((side) => {
      // Módulo principal
      const mainGeo  = new THREE.BoxGeometry(0.14, 0.42, 0.38);
      const mainMesh = new THREE.Mesh(mainGeo, _bodyMat());
      mainMesh.position.set(side * 0.62, 0.04, 0);

      // Detalle: ranura horizontal
      const slotGeo  = new THREE.BoxGeometry(0.15, 0.025, 0.3);
      const slotMesh = new THREE.Mesh(slotGeo, _accentMat());
      slotMesh.position.set(side * 0.625, 0.05, 0);

      // Antena lateral corta
      const antGeo  = new THREE.CylinderGeometry(0.012, 0.008, 0.18, 6);
      const antMesh = new THREE.Mesh(antGeo, _accentMat());
      antMesh.position.set(side * 0.625, 0.28, 0);

      group.add(mainMesh, slotMesh, antMesh);
    });

    return group;
  }

  /* ── CUELLO ───────────────────────────────────────────────── */
  function _buildNeck() {
    const geo  = new THREE.CylinderGeometry(0.18, 0.22, 0.35, 8);
    const mesh = new THREE.Mesh(geo, _bodyMat());
    mesh.position.set(0, -0.83, 0);
    mesh.name = 'neck';
    return mesh;
  }

  /* ── ANTENAS CORONALES ────────────────────────────────────── */
  function _buildAntennae() {
    const group = new THREE.Group();
    group.name = 'antennae';
    const cyan = new THREE.Color(_css('--js-color-cyan') || '#00ffff');

    const positions = [
      [0,    0.5,  0.1],    // centro
      [-0.2, 0.48, 0.05],   // izquierda
      [ 0.2, 0.48, 0.05],   // derecha
    ];

    positions.forEach(([x, y, z], idx) => {
      const height = 0.18 - idx * 0.02;

      // Tallo
      const stalkGeo  = new THREE.CylinderGeometry(0.009, 0.014, height, 6);
      const stalkMesh = new THREE.Mesh(stalkGeo, _bodyMat());
      stalkMesh.position.set(x, y + height / 2, z);

      // Punta emisiva
      const tipGeo = new THREE.SphereGeometry(0.018, 8, 8);
      const tipMat = _makeMat({
        color:             cyan,
        emissive:          cyan,
        emissiveIntensity: idx === 0 ? 2.2 : 1.4,
        metalness: 0, roughness: 0,
      });
      _eyeMaterials.push(tipMat); // se anima junto con los ojos
      const tipMesh = new THREE.Mesh(tipGeo, tipMat);
      tipMesh.position.set(x, y + height, z);

      group.add(stalkMesh, tipMesh);
    });

    return group;
  }

  /* ── LÍNEAS HUD (scan lines sobre la cara) ────────────────── */
  function _buildScanLines() {
    const group = new THREE.Group();
    group.name = 'scanLines';
    const cyan = new THREE.Color(_css('--js-color-cyan') || '#00ffff');

    const lineMat = _makeMat({
      color:             cyan,
      emissive:          cyan,
      emissiveIntensity: 0.5,
      metalness: 0, roughness: 1,
      transparent: true,
      opacity: 0.55,
    });

    // 4 líneas horizontales escaneando la cara
    const yPositions = [-0.12, -0.04, 0.04, 0.12];
    yPositions.forEach((y, i) => {
      const w   = 0.55 - i * 0.04;
      const geo  = new THREE.BoxGeometry(w, 0.006, 0.005);
      const mesh = new THREE.Mesh(geo, lineMat.clone());
      mesh.position.set(0, y, 0.51);
      mesh.name = `scanLine_${i}`;
      group.add(mesh);
    });

    return group;
  }

  /* ── ANILLOS DE GLOW ORBITAL ──────────────────────────────── */
  function _buildGlowRings() {
    const group = new THREE.Group();
    group.name = 'glowRings';

    const cyan   = new THREE.Color(_css('--js-color-cyan')   || '#00ffff');
    const violet = new THREE.Color(_css('--js-color-violet') || '#7f5af0');

    const rings = [
      { color: cyan,   radius: 0.72, tube: 0.009, y: 0.1,   rx: Math.PI / 2 },
      { color: violet, radius: 0.65, tube: 0.007, y: 0.0,   rx: Math.PI / 3 },
      { color: cyan,   radius: 0.58, tube: 0.005, y: -0.05, rx: Math.PI / 4 },
    ];

    rings.forEach(({ color, radius, tube, y, rx }, i) => {
      const geo  = new THREE.TorusGeometry(radius, tube, 8, 64);
      const mat  = _makeMat({
        color,
        emissive:          color,
        emissiveIntensity: 0.8,
        metalness: 0, roughness: 0,
        transparent: true,
        opacity: 0.6,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = rx;
      mesh.position.y = y;
      mesh.name = `glowRing_${i}`;
      group.add(mesh);
    });

    return group;
  }

  /* ── ENSAMBLAR TODO ───────────────────────────────────────── */
  function _assemble() {
    _robotGroup = new THREE.Group();
    _robotGroup.name = 'robotGroup';

    _headGroup = new THREE.Group();
    _headGroup.name = 'headGroup';
    _headGroup.position.y = 0.5; // elevar sobre el centro de la escena

    // Construir piezas
    const cranium   = _buildCranium();
    const facePanel = _buildFacePanel();
    const brow      = _buildBrow();
    const jaw       = _buildJaw();
    const ears      = _buildEars();
    const neck      = _buildNeck();
    const antennae  = _buildAntennae();
    const scanLines = _buildScanLines();
    const glowRings = _buildGlowRings();

    _buildEyes(); // popula _eyes y _pupils

    // Añadir al headGroup
    _headGroup.add(
      cranium,
      facePanel,
      brow,
      jaw,
      ears,
      antennae,
      scanLines,
      glowRings,
      _eyes.left,
      _eyes.right,
      _pupils.left,
      _pupils.right,
    );

    // Cuello va en el robotGroup (no rota con el tracking)
    _robotGroup.add(_headGroup, neck);

    // Posición inicial: ligeramente girado para la vista 3/4
    _robotGroup.rotation.y = -0.15;
  }

  /* ── API PÚBLICA ──────────────────────────────────────────── */

  function init() {
    if (_ready) return;

    if (!window.RobotCore || !window.RobotCore.isReady()) {
      console.error('[RobotHead] RobotCore no está inicializado. Llama a RobotCore.init() primero.');
      return;
    }

    _assemble();

    const scene = window.RobotCore.getScene();
    scene.add(_robotGroup);

    _ready = true;
    console.log('[RobotHead] ✓ Robot ensamblado y añadido a la escena.');
  }

  function getHead()  { return _headGroup; }
  function getGroup() { return _robotGroup; }
  function getEyes()  { return { ..._eyes }; }
  function getJaw()   { return _jaw; }
  function isReady()  { return _ready; }

  /**
   * Cambia el color de los ojos en tiempo real.
   * @param {number|string} hex — color THREE-compatible
   */
  function setEyeColor(hex) {
    const color = new THREE.Color(hex);
    _eyeMaterials.forEach(mat => {
      mat.color.set(color);
      mat.emissive.set(color);
    });
  }

  /**
   * Ajusta la intensidad emisiva de los ojos.
   * @param {number} val
   */
  function setEyeIntensity(val) {
    _eyeMaterials.forEach(mat => {
      mat.emissiveIntensity = val;
    });
  }

  return {
    init,
    getHead,
    getGroup,
    getEyes,
    getJaw,
    setEyeColor,
    setEyeIntensity,
    isReady,
  };

})();

window.RobotHead = RobotHead;
