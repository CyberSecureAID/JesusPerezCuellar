/*
  ============================================================
  CYBER PORTFOLIO — F08 · js/effects/ParticleField.js
  ============================================================
  ESTADO: ✅ COMPLETADO
  VERSIÓN: 1.0.0
  FASE: 3 de 8

  DESCRIPCIÓN:
    Campo de partículas ambient con Three.js r128 usando
    InstancedMesh para máximo rendimiento. Las partículas
    flotan en el espacio 3D alrededor del robot y reaccionan
    al cursor del mouse con un efecto de repulsión suave.

  DEPENDENCIAS:
    → THREE (global, CDN r128 cargado en index.html)
    → RobotCore.js (F04) — window.RobotCore (scene, loop)
    → css/variables.css (F02) — lee --js-particle-count,
      --js-color-cyan, --js-color-violet

  API PÚBLICA:
    ParticleField.init()
    ParticleField.pause()
    ParticleField.resume()
    ParticleField.setMouseInfluence(radius, strength)
    ParticleField.isReady()  → boolean
    ParticleField.destroy()

  TÉCNICA:
    · InstancedMesh con SphereGeometry mínima (r=0.012, seg=4)
      → 1 draw call para todas las partículas
    · Cada partícula tiene: posición base, velocidad orbital,
      fase aleatoria y amplitud de drift
    · La reacción al cursor usa raycasting simplificado sobre
      un plano invisible frente a la cámara (sin Three.Raycaster
      completo — costo O(1) en vez de O(n))
    · En mobile: count reducido a 600, sin reacción al cursor

  DISTRIBUCIÓN:
    · 60% partículas — esfera grande alrededor del robot (r: 2-5)
    · 25% partículas — banda ecuatorial más densa (y: ±0.8)
    · 15% partículas — polvo cercano al robot (r: 0.8-1.8)

  COLORES:
    · 70% cian (#00ffff) con varianza de brillo
    · 30% violeta (#7f5af0) con varianza de brillo

  PRÓXIMO ARCHIVO: F09 · js/effects/HolographicGrid.js
  ============================================================
*/

'use strict';

