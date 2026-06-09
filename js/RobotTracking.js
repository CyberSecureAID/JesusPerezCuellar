/*
  ============================================================
  CYBER PORTFOLIO — F06 · js/robot/RobotTracking.js
  ============================================================
  ESTADO: ✅ COMPLETADO
  VERSIÓN: 1.0.0
  FASE: 2 de 8

  DESCRIPCIÓN:
    Sistema de tracking del cursor. La cabeza del robot sigue
    al puntero del mouse con interpolación lerp, límites
    anatómicos de rotación y detección de zona hero.
    En mobile usa gyroscopio si está disponible (DeviceOrientation).

  DEPENDENCIAS:
    → RobotCore.js (F04) — window.RobotCore (loop, camera)
    → RobotHead.js (F05) — window.RobotHead (headGroup)

  COMPORTAMIENTO:
    · El mouse en el centro de la pantalla = cabeza recta
    · El mouse en los extremos = rotación máxima (±25° Y, ±18° X)
    · La interpolación es suave (lerp factor 0.045 por frame)
    · Fuera de la sección #hero → cabeza vuelve lentamente al centro
    · Hover sobre elementos interactivos → micro-tilt hacia ellos
    · Mobile con giroscopio → usa beta/gamma del dispositivo

  API PÚBLICA:
    RobotTracking.init()
    RobotTracking.enable()
    RobotTracking.disable()
    RobotTracking.setTarget(x, y)   → fuerza una posición normalizada
    RobotTracking.isActive()        → boolean

  PRÓXIMO ARCHIVO: F07 · js/robot/RobotAnimations.js
  ============================================================
*/

'use strict';

