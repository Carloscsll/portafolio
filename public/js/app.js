/**
 * Portfolio Web - Core SPA Architecture & Dynamic Page Renderer
 * Pure Vanilla ES6+ Module
 */

import { initAdminPanel } from './admin.js';

// Global State
export const state = {
  settings: null,
  projects: [],
  categories: [],
  currentRoute: window.location.pathname,
  activeLightbox: {
    isOpen: false,
    items: [],
    currentIndex: 0
  }
};

// UI Elements
const appRoot = document.getElementById('app-root');
const mobileToggle = document.getElementById('mobile-toggle');
const mobileDrawer = document.getElementById('mobile-drawer');
const drawerClose = document.getElementById('drawer-close');
const toastContainer = document.getElementById('toast-container');

// Lightbox Elements
const lightbox = document.getElementById('lightbox');
const lightboxOverlay = document.getElementById('lightbox-overlay');
const lightboxClose = document.getElementById('lightbox-close');
const lightboxPrev = document.getElementById('lightbox-prev');
const lightboxNext = document.getElementById('lightbox-next');
const lightboxBody = document.getElementById('lightbox-body');
const lightboxTitle = document.getElementById('lightbox-title');
const lightboxCounter = document.getElementById('lightbox-counter');
const lightboxCaption = document.getElementById('lightbox-caption');

// --------------------------------------------------------------------------
// NOTIFICATION TOAST HELPER
// --------------------------------------------------------------------------
export function showToast(message, type = 'success') {
  if (!toastContainer) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${message}</span>
  `;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// --------------------------------------------------------------------------
// API FETCH HELPERS
// --------------------------------------------------------------------------
export async function fetchSettings() {
  try {
    const res = await fetch('/api/settings');
    if (!res.ok) throw new Error('Error al cargar configuración');
    state.settings = await res.json();
    state.categories = state.settings.categories || [];
    updateGlobalBrand();
    return state.settings;
  } catch (err) {
    console.error(err);
    return null;
  }
}

export async function fetchProjects(category = '') {
  try {
    const query = category ? `?category=${encodeURIComponent(category)}` : '';
    const res = await fetch(`/api/projects${query}`);
    if (!res.ok) throw new Error('Error al cargar proyectos');
    state.projects = await res.json();
    return state.projects;
  } catch (err) {
    console.error(err);
    return [];
  }
}

export async function fetchProjectBySlug(slug) {
  try {
    const res = await fetch(`/api/projects/${encodeURIComponent(slug)}`);
    if (!res.ok) throw new Error('Proyecto no encontrado');
    return await res.json();
  } catch (err) {
    console.error(err);
    return null;
  }
}

// Update Branding Elements across the page
function updateGlobalBrand() {
  if (!state.settings) return;
  const { name, tagline, email, instagram, whatsapp, location } = state.settings;

  document.title = `${name} — ${tagline}`;

  const brandName = document.getElementById('brand-name');
  const drawerBrandName = document.getElementById('drawer-brand-name');
  const footerBrandName = document.getElementById('footer-brand-name');
  const footerTagline = document.getElementById('footer-tagline');
  const footerEmail = document.getElementById('footer-email');
  const footerInstagram = document.getElementById('footer-instagram');
  const footerWhatsapp = document.getElementById('footer-whatsapp');
  const drawerLocation = document.getElementById('drawer-location');
  const drawerSocials = document.getElementById('drawer-socials');

  if (brandName) brandName.textContent = name;
  if (drawerBrandName) drawerBrandName.textContent = name;
  if (footerBrandName) footerBrandName.textContent = name;
  if (footerTagline) footerTagline.textContent = tagline;
  if (drawerLocation && location) drawerLocation.textContent = location;

  if (footerEmail && email) {
    footerEmail.textContent = email;
    footerEmail.href = `mailto:${email}`;
  }
  if (footerInstagram && instagram) {
    footerInstagram.href = instagram;
  }
  if (footerWhatsapp && whatsapp) {
    const cleanNumber = whatsapp.replace(/[^0-9]/g, '');
    footerWhatsapp.href = `https://wa.me/${cleanNumber}`;
  }

  if (drawerSocials) {
    drawerSocials.innerHTML = `
      ${instagram ? `<a href="${instagram}" target="_blank" rel="noopener">Instagram</a>` : ''}
      ${whatsapp ? `<a href="https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}" target="_blank" rel="noopener">WhatsApp</a>` : ''}
      ${email ? `<a href="mailto:${email}">Email</a>` : ''}
    `;
  }
}

