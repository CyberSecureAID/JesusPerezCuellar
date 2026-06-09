/*
  ============================================================
  CYBER PORTFOLIO — F07 · js/robot/RobotAnimations.js
  ============================================================
  ESTADO: ✅ COMPLETADO
  VERSIÓN: 1.0.0
  FASE: 2 de 8

  DESCRIPCIÓN:
    Loop de animaciones idle del robot. Gestiona la respiración,
    pulso de luces, parpadeo de ojos, micro-movimientos de cabeza
    y las animaciones de las líneas HUD. Todo procedural, sin
    archivos externos de animación.

  DEPENDENCIAS:
    → RobotCore.js (F04) — window.RobotCore (loop, clock)
    → RobotHead.js (F05) — window.RobotHead (head, eyes, jaw)

  ANIMACIONES INCLUIDAS:
    · Respiración — leve bobbing vertical del robotGroup
    · Pulso de ojos — oscilación de emissiveIntensity
    · Parpadeo — cierre rápido y reapertura de párpados (scaleY ojo)
    · Micro-tilt idle — pequeñas rotaciones aleatorias de cabeza
    · Jaw idle — mandíbula con micro-vibraciones sutiles
    · Scan lines — desplazamiento vertical de las líneas HUD
    · Glow rings — rotación continua a velocidades distintas
    · Antennae pulse — tips parpadean en secuencia

  API PÚBLICA:
    RobotAnimations.init()
    RobotAnimations.pause()
    RobotAnimations.resume()
    RobotAnimations.triggerBlink()    → fuerza un parpadeo manual
    RobotAnimations.triggerGlitch()   → micro-glitch de cabeza
    RobotAnimations.isReady()         → boolean

  NOTAS TÉCNICAS:
    - Se registra en el loop de RobotCore via addToLoop().
    - El parpadeo usa un timer con varianza aleatoria (3–7 seg).
    - triggerGlitch() es llamado por GlitchEffect.js (F16)
      para sincronizar el efecto visual CSS con el 3D.
    - Todas las animaciones respetan prefers-reduced-motion.

  PRÓXIMO ARCHIVO: F08 · js/effects/ParticleField.js
  ============================================================
*/

'use strict';

