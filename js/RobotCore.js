/*
  ============================================================
  CYBER PORTFOLIO — F04 · js/robot/RobotCore.js
  ============================================================
  ESTADO: ✅ COMPLETADO
  VERSIÓN: 1.0.0
  FASE: 2 de 8

  DESCRIPCIÓN:
    Motor principal del robot 3D. Gestiona la escena Three.js r128,
    la cámara, el renderer WebGL, la iluminación dramática y el
    loop de animación. Expone la API que consumen los módulos
    hermanos (F05, F06, F07) y el bootstrap (F22).

  DEPENDENCIAS:
    → THREE (global, CDN r128 cargado en index.html)
    → #robot-canvas  (canvas destino en index.html)
    → css/variables.css (F02) — lee colores via getComputedStyle

  MÓDULOS QUE DEPENDEN DE ESTE:
    → RobotHead.js       (F05) — añade geometría al scene
    → RobotTracking.js   (F06) — usa camera + scene
    → RobotAnimations.js (F07) — usa el loop de animación

  API PÚBLICA:
    RobotCore.init()           → inicializa todo, devuelve Promise
    RobotCore.getScene()       → THREE.Scene
    RobotCore.getCamera()      → THREE.PerspectiveCamera
    RobotCore.getRenderer()    → THREE.WebGLRenderer
    RobotCore.getClock()       → THREE.Clock
    RobotCore.addToLoop(fn)    → añade callback al render loop
    RobotCore.removeFromLoop(fn)
    RobotCore.isReady()        → boolean
    RobotCore.destroy()        → limpia recursos WebGL

  NOTAS TÉCNICAS:
    - Three.js r128: sin OrbitControls (CDN no los incluye).
    - Post-procesado Bloom emulado con luces puntuales de alta
      intensidad + MeshStandardMaterial emissive.
    - Renderer usa logarithmicDepthBuffer para evitar z-fighting
      en objetos cercanos (detalles del robot).
    - El canvas redimensiona automáticamente con ResizeObserver.
    - En mobile se baja el pixel ratio a 1 para mantener 30fps.

  PRÓXIMO ARCHIVO: F05 · js/robot/RobotHead.js
  ============================================================
*/

'use strict';