// --------------------------------------------------------------------------
// SPA ROUTER
// --------------------------------------------------------------------------
export function navigateTo(url) {
  window.history.pushState(null, null, url);
  handleRoute();
}

export async function handleRoute() {
  closeMobileMenu();
  const path = window.location.pathname;
  state.currentRoute = path;

  // Update active nav link state
  document.querySelectorAll('.nav-link, .drawer-link').forEach(link => {
    const linkRoute = link.getAttribute('data-route');
    if (linkRoute === path || (linkRoute !== '/' && path.startsWith(linkRoute))) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // Scroll to top
  window.scrollTo(0, 0);

  // Render Loader
  appRoot.innerHTML = `
    <div class="page-loader">
      <div class="loader-spinner"></div>
    </div>
  `;

  // Route Dispatcher
  if (path === '/' || path === '') {
    await renderHome();
  } else if (path === '/trabajos') {
    await renderPortfolio();
  } else if (path.startsWith('/proyecto/')) {
    const slug = path.split('/proyecto/')[1];
    await renderProject(slug);
  } else if (path === '/sobre-mi') {
    await renderAbout();
  } else if (path === '/servicios') {
    await renderServices();
  } else if (path === '/contacto') {
    await renderContact();
  } else if (path.startsWith('/admin')) {
    initAdminPanel(appRoot);
  } else {
    renderNotFound();
  }
}

// --------------------------------------------------------------------------
// PAGE RENDERERS
// --------------------------------------------------------------------------

// 1. HOME VIEW
async function renderHome() {
  const projects = await fetchProjects();
  const featured = projects.filter(p => p.featured);
  const displayProjects = featured.length > 0 ? featured : projects.slice(0, 6);

  // Hero Cover Project or Default Media
  const heroProject = displayProjects[0] || {
    title: state.settings?.name || "Carlos Mendoza",
    coverImage: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=2000&q=85",
    slug: ""
  };

  // Layout assignment for rhythm
  const layoutPatterns = ['layout-span-7', 'layout-span-5', 'layout-span-12', 'layout-span-6', 'layout-span-6', 'layout-span-8', 'layout-span-4'];

  appRoot.innerHTML = `
    <!-- Editorial Hero -->
    <section class="home-hero">
      <div class="hero-media-wrapper">
        <img src="${heroProject.coverImage}" alt="${heroProject.title}" loading="eager" />
        <div class="hero-overlay"></div>
      </div>
      <div class="hero-content">
        <span class="hero-tag">${state.settings?.tagline || 'Fotografía & Dirección Visual'}</span>
        <h1 class="hero-title">${state.settings?.heroSubtitle || 'Proyectos visuales y cinematografía de autor.'}</h1>
        <div class="hero-scroll-cue" id="scroll-to-work">
          <span class="scroll-line"></span>
          <span>Explorar Trabajos</span>
        </div>
      </div>
    </section>

    <!-- Curated Editorial Selection -->
    <section class="site-container" id="curated-works" style="padding-top: 5rem;">
      <div class="section-header">
        <div>
          <span class="section-label">Portafolio</span>
          <h2 class="section-heading">Selección de Trabajos</h2>
        </div>
        <a href="/trabajos" class="section-link" data-route="/trabajos">
          <span>Ver todo el archivo</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="12 5 19 12 12 19"></polyline>
          </svg>
        </a>
      </div>

      <div class="editorial-grid">
        ${displayProjects.map((p, idx) => {
          const layoutClass = layoutPatterns[idx % layoutPatterns.length];
          const hasVideo = p.media?.some(m => m.type === 'video');
          return `
            <article class="editorial-item ${layoutClass}" data-slug="${p.slug}">
              <div class="card-media-box aspect-${p.coverAspect || 'horizontal'}">
                <img src="${p.coverImage}" alt="${p.title}" loading="lazy" />
                ${hasVideo ? `
                  <div class="media-badge-video">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                    <span>Video</span>
                  </div>
                ` : ''}
              </div>
              <div class="card-meta-bar">
                <h3 class="card-title">${p.title}</h3>
                <div class="card-details">
                  <span>${p.categoryName || p.category}</span>
                  <span class="card-bullet"></span>
                  <span>${p.year}</span>
                </div>
              </div>
            </article>
          `;
        }).join('')}
      </div>
    </section>
  `;

  // Attach card click handlers
  appRoot.querySelectorAll('.editorial-item').forEach(card => {
    card.addEventListener('click', () => {
      const slug = card.getAttribute('data-slug');
      if (slug) navigateTo(`/proyecto/${slug}`);
    });
  });

  const scrollBtn = document.getElementById('scroll-to-work');
  if (scrollBtn) {
    scrollBtn.addEventListener('click', () => {
      const target = document.getElementById('curated-works');
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    });
  }
}

// 2. PORTFOLIO / TRABAJOS VIEW
async function renderPortfolio(activeCategory = 'todos') {
  const projects = await fetchProjects(activeCategory === 'todos' ? '' : activeCategory);

  const categories = state.categories || [
    { id: "fotografia", name: "Fotografía" },
    { id: "video", name: "Video" },
    { id: "comercial", name: "Comercial" },
    { id: "retrato", name: "Retrato" },
    { id: "eventos", name: "Eventos" },
    { id: "editorial", name: "Editorial" }
  ];

  appRoot.innerHTML = `
    <section class="site-container portfolio-header">
      <h1 class="portfolio-title">Trabajos</h1>
      
      <!-- Category Filter Pills -->
      <div class="category-filter-bar">
        <button class="filter-btn ${activeCategory === 'todos' ? 'active' : ''}" data-cat="todos">Todos</button>
        ${categories.map(c => `
          <button class="filter-btn ${activeCategory === c.id ? 'active' : ''}" data-cat="${c.id}">${c.name}</button>
        `).join('')}
      </div>

      <div class="portfolio-grid" id="portfolio-grid-container">
        ${projects.length === 0 ? `
          <div class="empty-state">
            <p>No hay proyectos en esta categoría por el momento.</p>
          </div>
        ` : projects.map(p => `
          <article class="editorial-item" data-slug="${p.slug}">
            <div class="card-media-box aspect-${p.coverAspect || 'horizontal'}">
              <img src="${p.coverImage}" alt="${p.title}" loading="lazy" />
              ${p.media?.some(m => m.type === 'video') ? `
                <div class="media-badge-video">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                  <span>Video</span>
                </div>
              ` : ''}
            </div>
            <div class="card-meta-bar">
              <h3 class="card-title">${p.title}</h3>
              <div class="card-details">
                <span>${p.categoryName || p.category}</span>
                <span class="card-bullet"></span>
                <span>${p.year}</span>
              </div>
            </div>
          </article>
        `).join('')}
      </div>
    </section>
  `;

  // Attach filter events
  appRoot.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const cat = btn.getAttribute('data-cat');
      await renderPortfolio(cat);
    });
  });

  // Attach card clicks
  appRoot.querySelectorAll('.editorial-item').forEach(card => {
    card.addEventListener('click', () => {
      const slug = card.getAttribute('data-slug');
      if (slug) navigateTo(`/proyecto/${slug}`);
    });
  });
}

