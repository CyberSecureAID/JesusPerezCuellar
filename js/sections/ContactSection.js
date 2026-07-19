/*
  ============================================================
  CYBER PORTFOLIO — F20 · js/sections/ContactSection.js
  ============================================================
  ESTADO: ✅ COMPLETADO
  VERSIÓN: 1.0.0
  FASE: 6 de 8

  DESCRIPCIÓN:
    Interactividad de la sección de contacto.
    Validación JS del formulario con feedback visual estilo
    terminal, efecto de escritura en inputs, copy al clipboard
    para email y manejo del submit con feedback de éxito/error.

  DEPENDENCIAS:
    → index.html (F01) — #contact-form, #contact-name,
      #contact-email, #contact-service, #contact-message,
      #submit-btn, #submit-text, #form-success,
      .copy-btn[data-copy], .form-input, .form-error
    → css/components.css (F12) — .is-invalid, .is-valid,
      .is-loading, .copied
    → css/layout.css (F11) — .form-group, .form-label

  FEATURES:
    · Validación en tiempo real (blur) + al submit
    · Mensajes de error inline por campo con aria-live
    · Efecto terminal: label se convierte en prompt ">"
      mientras el input tiene foco
    · Contador de caracteres en el textarea
    · Copy al clipboard para .copy-btn[data-copy]
    · Submit: bloquea botón, muestra spinner inline,
      simula envío (placeholder para integración real)
    · Mensaje de éxito con reveal animado
    · Reset del formulario tras éxito
    · Soporte completo reduced-motion
    · Accesibilidad: aria-invalid, aria-describedby,
      aria-live en mensajes de error

  API PÚBLICA:
    ContactSection.init()
    ContactSection.validate()       → boolean (valida todo)
    ContactSection.reset()          → limpia formulario y errores
    ContactSection.pause()
    ContactSection.resume()
    ContactSection.isReady()        → boolean
    ContactSection.destroy()

  INTEGRACIÓN:
    Descomentar en index.html:
      <script src="js/sections/ContactSection.js"></script>
    Añadir a la secuencia de init:
      ContactSection.init();

  PRÓXIMO ARCHIVO: F21 · js/audio/AudioManager.js
  ============================================================
*/

'use strict';