const RobotCore = (() => {

  /* ── Estado privado ───────────────────────────────────────── */
  let _canvas   = null;
  let _scene    = null;
  let _camera   = null;
  let _renderer = null;
  let _clock    = null;
  let _lights   = {};
  let _ready    = false;
  let _loopCallbacks = [];
  let _animFrameId   = null;
  let _resizeObserver = null;

  /* ── Leer colores CSS desde variables.css (F02) ───────────── */
  function _readCSSColor(varName) {
    return getComputedStyle(document.documentElement)
      .getPropertyValue(varName).trim();
  }

  /* ── Crear escena ─────────────────────────────────────────── */
  function _createScene() {
    _scene = new THREE.Scene();

    // Fog volumétrico: crea profundidad y ambiente sin post-pro
    // Color del fondo base (#050508) para fundirse con el CSS
    const fogColor = new THREE.Color(_readCSSColor('--js-color-bg') || '#050508');
    _scene.fog = new THREE.FogExp2(fogColor, 0.055);
    _scene.background = null; // Canvas transparente — fondo CSS visible
  }

  /* ── Crear cámara ─────────────────────────────────────────── */
  function _createCamera() {
    const fov    = parseFloat(_readCSSColor('--js-robot-fov')) || 45;
    const aspect = _canvas.clientWidth / _canvas.clientHeight || 1;

    _camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 100);

    // Posición: ligeramente elevada y alejada — vista dramática de 3/4
    _camera.position.set(0, 0.5, 5);
    _camera.lookAt(0, 0, 0);
  }

  /* ── Crear renderer ───────────────────────────────────────── */
  function _createRenderer() {
    const isMobile = window.innerWidth < 768;

    _renderer = new THREE.WebGLRenderer({
      canvas:                _canvas,
      antialias:             !isMobile,     // AA en desktop, off en mobile
      alpha:                 true,          // Fondo transparente
      powerPreference:       'high-performance',
      logarithmicDepthBuffer: true,         // Evita z-fighting en detalles
    });

    // Pixel ratio: máximo 2 en desktop, 1 en mobile (rendimiento)
    _renderer.setPixelRatio(
      isMobile ? 1 : Math.min(window.devicePixelRatio, 2)
    );
    _renderer.setSize(_canvas.clientWidth, _canvas.clientHeight, false);

    // Tone mapping: ACESFilmic da ese look cinematográfico oscuro
    _renderer.toneMapping        = THREE.ACESFilmicToneMapping;
    _renderer.toneMappingExposure = 1.2;

    // Output encoding: Linear (r128 no tiene sRGBEncoding como constante segura
    // en todos los builds, usamos el valor numérico 3000)
    // En r128: THREE.sRGBEncoding = 3000
    _renderer.outputEncoding = 3000;

    // Sombras: desactivadas para mantener 60fps
    // El look dramático lo conseguimos con iluminación, no sombras
    _renderer.shadowMap.enabled = false;
  }

  /* ── Sistema de iluminación dramática ────────────────────────
     Concepto: "sala de servidores con luz de emergencia"
     Tres fuentes principales + dos rims de acento + ambient mínimo.
  ─────────────────────────────────────────────────────────────── */
  function _createLights() {
    const cianColor   = new THREE.Color(_readCSSColor('--js-color-cyan')   || '#00ffff');
    const violetColor = new THREE.Color(_readCSSColor('--js-color-violet') || '#7f5af0');
    const greenColor  = new THREE.Color(_readCSSColor('--js-color-green')  || '#2cb67d');

    // 1. Ambient muy tenue — nunca plano, solo rellena las sombras más oscuras
    const ambient = new THREE.AmbientLight(0x0a0a14, 0.4);
    _scene.add(ambient);
    _lights.ambient = ambient;

    // 2. Luz principal — cian desde arriba-izquierda-frente
    //    Alta intensidad para crear el efecto "bloom" manual en los materiales
    const keyLight = new THREE.PointLight(cianColor, 3.5, 12, 2);
    keyLight.position.set(-2.5, 3, 3);
    _scene.add(keyLight);
    _lights.key = keyLight;

    // 3. Rim light — violeta desde atrás-derecha
    //    Separa el robot del fondo, da volumen
    const rimLight = new THREE.PointLight(violetColor, 2.8, 10, 2);
    rimLight.position.set(3, 1, -2);
    _scene.add(rimLight);
    _lights.rim = rimLight;

    // 4. Fill inferior — verde muy suave, simula reflexión del suelo
    //    Rompe la simetría y añade el tercer tono de la paleta
    const fillLight = new THREE.PointLight(greenColor, 0.6, 8, 2);
    fillLight.position.set(0, -3, 2);
    _scene.add(fillLight);
    _lights.fill = fillLight;

    // 5. Spot frontal — blanco frío muy tenue, ilumina la cara del robot
    //    Permite leer los detalles del HUD facial
    const frontLight = new THREE.DirectionalLight(0xd0e8ff, 0.3);
    frontLight.position.set(0, 0, 5);
    frontLight.target.position.set(0, 0, 0);
    _scene.add(frontLight);
    _scene.add(frontLight.target);
    _lights.front = frontLight;

    // 6. Helper visual: pequeña esfera en posición de keyLight
    //    (solo en desarrollo — se elimina en producción)
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      const helper = new THREE.PointLightHelper(_lights.key, 0.1);
      _scene.add(helper);
    }
  }

  /* ── Plano de reflejo sutil ───────────────────────────────── */
  function _createReflectionPlane() {
    // Plano horizontal debajo del robot — reflejo muy tenue
    // sin usar RelfectionCamera (demasiado costoso)
    const geometry = new THREE.PlaneGeometry(6, 6);
    const material = new THREE.MeshStandardMaterial({
      color:       0x050508,
      metalness:   0.9,
      roughness:   0.1,
      transparent: true,
      opacity:     0.4,
      side:        THREE.FrontSide,
    });
    const plane = new THREE.Mesh(geometry, material);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = -2.0;
    plane.name = 'reflectionPlane';
    _scene.add(plane);
  }

  /* ── Grid del suelo (líneas holográficas) ─────────────────── */
  function _createFloorGrid() {
    // GridHelper con colores cian muy sutiles — referencia visual de suelo
    const cianColor  = _readCSSColor('--js-color-cyan') || '#00ffff';
    const gridColor  = new THREE.Color(cianColor).multiplyScalar(0.12);
    const centerColor = new THREE.Color(cianColor).multiplyScalar(0.25);

    const grid = new THREE.GridHelper(10, 20, centerColor, gridColor);
    grid.position.y = -2.05;
    grid.name = 'floorGrid';
    _scene.add(grid);
  }

  /* ── Resize handler ───────────────────────────────────────── */
  function _onResize() {
    if (!_canvas || !_camera || !_renderer) return;

    const w = _canvas.clientWidth;
    const h = _canvas.clientHeight;

    if (w === 0 || h === 0) return;

    _camera.aspect = w / h;
    _camera.updateProjectionMatrix();

    const isMobile = window.innerWidth < 768;
    _renderer.setPixelRatio(
      isMobile ? 1 : Math.min(window.devicePixelRatio, 2)
    );
    _renderer.setSize(w, h, false);
  }

  /* ── Loop de animación ────────────────────────────────────── */
  function _startLoop() {
    function tick() {
      _animFrameId = requestAnimationFrame(tick);

      const delta   = _clock.getDelta();
      const elapsed = _clock.getElapsedTime();

      // Animar intensidad de luces — pulso sutil para dar vida
      if (_lights.key) {
        _lights.key.intensity = 3.5 + Math.sin(elapsed * 1.2) * 0.4;
      }
      if (_lights.rim) {
        _lights.rim.intensity = 2.8 + Math.sin(elapsed * 0.8 + 1.0) * 0.3;
      }

      // Ejecutar callbacks registrados (RobotHead, RobotTracking, RobotAnimations)
      for (let i = 0; i < _loopCallbacks.length; i++) {
        try {
          _loopCallbacks[i](delta, elapsed);
        } catch (e) {
          console.warn('[RobotCore] Error en loop callback:', e);
        }
      }

      _renderer.render(_scene, _camera);
    }

    tick();
  }

  /* ── API pública ──────────────────────────────────────────── */

  /**
   * Inicializa el motor Three.js completo.
   * Llama a esta función desde AppInit.js (F22).
   * @returns {Promise<void>}
   */
  async function init() {
    if (_ready) {
      console.warn('[RobotCore] Ya inicializado.');
      return;
    }

    // Verificar que Three.js esté disponible (CDN)
    if (typeof THREE === 'undefined') {
      console.error('[RobotCore] THREE no está disponible. Asegúrate de cargar el CDN antes de este script.');
      return;
    }

    // Obtener el canvas del DOM
    _canvas = document.getElementById('robot-canvas');
    if (!_canvas) {
      console.error('[RobotCore] No se encontró #robot-canvas en el DOM.');
      return;
    }

    // Detectar soporte WebGL
    try {
      const testRenderer = new THREE.WebGLRenderer({ canvas: document.createElement('canvas') });
      testRenderer.dispose();
    } catch (e) {
      console.warn('[RobotCore] WebGL no disponible. El robot 3D no se mostrará.');
      _canvas.style.display = 'none';
      return;
    }

    // Construir la escena
    _clock = new THREE.Clock();
    _createScene();
    _createCamera();
    _createRenderer();
    _createLights();
    _createReflectionPlane();
    _createFloorGrid();

    // Resize automático con ResizeObserver
    _resizeObserver = new ResizeObserver(_onResize);
    _resizeObserver.observe(_canvas.parentElement || _canvas);

    // Iniciar loop
    _startLoop();

    _ready = true;
    console.log('[RobotCore] ✓ Inicializado. Three.js r128.');
  }

  /**
   * Añade un callback al render loop.
   * El callback recibe (delta: number, elapsed: number).
   * @param {Function} fn
   */
  function addToLoop(fn) {
    if (typeof fn === 'function' && !_loopCallbacks.includes(fn)) {
      _loopCallbacks.push(fn);
    }
  }

  /**
   * Elimina un callback del render loop.
   * @param {Function} fn
   */
  function removeFromLoop(fn) {
    _loopCallbacks = _loopCallbacks.filter(cb => cb !== fn);
  }

  /**
   * Libera todos los recursos WebGL.
   * Llamar desde AppInit.destroy() si es necesario.
   */
  function destroy() {
    if (_animFrameId) cancelAnimationFrame(_animFrameId);
    if (_resizeObserver) _resizeObserver.disconnect();

    // Limpiar la escena
    if (_scene) {
      _scene.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach(m => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
      _scene.clear();
    }

    if (_renderer) {
      _renderer.dispose();
      _renderer.forceContextLoss();
    }

    _scene    = null;
    _camera   = null;
    _renderer = null;
    _clock    = null;
    _lights   = {};
    _loopCallbacks = [];
    _ready    = false;

    console.log('[RobotCore] Destruido y recursos liberados.');
  }

  /* Getters */
  const getScene    = () => _scene;
  const getCamera   = () => _camera;
  const getRenderer = () => _renderer;
  const getClock    = () => _clock;
  const isReady     = () => _ready;

  return {
    init,
    getScene,
    getCamera,
    getRenderer,
    getClock,
    addToLoop,
    removeFromLoop,
    isReady,
    destroy,
  };

})();

// Exportar como global para que F05, F06, F07 y F22 puedan accederlo
// sin necesidad de módulos ES (el proyecto usa scripts clásicos)
window.RobotCore = RobotCore;