// 3. SINGLE PROJECT VIEW
async function renderProject(slug) {
  const project = await fetchProjectBySlug(slug);

  if (!project) {
    renderNotFound('Proyecto no encontrado');
    return;
  }

  // Group media into editorial presentation rhythm (1 full width, 2 side-by-side, video full, etc.)
  const mediaItems = project.media || [];

  appRoot.innerHTML = `
    <article class="site-container project-view">
      <div class="project-breadcrumb">
        <a href="/trabajos" class="back-link" data-route="/trabajos">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          <span>Volver al Portafolio</span>
        </a>
      </div>

      <header class="project-intro-header">
        <div>
          <h1 class="project-heading">${project.title}</h1>
          ${project.description ? `<p class="project-statement">${project.description}</p>` : ''}
        </div>
        <div class="project-meta-list">
          <div class="meta-item">
            <span class="meta-label">Categoría</span>
            <span class="meta-value">${project.categoryName || project.category}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Año</span>
            <span class="meta-value">${project.year}</span>
          </div>
          ${project.client ? `
            <div class="meta-item">
              <span class="meta-label">Proyecto / Cliente</span>
              <span class="meta-value">${project.client}</span>
            </div>
          ` : ''}
        </div>
      </header>

      <!-- Media Gallery Flow -->
      <section class="project-gallery-flow">
        ${mediaItems.map((item, index) => {
          if (item.type === 'video') {
            return `
              <div class="gallery-row cols-1">
                ${createVideoPlayerHTML(item)}
                ${item.caption ? `<p class="gallery-caption">${item.caption}</p>` : ''}
              </div>
            `;
          } else {
            return `
              <div class="gallery-row cols-1">
                <figure class="gallery-media-figure" data-index="${index}">
                  <img src="${item.url}" alt="${item.caption || project.title}" loading="lazy" />
                </figure>
                ${item.caption ? `<figcaption class="gallery-caption">${item.caption}</figcaption>` : ''}
              </div>
            `;
          }
        }).join('')}
      </section>

      <!-- Project Pagination -->
      <nav class="project-pagination">
        ${project.prevProject ? `
          <a href="/proyecto/${project.prevProject.slug}" class="pagination-card prev" data-route="/proyecto/${project.prevProject.slug}">
            <span class="pagination-label">← Proyecto Anterior</span>
            <span class="pagination-title">${project.prevProject.title}</span>
          </a>
        ` : `<div></div>`}

        ${project.nextProject ? `
          <a href="/proyecto/${project.nextProject.slug}" class="pagination-card next" data-route="/proyecto/${project.nextProject.slug}">
            <span class="pagination-label">Siguiente Proyecto →</span>
            <span class="pagination-title">${project.nextProject.title}</span>
          </a>
        ` : `<div></div>`}
      </nav>
    </article>
  `;

  // Attach Lightbox triggers
  appRoot.querySelectorAll('.gallery-media-figure').forEach(figure => {
    figure.addEventListener('click', () => {
      const idx = parseInt(figure.getAttribute('data-index'), 10);
      openLightbox(mediaItems, idx);
    });
  });
}