const ContactSection = (() => {

  /* ── Estado ─────────────────────────────────────────────── */
  let _ready         = false;
  let _paused        = false;
  let _reducedMotion = false;
  let _submitting    = false;

  /* Referencias DOM */
  let _form        = null;
  let _submitBtn   = null;
  let _submitText  = null;
  let _successEl   = null;
  let _fields      = {};     // { name, email, service, message }
  let _errorEls    = {};     // { name, email, message }
  let _charCounter = null;

  /* ── Helpers ─────────────────────────────────────────────── */
  function _qs(sel, root)  { return (root || document).querySelector(sel); }
  function _qsa(sel, root) { return [...(root || document).querySelectorAll(sel)]; }

  /* ════════════════════════════════════════════════════════
     VALIDADORES
  ════════════════════════════════════════════════════════ */

  const _validators = {
    name(v) {
      if (!v.trim())            return 'El nombre es requerido.';
      if (v.trim().length < 2)  return 'El nombre debe tener al menos 2 caracteres.';
      return null;
    },
    email(v) {
      if (!v.trim())            return 'El email es requerido.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()))
        return 'Ingresa un email válido.';
      return null;
    },
    message(v) {
      if (!v.trim())            return 'El mensaje es requerido.';
      if (v.trim().length < 10) return 'El mensaje debe tener al menos 10 caracteres.';
      if (v.trim().length > 2000) return 'El mensaje no puede superar los 2000 caracteres.';
      return null;
    },
  };

  /* ── Mostrar error en un campo ────────────────────────────── */
  function _setError(fieldName, message) {
    const input = _fields[fieldName];
    const errEl = _errorEls[fieldName];
    if (!input) return;

    input.classList.add('is-invalid');
    input.classList.remove('is-valid');
    input.setAttribute('aria-invalid', 'true');

    if (errEl) {
      errEl.textContent = message || '';
    }
  }

  /* ── Limpiar error de un campo ───────────────────────────── */
  function _clearError(fieldName) {
    const input = _fields[fieldName];
    const errEl = _errorEls[fieldName];
    if (!input) return;

    input.classList.remove('is-invalid');
    input.setAttribute('aria-invalid', 'false');

    if (errEl) errEl.textContent = '';
  }

  /* ── Marcar campo como válido ─────────────────────────────── */
  function _setValid(fieldName) {
    const input = _fields[fieldName];
    if (!input) return;
    input.classList.remove('is-invalid');
    input.classList.add('is-valid');
    input.setAttribute('aria-invalid', 'false');
  }

  /* ── Validar un campo individual ─────────────────────────── */
  function _validateField(fieldName) {
    const validator = _validators[fieldName];
    if (!validator) return true;

    const input = _fields[fieldName];
    if (!input) return true;

    const error = validator(input.value);
    if (error) {
      _setError(fieldName, error);
      return false;
    } else {
      _setValid(fieldName);
      return true;
    }
  }

  /* ════════════════════════════════════════════════════════
     EFECTO TERMINAL EN LABELS
     Mientras el input tiene foco, el label muestra "> "
     delante del texto como un prompt de terminal.
  ════════════════════════════════════════════════════════ */

  /* Guarda el texto original de cada label code */
  const _labelOriginals = new Map();

  function _initTerminalLabels() {
    _qsa('.form-group').forEach(group => {
      const label    = _qs('.form-label', group);
      const codeSpan = _qs('.form-label-code', label);
      const input    = _qs('.form-input', group);
      if (!label || !input || !codeSpan) return;

      const original = codeSpan.textContent;
      _labelOriginals.set(codeSpan, original);

      input.addEventListener('focus', () => {
        if (_reducedMotion) return;
        codeSpan.textContent = '>';
        label.style.color    = 'var(--color-cyan-400)';
        codeSpan.style.color = 'var(--color-cyan-500)';
      });

      input.addEventListener('blur', () => {
        codeSpan.textContent = _labelOriginals.get(codeSpan) || original;
        label.style.color    = '';
        codeSpan.style.color = '';
      });
    });
  }

  /* ════════════════════════════════════════════════════════
     CONTADOR DE CARACTERES EN TEXTAREA
  ════════════════════════════════════════════════════════ */
  function _initCharCounter() {
    const textarea = _fields.message;
    if (!textarea) return;

    _charCounter = document.createElement('span');
    _charCounter.className   = '__char-counter';
    _charCounter.setAttribute('aria-live', 'polite');
    _charCounter.setAttribute('aria-atomic', 'true');
    _charCounter.style.cssText = `
      font-family: var(--font-mono);
      font-size: var(--text-2xs);
      letter-spacing: var(--tracking-code);
      color: var(--color-text-muted);
      align-self: flex-end;
      user-select: none;
    `;

    const group = textarea.closest('.form-group');
    if (group) {
      group.style.position = 'relative';
      group.appendChild(_charCounter);
    }

    function _update() {
      const len  = textarea.value.length;
      const max  = 2000;
      const pct  = len / max;
      _charCounter.textContent = `${len} / ${max}`;
      _charCounter.style.color = pct > 0.9
        ? 'var(--color-red-400)'
        : pct > 0.7
          ? 'var(--color-yellow-400)'
          : 'var(--color-text-muted)';
    }

    textarea.addEventListener('input', _update);
    _update();
  }

  /* ════════════════════════════════════════════════════════
     COPY TO CLIPBOARD
  ════════════════════════════════════════════════════════ */
  function _initCopyButtons() {
    _qsa('.copy-btn[data-copy]').forEach(btn => {
      /* Eliminar listener previo del inline JS si existe */
      const fresh = btn.cloneNode(true);
      btn.parentNode.replaceChild(fresh, btn);

      fresh.addEventListener('click', async () => {
        const text = fresh.dataset.copy;
        if (!text) return;

        try {
          await navigator.clipboard.writeText(text);
          fresh.classList.add('copied');

          /* Swap del SVG por un check */
          const originalHTML = fresh.innerHTML;
          fresh.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="var(--color-green-400)" stroke-width="2.5" aria-hidden="true">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          `;

          setTimeout(() => {
            fresh.classList.remove('copied');
            fresh.innerHTML = originalHTML;
          }, 2000);
        } catch {
          /* Fallback para navegadores sin clipboard API */
          const ta = document.createElement('textarea');
          ta.value     = text;
          ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none;';
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);

          fresh.classList.add('copied');
          setTimeout(() => fresh.classList.remove('copied'), 2000);
        }
      });
    });
  }

  /* ════════════════════════════════════════════════════════
     SUBMIT
  ════════════════════════════════════════════════════════ */

  /* Animar el botón a estado de carga */
  function _setLoading(active) {
    if (!_submitBtn || !_submitText) return;

    if (active) {
      _submitting = true;
      _submitBtn.classList.add('is-loading');
      _submitBtn.disabled = true;
      _submitText.textContent = 'Enviando';

      /* Spinner SVG inline */
      const spin = document.createElement('span');
      spin.id = '__submit-spinner';
      spin.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2" aria-hidden="true"
          style="animation:__spin 0.8s linear infinite;display:inline-block;vertical-align:middle;margin-left:6px;">
          <circle cx="12" cy="12" r="10" stroke-opacity="0.25"/>
          <path d="M12 2a10 10 0 0 1 10 10" stroke-opacity="1"/>
        </svg>
      `;
      if (!_submitBtn.querySelector('#__submit-spinner')) {
        _submitBtn.appendChild(spin);
      }

      /* Inyectar keyframe del spinner si no existe */
      if (!document.getElementById('__spin-style')) {
        const s = document.createElement('style');
        s.id = '__spin-style';
        s.textContent = '@keyframes __spin { to { transform: rotate(360deg); } }';
        document.head.appendChild(s);
      }
    } else {
      _submitting = false;
      _submitBtn.classList.remove('is-loading');
      _submitBtn.disabled = false;
      _submitText.textContent = 'Enviar mensaje';
      const spin = _submitBtn.querySelector('#__submit-spinner');
      if (spin) spin.remove();
    }
  }

  /* Mostrar mensaje de éxito */
  function _showSuccess() {
    if (!_successEl) return;
    _successEl.hidden = false;
    _successEl.style.opacity = '0';
    _successEl.style.transform = 'translateY(8px)';
    _successEl.style.transition = _reducedMotion
      ? 'none'
      : 'opacity 0.4s ease, transform 0.4s cubic-bezier(0.23,1,0.32,1)';

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        _successEl.style.opacity   = '1';
        _successEl.style.transform = 'translateY(0)';
      });
    });

    /* Sincronizar robot */
    if (window.RobotAnimations && window.RobotAnimations.isReady()) {
      window.RobotAnimations.triggerBlink();
    }
  }

  /* Ocultar mensaje de éxito */
  function _hideSuccess() {
    if (!_successEl) return;
    _successEl.hidden = true;
    _successEl.style.opacity   = '';
    _successEl.style.transform = '';
  }

  /* Envío del formulario */
  async function _handleSubmit(e) {
    e.preventDefault();
    if (_submitting || _paused) return;

    /* Validar todos los campos */
    const validName    = _validateField('name');
    const validEmail   = _validateField('email');
    const validMessage = _validateField('message');

    if (!validName || !validEmail || !validMessage) {
      /* Focus al primer campo inválido */
      const firstInvalid = _form.querySelector('.is-invalid');
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    _setLoading(true);
    _hideSuccess();

    try {
      /*
        ─────────────────────────────────────────────────────
        INTEGRACIÓN REAL:
        Reemplaza este bloque con tu endpoint real.
        Ejemplo Formspree:
          const res = await fetch('https://formspree.io/f/YOUR_ID', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({
              name:    _fields.name.value,
              email:   _fields.email.value,
              service: _fields.service?.value,
              message: _fields.message.value,
            }),
          });
          if (!res.ok) throw new Error('Server error');
        ─────────────────────────────────────────────────────
      */

      /* Simular latencia de red (eliminar en producción) */
      await new Promise(resolve => setTimeout(resolve, 1400));

      _setLoading(false);
      _showSuccess();
      reset();

    } catch (err) {
      _setLoading(false);
      console.error('[ContactSection] Error al enviar:', err);

      /* Mostrar error global como form-error en el botón */
      let globalErr = _qs('.__form-global-error');
      if (!globalErr) {
        globalErr = document.createElement('p');
        globalErr.className = '__form-global-error form-error';
        globalErr.setAttribute('role', 'alert');
        globalErr.setAttribute('aria-live', 'assertive');
        globalErr.style.marginTop = 'var(--space-3)';
        _submitBtn.insertAdjacentElement('afterend', globalErr);
      }
      globalErr.textContent = 'Hubo un problema al enviar. Por favor intenta nuevamente.';

      setTimeout(() => {
        if (globalErr && globalErr.parentNode) {
          globalErr.textContent = '';
        }
      }, 6000);
    }
  }

  /* ════════════════════════════════════════════════════════
     VALIDACIÓN EN BLUR (tiempo real)
  ════════════════════════════════════════════════════════ */
  function _bindFieldValidation() {
    ['name', 'email', 'message'].forEach(name => {
      const input = _fields[name];
      if (!input) return;

      /* Validar al salir del campo */
      input.addEventListener('blur', () => {
        if (input.value.trim()) _validateField(name);
      });

      /* Limpiar error mientras escribe (si ya había error) */
      input.addEventListener('input', () => {
        if (input.classList.contains('is-invalid')) {
          _clearError(name);
        }
      });
    });
  }

  /* ════════════════════════════════════════════════════════
     API PÚBLICA
  ════════════════════════════════════════════════════════ */

  /**
   * Valida todos los campos del formulario.
   * @returns {boolean}
   */
  function validate() {
    if (!_ready) return false;
    const ok = ['name', 'email', 'message'].every(n => _validateField(n));
    return ok;
  }

  /**
   * Limpia el formulario y todos los estados de error/éxito.
   */
  function reset() {
    if (!_form) return;
    _form.reset();

    ['name', 'email', 'message'].forEach(name => {
      const input = _fields[name];
      if (!input) return;
      input.classList.remove('is-invalid', 'is-valid');
      input.setAttribute('aria-invalid', 'false');
    });

    Object.values(_errorEls).forEach(el => {
      if (el) el.textContent = '';
    });

    if (_charCounter) {
      _charCounter.textContent = `0 / 2000`;
      _charCounter.style.color = 'var(--color-text-muted)';
    }

    _hideSuccess();
  }

  function pause()   { _paused = true; }
  function resume()  { _paused = false; }
  function isReady() { return _ready; }

  function init() {
    if (_ready) return;

    _form       = document.getElementById('contact-form');
    _submitBtn  = document.getElementById('submit-btn');
    _submitText = document.getElementById('submit-text');
    _successEl  = document.getElementById('form-success');

    if (!_form) {
      console.warn('[ContactSection] No se encontró #contact-form.');
      return;
    }

    /* Cachear campos */
    _fields = {
      name:    document.getElementById('contact-name'),
      email:   document.getElementById('contact-email'),
      service: document.getElementById('contact-service'),
      message: document.getElementById('contact-message'),
    };

    /* Cachear elementos de error */
    _errorEls = {
      name:    document.getElementById('name-error'),
      email:   document.getElementById('email-error'),
      message: document.getElementById('message-error'),
    };

    _reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.matchMedia('(prefers-reduced-motion: reduce)')
      .addEventListener('change', e => { _reducedMotion = e.matches; });

    /* Inicializar features */
    _initTerminalLabels();
    _initCharCounter();
    _initCopyButtons();
    _bindFieldValidation();

    /* Submit handler */
    _form.addEventListener('submit', _handleSubmit);

    _ready = true;
    console.log('[ContactSection] ✓ Formulario de contacto activo.');
  }

  function destroy() {
    if (_form) {
      _form.removeEventListener('submit', _handleSubmit);
    }

    /* Restaurar labels */
    _qsa('.form-group').forEach(group => {
      const label    = _qs('.form-label', group);
      const codeSpan = _qs('.form-label-code', label);
      if (codeSpan && _labelOriginals.has(codeSpan)) {
        codeSpan.textContent = _labelOriginals.get(codeSpan);
      }
    });
    _labelOriginals.clear();

    /* Eliminar contador */
    if (_charCounter && _charCounter.parentNode) {
      _charCounter.parentNode.removeChild(_charCounter);
    }

    reset();

    _form       = null;
    _submitBtn  = null;
    _submitText = null;
    _successEl  = null;
    _fields     = {};
    _errorEls   = {};
    _charCounter = null;
    _ready      = false;

    console.log('[ContactSection] Destruido.');
  }

  return {
    init,
    validate,
    reset,
    pause,
    resume,
    isReady,
    destroy,
  };

})();

window.ContactSection = ContactSection;
