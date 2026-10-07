const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.warn('Sharp module not loaded:', e.message);
}
const cors = require('cors');
const morgan = require('morgan');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// En Vercel el filesystem es read-only excepto /tmp
// Detectamos el entorno y usamos /tmp para datos escritos
const IS_VERCEL = !!process.env.VERCEL;
const DATA_DIR = IS_VERCEL ? '/tmp/portfolio-data' : path.join(__dirname, 'data');
const UPLOADS_DIR = IS_VERCEL ? '/tmp/portfolio-uploads' : path.join(__dirname, 'uploads');
const OPTIMIZED_DIR = path.join(UPLOADS_DIR, 'optimized');
const THUMBS_DIR = path.join(UPLOADS_DIR, 'thumbnails');
const ORIGINAL_DIR = path.join(UPLOADS_DIR, 'original');

try {
  [DATA_DIR, UPLOADS_DIR, OPTIMIZED_DIR, THUMBS_DIR, ORIGINAL_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
} catch (err) {
  console.warn('Dir creation warning (expected on Vercel):', err.message);
}

// Database file helpers
const PROJECTS_FILE = path.join(DATA_DIR, 'projects.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');

function readJsonFile(filePath, defaultValue) {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data);
    }
    return defaultValue;
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
    return defaultValue;
  }
}

