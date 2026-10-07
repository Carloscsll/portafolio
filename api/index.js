/**
 * Vercel Serverless API Handler
 * Solo maneja /api/* routes
 * Los archivos estáticos (CSS, JS, HTML) son servidos directamente por Vercel CDN
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();

// En Vercel el filesystem es read-only excepto /tmp
const DATA_DIR = '/tmp/portfolio-data';

try {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
} catch (e) {}

const PROJECTS_FILE = path.join(DATA_DIR, 'projects.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');

function readJsonFile(filePath, defaultValue) {
  try {
    if (fs.existsSync(filePath)) return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const fileName = path.basename(filePath);
    const repoDataPath = path.join(__dirname, '..', 'data', fileName);
    if (fs.existsSync(repoDataPath)) return JSON.parse(fs.readFileSync(repoDataPath, 'utf-8'));
    return defaultValue;
  } catch (e) { return defaultValue; }
}

function writeJsonFile(filePath, data) {
  try { fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8'); }
  catch (e) { console.error('Write error:', e); }
}

const DEFAULT_SETTINGS = {
  name: "Carlos Castellanos",
  tagline: "Fotografía & Dirección Visual",
  heroSubtitle: "Proyectos visuales, cinematografía documental y retratos de autor.",
  bio: "Soy fotógrafo y realizador audiovisual enfocado en capturar la esencia natural de las personas, espacios y proyectos comerciales.",
  location: "México",
  email: "contacto@carloscastellanos.com",
  phone: "",
  instagram: "",
  whatsapp: "",
  vimeo: "",
  adminPassword: "admin",
  categories: [
    { id: "fotografia", name: "Fotografía" },
    { id: "video", name: "Video" },
    { id: "comercial", name: "Comercial" },
    { id: "retrato", name: "Retrato" },
    { id: "eventos", name: "Eventos" },
    { id: "editorial", name: "Editorial" }
  ],
  services: [
    { id: "srv-1", title: "Fotografía Editorial & Comercial", description: "Campañas de marca, lookbooks y proyectos editoriales con atención a iluminación, composición y dirección de arte." },
    { id: "srv-2", title: "Dirección y Video Cinematográfico", description: "Piezas audiovisuales con narrativa cinematográfica, spots comerciales y documentales breves." },
    { id: "srv-3", title: "Retrato de Autor & Personal Branding", description: "Sesiones de retrato para artistas, profesionales y marcas personales con enfoque íntimo y atemporal." },
    { id: "srv-4", title: "Cobertura Documental de Eventos", description: "Registro visual elegante de eventos culturales, corporativos y experiencias exclusivas." }
  ]
};

const DEFAULT_PROJECTS = [
  {
    id: "proj-1", title: "Luz del Norte", slug: "luz-del-norte",
    category: "fotografia", categoryName: "Fotografía", year: "2024", client: "Serie Personal",
    description: "Una exploración visual de paisajes naturales durante el invierno.",
    coverImage: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1600&q=85",
    coverAspect: "horizontal", featured: true, published: true, order: 1,
    media: [
      { id: "m-1", type: "image", url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=2000&q=85", thumbnail: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80", aspect: "horizontal", caption: "Amanecer en los acantilados" },
      { id: "m-2", type: "image", url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=2000&q=85", thumbnail: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80", aspect: "panoramic", caption: "Crestas montañosas" }
    ]
  },
  {
    id: "proj-2", title: "Silencio Cinematográfico", slug: "silencio-cinematografico",
    category: "video", categoryName: "Video", year: "2024", client: "Cortometraje Documental",
    description: "Pieza audiovisual sobre artesanos contemporáneos filmada con luz natural.",
    coverImage: "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1600&q=85",
    coverAspect: "horizontal", featured: true, published: true, order: 2,
    media: [
      { id: "m-v1", type: "video", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4", thumbnail: "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1200&q=85", aspect: "panoramic", caption: "Tráiler oficial" },
      { id: "m-5", type: "image", url: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1600&q=85", thumbnail: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80", aspect: "horizontal", caption: "Detalle de taller" }
    ]
  },
  {
    id: "proj-3", title: "Retratos de Taller", slug: "retratos-de-taller",
    category: "retrato", categoryName: "Retrato", year: "2024", client: "Serie Personal",
    description: "Retratos íntimos de artistas plásticos en sus espacios de trabajo.",
    coverImage: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=85",
    coverAspect: "vertical", featured: true, published: true, order: 3,
    media: [
      { id: "m-7", type: "image", url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=85", thumbnail: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80", aspect: "vertical", caption: "Retrato en luz lateral suave" }
    ]
  },
  {
    id: "proj-4", title: "Materia & Forma", slug: "materia-y-forma",
    category: "comercial", categoryName: "Comercial", year: "2023", client: "Firma de Diseño",
    description: "Campaña visual para colección de mobiliario y objetos cerámicos.",
    coverImage: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1600&q=85",
    coverAspect: "horizontal", featured: true, published: true, order: 4,
    media: [
      { id: "m-10", type: "image", url: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1800&q=85", thumbnail: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80", aspect: "horizontal", caption: "Silla de nogal y sombras rasantes" }
    ]
  }
];

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'No autorizado' });
  if (authHeader.split(' ')[1] !== 'valid-session-token') return res.status(401).json({ error: 'Sesión inválida' });
  next();
}

app.post('/api/auth/login', (req, res) => {
  const s = readJsonFile(SETTINGS_FILE, DEFAULT_SETTINGS);
  if (req.body.password === s.adminPassword) return res.json({ success: true, token: 'valid-session-token', user: { name: s.name } });
  res.status(401).json({ success: false, error: 'Contraseña incorrecta' });
});

app.get('/api/auth/verify', requireAuth, (req, res) => {
  const s = readJsonFile(SETTINGS_FILE, DEFAULT_SETTINGS);
  res.json({ valid: true, name: s.name });
});

app.get('/api/settings', (req, res) => {
  const s = readJsonFile(SETTINGS_FILE, DEFAULT_SETTINGS);
  const { adminPassword, ...safe } = s;
  res.json(safe);
});

app.get('/api/admin/settings', requireAuth, (req, res) => res.json(readJsonFile(SETTINGS_FILE, DEFAULT_SETTINGS)));

app.put('/api/settings', requireAuth, (req, res) => {
  const updated = { ...readJsonFile(SETTINGS_FILE, DEFAULT_SETTINGS), ...req.body };
  writeJsonFile(SETTINGS_FILE, updated);
  const { adminPassword, ...safe } = updated;
  res.json({ success: true, settings: safe });
});

app.get('/api/projects', (req, res) => {
  let p = readJsonFile(PROJECTS_FILE, DEFAULT_PROJECTS);
  const { category, featured, all } = req.query;
  if (all !== 'true') p = p.filter(x => x.published !== false);
  if (category && category !== 'todos') p = p.filter(x => x.category === category);
  if (featured === 'true') p = p.filter(x => x.featured === true);
  p.sort((a, b) => (a.order || 0) - (b.order || 0));
  res.json(p);
});

app.get('/api/projects/:slug', (req, res) => {
  const all = readJsonFile(PROJECTS_FILE, DEFAULT_PROJECTS);
  const project = all.find(p => p.slug === req.params.slug || p.id === req.params.slug);
  if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });
  const pub = all.filter(p => p.published !== false).sort((a, b) => (a.order || 0) - (b.order || 0));
  const idx = pub.findIndex(p => p.id === project.id);
  res.json({
    ...project,
    prevProject: idx > 0 ? { id: pub[idx-1].id, title: pub[idx-1].title, slug: pub[idx-1].slug, coverImage: pub[idx-1].coverImage } : null,
    nextProject: idx < pub.length - 1 ? { id: pub[idx+1].id, title: pub[idx+1].title, slug: pub[idx+1].slug, coverImage: pub[idx+1].coverImage } : null
  });
});

app.post('/api/projects', requireAuth, (req, res) => {
  const all = readJsonFile(PROJECTS_FILE, DEFAULT_PROJECTS);
  const { title, category, categoryName, year, client, description, coverImage, coverAspect, featured, published, media } = req.body;
  if (!title) return res.status(400).json({ error: 'El título es obligatorio' });
  let base = title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)+/g,'') || 'proyecto';
  let slug = base, c = 1;
  while (all.some(p => p.slug === slug)) slug = `${base}-${c++}`;
  const np = {
    id: `proj-${Date.now()}`, title, slug,
    category: category || 'fotografia', categoryName: categoryName || 'Fotografía',
    year: year || new Date().getFullYear().toString(), client: client || '',
    description: description || '',
    coverImage: coverImage || (media?.length ? media[0].url : ''),
    coverAspect: coverAspect || 'horizontal',
    featured: Boolean(featured),
    published: published !== undefined ? Boolean(published) : true,
    order: all.reduce((m, p) => Math.max(m, p.order || 0), 0) + 1,
    media: media || [], createdAt: new Date().toISOString()
  };
  all.push(np);
  writeJsonFile(PROJECTS_FILE, all);
  res.status(201).json({ success: true, project: np });
});

app.put('/api/projects/:id', requireAuth, (req, res) => {
  const all = readJsonFile(PROJECTS_FILE, DEFAULT_PROJECTS);
  const i = all.findIndex(p => p.id === req.params.id);
  if (i === -1) return res.status(404).json({ error: 'No encontrado' });
  all[i] = { ...all[i], ...req.body, id: all[i].id, updatedAt: new Date().toISOString() };
  writeJsonFile(PROJECTS_FILE, all);
  res.json({ success: true, project: all[i] });
});

app.delete('/api/projects/:id', requireAuth, (req, res) => {
  let all = readJsonFile(PROJECTS_FILE, DEFAULT_PROJECTS);
  const prev = all.length;
  all = all.filter(p => p.id !== req.params.id);
  if (all.length === prev) return res.status(404).json({ error: 'No encontrado' });
  writeJsonFile(PROJECTS_FILE, all);
  res.json({ success: true });
});

app.post('/api/projects/reorder', requireAuth, (req, res) => {
  const { orderList } = req.body;
  if (!Array.isArray(orderList)) return res.status(400).json({ error: 'orderList debe ser array' });
  const all = readJsonFile(PROJECTS_FILE, DEFAULT_PROJECTS);
  orderList.forEach((id, i) => { const p = all.find(x => x.id === id); if (p) p.order = i + 1; });
  writeJsonFile(PROJECTS_FILE, all);
  res.json({ success: true });
});

app.post('/api/contact', (req, res) => {
  const { name, email, projectType, message } = req.body;
  if (!name || !email || !message) return res.status(400).json({ error: 'Completa nombre, email y mensaje.' });
  const all = readJsonFile(MESSAGES_FILE, []);
  all.unshift({ id: `msg-${Date.now()}`, name, email, projectType: projectType || 'General', message, date: new Date().toISOString(), read: false });
  writeJsonFile(MESSAGES_FILE, all);
  res.json({ success: true, message: 'Mensaje enviado. Me pondré en contacto a la brevedad.' });
});

app.get('/api/admin/messages', requireAuth, (req, res) => res.json(readJsonFile(MESSAGES_FILE, [])));

app.delete('/api/admin/messages/:id', requireAuth, (req, res) => {
  let all = readJsonFile(MESSAGES_FILE, []);
  writeJsonFile(MESSAGES_FILE, all.filter(m => m.id !== req.params.id));
  res.json({ success: true });
});

app.get('/api/admin/stats', requireAuth, (req, res) => {
  const p = readJsonFile(PROJECTS_FILE, DEFAULT_PROJECTS);
  const m = readJsonFile(MESSAGES_FILE, []);
  res.json({
    totalProjects: p.length,
    publishedProjects: p.filter(x => x.published !== false).length,
    featuredProjects: p.filter(x => x.featured).length,
    totalMedia: p.reduce((acc, x) => acc + (x.media?.length || 0), 0),
    unreadMessages: m.filter(x => !x.read).length,
    totalMessages: m.length
  });
});

app.post('/api/upload', requireAuth, (req, res) => {
  res.status(503).json({ error: 'Upload no disponible en Vercel serverless. Usa URLs externas (Unsplash, Vimeo, Cloudinary) al crear proyectos.' });
});

module.exports = app;