// 4. ABOUT VIEW
async function renderAbout() {
  const s = state.settings || await fetchSettings();

  appRoot.innerHTML = `
    <section class="site-container about-view">
      <div class="about-grid">
        <div class="about-media-col">
          <div class="about-portrait-frame">
            <img src="${s?.profileImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=85'}" alt="${s?.name || 'Autor'}" />
          </div>
        </div>

        <div class="about-content-col">
          <div>
            <span class="section-label">Sobre mí</span>
            <h1 class="about-intro-title">${s?.name || 'Carlos Mendoza'}</h1>
            <div class="about-bio-text">
              <p>${s?.bio || 'Soy fotógrafo y realizador audiovisual enfocado en capturar la esencia natural de las personas, espacios y proyectos comerciales.'}</p>
              <p class="philosophy-quote">"La luz natural y el respeto por las proporciones auténticas definen cada encuadre."</p>
              <p>Con sede en ${s?.location || 'Madrid'} y disponibilidad para trabajar en producciones tanto nacionales como internacionales.</p>
            </div>
          </div>

          <div>
            <h2 class="about-subheading">Enfoque & Disciplina</h2>
            <div class="about-bio-text">
              <p>Combino técnicas digitales contemporáneas y sensibilidad estética clásica para entregar narrativas visuales coherentes, sobrias y de alto impacto visual.</p>
            </div>
          </div>

          <div>
            <a href="/contacto" class="btn-submit" data-route="/contacto" style="align-self: flex-start;">
              <span>Iniciar una conversación</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </section>
  `;
}