function writeJsonFile(filePath, data) {
  try {
    const tempPath = `${filePath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempPath, filePath);
    return true;
  } catch (err) {
    console.warn(`Filesystem write skipped (read-only):`, err.message);
    return false;
  }
}

// Initial settings default
const DEFAULT_SETTINGS = {
  name: "Carlos Mendoza",
  tagline: "Fotografía y Dirección Visual",
  heroSubtitle: "Proyectos visuales, cinematografía documental y retratos de autor.",
  bio: "Soy fotógrafo y realizador audiovisual enfocado en capturar la esencia natural de las personas, espacios y proyectos comerciales. Mi trabajo busca una estética sobria, atemporal y respetuosa con la luz natural y las historias reales.",
  location: "Madrid / Disponible a nivel global",
  email: "contacto@carlosmendoza.com",
  phone: "+34 600 000 000",
  instagram: "https://instagram.com/carlosmendoza.photo",
  whatsapp: "+34600000000",
  vimeo: "https://vimeo.com/carlosmendoza",
  adminPassword: "admin", // Easily changed in panel
  categories: [
    { id: "fotografia", name: "Fotografía" },
    { id: "video", name: "Video" },
    { id: "comercial", name: "Comercial" },
    { id: "retrato", name: "Retrato" },
    { id: "eventos", name: "Eventos" },
    { id: "editorial", name: "Editorial" }
  ],
  services: [
    {
      id: "srv-1",
      title: "Fotografía Editorial & Comercial",
      description: "Campañas de marca, lookbooks, catálogos de producto y proyectos editoriales cuidando minuciosamente la iluminación, composición y dirección de arte."
    },
    {
      id: "srv-2",
      title: "Dirección y Video Cinematográfico",
      description: "Piezas audiovisuales con narrativa cinematográfica, spots comerciales, documentales breves y videos de concepto con etalonaje digital profesional."
    },
    {
      id: "srv-3",
      title: "Retrato de Autor & Personal Branding",
      description: "Sesiones de retrato en estudio o localización natural para artistas, profesionales y marcas personales con un enfoque íntimo y atemporal."
    },
    {
      id: "srv-4",
      title: "Cobertura Documental de Eventos",
      description: "Registro visual discreto y elegante de eventos culturales, corporativos, conferencias y experiencias exclusivas sin alterar la naturalidad del momento."
    },
    {
      id: "srv-5",
      title: "Edición y Color Grading",
      description: "Postproducción visual, revelado digital de alta resolución y corrección de color profesional para proyectos de fotografía y video."
    }
  ]
};

// Initial projects default
const DEFAULT_PROJECTS = [
  {
    id: "proj-1",
    title: "Luz del Norte",
    slug: "luz-del-norte",
    category: "fotografia",
    categoryName: "Fotografía",
    year: "2026",
    client: "Editorial Arquitectura & Paisaje",
    description: "Una exploración visual de las costas septentrionales durante el invierno. La serie documenta la interacción silenciosa entre la arquitectura de hormigón brutalista y la luz fría del amanecer atlántico.",
    coverImage: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1600&q=85",
    coverAspect: "horizontal",
    featured: true,
    published: true,
    order: 1,
    media: [
      {
        id: "m-1",
        type: "image",
        url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=2000&q=85",
        thumbnail: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80",
        aspect: "horizontal",
        caption: "Amanecer en los acantilados de la costa norte",
        width: 2000,
        height: 1333
      },
      {
        id: "m-2",
        type: "image",
        url: "https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=1200&q=85",
        thumbnail: "https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=600&q=80",
        aspect: "vertical",
        caption: "Estructuras verticales y niebla matutina",
        width: 1200,
        height: 1800
      },
      {
        id: "m-3",
        type: "image",
        url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=2000&q=85",
        thumbnail: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80",
        aspect: "panoramic",
        caption: "Crestas montañosas bajo luz tenue",
        width: 2000,
        height: 1000
      },
      {
        id: "m-4",
        type: "image",
        url: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&q=85",
        thumbnail: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=600&q=80",
        aspect: "vertical",
        caption: "Bosque templado en atmósfera húmeda",
        width: 1200,
        height: 1600
      }
    ]
  },
  {
    id: "proj-2",
    title: "Silencio Cinematográfico",
    slug: "silencio-cinematografico",
    category: "video",
    categoryName: "Video",
    year: "2025",
    client: "Cortometraje Documental",
    description: "Pieza audiovisual sobre artesanos contemporáneos que preservan métodos ancestrales de talla en madera y forja. Filmado íntegramente en formato anamórfico con luz natural y sonido diegético directo.",
    coverImage: "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1600&q=85",
    coverAspect: "horizontal",
    featured: true,
    published: true,
    order: 2,
    media: [
      {
        id: "m-v1",
        type: "video",
        url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
        thumbnail: "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1200&q=85",
        aspect: "panoramic",
        caption: "Tráiler oficial - Formato anamórfico 2.39:1",
        width: 1920,
        height: 804
      },
      {
        id: "m-5",
        type: "image",
        url: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1600&q=85",
        thumbnail: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80",
        aspect: "horizontal",
        caption: "Detalle de taller y textura de madera",
        width: 1600,
        height: 1067
      },
      {
        id: "m-6",
        type: "image",
        url: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1200&q=85",
        thumbnail: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=600&q=80",
        aspect: "vertical",
        caption: "Retrato del maestro artesano",
        width: 1200,
        height: 1600
      }
    ]
  },
  {
    id: "proj-3",
    title: "Retratos de Taller",
    slug: "retratos-de-taller",
    category: "retrato",
    categoryName: "Retrato",
    year: "2025",
    client: "Serie Personal",
    description: "Sesión íntima de retratos analógicos y digitales en medio formato a artistas plásticos en sus espacios de trabajo cotidianos, registrando la concentración y la honestidad del proceso creador.",
    coverImage: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=85",
    coverAspect: "vertical",
    featured: true,
    published: true,
    order: 3,
    media: [
      {
        id: "m-7",
        type: "image",
        url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=85",
        thumbnail: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80",
        aspect: "vertical",
        caption: "Retrato en luz lateral suave",
        width: 1200,
        height: 1600
      },
      {
        id: "m-8",
        type: "image",
        url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=1200&q=85",
        thumbnail: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80",
        aspect: "vertical",
        caption: "Mirada frontal y expresión natural",
        width: 1200,
        height: 1600
      },
      {
        id: "m-9",
        type: "image",
        url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1200&q=85",
        thumbnail: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=80",
        aspect: "vertical",
        caption: "Estudio de luz cenital",
        width: 1200,
        height: 1600
      }
    ]
  },
  {
    id: "proj-4",
    title: "Materia & Forma",
    slug: "materia-y-forma",
    category: "comercial",
    categoryName: "Comercial",
    year: "2025",
    client: "Firma de Diseño Escandinavo",
    description: "Campaña visual para la colección de mobiliario y objetos cerámicos. Composiciones sobrias con énfasis en la pureza de las líneas, texturas orgánicas y gradaciones tonales neutras.",
    coverImage: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1600&q=85",
    coverAspect: "horizontal",
    featured: true,
    published: true,
    order: 4,
    media: [
      {
        id: "m-10",
        type: "image",
        url: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1800&q=85",
        thumbnail: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80",
        aspect: "horizontal",
        caption: "Silla de nogal y sombras rasantes",
        width: 1800,
        height: 1200
      },
      {
        id: "m-11",
        type: "image",
        url: "https://images.unsplash.com/photo-1538688525198-9b88f6f53126?auto=format&fit=crop&w=1200&q=85",
        thumbnail: "https://images.unsplash.com/photo-1538688525198-9b88f6f53126?auto=format&fit=crop&w=600&q=80",
        aspect: "vertical",
        caption: "Cerámica gres y detalle de acabado mate",
        width: 1200,
        height: 1600
      },
      {
        id: "m-12",
        type: "image",
        url: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1800&q=85",
        thumbnail: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80",
        aspect: "horizontal",
        caption: "Espacio interior y luz difusa de ventana",
        width: 1800,
        height: 1200
      }
    ]
  },
  {
    id: "proj-5",
    title: "Encuentros en Vivo",
    slug: "encuentros-en-vivo",
    category: "eventos",
    categoryName: "Eventos",
    year: "2024",
    client: "Festival de Música Acústica",
    description: "Documentación fotográfica y cobertura de video de conciertos íntimos y ensayos entre bastidores. Captura de la atmósfera emotiva y el dinamismo lumínico de las presentaciones nocturnas.",
    coverImage: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1600&q=85",
    coverAspect: "horizontal",
    featured: false,
    published: true,
    order: 5,
    media: [
      {
        id: "m-13",
        type: "image",
        url: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1800&q=85",
        thumbnail: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=80",
        aspect: "horizontal",
        caption: "Momento cumbre en el escenario principal",
        width: 1800,
        height: 1200
      },
      {
        id: "m-14",
        type: "image",
        url: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1200&q=85",
        thumbnail: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80",
        aspect: "vertical",
        caption: "Detalle de instrumento y manos",
        width: 1200,
        height: 1600
      }
    ]
  },
  {
    id: "proj-6",
    title: "Vibraciones Urbanas",
    slug: "vibraciones-urbanas",
    category: "editorial",
    categoryName: "Editorial",
    year: "2024",
    client: "Revista Monocle / Street",
    description: "Ensayo fotográfico documental sobre la vida urbana en las horas crepusculares. Luces de neón, reflejos sobre asfalto mojado y siluetas en movimiento en el centro metropolitano.",
    coverImage: "https://images.unsplash.com/photo-1477959858617-67f30bc75b82?auto=format&fit=crop&w=1600&q=85",
    coverAspect: "horizontal",
    featured: true,
    published: true,
    order: 6,
    media: [
      {
        id: "m-15",
        type: "image",
        url: "https://images.unsplash.com/photo-1477959858617-67f30bc75b82?auto=format&fit=crop&w=1800&q=85",
        thumbnail: "https://images.unsplash.com/photo-1477959858617-67f30bc75b82?auto=format&fit=crop&w=800&q=80",
        aspect: "horizontal",
        caption: "Perspectiva urbana y rascacielos al anochecer",
        width: 1800,
        height: 1200
      },
      {
        id: "m-16",
        type: "image",
        url: "https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=1200&q=85",
        thumbnail: "https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=600&q=80",
        aspect: "vertical",
        caption: "Luces de tráfico y desenfoque de movimiento",
        width: 1200,
        height: 1800
      }
    ]
  }
];

// Initialize database
let projects = readJsonFile(PROJECTS_FILE, DEFAULT_PROJECTS);
let settings = readJsonFile(SETTINGS_FILE, DEFAULT_SETTINGS);
let messages = readJsonFile(MESSAGES_FILE, []);

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan('dev'));

// Static files
app.use('/uploads', express.static(UPLOADS_DIR));
app.use(express.static(path.join(__dirname, 'public')));

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, ORIGINAL_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(6).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${uniqueSuffix}-${safeName}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 250 * 1024 * 1024 }, // 250MB limit for 4K video clips
  fileFilter: (req, file, cb) => {
    const isImage = file.mimetype.startsWith('image/');
    const isVideo = file.mimetype.startsWith('video/');
    if (isImage || isVideo) {
      cb(null, true);
    } else {
      cb(new Error('Formato no soportado. Sube únicamente imágenes (JPG, PNG, WebP) o videos (MP4, WebM, MOV).'));
    }
  }
});

// Simple token-based auth middleware for admin
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado. Inicia sesión en el panel.' });
  }
  const token = authHeader.split(' ')[1];
  if (token !== 'valid-session-token') {
    return res.status(401).json({ error: 'Sesión inválida o expirada.' });
  }
  next();
}

// --------------------------------------------------------------------------
// API ROUTES
// --------------------------------------------------------------------------

// 1. Auth
app.post('/api/auth/login', (req, res) => {
  const { password } = req.body;
  const currentSettings = readJsonFile(SETTINGS_FILE, DEFAULT_SETTINGS);
  if (password === currentSettings.adminPassword) {
    return res.json({
      success: true,
      token: 'valid-session-token',
      user: { name: currentSettings.name }
    });
  }
  return res.status(401).json({ success: false, error: 'Contraseña incorrecta' });
});

app.get('/api/auth/verify', requireAuth, (req, res) => {
  const currentSettings = readJsonFile(SETTINGS_FILE, DEFAULT_SETTINGS);
  res.json({ valid: true, name: currentSettings.name });
});

// 2. Settings
app.get('/api/settings', (req, res) => {
  const currentSettings = readJsonFile(SETTINGS_FILE, DEFAULT_SETTINGS);
  // Don't leak admin password in public response
  const { adminPassword, ...safeSettings } = currentSettings;
  res.json(safeSettings);
});

app.get('/api/admin/settings', requireAuth, (req, res) => {
  const currentSettings = readJsonFile(SETTINGS_FILE, DEFAULT_SETTINGS);
  res.json(currentSettings);
});

app.put('/api/settings', requireAuth, (req, res) => {
  const currentSettings = readJsonFile(SETTINGS_FILE, DEFAULT_SETTINGS);
  const updatedSettings = {
    ...currentSettings,
    ...req.body
  };
  writeJsonFile(SETTINGS_FILE, updatedSettings);
  settings = updatedSettings;
  const { adminPassword, ...safeSettings } = updatedSettings;
  res.json({ success: true, settings: safeSettings });
});

// 3. Projects API
app.get('/api/projects', (req, res) => {
  const allProjects = readJsonFile(PROJECTS_FILE, DEFAULT_PROJECTS);
  const { category, featured, all } = req.query;

  let filtered = [...allProjects];

  // If not requesting admin (all=true), only return published
  if (all !== 'true') {
    filtered = filtered.filter(p => p.published !== false);
  }

  if (category && category !== 'todos') {
    filtered = filtered.filter(p => p.category === category || p.categoryName?.toLowerCase() === category.toLowerCase());
  }

  if (featured === 'true') {
    filtered = filtered.filter(p => p.featured === true);
  }

  // Sort by order ascending
  filtered.sort((a, b) => (a.order || 0) - (b.order || 0));

  res.json(filtered);
});

app.get('/api/projects/:slug', (req, res) => {
  const allProjects = readJsonFile(PROJECTS_FILE, DEFAULT_PROJECTS);
  const project = allProjects.find(p => p.slug === req.params.slug || p.id === req.params.slug);
  
  if (!project) {
    return res.status(404).json({ error: 'Proyecto no encontrado' });
  }

  // Find prev & next projects for seamless pagination
  const publishedProjects = allProjects.filter(p => p.published !== false).sort((a, b) => (a.order || 0) - (b.order || 0));
  const currentIndex = publishedProjects.findIndex(p => p.id === project.id);
  
  const prevProject = currentIndex > 0 ? {
    id: publishedProjects[currentIndex - 1].id,
    title: publishedProjects[currentIndex - 1].title,
    slug: publishedProjects[currentIndex - 1].slug,
    coverImage: publishedProjects[currentIndex - 1].coverImage
  } : null;

  const nextProject = currentIndex < publishedProjects.length - 1 ? {
    id: publishedProjects[currentIndex + 1].id,
    title: publishedProjects[currentIndex + 1].title,
    slug: publishedProjects[currentIndex + 1].slug,
    coverImage: publishedProjects[currentIndex + 1].coverImage
  } : null;

  res.json({ ...project, prevProject, nextProject });
});

// Create Project
app.post('/api/projects', requireAuth, (req, res) => {
  const allProjects = readJsonFile(PROJECTS_FILE, DEFAULT_PROJECTS);
  const {
    title,
    category,
    categoryName,
    year,
    client,
    description,
    coverImage,
    coverAspect,
    featured,
    published,
    media
  } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'El título del proyecto es obligatorio' });
  }

  // Generate unique slug
  let baseSlug = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

  if (!baseSlug) baseSlug = 'proyecto';
  
  let slug = baseSlug;
  let counter = 1;
  while (allProjects.some(p => p.slug === slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  const maxOrder = allProjects.reduce((max, p) => Math.max(max, p.order || 0), 0);

  const newProject = {
    id: `proj-${Date.now()}`,
    title,
    slug,
    category: category || 'fotografia',
    categoryName: categoryName || 'Fotografía',
    year: year || new Date().getFullYear().toString(),
    client: client || '',
    description: description || '',
    coverImage: coverImage || (media && media.length > 0 ? media[0].url : ''),
    coverAspect: coverAspect || 'horizontal',
    featured: featured !== undefined ? Boolean(featured) : false,
    published: published !== undefined ? Boolean(published) : true,
    order: maxOrder + 1,
    media: media || [],
    createdAt: new Date().toISOString()
  };

  allProjects.push(newProject);
  writeJsonFile(PROJECTS_FILE, allProjects);
  projects = allProjects;

  res.status(201).json({ success: true, project: newProject });
});

// Update Project
app.put('/api/projects/:id', requireAuth, (req, res) => {
  const allProjects = readJsonFile(PROJECTS_FILE, DEFAULT_PROJECTS);
  const index = allProjects.findIndex(p => p.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: 'Proyecto no encontrado' });
  }

  const existing = allProjects[index];
  const updated = {
    ...existing,
    ...req.body,
    id: existing.id, // Immutable
    updatedAt: new Date().toISOString()
  };

  allProjects[index] = updated;
  writeJsonFile(PROJECTS_FILE, allProjects);
  projects = allProjects;

  res.json({ success: true, project: updated });
});

// Delete Project
app.delete('/api/projects/:id', requireAuth, (req, res) => {
  let allProjects = readJsonFile(PROJECTS_FILE, DEFAULT_PROJECTS);
  const initialLength = allProjects.length;
  allProjects = allProjects.filter(p => p.id !== req.params.id);

  if (allProjects.length === initialLength) {
    return res.status(404).json({ error: 'Proyecto no encontrado' });
  }

  writeJsonFile(PROJECTS_FILE, allProjects);
  projects = allProjects;

  res.json({ success: true, message: 'Proyecto eliminado con éxito' });
});

// Reorder Projects
app.post('/api/projects/reorder', requireAuth, (req, res) => {
  const { orderList } = req.body; // Array of IDs in new order
  if (!Array.isArray(orderList)) {
    return res.status(400).json({ error: 'orderList debe ser un array de IDs' });
  }

  const allProjects = readJsonFile(PROJECTS_FILE, DEFAULT_PROJECTS);
  
  orderList.forEach((id, idx) => {
    const p = allProjects.find(item => item.id === id);
    if (p) {
      p.order = idx + 1;
    }
  });

  writeJsonFile(PROJECTS_FILE, allProjects);
  projects = allProjects;

  res.json({ success: true, message: 'Orden actualizado' });
});

// 4. Media Upload with Automatic Sharp Web Optimization
app.post('/api/upload', requireAuth, upload.array('files', 20), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No se subieron archivos' });
    }

    const uploadedMedia = [];

    for (const file of req.files) {
      const isVideo = file.mimetype.startsWith('video/');
      const originalPath = file.path;
      const baseFilename = path.parse(file.filename).name;

      if (isVideo) {
        // Video storage
        uploadedMedia.push({
          id: `m-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          type: 'video',
          url: `/uploads/original/${file.filename}`,
          thumbnail: '/uploads/original/' + file.filename, // Or fallback video poster
          filename: file.filename,
          originalName: file.originalname,
          size: file.size,
          aspect: 'panoramic',
          caption: ''
        });
      } else {
        // Image processing with Sharp for high fidelity & web performance
        const optimizedFilename = `${baseFilename}.webp`;
        const thumbFilename = `${baseFilename}-thumb.webp`;

        const optimizedPath = path.join(OPTIMIZED_DIR, optimizedFilename);
        const thumbPath = path.join(THUMBS_DIR, thumbFilename);

        const metadata = await sharp(originalPath).metadata();
        const width = metadata.width || 1920;
        const height = metadata.height || 1080;
        
        // Determine aspect ratio naturally
        let aspect = 'horizontal';
        const ratio = width / height;
        if (ratio < 0.9) {
          aspect = 'vertical';
        } else if (ratio > 1.8) {
          aspect = 'panoramic';
        } else if (ratio >= 0.9 && ratio <= 1.1) {
          aspect = 'square';
        }

        // WebP high-quality full version (max 2560px width, preserving aspect)
        await sharp(originalPath)
          .rotate() // Auto-orient according to EXIF
          .resize({ width: 2560, withoutEnlargement: true })
          .webp({ quality: 88, effort: 4 })
          .toFile(optimizedPath);

        // WebP crisp thumbnail version (max 800px width)
        await sharp(originalPath)
          .rotate()
          .resize({ width: 800, withoutEnlargement: true })
          .webp({ quality: 80, effort: 4 })
          .toFile(thumbPath);

        uploadedMedia.push({
          id: `m-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          type: 'image',
          url: `/uploads/optimized/${optimizedFilename}`,
          thumbnail: `/uploads/thumbnails/${thumbFilename}`,
          originalUrl: `/uploads/original/${file.filename}`,
          filename: optimizedFilename,
          originalName: file.originalname,
          width,
          height,
          aspect,
          caption: ''
        });
      }
    }

    res.json({ success: true, media: uploadedMedia });
  } catch (error) {
    console.error('Upload processing error:', error);
    res.status(500).json({ error: 'Error procesando archivos: ' + error.message });
  }
});

// 5. Contact Inquiries API
app.post('/api/contact', (req, res) => {
  const { name, email, projectType, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Por favor completa tu nombre, email y mensaje.' });
  }

  const allMessages = readJsonFile(MESSAGES_FILE, []);
  const newMessage = {
    id: `msg-${Date.now()}`,
    name,
    email,
    projectType: projectType || 'General',
    message,
    date: new Date().toISOString(),
    read: false
  };

  allMessages.unshift(newMessage);
  writeJsonFile(MESSAGES_FILE, allMessages);
  messages = allMessages;

  res.json({
    success: true,
    message: 'Mensaje enviado correctamente. Me pondré en contacto contigo a la brevedad.'
  });
});

app.get('/api/admin/messages', requireAuth, (req, res) => {
  const allMessages = readJsonFile(MESSAGES_FILE, []);
  res.json(allMessages);
});

app.delete('/api/admin/messages/:id', requireAuth, (req, res) => {
  let allMessages = readJsonFile(MESSAGES_FILE, []);
  allMessages = allMessages.filter(m => m.id !== req.params.id);
  writeJsonFile(MESSAGES_FILE, allMessages);
  messages = allMessages;
  res.json({ success: true });
});

// Admin Stats
app.get('/api/admin/stats', requireAuth, (req, res) => {
  const allProjects = readJsonFile(PROJECTS_FILE, DEFAULT_PROJECTS);
  const allMessages = readJsonFile(MESSAGES_FILE, []);
  
  const totalProjects = allProjects.length;
  const publishedProjects = allProjects.filter(p => p.published !== false).length;
  const featuredProjects = allProjects.filter(p => p.featured === true).length;
  const totalMedia = allProjects.reduce((acc, p) => acc + (p.media?.length || 0), 0);
  const unreadMessages = allMessages.filter(m => !m.read).length;

  res.json({
    totalProjects,
    publishedProjects,
    featuredProjects,
    totalMedia,
    unreadMessages,
    totalMessages: allMessages.length
  });
});

// SPA fallback for HTML5 History API routing
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`🎬 Portafolio Web iniciado con éxito`);
    console.log(`📍 URL: http://localhost:${PORT}`);
    console.log(`⚙️  Admin Panel: http://localhost:${PORT}/admin`);
    console.log(`🔑 Contraseña por defecto: admin`);
    console.log(`=========================================`);
  });
}

module.exports = app;