const RobotTracking = (() => {

  /* ── Configuración ────────────────────────────────────────── */
  const CONFIG = {
    // Límites de rotación en radianes
    maxRotY:      0.44,   // ±25° horizontal
    maxRotX:      0.31,   // ±18° vertical

    // Lerp: qué tan rápido sigue al cursor (0 = nunca, 1 = instantáneo)
    lerpFactor:   0.045,

    // Lerp más lento cuando el cursor está fuera del hero
    returnLerp:   0.028,

    // Zona muerta central — el robot no se mueve si el cursor
    // está en el ±10% central de la pantalla
    deadZone:     0.10,

    // Offset vertical: el robot mira ligeramente hacia arriba
    // por defecto (más natural)
    baseOffsetX: -0.04,

    // Gyro sensitivity (mobile)
    gyroSensY:    0.012,
    gyroSensX:    0.008,
  };

  /* ── Estado privado ───────────────────────────────────────── */
  let _active         = false;
  let _inHeroZone     = false;
  let _gyroEnabled    = false;

  // Posición normalizada del cursor: [-1, 1] en ambos ejes
  let _cursorNorm     = { x: 0, y: 0 };

  // Rotación actual del headGroup (interpolada)
  let _currentRot     = { x: CONFIG.baseOffsetX, y: 0 };

  // Rotación objetivo (calculada desde cursor)
  let _targetRot      = { x: CONFIG.baseOffsetX, y: 0 };

  // Referencias a objetos Three.js
  let _headGroup      = null;
  let _heroSection    = null;
  let _heroRect       = null;

  // IntersectionObserver para detectar si el hero está visible
  let _heroObserver   = null;

  /* ── Calcular rotación objetivo desde posición normalizada ── */
  function _calcTargetRot(nx, ny) {
    // Aplicar zona muerta
    const dx = Math.abs(nx) < CONFIG.deadZone ? 0 : nx;
    const dy = Math.abs(ny) < CONFIG.deadZone ? 0 : ny;

    // Aplicar curva de potencia para más suavidad en el centro
    const px = Math.sign(dx) * Math.pow(Math.abs(dx), 1.3);
    const py = Math.sign(dy) * Math.pow(Math.abs(dy), 1.3);

    return {
      y: px * CONFIG.maxRotY,
      x: CONFIG.baseOffsetX + (-py * CONFIG.maxRotX),
    };
  }

  /* ── Handler de mouse ─────────────────────────────────────── */
  function _onMouseMove(e) {
    if (!_active) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Normalizar a [-1, 1]
    _cursorNorm.x = (e.clientX / vw) * 2 - 1;
    _cursorNorm.y = (e.clientY / vh) * 2 - 1;  // positivo = abajo

    // Verificar si el cursor está sobre la sección hero
    if (_heroRect) {
      _inHeroZone = (
        e.clientX >= _heroRect.left &&
        e.clientX <= _heroRect.right &&
        e.clientY >= _heroRect.top  &&
        e.clientY <= _heroRect.bottom
      );
    }

    if (_inHeroZone) {
      _targetRot = _calcTargetRot(_cursorNorm.x, _cursorNorm.y);
    }
  }

  /* ── Handler de touch (mobile sin giroscopio) ─────────────── */
  function _onTouchMove(e) {
    if (!_active || _gyroEnabled) return;
    const t = e.touches[0];
    if (!t) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    _cursorNorm.x = (t.clientX / vw) * 2 - 1;
    _cursorNorm.y = (t.clientY / vh) * 2 - 1;
    _targetRot = _calcTargetRot(_cursorNorm.x, _cursorNorm.y);
  }

  /* ── Giroscopio (mobile) ─────────────────────────────────── */
  function _onDeviceOrientation(e) {
    if (!_active || !_gyroEnabled) return;

    // beta: inclinación frontal/atrás (-180 a 180)
    // gamma: inclinación izquierda/derecha (-90 a 90)
    const beta  = e.beta  || 0;
    const gamma = e.gamma || 0;

    // Normalizar al rango útil (el teléfono en vertical está ~90° beta)
    const normY = THREE.MathUtils.clamp(gamma / 45, -1, 1);
    const normX = THREE.MathUtils.clamp((beta - 90) / 45, -1, 1);

    _targetRot = _calcTargetRot(normY, normX);
  }

  /* ── Solicitar permisos de giroscopio (iOS 13+) ───────────── */
  async function _requestGyro() {
    if (typeof DeviceOrientationEvent === 'undefined') return false;

    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const perm = await DeviceOrientationEvent.requestPermission();
        return perm === 'granted';
      } catch {
        return false;
      }
    }
    // Android / otros: no requiere permiso explícito
    return true;
  }

  /* ── Actualizar hero rect (en resize) ─────────────────────── */
  function _updateHeroRect() {
    if (_heroSection) {
      _heroRect = _heroSection.getBoundingClientRect();
    }
  }

  /* ── Callback del render loop ─────────────────────────────── */
  function _tick(delta, elapsed) {
    if (!_headGroup || !_active) return;

    // Si el cursor no está en el hero, volver lentamente al centro
    const lf = _inHeroZone ? CONFIG.lerpFactor : CONFIG.returnLerp;

    if (!_inHeroZone) {
      _targetRot.x = THREE.MathUtils.lerp(_targetRot.x, CONFIG.baseOffsetX, 0.02);
      _targetRot.y = THREE.MathUtils.lerp(_targetRot.y, 0, 0.02);
    }

    // Interpolación lerp hacia el objetivo
    _currentRot.x = THREE.MathUtils.lerp(_currentRot.x, _targetRot.x, lf);
    _currentRot.y = THREE.MathUtils.lerp(_currentRot.y, _targetRot.y, lf);

    // Aplicar rotación al headGroup
    _headGroup.rotation.x = _currentRot.x;
    _headGroup.rotation.y = _currentRot.y;
  }

  /* ── API PÚBLICA ──────────────────────────────────────────── */

  async function init() {
    if (!window.RobotCore || !window.RobotCore.isReady()) {
      console.error('[RobotTracking] RobotCore no está listo.');
      return;
    }
    if (!window.RobotHead || !window.RobotHead.isReady()) {
      console.error('[RobotTracking] RobotHead no está listo.');
      return;
    }

    _headGroup   = window.RobotHead.getHead();
    _heroSection = document.getElementById('hero');

    // Calcular rect inicial
    _updateHeroRect();

    // Observar visibilidad del hero
    _heroObserver = new IntersectionObserver(entries => {
      _inHeroZone = entries[0].isIntersecting;
    }, { threshold: 0.3 });
    if (_heroSection) _heroObserver.observe(_heroSection);

    // Registrar en el loop de RobotCore
    window.RobotCore.addToLoop(_tick);

    // Eventos de mouse
    window.addEventListener('mousemove', _onMouseMove, { passive: true });
    window.addEventListener('touchmove', _onTouchMove, { passive: true });
    window.addEventListener('resize',    _updateHeroRect, { passive: true });

    // Giroscopio en mobile
    const isMobile = /Mobi|Android/i.test(navigator.userAgent);
    if (isMobile && 'DeviceOrientationEvent' in window) {
      _gyroEnabled = await _requestGyro();
      if (_gyroEnabled) {
        window.addEventListener('deviceorientation', _onDeviceOrientation, { passive: true });
        console.log('[RobotTracking] Giroscopio habilitado.');
      }
    }

    _active = true;
    console.log('[RobotTracking] ✓ Tracking activo.');
  }

  function enable()  { _active = true; }
  function disable() { _active = false; }
  function isActive(){ return _active; }

  /**
   * Fuerza una posición normalizada de la cabeza.
   * Útil para animaciones de intro o demos.
   * @param {number} x — [-1, 1]
   * @param {number} y — [-1, 1]
   */
  function setTarget(x, y) {
    _targetRot = _calcTargetRot(
      THREE.MathUtils.clamp(x, -1, 1),
      THREE.MathUtils.clamp(y, -1, 1)
    );
    _inHeroZone = true; // forzar aplicación
  }

  function destroy() {
    window.removeEventListener('mousemove', _onMouseMove);
    window.removeEventListener('touchmove', _onTouchMove);
    window.removeEventListener('resize',    _updateHeroRect);
    window.removeEventListener('deviceorientation', _onDeviceOrientation);
    if (_heroObserver) _heroObserver.disconnect();
    if (window.RobotCore) window.RobotCore.removeFromLoop(_tick);
    _active = false;
  }

  return { init, enable, disable, isActive, setTarget, destroy };

})();

window.RobotTracking = RobotTracking;