// 5. SERVICES VIEW
async function renderServices() {
  const s = state.settings || await fetchSettings();
  const services = s?.services || [];

  appRoot.innerHTML = `
    <section class="site-container services-view">
      <div class="section-header">
        <div>
          <span class="section-label">Servicios Profesionales</span>
          <h1 class="section-heading">Producción Audiovisual & Fotografía</h1>
        </div>
      </div>

      <div class="services-list">
        ${services.map((item, index) => `
          <div class="service-item-row">
            <span class="service-index">0${index + 1}</span>
            <h2 class="service-title">${item.title}</h2>
            <p class="service-desc">${item.description}</p>
          </div>
        `).join('')}
      </div>

      <div style="margin-top: 5rem; padding: 4rem 2rem; background-color: var(--bg-secondary); border-radius: var(--radius-xs); text-align: center; border: 1px solid var(--border-subtle);">
        <h3 style="font-size: 1.75rem; font-weight: 500; margin-bottom: 1rem;">¿Tienes un proyecto en mente?</h3>
        <p style="color: var(--text-secondary); max-width: 550px; margin: 0 auto 2rem auto; font-size: 0.95rem;">
          Cuéntame los detalles de tu idea o requerimiento y te prepararé una propuesta a medida sin compromiso.
        </p>
        <a href="/contacto" class="btn-submit" data-route="/contacto" style="display: inline-flex;">
          Solicitar Presupuesto
        </a>
      </div>
    </section>
  `;
}

// 6. CONTACT VIEW
async function renderContact() {
  const s = state.settings || await fetchSettings();
  const cleanPhone = (s?.whatsapp || '').replace(/[^0-9]/g, '');

  appRoot.innerHTML = `
    <section class="site-container contact-view">
      <div class="contact-grid">
        <div class="contact-info-col">
          <div>
            <span class="section-label">Contacto</span>
            <h1 class="contact-heading">Hablemos de tu próximo proyecto.</h1>
            <p class="contact-sub">Para encargos editoriales, comerciales, sesiones de retrato o producciones de video.</p>
          </div>

          <div class="direct-channels">
            <a href="mailto:${s?.email || 'contacto@carlosmendoza.com'}" class="direct-channel-card">
              <div class="channel-info">
                <h4>Correo Electrónico</h4>
                <p>${s?.email || 'contacto@carlosmendoza.com'}</p>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <line x1="7" y1="17" x2="17" y2="7"></line>
                <polyline points="7 7 17 7 17 17"></polyline>
              </svg>
            </a>

            ${s?.whatsapp ? `
              <a href="https://wa.me/${cleanPhone}" target="_blank" rel="noopener" class="direct-channel-card">
                <div class="channel-info">
                  <h4>WhatsApp Directo</h4>
                  <p>${s.phone || s.whatsapp}</p>
                </div>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <line x1="7" y1="17" x2="17" y2="7"></line>
                  <polyline points="7 7 17 7 17 17"></polyline>
                </svg>
              </a>
            ` : ''}

            ${s?.instagram ? `
              <a href="${s.instagram}" target="_blank" rel="noopener" class="direct-channel-card">
                <div class="channel-info">
                  <h4>Instagram</h4>
                  <p>@${s.instagram.split('/').filter(Boolean).pop() || 'carlosmendoza'}</p>
                </div>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <line x1="7" y1="17" x2="17" y2="7"></line>
                  <polyline points="7 7 17 7 17 17"></polyline>
                </svg>
              </a>
            ` : ''}
          </div>
        </div>

        <div>
          <form class="contact-form" id="contact-form">
            <div class="form-group">
              <label class="form-label" for="contact-name">Tu Nombre *</label>
              <input type="text" id="contact-name" name="name" class="form-input" required placeholder="Nombre o empresa" />
            </div>

            <div class="form-group">
              <label class="form-label" for="contact-email">Email de Contacto *</label>
              <input type="email" id="contact-email" name="email" class="form-input" required placeholder="tu@email.com" />
            </div>

            <div class="form-group">
              <label class="form-label" for="contact-type">Tipo de Proyecto</label>
              <select id="contact-type" name="projectType" class="form-select">
                <option value="Fotografía Comercial / Editorial">Fotografía Comercial / Editorial</option>
                <option value="Producción de Video / Cine">Producción de Video / Cine</option>
                <option value="Sesión de Retrato">Sesión de Retrato</option>
                <option value="Cobertura de Evento">Cobertura de Evento</option>
                <option value="Consulta General">Consulta General</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label" for="contact-message">Mensaje / Detalles *</label>
              <textarea id="contact-message" name="message" class="form-textarea" required placeholder="Cuéntame sobre la idea, fechas estimadas, locación o requerimientos..."></textarea>
            </div>

            <button type="submit" class="btn-submit" id="btn-submit-contact">
              <span>Enviar Mensaje</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </form>
        </div>
      </div>
    </section>
  `;

  // Attach Form Submit
  const form = document.getElementById('contact-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('btn-submit-contact');
      btn.disabled = true;
      btn.textContent = 'Enviando...';

      const formData = {
        name: form.name.value.trim(),
        email: form.email.value.trim(),
        projectType: form.projectType.value,
        message: form.message.value.trim()
      };

      try {
        const res = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        const data = await res.json();
        if (res.ok && data.success) {
          showToast(data.message || 'Mensaje enviado con éxito');
          form.reset();
        } else {
          showToast(data.error || 'Ocurrió un error al enviar el mensaje', 'error');
        }
      } catch (err) {
        showToast('Error de conexión con el servidor', 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = `<span>Enviar Mensaje</span>`;
      }
    });
  }
}

