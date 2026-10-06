# Portafolio Profesional de Fotografía y Video

Un sitio web sobrio, minimalista, cinematográfico y contemporáneo diseñado exclusivamente para fotógrafos, videógrafos y directores visuales independientes. 

---

## Características Principales

### 1. Dirección Visual & Estética Editorial
* **Enfoque en la imagen:** Las fotografías y los videos son los protagonistas absolutos sin marcos ni recortes forzados. Respeta las proporciones originales (verticales 4:5, horizontales 3:2, panorámicas 21:9 anamórficas, cuadradas 1:1).
* **Cero clichés de IA:** Sin gradientes estridentes, sin glassmorphism, sin efectos 3D innecesarios ni estética de startup corporativa. Tipografía moderna refinada (*Plus Jakarta Sans* y *Newsreader*), espaciados generosos y paleta monocromática neutra.
* **Transiciones y micro-interacciones suaves:** Hover sutil sobre imágenes, animaciones discretas y carga progresiva.

### 2. Estructura Completa del Sitio
* **Inicio (Home):** Hero cinematográfico a pantalla casi completa con frase de autor, indicador para descubrir el contenido y selección editorial asimétrica de proyectos destacados.
* **Trabajos (Portafolio):** Archivo completo con filtrado dinámico por categorías (*Fotografía, Video, Comercial, Retrato, Eventos, Editorial*).
* **Página Individual de Proyecto:** Declaración del proyecto, cliente, año, galería editorial continua, reproductor de video y visor lightbox a pantalla completa (soporta flechas de teclado, zoom y navegación táctil) más paginación de proyecto anterior/siguiente.
* **Sobre Mí:** Presentación personal, retrato de autor, filosofía de trabajo y disciplina.
* **Servicios:** Desglose limpio de áreas de trabajo y producción audiovisual.
* **Contacto:** Formulario funcional, enlace directo a WhatsApp, Instagram y correo electrónico.

### 3. CMS / Sistema Real de Gestión y Subida de Trabajos
* **Acceso Seguro:** Panel accesible en `/admin` (Contraseña inicial: `admin`).
* **Creación y Edición:** Permite crear, modificar y eliminar proyectos en tiempo real sin tocar código.
* **Subida Múltiple con Optimización Automática:** Arrastra y suelta lotes de fotos y videos. El backend comprime y optimiza automáticamente las imágenes a formato **WebP de alta fidelidad** generando miniaturas ultrarrápidas mediante `Sharp`.
* **Organización:** Cambia el orden de los proyectos (arriba/abajo), elige qué imagen es la portada con un clic, asigna proporciones y activa/desactiva el estado de publicación o destacado.
* **Bandeja de Mensajes:** Visualiza las consultas enviadas por clientes a través del formulario de contacto.
* **Configuración del Perfil:** Edita nombre, biografía, redes sociales, servicios y contraseña de acceso.

---

## Cómo Iniciar el Proyecto

### 1. Iniciar el servidor local
```bash
npm start
```
O en modo desarrollo con auto-recarga:
```bash
npm run dev
```

### 2. Abrir en el navegador
* **Sitio Web:** [http://localhost:3000](http://localhost:3000)
* **Panel CMS:** [http://localhost:3000/admin](http://localhost:3000/admin) *(Clave: `admin`)*

---

## Estructura de Archivos

```
PORTAFOLIO-WEB/
├── data/                  # Base de datos JSON persistente
│   ├── projects.json      # Catálogo de proyectos y galerías
│   ├── settings.json      # Datos del autor, redes, servicios y credenciales
│   └── messages.json      # Consultas recibidas por formulario de contacto
├── public/                # Frontend SPA limpio y modular
│   ├── css/
│   │   └── main.css       # Sistema de diseño editorial
│   ├── js/
│   │   ├── app.js         # Router SPA, renderers de página y Lightbox
│   │   └── admin.js       # CMS completo, subida drag-and-drop y ajustes
│   └── index.html         # Documento HTML5 semántico
├── uploads/               # Almacenamiento local de medios
│   ├── original/          # Archivos de alta resolución originales y videos
│   ├── optimized/         # Versiones WebP de alta fidelidad
│   └── thumbnails/        # Miniaturas WebP optimizadas
├── server.js              # Servidor Express, API REST, procesado Sharp y Multer
└── package.json           # Dependencias y scripts
```
