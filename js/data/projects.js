/*
  CYBER PORTFOLIO - js/data/projects.js
  Los 9 proyectos reales desplegados por Jesús Pérez Cuellar.
  Cada captura vive en assets/projects/shots/<id>.jpg (1200x527, uniforme).
  Tras cambiar la lista, sube PROJECTS_VERSION en index.html.
*/
'use strict';

var _NP_CUSTOM = " Lo que ves es la base que se entregó al cliente y es 100% personalizable: al contratarme, se adapta a tus colores, tu interfaz, tus transiciones y tus necesidades — el resultado final siempre supera esta muestra.";

window.NP_PROJECTS = [
  {
    "id": "p1",
    "title": "North Alliance",
    "category": "Web",
    "description": "Sitio corporativo de alta gama para una empresa de ingeniería y construcción. Tema claro/oscuro con una transición tan sutil que apenas se percibe, botones dorados en 3D y un chatbot inteligente que capta clientes y envía sus datos por correo de forma automática. Totalmente responsive, con múltiples servicios, animaciones e integraciones." + _NP_CUSTOM,
    "link": "https://northalliancegroup.ca/",
    "image": "assets/projects/shots/p1.jpg"
  },
  {
    "id": "p2",
    "title": "Architecture",
    "category": "Web",
    "description": "Web corporativa para Contracting Unlimited Inc. (Ontario, Canadá), constructora de ingeniería. Incluye un chatbot bilingüe entrenado para atender al cliente, recepción de leads por correo 100% funcional y una interfaz intuitiva, agradable e informativa. Construido íntegramente desde cero, sin plantillas genéricas." + _NP_CUSTOM,
    "link": "https://cybersecureaid.github.io/Architecture/",
    "image": "assets/projects/shots/p2.jpg"
  },
  {
    "id": "p3",
    "title": "Sellador Pro",
    "category": "Dev",
    "description": "Herramienta profesional de edición y sellado de imágenes por lotes. Exporta a PDF, Web, PNG y JPG; recorta al estilo Photoshop; lee metadatos EXIF; renombra grupos completos de imágenes; aplica sellos, texto, colores y fuentes; y redimensiona sin perder calidad, con zoom y encuadre por rueda del ratón. Pensada para diseñadores y desarrolladores que no quieren depender de webs de pago." + _NP_CUSTOM,
    "link": "https://cybersecureaid.github.io/Sellador-de-fotos/",
    "image": "assets/projects/shots/p3.jpg"
  },
  {
    "id": "p4",
    "title": "Token Alarm",
    "category": "Web3",
    "description": "Software de monitoreo y alertas de tokens sobre Binance Smart Chain. Configura alarmas por precio o por movimiento porcentual, visualiza distintos tipos de gráficas y rastrea criptomonedas difíciles de encontrar mediante rastreo on-chain y múltiples APIs, verificando incluso si el contrato está publicado. Permite además intercambio local conectando MetaMask u otra wallet del navegador." + _NP_CUSTOM,
    "link": "https://cybersecureaid.github.io/token-alarm/",
    "image": "assets/projects/shots/p4.jpg"
  },
  {
    "id": "p5",
    "title": "Editor PDF",
    "category": "Dev",
    "description": "Editor avanzado de PDF y texto hecho totalmente a medida. Efectos de texto que no encontrarás en otros editores (neón, cromo, fuego, arcoíris), amplias librerías de fuentes y texturas, y plantillas para CV, facturas, menús, certificados, propuestas comerciales y más. Convierte Word y PowerPoint a PDF y permite crear documentos desde cero. Cada sector es expandible a demanda." + _NP_CUSTOM,
    "link": "https://cybersecureaid.github.io/El-editor/",
    "image": "assets/projects/shots/p5.jpg"
  },
  {
    "id": "p6",
    "title": "MiSwap",
    "category": "Web3",
    "description": "Tu propio DEX: vende tu criptomoneda al precio que tú decidas. Respaldado por un smart contract que custodia los tokens y ejecuta el intercambio de forma instantánea, con panel administrativo, verificación de wallet por owner y varias capas de seguridad (Cloudflare y más). El comprador conecta su wallet y paga con USDT o BNB; al no haber curva de bonding, el precio se mantiene estable en cada compra." + _NP_CUSTOM,
    "link": "https://cybersecureaid.github.io/panel-v7",
    "image": "assets/projects/shots/p6.jpg"
  },
  {
    "id": "p7",
    "title": "Valeta",
    "category": "Dev",
    "description": "Sistema de monitoreo de red y seguridad. Vigila latencia, velocidad, constancia y calidad de tu conexión 24/7, avisa ante cualquier caída con notificaciones push y funciona en segundo plano. Pensado también como anti-robo de equipos de conectividad como Mikrotik, Nano y antenas, dándote control total sobre toda la red de tu hogar o sector." + _NP_CUSTOM,
    "link": "https://cybersecureaid.github.io/ALERT/",
    "image": "assets/projects/shots/p7.jpg"
  },
  {
    "id": "p8",
    "title": "Gestión POS",
    "category": "Dev",
    "description": "Sistema de gestión de órdenes para restaurantes y tiendas de venta directa. Organiza el stock por módulos y las comandas por mesa, agrega productos con un solo toque y genera facturas descargables con el nombre y el logo del negocio. Puede entregar carta digital por mesa para que el propio cliente elija. Elimina la libreta y la calculadora: menos errores y mucho más rápido." + _NP_CUSTOM,
    "link": "https://cybersecureaid.github.io/GestionSWFTWARE/",
    "image": "assets/projects/shots/p8.jpg"
  },
  {
    "id": "p9",
    "title": "Charts Pro",
    "category": "Trading",
    "description": "Análisis técnico directo, sin registro y sin depender de TradingView. Acceso inmediato a los gráficos de una lista de criptomonedas a medida, según el exchange del cliente, con un panel lateral de seguimiento claro y responsive. Ideal para traders que quieren operar rápido, sin crear cuentas ni pelear con rutas que cambian." + _NP_CUSTOM,
    "link": "https://cybersecureaid.github.io/Gr-ficosinregistro/",
    "image": "assets/projects/shots/p9.jpg"
  }
];

/* Precargar las imágenes de proyectos para que estén en caché cuanto antes */
(function(){
  try{
    window.NP_PROJECTS.forEach(function(p){
      if(p.image){ var im=new Image(); im.decoding='async'; im.src=p.image; }
    });
  }catch(e){}
})();