// 7. NOT FOUND
function renderNotFound(msg = 'Página no encontrada') {
  appRoot.innerHTML = `
    <section class="site-container" style="text-align: center; padding: 8rem 2rem;">
      <h1 style="font-size: 3rem; margin-bottom: 1rem;">404</h1>
      <p style="color: var(--text-secondary); margin-bottom: 2rem;">${msg}</p>
      <a href="/" class="btn-submit" data-route="/" style="display: inline-flex;">Volver al Inicio</a>
    </section>
  `;
}

// Helper to create video player supporting YouTube, Vimeo, and Direct Video URLs
export function createVideoPlayerHTML(item) {
  const url = (item.url || '').trim();
  
  // YouTube match
  const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  if (ytMatch) {
    return `<div class="video-wrapper" style="position:relative; width:100%; aspect-ratio:16/9; overflow:hidden; border-radius:var(--radius-xs);"><iframe src="https://www.youtube.com/embed/${ytMatch[1]}?rel=0&modestbranding=1&playsinline=1" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="position:absolute; top:0; left:0; width:100%; height:100%; border:none;"></iframe></div>`;
  }

  // Vimeo match
  const vimeoMatch = url.match(/(?:vimeo\.com\/)(\d+)/);
  if (vimeoMatch) {
    return `<div class="video-wrapper" style="position:relative; width:100%; aspect-ratio:16/9; overflow:hidden; border-radius:var(--radius-xs);"><iframe src="https://player.vimeo.com/video/${vimeoMatch[1]}?title=0&byline=0&portrait=0" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen style="position:absolute; top:0; left:0; width:100%; height:100%; border:none;"></iframe></div>`;
  }

  // Standard video tag
  return `<div class="video-wrapper"><video src="${url}" controls playsinline poster="${item.thumbnail || ''}" style="width:100%; max-height:85vh;"></video></div>`;
}

