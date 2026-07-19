/*
  ============================================================
  CYBER PORTFOLIO — F14 · js/ui/TypeWriter.js
  ============================================================
  VERSIÓN: 1.1.0 — Strings actualizados (dev/trader profile)
  ============================================================
*/

'use strict';

const TypeWriter = (() => {

  const DEFAULT_STRINGS = [
    'Software Developer',
    'Blockchain Developer',
    'Web3 Engineer',
    'Smart Contract Dev',
    'Python Developer',
    'Crypto Trader',
  ];

  const CONFIG = {
    typeSpeed:    62,
    deleteSpeed:  32,
    pauseAfter:   2200,
    pauseEmpty:   480,
    glitchChars:  '!<>-_\\/[]{}—=+*^?#░▒▓',
    glitchFrames: 5,
  };

  let _ready       = false;
  let _paused      = false;
  let _destroyed   = false;
  let _strings     = [...DEFAULT_STRINGS];
  let _target      = null;
  let _currentIdx  = 0;
  let _timeoutId   = null;
  let _reducedMotion = false;

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
        const waitForResume = setInterval(() => {
          if (_destroyed) { clearInterval(waitForResume); return; }
          if (!_paused) { clearInterval(waitForResume); fn(); }
        }, 100);
      }
    }, delay);
  }

  function _type(text, charIdx, onDone) {
    if (_destroyed || charIdx > text.length) { onDone && onDone(); return; }
    _target.textContent = text.slice(0, charIdx);
    const jitter = _rand(-8, 22);
    _schedule(() => _type(text, charIdx + 1, onDone), CONFIG.typeSpeed + jitter);
  }

  function _delete(text, charIdx, onDone) {
    if (_destroyed || charIdx < 0) { onDone && onDone(); return; }
    _target.textContent = text.slice(0, charIdx);
    const jitter = _rand(-4, 10);
    _schedule(() => _delete(text, charIdx - 1, onDone), CONFIG.deleteSpeed + jitter);
  }

  function _glitch(text, framesLeft, onDone) {
    if (_destroyed || framesLeft <= 0) { onDone && onDone(); return; }
    const noise = text.split('').map(() => _randChar()).join('');
    _target.textContent = noise;
    _target.classList.add('is-erasing');
    _schedule(() => _glitch(text, framesLeft - 1, () => {
      _target.textContent = '';
      _target.classList.remove('is-erasing');
      onDone && onDone();
    }), 55);
  }

  function _cycle() {
    if (_destroyed) return;
    const current = _strings[_currentIdx];
    _type(current, 0, () => {
      _schedule(() => {
        _delete(current, current.length, () => {
          _glitch(current, CONFIG.glitchFrames, () => {
            if (window.RobotAnimations && window.RobotAnimations.isReady()) {
              window.RobotAnimations.triggerGlitch(0.28, 0.6);
            }
            _schedule(() => {
              _currentIdx = (_currentIdx + 1) % _strings.length;
              _cycle();
            }, CONFIG.pauseEmpty);
          });
        });
      }, CONFIG.pauseAfter);
    });
  }

  function _rotateSimple() {
    if (_destroyed || _paused) return;
    _target.textContent = _strings[_currentIdx];
    _currentIdx = (_currentIdx + 1) % _strings.length;
    _schedule(_rotateSimple, CONFIG.pauseAfter + 400);
  }

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

  return { init, pause, resume, setStrings, isReady, destroy };

})();

window.TypeWriter = TypeWriter;