const ParticleField = (() => {

  /* ── Estado privado ───────────────────────────────────────── */
  let _ready       = false;
  let _paused      = false;
  let _isMobile    = false;

  /* Three.js objects */
  let _instancedMesh = null;
  let _scene         = null;

  /* Datos por partícula */
  let _count       = 0;
  let _positions   = null;  // Float32Array [x, y, z] base
  let _velocities  = null;  // Float32Array [vx, vy, vz] orbital
  let _phases      = null;  // Float32Array [phase] drift
  let _amplitudes  = null;  // Float32Array [ax, ay, az]
  let _colors      = null;  // Float32Array [r, g, b] per particle

  /* Cursor en espacio 3D (plano Z=0) */
  let _cursorWorld = { x: 0, y: 0 };
  let _mouseInfluenceRadius   = 2.2;
  let _mouseInfluenceStrength = 0.28;

  /* Reutilizables en el loop (evita GC) */
  const _dummy    = new THREE.Object3D();
  const _color    = new THREE.Color();

  /* ── Helpers CSS ──────────────────────────────────────────── */
  function _css(v) {
    return getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  }

  /* ── Construir geometría y material ──────────────────────── */
  function _buildMesh() {
    // Geometría mínima: esfera con 4 segmentos (triángulo en la práctica)
    // Para partículas tan pequeñas no se nota la diferencia
    const geo = new THREE.SphereGeometry(0.012, 4, 4);

    // Material con vertex colors para variar el color por instancia
    const mat = new THREE.MeshBasicMaterial({
      vertexColors: false,   // usamos instanceColor (r128 lo soporta)
      transparent:  true,
      opacity:      0.85,
      depthWrite:   false,   // partículas no escriben al z-buffer
      blending:     THREE.AdditiveBlending,  // look de brillo/glow
    });

    _instancedMesh = new THREE.InstancedMesh(geo, mat, _count);
    _instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    _instancedMesh.name = 'particleField';

    // Activar instanceColor
    _instancedMesh.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(_count * 3), 3
    );

    _scene.add(_instancedMesh);
  }

  /* ── Distribución inicial de partículas ──────────────────── */
  function _distribute() {
    const cyan   = new THREE.Color(_css('--js-color-cyan')   || '#00ffff');
    const violet = new THREE.Color(_css('--js-color-violet') || '#7f5af0');

    for (let i = 0; i < _count; i++) {
      const base  = i * 3;
      const zone  = Math.random();

      let x, y, z;

      if (zone < 0.60) {
        // Zona 1: esfera grande — distribución esférica uniforme
        const theta = Math.random() * Math.PI * 2;
        const phi   = Math.acos(2 * Math.random() - 1);
        const r     = 2.0 + Math.random() * 3.0;
        x = r * Math.sin(phi) * Math.cos(theta);
        y = r * Math.sin(phi) * Math.sin(theta);
        z = r * Math.cos(phi);
      } else if (zone < 0.85) {
        // Zona 2: banda ecuatorial — disco achatado
        const theta = Math.random() * Math.PI * 2;
        const r     = 1.2 + Math.random() * 2.8;
        x = r * Math.cos(theta);
        y = (Math.random() - 0.5) * 1.6;
        z = r * Math.sin(theta);
      } else {
        // Zona 3: polvo cercano — esfera pequeña
        const theta = Math.random() * Math.PI * 2;
        const phi   = Math.acos(2 * Math.random() - 1);
        const r     = 0.8 + Math.random() * 1.0;
        x = r * Math.sin(phi) * Math.cos(theta);
        y = r * Math.sin(phi) * Math.sin(theta);
        z = r * Math.cos(phi);
      }

      _positions[base]     = x;
      _positions[base + 1] = y;
      _positions[base + 2] = z;

      // Velocidad orbital aleatoria y lenta
      _velocities[base]     = (Math.random() - 0.5) * 0.002;
      _velocities[base + 1] = (Math.random() - 0.5) * 0.003;
      _velocities[base + 2] = (Math.random() - 0.5) * 0.002;

      // Fase y amplitud del drift senoidal
      _phases[i]           = Math.random() * Math.PI * 2;
      _amplitudes[base]     = (Math.random() * 0.015) + 0.005;
      _amplitudes[base + 1] = (Math.random() * 0.020) + 0.008;
      _amplitudes[base + 2] = (Math.random() * 0.015) + 0.005;

      // Color: 70% cian, 30% violeta — con varianza de brillo
      const brightness = 0.5 + Math.random() * 0.5;
      const isCyan     = Math.random() < 0.70;
      const baseColor  = isCyan ? cyan : violet;
      _color.copy(baseColor).multiplyScalar(brightness);

      _colors[base]     = _color.r;
      _colors[base + 1] = _color.g;
      _colors[base + 2] = _color.b;

      // Aplicar color a la instancia
      _instancedMesh.setColorAt(i, _color);
    }

    _instancedMesh.instanceColor.needsUpdate = true;
  }

  /* ── Handler de mouse — proyectar en plano Z=2 ───────────── */
  function _onMouseMove(e) {
    if (_isMobile) return;

    // Conversión NDC a coordenadas de mundo aproximadas
    // Asumimos el plano Z=2 frente a la cámara (cámara en Z=5)
    // Es una aproximación O(1) sin Raycaster completo
    const nx = (e.clientX / window.innerWidth)  * 2 - 1;
    const ny = -((e.clientY / window.innerHeight) * 2 - 1);

    // Factor de conversión empírico para FOV 45° y Z=2 desde cámara
    const fovFactor = 1.85;
    _cursorWorld.x = nx * fovFactor;
    _cursorWorld.y = ny * fovFactor * (window.innerHeight / window.innerWidth);
  }

  /* ── Callback del render loop ─────────────────────────────── */
  function _tick(delta, elapsed) {
    if (_paused || !_ready || !_instancedMesh) return;

    const r2 = _mouseInfluenceRadius * _mouseInfluenceRadius;

    for (let i = 0; i < _count; i++) {
      const base = i * 3;

      // Posición actual = posición base + drift senoidal
      let px = _positions[base]     + Math.sin(elapsed * 0.6 + _phases[i]) * _amplitudes[base];
      let py = _positions[base + 1] + Math.sin(elapsed * 0.5 + _phases[i] + 1.0) * _amplitudes[base + 1];
      let pz = _positions[base + 2] + Math.sin(elapsed * 0.7 + _phases[i] + 2.0) * _amplitudes[base + 2];

      // Orbitar lentamente alrededor del origen
      _positions[base]     += _velocities[base];
      _positions[base + 1] += _velocities[base + 1];
      _positions[base + 2] += _velocities[base + 2];

      // Contener dentro de un radio máximo (6 unidades)
      const dist = Math.sqrt(
        _positions[base]     * _positions[base] +
        _positions[base + 1] * _positions[base + 1] +
        _positions[base + 2] * _positions[base + 2]
      );
      if (dist > 6.0) {
        // Reflejo: revertir velocidad y empujar hacia adentro
        _velocities[base]     *= -0.8;
        _velocities[base + 1] *= -0.8;
        _velocities[base + 2] *= -0.8;
        const factor = 5.5 / dist;
        _positions[base]     *= factor;
        _positions[base + 1] *= factor;
        _positions[base + 2] *= factor;
      }

      // Reacción al cursor (solo desktop, solo en plano XY aproximado)
      if (!_isMobile) {
        const dx = px - _cursorWorld.x;
        const dy = py - _cursorWorld.y;
        const dSq = dx * dx + dy * dy;

        if (dSq < r2 && dSq > 0.0001) {
          const d      = Math.sqrt(dSq);
          const force  = (_mouseInfluenceRadius - d) / _mouseInfluenceRadius;
          const repulse = force * _mouseInfluenceStrength * delta * 60;
          px += (dx / d) * repulse;
          py += (dy / d) * repulse;
        }
      }

      // Actualizar la instancia
      _dummy.position.set(px, py, pz);

      // Escala pulsante por partícula (fase individual)
      const scale = 0.7 + Math.sin(elapsed * 1.8 + _phases[i]) * 0.3;
      _dummy.scale.setScalar(scale);
      _dummy.updateMatrix();
      _instancedMesh.setMatrixAt(i, _dummy.matrix);
    }

    _instancedMesh.instanceMatrix.needsUpdate = true;
  }

  /* ── API PÚBLICA ──────────────────────────────────────────── */

  function init() {
    if (_ready) return;

    if (!window.RobotCore || !window.RobotCore.isReady()) {
      console.error('[ParticleField] RobotCore no está listo.');
      return;
    }

    _scene    = window.RobotCore.getScene();
    _isMobile = window.innerWidth < 768;

    // Leer count desde CSS token o usar default
    const rawCount = parseInt(_css('--js-particle-count'), 10);
    _count = isNaN(rawCount) ? 2000 : rawCount;
    if (_isMobile) _count = Math.min(_count, 600);

    // Allocar arrays
    _positions  = new Float32Array(_count * 3);
    _velocities = new Float32Array(_count * 3);
    _phases     = new Float32Array(_count);
    _amplitudes = new Float32Array(_count * 3);
    _colors     = new Float32Array(_count * 3);

    // Construir la malla y distribuir
    _buildMesh();
    _distribute();

    // Registrar en el loop
    window.RobotCore.addToLoop(_tick);

    // Eventos
    if (!_isMobile) {
      window.addEventListener('mousemove', _onMouseMove, { passive: true });
    }

    _ready = true;
    console.log(`[ParticleField] ✓ ${_count} partículas activas.`);
  }

  function pause()  { _paused = true; }
  function resume() { _paused = false; }
  function isReady(){ return _ready; }

  /**
   * Ajusta el radio e intensidad de la influencia del cursor.
   * @param {number} radius   — unidades de mundo (default: 2.2)
   * @param {number} strength — fuerza de repulsión (default: 0.28)
   */
  function setMouseInfluence(radius, strength) {
    _mouseInfluenceRadius   = radius   ?? _mouseInfluenceRadius;
    _mouseInfluenceStrength = strength ?? _mouseInfluenceStrength;
  }

  function destroy() {
    if (window.RobotCore) window.RobotCore.removeFromLoop(_tick);
    window.removeEventListener('mousemove', _onMouseMove);

    if (_instancedMesh) {
      _instancedMesh.geometry.dispose();
      _instancedMesh.material.dispose();
      if (_scene) _scene.remove(_instancedMesh);
      _instancedMesh = null;
    }

    _positions  = null;
    _velocities = null;
    _phases     = null;
    _amplitudes = null;
    _colors     = null;
    _ready      = false;
  }

  return {
    init,
    pause,
    resume,
    isReady,
    setMouseInfluence,
    destroy,
  };

})();

window.ParticleField = ParticleField;