// --------------------------------------------------------------------------
// LIGHTBOX FULLSCREEN LOGIC
// --------------------------------------------------------------------------
function openLightbox(items, startIndex = 0) {
  state.activeLightbox.items = items;
  state.activeLightbox.currentIndex = startIndex;
  state.activeLightbox.isOpen = true;

  updateLightboxContent();
  lightbox.classList.add('open');
  lightbox.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  state.activeLightbox.isOpen = false;
  lightbox.classList.remove('open');
  lightbox.setAttribute('aria-hidden', 'true');
  lightboxBody.innerHTML = '';
  document.body.style.overflow = '';
}

function updateLightboxContent() {
  const { items, currentIndex } = state.activeLightbox;
  if (!items || items.length === 0) return;

  const currentItem = items[currentIndex];

  lightboxCounter.textContent = `${currentIndex + 1} / ${items.length}`;
  lightboxTitle.textContent = currentItem.caption || '';
  lightboxCaption.textContent = currentItem.caption || '';

  if (currentItem.type === 'video') {
    lightboxBody.innerHTML = `
      <div style="width: 85vw; max-width: 1100px;">
        ${createVideoPlayerHTML(currentItem)}
      </div>
    `;
  } else {
    lightboxBody.innerHTML = `
      <img src="${currentItem.url}" alt="${currentItem.caption || 'Fotografía ampliada'}" />
    `;
  }
}

function nextLightboxItem() {
  const { items, currentIndex } = state.activeLightbox;
  if (currentIndex < items.length - 1) {
    state.activeLightbox.currentIndex++;
  } else {
    state.activeLightbox.currentIndex = 0; // loop
  }
  updateLightboxContent();
}

function prevLightboxItem() {
  const { items, currentIndex } = state.activeLightbox;
  if (currentIndex > 0) {
    state.activeLightbox.currentIndex--;
  } else {
    state.activeLightbox.currentIndex = items.length - 1; // loop
  }
  updateLightboxContent();
}

// Mobile drawer controls
function toggleMobileMenu() {
  const isOpen = mobileDrawer.classList.contains('open');
  if (isOpen) {
    closeMobileMenu();
  } else {
    mobileDrawer.classList.add('open');
    mobileDrawer.setAttribute('aria-hidden', 'false');
    mobileToggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }
}

function closeMobileMenu() {
  if (mobileDrawer) {
    mobileDrawer.classList.remove('open');
    mobileDrawer.setAttribute('aria-hidden', 'true');
  }
  if (mobileToggle) {
    mobileToggle.setAttribute('aria-expanded', 'false');
  }
  document.body.style.overflow = '';
}

// --------------------------------------------------------------------------
// GLOBAL EVENT LISTENERS & INITIALIZATION
// --------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Initial Data Fetch
  await fetchSettings();

  // 2. Intercept navigation clicks
  document.body.addEventListener('click', (e) => {
    const targetLink = e.target.closest('a[data-route]');
    if (targetLink) {
      const href = targetLink.getAttribute('href');
      if (href && !href.startsWith('http') && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
        e.preventDefault();
        navigateTo(href);
      }
    }
  });

  // 3. Browser Back/Forward history
  window.addEventListener('popstate', handleRoute);

  // 4. Mobile Menu Listeners
  if (mobileToggle) mobileToggle.addEventListener('click', toggleMobileMenu);
  if (drawerClose) drawerClose.addEventListener('click', closeMobileMenu);

  // 5. Lightbox Controls
  if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
  if (lightboxOverlay) lightboxOverlay.addEventListener('click', closeLightbox);
  if (lightboxNext) lightboxNext.addEventListener('click', nextLightboxItem);
  if (lightboxPrev) lightboxPrev.addEventListener('click', prevLightboxItem);

  // Keyboard navigation for lightbox
  window.addEventListener('keydown', (e) => {
    if (!state.activeLightbox.isOpen) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowRight') nextLightboxItem();
    if (e.key === 'ArrowLeft') prevLightboxItem();
  });

  // Current year in footer
  const yr = document.getElementById('current-year');
  if (yr) yr.textContent = new Date().getFullYear().toString();

  // Initial Route Render
  handleRoute();
});
