/*
  ============================================================
  CYBER PORTFOLIO — F14 · js/ui/TypeWriter.js
  ============================================================
  ESTADO: ✅ COMPLETADO
  VERSIÓN: 1.0.0
  FASE: 5 de 8

  DESCRIPCIÓN:
    Efecto typewriter con cursor parpadeante para el hero.
    Rota entre especialidades con efecto de escritura y borrado.
    Micro-glitch en la transición entre palabras — llama a
    RobotAnimations.triggerGlitch() para sincronía 3D.

  DEPENDENCIAS:
    → #typewriter-target   — span en index.html (hero)
    → RobotAnimations.js (F07) — triggerGlitch() (opcional)

  API PÚBLICA:
    TypeWriter.init()
    TypeWriter.pause()
    TypeWriter.resume()
    TypeWriter.setStrings(arr)   → reemplaza las especialidades
    TypeWriter.isReady()         → boolean
    TypeWriter.destroy()

  INTEGRACIÓN:
    Descomentar en index.html:
      <script src="js/ui/TypeWriter.js"></script>
    Añadir a la secuencia de init en el bloque inline:
      TypeWriter.init();

  PRÓXIMO ARCHIVO: F15 · js/ui/ScrollAnimations.js
  ============================================================
*/

'use strict';

const TypeWriter = (() => {

  /* ── Especialidades en rotación ─────────────────────────── */
  const DEFAULT_STRINGS = [
    'Software Developer',
    'Ethical Hacker',
    'Blockchain Dev',
    'Pentest Specialist',
    'Web3 Architect',
    'AI/ML Engineer',
  ];

  /* ── Configuración ──────────────────────────────────────── */
  const CONFIG = {
    typeSpeed:    62,    // ms por carácter al escribir
    deleteSpeed:  32,    // ms por carácter al borrar
    pauseAfter:   2200,  // ms de espera con el texto completo
    pauseEmpty:   480,   // ms de espera con el texto vacío
    glitchChars:  '!<>-_\\/[]{}—=+*^?#░▒▓',
    glitchFrames: 5,     // frames de glitch antes de escribir la nueva palabra
  };

  /* ── Estado ─────────────────────────────────────────────── */
  let _ready       = false;
  let _paused      = false;
  let _destroyed   = false;
  let _strings     = [...DEFAULT_STRINGS];
  let _target      = null;
  let _currentIdx  = 0;
  let _timeoutId   = null;
  let _reducedMotion = false;

  /* ── Helpers ────────────────────────────────────────────── */
  function _rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function _randChar() {
    return CONFIG.glitchChars[_rand(0, CONFIG.glitchChars.length - 1)];
  }

  function _schedule(fn, delay) {
    if (_destroyed) return;
    _timeoutId = setTimeout(() => {
      if (_destroyed) return;
      if (!_paused) {
        fn();
      } else {
        /* Si está pausado, reencolar hasta que se reanude */
        const waitForResume = setInterval(() => {
          if (_destroyed) { clearInterval(waitForResume); return; }
          if (!_paused) { clearInterval(waitForResume); fn(); }
        }, 100);
      }
    }, delay);
  }

  /* ── Escribir texto carácter a carácter ─────────────────── */
  function _type(text, charIdx, onDone) {
    if (_destroyed || charIdx > text.length) { onDone && onDone(); return; }

    _target.textContent = text.slice(0, charIdx);

    /* Varianza natural: algún carácter tarda un poco más */
    const jitter = _rand(-8, 22);
    _schedule(() => _type(text, charIdx + 1, onDone), CONFIG.typeSpeed + jitter);
  }

  /* ── Borrar texto carácter a carácter ───────────────────── */
  function _delete(text, charIdx, onDone) {
    if (_destroyed || charIdx < 0) { onDone && onDone(); return; }

    _target.textContent = text.slice(0, charIdx);

    const jitter = _rand(-4, 10);
    _schedule(() => _delete(text, charIdx - 1, onDone), CONFIG.deleteSpeed + jitter);
  }

  /* ── Micro-glitch: sustituye el texto por ruido visual ─── */
  function _glitch(text, framesLeft, onDone) {
    if (_destroyed || framesLeft <= 0) { onDone && onDone(); return; }

    /* Genera una cadena de la misma longitud con chars aleatorios */
    const noise = text.split('').map(() => _randChar()).join('');
    _target.textContent = noise;
    _target.classList.add('is-erasing');

    _schedule(() => _glitch(text, framesLeft - 1, () => {
      _target.textContent = '';
      _target.classList.remove('is-erasing');
      onDone && onDone();
    }), 55);
  }

  /* ── Ciclo principal ────────────────────────────────────── */
  function _cycle() {
    if (_destroyed) return;

    const current = _strings[_currentIdx];

    /* 1. Escribir la palabra completa */
    _type(current, 0, () => {

      /* 2. Esperar con el texto visible */
      _schedule(() => {

        /* 3. Borrar */
        _delete(current, current.length, () => {

          /* 4. Micro-glitch en transición */
          _glitch(current, CONFIG.glitchFrames, () => {

            /* Sincronizar glitch con el robot 3D (F07) */
            if (window.RobotAnimations && window.RobotAnimations.isReady()) {
              window.RobotAnimations.triggerGlitch(0.28, 0.6);
            }

            /* 5. Pausa breve con cursor vacío */
            _schedule(() => {
              _currentIdx = (_currentIdx + 1) % _strings.length;
              _cycle();
            }, CONFIG.pauseEmpty);

          });
        });

      }, CONFIG.pauseAfter);
    });
  }

  /* ── Fallback para reduced-motion: solo rotar sin animar ── */
  function _rotateSimple() {
    if (_destroyed || _paused) return;
    _target.textContent = _strings[_currentIdx];
    _currentIdx = (_currentIdx + 1) % _strings.length;
    _schedule(_rotateSimple, CONFIG.pauseAfter + 400);
  }

  /* ── API PÚBLICA ────────────────────────────────────────── */

  function init() {
    if (_ready) return;

    _target = document.getElementById('typewriter-target');
    if (!_target) {
      console.error('[TypeWriter] No se encontró #typewriter-target.');
      return;
    }

    _reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.matchMedia('(prefers-reduced-motion: reduce)')
      .addEventListener('change', e => { _reducedMotion = e.matches; });

    _ready = true;

    /* Pequeño delay inicial para que el robot cargue primero */
    _schedule(() => {
      if (_reducedMotion) {
        _rotateSimple();
      } else {
        _cycle();
      }
    }, 800);

    console.log('[TypeWriter] ✓ Typewriter activo.');
  }

  function pause()   { _paused = true; }
  function resume()  { _paused = false; }
  function isReady() { return _ready; }

  /**
   * Reemplaza el array de especialidades.
   * El cambio se aplica en el siguiente ciclo.
   * @param {string[]} arr
   */
  function setStrings(arr) {
    if (!Array.isArray(arr) || !arr.length) return;
    _strings    = [...arr];
    _currentIdx = 0;
  }

  function destroy() {
    _destroyed = true;
    if (_timeoutId) clearTimeout(_timeoutId);
    if (_target) _target.textContent = _strings[0] || '';
    _ready = false;
  }

  return {
    init,
    pause,
    resume,
    setStrings,
    isReady,
    destroy,
  };