const RobotAnimations = (() => {

  /* ── Estado privado ───────────────────────────────────────── */
  let _ready      = false;
  let _paused     = false;
  let _reducedMotion = false;

  /* Referencias a objetos Three.js */
  let _robotGroup  = null;  // grupo raíz — respiración
  let _headGroup   = null;  // cabeza — micro-tilt
  let _eyes        = null;  // { left, right } meshes
  let _jaw         = null;  // mandíbula
  let _scene       = null;  // para buscar scan lines y glow rings por nombre

  /* ── Timers de parpadeo ───────────────────────────────────── */
  let _blinkTimer    = 0;
  let _blinkInterval = 4.5;   // segundos hasta el próximo parpadeo
  let _blinkState    = 'open'; // 'open' | 'closing' | 'opening'
  let _blinkProgress = 0;

  /* ── Estado del micro-tilt idle ──────────────────────────── */
  let _idleTilt = {
    targetX: 0, targetY: 0,
    currentX: 0, currentY: 0,
    timer: 0,
    interval: 3.5,
  };

  /* ── Estado del glitch ────────────────────────────────────── */
  let _glitchActive    = false;
  let _glitchTimer     = 0;
  let _glitchDuration  = 0;
  let _glitchIntensity = 0;
  let _origRotation    = { x: 0, y: 0, z: 0 };

  /* ── Leer CSS ─────────────────────────────────────────────── */
  function _css(v) {
    return getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  }

  /* ── Detectar reduced-motion ─────────────────────────────── */
  function _checkReducedMotion() {
    _reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /* ── Encontrar objeto por nombre en la escena ────────────── */
  function _find(name) {
    let found = null;
    _scene.traverse(obj => {
      if (obj.name === name) found = obj;
    });
    return found;
  }

  /* ── Encontrar todos los objetos con prefijo ─────────────── */
  function _findAll(prefix) {
    const results = [];
    _scene.traverse(obj => {
      if (obj.name && obj.name.startsWith(prefix)) results.push(obj);
    });
    return results;
  }

  /* ── Nuevo intervalo aleatorio de parpadeo ────────────────── */
  function _nextBlinkInterval() {
    return 3.0 + Math.random() * 4.0; // entre 3 y 7 segundos
  }

  /* ════════════════════════════════════════════════════════════
     ANIMACIÓN: RESPIRACIÓN
     Leve movimiento vertical + escala micro del robotGroup.
     Simula que el robot está "vivo" esperando.
  ════════════════════════════════════════════════════════════ */
  function _animBreathing(elapsed) {
    if (!_robotGroup) return;

    const speed  = 0.55;   // ciclos por segundo
    const ampY   = 0.018;  // amplitud vertical
    const ampS   = 0.004;  // amplitud de escala

    const t = elapsed * speed;
    _robotGroup.position.y = Math.sin(t * Math.PI * 2) * ampY;
    const s = 1 + Math.sin(t * Math.PI * 2) * ampS;
    _robotGroup.scale.set(s, s, s);
  }

  /* ════════════════════════════════════════════════════════════
     ANIMACIÓN: PULSO DE OJOS
     Oscilación senoidal de emissiveIntensity.
     Fase ligeramente diferente en cada ojo para que
     no sean perfectamente síncronos.
  ════════════════════════════════════════════════════════════ */
  function _animEyePulse(elapsed) {
    if (!_eyes || !_eyes.left || !_eyes.right) return;

    const baseIntensity = 1.8;
    const amplitude     = 0.6;
    const speed         = 1.3;

    const pulseL = baseIntensity + Math.sin(elapsed * speed * Math.PI * 2) * amplitude;
    const pulseR = baseIntensity + Math.sin(elapsed * speed * Math.PI * 2 + 0.4) * amplitude;

    if (_eyes.left.material) {
      _eyes.left.material.emissiveIntensity  = Math.max(0.4, pulseL);
    }
    if (_eyes.right.material) {
      _eyes.right.material.emissiveIntensity = Math.max(0.4, pulseR);
    }
  }

  /* ════════════════════════════════════════════════════════════
     ANIMACIÓN: PARPADEO
     Colapsa scaleY de los ojos a 0.05 (párpado cerrado)
     y los reabre en 80ms. Efecto de parpadeo realista.
  ════════════════════════════════════════════════════════════ */
  function _animBlink(delta) {
    if (!_eyes || !_eyes.left || !_eyes.right) return;

    _blinkTimer += delta;

    if (_blinkState === 'open') {
      // Asegurar que los ojos estén abiertos
      _eyes.left.scale.y  = 1;
      _eyes.right.scale.y = 1;
      if (_pupils.left)  _pupils.left.scale.y  = 1;
      if (_pupils.right) _pupils.right.scale.y = 1;

      if (_blinkTimer >= _blinkInterval) {
        _blinkState    = 'closing';
        _blinkProgress = 0;
        _blinkTimer    = 0;
      }
    }
    else if (_blinkState === 'closing') {
      _blinkProgress += delta / 0.055; // cierra en 55ms
      const sy = Math.max(0.05, 1 - _blinkProgress);
      _eyes.left.scale.y  = sy;
      _eyes.right.scale.y = sy;
      if (_pupils.left)  _pupils.left.scale.y  = sy;
      if (_pupils.right) _pupils.right.scale.y = sy;

      if (_blinkProgress >= 1) {
        _blinkState    = 'opening';
        _blinkProgress = 0;
      }
    }
    else if (_blinkState === 'opening') {
      _blinkProgress += delta / 0.08; // abre en 80ms
      const sy = Math.min(1, _blinkProgress);
      _eyes.left.scale.y  = sy;
      _eyes.right.scale.y = sy;
      if (_pupils.left)  _pupils.left.scale.y  = sy;
      if (_pupils.right) _pupils.right.scale.y = sy;

      if (_blinkProgress >= 1) {
        _blinkState    = 'open';
        _blinkInterval = _nextBlinkInterval();
        _blinkTimer    = 0;
      }
    }
  }

  /* ════════════════════════════════════════════════════════════
     ANIMACIÓN: MICRO-TILT IDLE
     La cabeza se mueve lentamente a posiciones aleatorias
     sutiles. Se combina con el tracking (que domina cuando
     hay movimiento de cursor).
  ════════════════════════════════════════════════════════════ */
  function _animIdleTilt(delta) {
    if (!_headGroup) return;

    _idleTilt.timer += delta;

    if (_idleTilt.timer >= _idleTilt.interval) {
      // Nueva posición objetivo aleatoria y sutil
      _idleTilt.targetX = (Math.random() - 0.5) * 0.06;
      _idleTilt.targetY = (Math.random() - 0.5) * 0.08;
      _idleTilt.interval = 2.5 + Math.random() * 3.0;
      _idleTilt.timer    = 0;
    }

    // Lerp suave hacia el objetivo
    // NOTA: Este offset se añade a la rotación del tracking (F06).
    // RobotTracking domina la rotación principal; este es un delta sutil.
    _idleTilt.currentX = THREE.MathUtils.lerp(_idleTilt.currentX, _idleTilt.targetX, 0.015);
    _idleTilt.currentY = THREE.MathUtils.lerp(_idleTilt.currentY, _idleTilt.targetY, 0.015);

    // Aplicar como offset SOBRE la rotación del tracking
    // Se usa una propiedad userData para no pisar la rotación del tracking
    _headGroup.userData.idleTiltX = _idleTilt.currentX;
    _headGroup.userData.idleTiltY = _idleTilt.currentY;
  }

  /* ════════════════════════════════════════════════════════════
     ANIMACIÓN: MANDÍBULA IDLE
     Micro-vibraciones muy sutiles, como si el robot
     procesara información silenciosamente.
  ════════════════════════════════════════════════════════════ */
  function _animJaw(elapsed) {
    if (!_jaw) return;

    // Vibración muy sutil en Y usando ruido periódico
    const noise =
      Math.sin(elapsed * 7.3) * 0.002 +
      Math.sin(elapsed * 13.1) * 0.001;

    _jaw.position.y = -0.56 + noise;
  }

  /* ════════════════════════════════════════════════════════════
     ANIMACIÓN: SCAN LINES
     Las líneas HUD del panel facial se desplazan lentamente
     hacia abajo y se reinician arriba (efecto de escaneo).
  ════════════════════════════════════════════════════════════ */
  function _animScanLines(elapsed) {
    const scanLines = _findAll('scanLine_');
    if (!scanLines.length) return;

    scanLines.forEach((line, i) => {
      // Cada línea con velocidad y fase ligeramente distinta
      const speed  = 0.18 + i * 0.03;
      const range  = 0.28;
      const offset = (i / scanLines.length) * range;
      const t      = ((elapsed * speed + offset) % 1);
      // Mapear t a [-0.14, 0.14] y oscila
      line.position.y = -0.14 + t * 0.28;

      // Opacidad cae cuando está en los extremos
      const alpha = Math.sin(t * Math.PI);
      if (line.material) {
        line.material.opacity = 0.15 + alpha * 0.4;
      }
    });
  }

  /* ════════════════════════════════════════════════════════════
     ANIMACIÓN: GLOW RINGS
     Los anillos orbitales rotan a velocidades distintas
     y con ejes distintos para crear un efecto holográfico.
  ════════════════════════════════════════════════════════════ */
  function _animGlowRings(elapsed) {
    const rings = _findAll('glowRing_');
    if (!rings.length) return;

    const speeds  = [0.4, -0.28, 0.52];
    const axes    = ['y', 'z', 'x'];

    rings.forEach((ring, i) => {
      const s = speeds[i] || 0.3;
      const a = axes[i]   || 'y';
      ring.rotation[a] = elapsed * s * Math.PI * 2;

      // Pulso de opacidad
      ring.material.opacity = 0.35 + Math.sin(elapsed * 0.9 + i * 1.2) * 0.25;
    });
  }

  /* ════════════════════════════════════════════════════════════
     ANIMACIÓN: PULSO DE ANTENAS
     Los tips de las antenas parpadean en secuencia
     (cascada de izquierda a derecha).
  ════════════════════════════════════════════════════════════ */
  function _animAntennae(elapsed) {
    // Las puntas de las antenas son MeshStandardMaterial con emissive
    // Se añadieron a _eyeMaterials en RobotHead, pero aquí las buscamos
    // por posición en la escena (las esferas en la corona de la cabeza).
    // Usamos el headGroup para buscar los tipMesh por su posición Y alta.
    if (!_headGroup) return;

    const tips = [];
    _headGroup.traverse(obj => {
      if (
        obj.isMesh &&
        obj.geometry &&
        obj.geometry.type === 'SphereGeometry' &&
        obj.position.y > 0.6
      ) {
        tips.push(obj);
      }
    });

    tips.forEach((tip, i) => {
      if (tip.material) {
        const phase = i * (Math.PI * 2 / 3);
        tip.material.emissiveIntensity = 1.0 + Math.sin(elapsed * 2.5 + phase) * 1.2;
      }
    });
  }

  /* ════════════════════════════════════════════════════════════
     GLITCH
     Desplazamiento rápido de la cabeza + cambio de color de ojos.
     Llamado externamente por GlitchEffect.js (F16).
  ════════════════════════════════════════════════════════════ */
  function _animGlitch(delta) {
    if (!_glitchActive || !_headGroup) return;

    _glitchTimer += delta;

    if (_glitchTimer < _glitchDuration) {
      const t = _glitchTimer / _glitchDuration;

      // Desplazamiento aleatorio decreciente
      const intensity = _glitchIntensity * (1 - t);
      _headGroup.position.x = (Math.random() - 0.5) * intensity * 0.12;
      _headGroup.position.z = (Math.random() - 0.5) * intensity * 0.06;
      _headGroup.rotation.z = (Math.random() - 0.5) * intensity * 0.08;

      // Parpadeo de ojos a color violeta durante el glitch
      if (_eyes && _eyes.left && _eyes.left.material) {
        const violet = new THREE.Color(_css('--js-color-violet') || '#7f5af0');
        const cyan   = new THREE.Color(_css('--js-color-cyan')   || '#00ffff');
        const lerpColor = violet.clone().lerp(cyan, t);
        _eyes.left.material.color.set(lerpColor);
        _eyes.left.material.emissive.set(lerpColor);
        _eyes.right.material.color.set(lerpColor);
        _eyes.right.material.emissive.set(lerpColor);
      }
    } else {
      // Restaurar estado normal
      _headGroup.position.x = 0;
      _headGroup.position.z = 0;
      _headGroup.rotation.z = 0;

      if (_eyes && _eyes.left && _eyes.left.material) {
        const cyan = new THREE.Color(_css('--js-color-cyan') || '#00ffff');
        _eyes.left.material.color.set(cyan);
        _eyes.left.material.emissive.set(cyan);
        _eyes.right.material.color.set(cyan);
        _eyes.right.material.emissive.set(cyan);
      }

      _glitchActive = false;
    }
  }

  /* ── Referencia a pupils (necesaria para el blink) ────────── */
  let _pupils = { left: null, right: null };

  function _getPupils() {
    if (!_headGroup) return;
    _headGroup.traverse(obj => {
      if (obj.name === 'pupil_left')  _pupils.left  = obj;
      if (obj.name === 'pupil_right') _pupils.right = obj;
    });
  }

  /* ── Callback principal del render loop ─────────────────────
     Recibe (delta, elapsed) desde RobotCore.
  ─────────────────────────────────────────────────────────────── */
  function _tick(delta, elapsed) {
    if (_paused || !_ready) return;

    if (_reducedMotion) {
      // Solo pulso de ojos en modo reduced-motion (no mueve nada)
      _animEyePulse(elapsed);
      return;
    }

    _animBreathing(elapsed);
    _animEyePulse(elapsed);
    _animBlink(delta);
    _animIdleTilt(delta);
    _animJaw(elapsed);
    _animScanLines(elapsed);
    _animGlowRings(elapsed);
    _animAntennae(elapsed);

    if (_glitchActive) {
      _animGlitch(delta);
    }
  }

  /* ── API PÚBLICA ──────────────────────────────────────────── */

  function init() {
    if (_ready) return;

    if (!window.RobotCore || !window.RobotCore.isReady()) {
      console.error('[RobotAnimations] RobotCore no está listo.');
      return;
    }
    if (!window.RobotHead || !window.RobotHead.isReady()) {
      console.error('[RobotAnimations] RobotHead no está listo.');
      return;
    }

    _scene      = window.RobotCore.getScene();
    _robotGroup = window.RobotHead.getGroup();
    _headGroup  = window.RobotHead.getHead();
    _eyes       = window.RobotHead.getEyes();
    _jaw        = window.RobotHead.getJaw();

    _getPupils();
    _checkReducedMotion();

    // Escuchar cambios de reduced-motion en tiempo real
    window.matchMedia('(prefers-reduced-motion: reduce)')
      .addEventListener('change', _checkReducedMotion);

    // Intervalo inicial de parpadeo aleatorizado
    _blinkInterval = _nextBlinkInterval();

    // Registrar en el render loop
    window.RobotCore.addToLoop(_tick);

    _ready = true;
    console.log('[RobotAnimations] ✓ Animaciones idle activas.');
  }

  function pause()  { _paused = true; }
  function resume() { _paused = false; }
  function isReady(){ return _ready; }

  /**
   * Fuerza un parpadeo inmediato.
   * Útil para sincronizar con eventos de la UI.
   */
  function triggerBlink() {
    if (!_ready) return;
    _blinkState    = 'closing';
    _blinkProgress = 0;
    _blinkTimer    = 0;
  }

  /**
   * Activa un micro-glitch de la cabeza.
   * Llamado desde GlitchEffect.js (F16) para sincronizar
   * el efecto CSS con el 3D.
   * @param {number} duration   — duración en segundos (default: 0.35)
   * @param {number} intensity  — intensidad 0-1 (default: 1.0)
   */
  function triggerGlitch(duration, intensity) {
    if (!_ready) return;
    _glitchActive    = true;
    _glitchTimer     = 0;
    _glitchDuration  = duration  || 0.35;
    _glitchIntensity = intensity || 1.0;
  }

  function destroy() {
    if (window.RobotCore) window.RobotCore.removeFromLoop(_tick);
    _ready  = false;
    _paused = false;
  }

  return {
    init,
    pause,
    resume,
    isReady,
    triggerBlink,
    triggerGlitch,
    destroy,
  };

})();

window.RobotAnimations = RobotAnimations;
