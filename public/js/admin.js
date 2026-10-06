/**
 * Portfolio Web - CMS & Admin Panel Module
 * Real, scalable project management, multi-media uploader, and settings editor
 */

import { state, showToast, navigateTo, fetchSettings } from './app.js';

let authToken = localStorage.getItem('portfolio_auth_token') || null;
let currentTab = 'projects'; // 'projects' | 'new-project' | 'settings' | 'messages'
let editingProjectId = null;
let uploadedMediaBuffer = []; // Media items for current project being created/edited

export async function initAdminPanel(container) {
  if (!authToken) {
    renderAdminLogin(container);
    return;
  }

  // Verify auth
  try {
    const res = await fetch('/api/auth/verify', {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    if (!res.ok) throw new Error('Unauthorized');
    renderAdminDashboard(container);
  } catch (err) {
    localStorage.removeItem('portfolio_auth_token');
    authToken = null;
    renderAdminLogin(container);
  }
}

// --------------------------------------------------------------------------
// 1. ADMIN LOGIN VIEW
// --------------------------------------------------------------------------
function renderAdminLogin(container) {
  container.innerHTML = `
    <section class="site-container">
      <div class="admin-login-box">
        <h2 class="admin-login-title">Panel de Administración</h2>
        <p class="admin-login-sub">Introduce la clave de acceso para gestionar tu portafolio.</p>

        <form id="admin-login-form" style="display: flex; flex-direction: column; gap: 1.25rem;">
          <div class="form-group" style="text-align: left;">
            <label class="form-label" for="admin-pass">Contraseña</label>
            <input type="password" id="admin-pass" class="form-input" placeholder="Contraseña (por defecto: admin)" required />
          </div>

          <button type="submit" class="btn-submit" id="btn-login-submit" style="width: 100%;">
            Entrar al Panel
          </button>
        </form>
      </div>
    </section>
  `;

  const form = document.getElementById('admin-login-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const pass = document.getElementById('admin-pass').value;
    const btn = document.getElementById('btn-login-submit');
    btn.disabled = true;
    btn.textContent = 'Verificando...';

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pass })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        authToken = data.token;
        localStorage.setItem('portfolio_auth_token', authToken);
        showToast('Acceso concedido al panel');
        renderAdminDashboard(container);
      } else {
        showToast(data.error || 'Contraseña incorrecta', 'error');
      }
    } catch (err) {
      showToast('Error al conectar con el servidor', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Entrar al Panel';
    }
  });
}

// --------------------------------------------------------------------------
// 2. ADMIN MAIN DASHBOARD
// --------------------------------------------------------------------------
async function renderAdminDashboard(container) {
  // Fetch stats & fresh projects list
  let stats = { totalProjects: 0, publishedProjects: 0, totalMedia: 0, totalMessages: 0 };
  try {
    const res = await fetch('/api/admin/stats', {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    if (res.ok) stats = await res.json();
  } catch (err) {
    console.error(err);
  }

  container.innerHTML = `
    <section class="site-container admin-view">
      <div class="admin-header-bar">
        <div>
          <h1 class="admin-title">Panel de Control CMS</h1>
          <p style="color: var(--text-muted); font-size: 0.8125rem;">Gestión de contenidos y configuración del portafolio</p>
        </div>

        <div style="display: flex; align-items: center; gap: 1rem;">
          <div class="admin-nav-tabs">
            <button class="admin-tab-btn ${currentTab === 'projects' ? 'active' : ''}" data-tab="projects">Proyectos</button>
            <button class="admin-tab-btn ${currentTab === 'new-project' ? 'active' : ''}" data-tab="new-project">+ Nuevo Proyecto</button>
            <button class="admin-tab-btn ${currentTab === 'settings' ? 'active' : ''}" data-tab="settings">Ajustes & Perfil</button>
            <button class="admin-tab-btn ${currentTab === 'messages' ? 'active' : ''}" data-tab="messages">
              Mensajes ${stats.unreadMessages > 0 ? `(${stats.unreadMessages})` : ''}
            </button>
          </div>

          <button class="action-icon-btn" id="btn-admin-logout" title="Cerrar sesión" style="border: 1px solid var(--border-subtle); padding: 0.5rem 0.75rem; font-size: 0.75rem; text-transform: uppercase;">
            Salir
          </button>
        </div>
      </div>

      <!-- Quick Stats Row -->
      <div class="admin-stats-grid">
        <div class="stat-card">
          <span class="stat-label">Total Proyectos</span>
          <span class="stat-number">${stats.totalProjects}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Publicados</span>
          <span class="stat-number">${stats.publishedProjects}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Fotografías / Videos</span>
          <span class="stat-number">${stats.totalMedia}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Mensajes Recibidos</span>
          <span class="stat-number">${stats.totalMessages}</span>
        </div>
      </div>

      <!-- Active Tab Content Area -->
      <div id="admin-tab-container"></div>
    </section>
  `;

  // Attach tab switchers
  container.querySelectorAll('.admin-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentTab = btn.getAttribute('data-tab');
      if (currentTab === 'new-project') editingProjectId = null;
      renderAdminDashboard(container);
    });
  });

  // Attach logout
  const logoutBtn = document.getElementById('btn-admin-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('portfolio_auth_token');
      authToken = null;
      showToast('Sesión cerrada');
      initAdminPanel(container);
    });
  }

  // Render tab
  const tabContainer = document.getElementById('admin-tab-container');
  if (currentTab === 'projects') {
    renderProjectsTab(tabContainer);
  } else if (currentTab === 'new-project' || currentTab === 'edit-project') {
    renderProjectEditorTab(tabContainer, editingProjectId);
  } else if (currentTab === 'settings') {
    renderSettingsTab(tabContainer);
  } else if (currentTab === 'messages') {
    renderMessagesTab(tabContainer);
  }
}

// --------------------------------------------------------------------------
// 3. PROJECTS LIST TAB
// --------------------------------------------------------------------------
async function renderProjectsTab(container) {
  let projectsList = [];
  try {
    const res = await fetch('/api/projects?all=true');
    if (res.ok) projectsList = await res.json();
  } catch (err) {
    console.error(err);
  }

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
      <h2 style="font-size: 1.25rem; font-weight: 500;">Todos los Trabajos (${projectsList.length})</h2>
      <button class="btn-submit" id="btn-create-proj-quick" style="padding: 0.5rem 1rem; font-size: 0.8125rem;">
        + Crear Proyecto
      </button>
    </div>

    <div class="admin-table-wrapper">
      <table class="admin-table">
        <thead>
          <tr>
            <th style="width: 70px;">Portada</th>
            <th>Título</th>
            <th>Categoría</th>
            <th>Año</th>
            <th>Medios</th>
            <th>Estado</th>
            <th>Destacado</th>
            <th style="text-align: right;">Acciones</th>
          </tr>
        </thead>
        <tbody id="projects-table-body">
          ${projectsList.length === 0 ? `
            <tr><td colspan="8" style="text-align: center; padding: 3rem;">No hay proyectos creados aún. Haz clic en '+ Crear Proyecto' para añadir uno.</td></tr>
          ` : projectsList.map((p, idx) => `
            <tr data-id="${p.id}">
              <td>
                <img src="${p.coverImage || (p.media && p.media[0] ? p.media[0].thumbnail || p.media[0].url : '')}" class="admin-thumb-img" alt="${p.title}" />
              </td>
              <td>
                <strong style="color: var(--text-primary); cursor: pointer;" class="btn-edit-title" data-id="${p.id}">${p.title}</strong>
              </td>
              <td>${p.categoryName || p.category}</td>
              <td>${p.year}</td>
              <td>${p.media?.length || 0} archivos</td>
              <td>
                <button class="status-badge ${p.published !== false ? 'published' : 'draft'} btn-toggle-publish" data-id="${p.id}" data-status="${p.published !== false}">
                  ${p.published !== false ? 'Publicado' : 'Borrador'}
                </button>
              </td>
              <td>
                <input type="checkbox" class="featured-toggle" data-id="${p.id}" ${p.featured ? 'checked' : ''} />
              </td>
              <td style="text-align: right;">
                <div class="admin-actions-cell" style="justify-content: flex-end;">
                  <button class="action-icon-btn btn-move-up" data-id="${p.id}" title="Subir orden" ${idx === 0 ? 'disabled style="opacity:0.3"' : ''}>
                    ↑
                  </button>
                  <button class="action-icon-btn btn-move-down" data-id="${p.id}" title="Bajar orden" ${idx === projectsList.length - 1 ? 'disabled style="opacity:0.3"' : ''}>
                    ↓
                  </button>
                  <button class="action-icon-btn btn-edit-proj" data-id="${p.id}" title="Editar">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                  </button>
                  <button class="action-icon-btn delete btn-delete-proj" data-id="${p.id}" title="Eliminar">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  </button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  // Quick create button
  document.getElementById('btn-create-proj-quick')?.addEventListener('click', () => {
    currentTab = 'new-project';
    editingProjectId = null;
    initAdminPanel(document.getElementById('app-root'));
  });

  // Edit actions
  container.querySelectorAll('.btn-edit-proj, .btn-edit-title').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      editingProjectId = id;
      currentTab = 'edit-project';
      initAdminPanel(document.getElementById('app-root'));
    });
  });

  // Toggle publish status
  container.querySelectorAll('.btn-toggle-publish').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const current = btn.getAttribute('data-status') === 'true';
      try {
        const res = await fetch(`/api/projects/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`
          },
          body: JSON.stringify({ published: !current })
        });
        if (res.ok) {
          showToast(`Proyecto ${!current ? 'publicado' : 'guardado como borrador'}`);
          renderProjectsTab(container);
        }
      } catch (err) {
        showToast('Error al actualizar estado', 'error');
      }
    });
  });

  // Toggle featured status
  container.querySelectorAll('.featured-toggle').forEach(chk => {
    chk.addEventListener('change', async () => {
      const id = chk.getAttribute('data-id');
      try {
        const res = await fetch(`/api/projects/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`
          },
          body: JSON.stringify({ featured: chk.checked })
        });
        if (res.ok) {
          showToast(`Estado destacado actualizado`);
        }
      } catch (err) {
        showToast('Error al actualizar destacado', 'error');
      }
    });
  });

  // Delete project
  container.querySelectorAll('.btn-delete-proj').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      if (!confirm('¿Estás seguro de que deseas eliminar este proyecto? Esta acción no se puede deshacer.')) return;

      try {
        const res = await fetch(`/api/projects/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${authToken}` }
        });
        if (res.ok) {
          showToast('Proyecto eliminado');
          renderProjectsTab(container);
        }
      } catch (err) {
        showToast('Error al eliminar proyecto', 'error');
      }
    });
  });

  // Reordering projects
  container.querySelectorAll('.btn-move-up').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const idx = projectsList.findIndex(p => p.id === id);
      if (idx > 0) {
        const temp = projectsList[idx];
        projectsList[idx] = projectsList[idx - 1];
        projectsList[idx - 1] = temp;
        await saveNewOrder(projectsList.map(p => p.id));
        renderProjectsTab(container);
      }
    });
  });

  container.querySelectorAll('.btn-move-down').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const idx = projectsList.findIndex(p => p.id === id);
      if (idx < projectsList.length - 1) {
        const temp = projectsList[idx];
        projectsList[idx] = projectsList[idx + 1];
        projectsList[idx + 1] = temp;
        await saveNewOrder(projectsList.map(p => p.id));
        renderProjectsTab(container);
      }
    });
  });
}

async function saveNewOrder(orderList) {
  try {
    await fetch('/api/projects/reorder', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`
      },
      body: JSON.stringify({ orderList })
    });
    showToast('Orden guardado con éxito');
  } catch (err) {
    console.error(err);
  }
}

// --------------------------------------------------------------------------
// 4. PROJECT EDITOR TAB (Create & Edit)
// --------------------------------------------------------------------------
async function renderProjectEditorTab(container, projectId = null) {
  let projectData = {
    title: '',
    category: 'fotografia',
    categoryName: 'Fotografía',
    year: new Date().getFullYear().toString(),
    client: '',
    description: '',
    coverImage: '',
    coverAspect: 'horizontal',
    featured: false,
    published: true,
    media: []
  };

  if (projectId) {
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      if (res.ok) projectData = await res.json();
    } catch (err) {
      console.error(err);
    }
  }

  uploadedMediaBuffer = [...(projectData.media || [])];

  const categories = state.categories || [
    { id: "fotografia", name: "Fotografía" },
    { id: "video", name: "Video" },
    { id: "comercial", name: "Comercial" },
    { id: "retrato", name: "Retrato" },
    { id: "eventos", name: "Eventos" },
    { id: "editorial", name: "Editorial" }
  ];

  container.innerHTML = `
    <div style="margin-bottom: 2rem;">
      <h2 style="font-size: 1.5rem; font-weight: 600;">
        ${projectId ? `Editar Proyecto: ${projectData.title}` : 'Crear Nuevo Proyecto'}
      </h2>
      <p style="color: var(--text-muted); font-size: 0.8125rem;">Completa la información y sube tus fotografías y videos de alta resolución.</p>
    </div>

    <form id="project-editor-form" style="display: flex; flex-direction: column; gap: 2rem;">
      <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 2rem;">
        <!-- Left details col -->
        <div style="display: flex; flex-direction: column; gap: 1.5rem;">
          <div class="form-group">
            <label class="form-label" for="proj-title">Título del Proyecto *</label>
            <input type="text" id="proj-title" class="form-input" required value="${projectData.title || ''}" placeholder="Ej. Luz del Norte, Retratos de Taller..." />
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div class="form-group">
              <label class="form-label" for="proj-category">Categoría</label>
              <select id="proj-category" class="form-select">
                ${categories.map(c => `
                  <option value="${c.id}" ${projectData.category === c.id ? 'selected' : ''}>${c.name}</option>
                `).join('')}
              </select>
            </div>

            <div class="form-group">
              <label class="form-label" for="proj-year">Año de Producción</label>
              <input type="text" id="proj-year" class="form-input" value="${projectData.year || '2026'}" placeholder="2026" />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="proj-client">Cliente / Contexto (Opcional)</label>
            <input type="text" id="proj-client" class="form-input" value="${projectData.client || ''}" placeholder="Ej. Campaña Editorial, Cortometraje Documental..." />
          </div>

          <div class="form-group">
            <label class="form-label" for="proj-desc">Declaración / Descripción del Proyecto</label>
            <textarea id="proj-desc" class="form-textarea" placeholder="Escribe una breve memoria conceptual sobre este proyecto...">${projectData.description || ''}</textarea>
          </div>
        </div>

        <!-- Right settings col -->
        <div style="display: flex; flex-direction: column; gap: 1.5rem; background-color: var(--bg-secondary); padding: 1.5rem; border-radius: var(--radius-xs); border: 1px solid var(--border-subtle); height: fit-content;">
          <h3 style="font-size: 0.95rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem;">Opciones de Publicación</h3>

          <div class="form-group">
            <label class="form-label" for="proj-aspect">Proporción de Portada</label>
            <select id="proj-aspect" class="form-select">
              <option value="horizontal" ${projectData.coverAspect === 'horizontal' ? 'selected' : ''}>Horizontal (16:10 / 3:2)</option>
              <option value="vertical" ${projectData.coverAspect === 'vertical' ? 'selected' : ''}>Vertical (4:5 / 9:16)</option>
              <option value="panoramic" ${projectData.coverAspect === 'panoramic' ? 'selected' : ''}>Panorámica (21:9 / 2.39:1)</option>
              <option value="square" ${projectData.coverAspect === 'square' ? 'selected' : ''}>Cuadrada (1:1)</option>
            </select>
          </div>

          <label style="display: flex; align-items: center; gap: 0.75rem; cursor: pointer;">
            <input type="checkbox" id="proj-published" ${projectData.published !== false ? 'checked' : ''} />
            <span style="font-size: 0.875rem;">Publicar inmediatamente en el sitio</span>
          </label>

          <label style="display: flex; align-items: center; gap: 0.75rem; cursor: pointer;">
            <input type="checkbox" id="proj-featured" ${projectData.featured ? 'checked' : ''} />
            <span style="font-size: 0.875rem;">Destacar en página de inicio</span>
          </label>

          <div style="border-top: 1px solid var(--border-subtle); padding-top: 1.5rem; display: flex; flex-direction: column; gap: 0.75rem;">
            <button type="submit" class="btn-submit" id="btn-save-project" style="width: 100%;">
              ${projectId ? 'Guardar Cambios' : 'Crear Proyecto'}
            </button>
            <button type="button" class="btn-direct-contact" id="btn-cancel-edit" style="width: 100%; justify-content: center;">
              Cancelar
            </button>
          </div>
        </div>
      </div>

      <!-- Media Gallery Uploader & Manager -->
      <div style="border-top: 1px solid var(--border-subtle); padding-top: 2rem;">
        <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 1rem;">
          <h3 style="font-size: 1.25rem; font-weight: 500;">Galería de Fotografías y Videos</h3>
          <span style="font-size: 0.75rem; color: var(--text-muted);" id="media-count-label">${uploadedMediaBuffer.length} archivos añadidos</span>
        </div>

        <!-- Drag & Drop Upload Zone -->
        <div class="upload-dropzone" id="upload-dropzone">
          <input type="file" id="media-file-input" multiple accept="image/*,video/*" style="display: none;" />
          <div class="upload-dropzone-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
          </div>
          <p class="upload-dropzone-text"><strong>Arrastra y suelta tus fotografías y videos aquí</strong> o haz clic para explorar</p>
          <p class="upload-dropzone-sub">Soporta JPG, PNG, WebP y videos MP4 / WebM / MOV. Optimización automática a WebP sin pérdida de calidad.</p>
          <div id="upload-progress-bar" style="display:none; width:100%; height:4px; background:#222; margin-top:1rem; border-radius:2px; overflow:hidden;">
            <div id="upload-progress-fill" style="width:0%; height:100%; background:var(--text-primary); transition:width 0.2s;"></div>
          </div>
        </div>

        <!-- Add Media by External URL (Vimeo, YouTube, Cloudinary, Web link) -->
        <div style="margin-top: 1rem; background-color: var(--bg-secondary); border: 1px solid var(--border-subtle); border-radius: var(--radius-xs); padding: 1.25rem;">
          <h4 style="font-size: 0.8125rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.75rem; color: var(--text-secondary);">
            🔗 O Añadir Video / Foto por Enlace Web (YouTube, Vimeo, Cloudinary, MP4 directo)
          </h4>
          <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
            <select id="ext-media-type" class="form-select" style="width: 140px; padding: 0.5rem 0.75rem; font-size: 0.8125rem;">
              <option value="video">Video (Vimeo/YT/MP4)</option>
              <option value="image">Fotografía (URL)</option>
            </select>
            <input type="url" id="ext-media-url" class="form-input" placeholder="Pega el enlace de Vimeo, YouTube o URL directa..." style="flex-grow: 1; padding: 0.5rem 0.75rem; font-size: 0.8125rem;" />
            <input type="text" id="ext-media-caption" class="form-input" placeholder="Pie de foto / Título (opcional)" style="width: 220px; padding: 0.5rem 0.75rem; font-size: 0.8125rem;" />
            <button type="button" class="btn-submit" id="btn-add-ext-media" style="padding: 0.5rem 1.25rem; font-size: 0.8125rem; white-space: nowrap;">
              + Añadir al Proyecto
            </button>
          </div>
        </div>

        <!-- Media Grid Preview & Ordering -->
        <div class="media-manager-grid" id="media-manager-grid">
          <!-- Rendered dynamically -->
        </div>
      </div>
    </form>
  `;

  renderMediaManagerGrid();

  // Attach File Upload Dropzone
  const dropzone = document.getElementById('upload-dropzone');
  const fileInput = document.getElementById('media-file-input');

  dropzone.addEventListener('click', () => fileInput.click());

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });

  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesUpload(e.dataTransfer.files);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFilesUpload(e.target.files);
    }
  });

  // Add Media by External URL
  const addExtBtn = document.getElementById('btn-add-ext-media');
  if (addExtBtn) {
    addExtBtn.addEventListener('click', () => {
      const urlInput = document.getElementById('ext-media-url');
      const typeSelect = document.getElementById('ext-media-type');
      const captionInput = document.getElementById('ext-media-caption');

      const url = urlInput.value.trim();
      const type = typeSelect.value;
      const caption = captionInput.value.trim();

      if (!url) {
        showToast('Por favor introduce un enlace o URL', 'error');
        return;
      }

      uploadedMediaBuffer.push({
        id: `m-ext-${Date.now()}`,
        type,
        url,
        thumbnail: url,
        caption: caption || '',
        aspect: type === 'video' ? 'panoramic' : 'horizontal'
      });

      urlInput.value = '';
      captionInput.value = '';
      renderMediaManagerGrid();
      showToast(`${type === 'video' ? 'Video' : 'Fotografía'} añadido a la galería`);
    });
  }

  // Cancel edit
  document.getElementById('btn-cancel-edit').addEventListener('click', () => {
    currentTab = 'projects';
    initAdminPanel(document.getElementById('app-root'));
  });

  // Save Project Form Submit
  const form = document.getElementById('project-editor-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const saveBtn = document.getElementById('btn-save-project');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Guardando...';

    const selectedCategory = document.getElementById('proj-category').value;
    const catObj = categories.find(c => c.id === selectedCategory);

    // Cover image logic: if cover not explicitly picked, use first media item
    let cover = projectData.coverImage;
    if (!cover && uploadedMediaBuffer.length > 0) {
      cover = uploadedMediaBuffer[0].url;
    }

    const payload = {
      title: document.getElementById('proj-title').value.trim(),
      category: selectedCategory,
      categoryName: catObj ? catObj.name : 'Fotografía',
      year: document.getElementById('proj-year').value.trim(),
      client: document.getElementById('proj-client').value.trim(),
      description: document.getElementById('proj-desc').value.trim(),
      coverImage: cover,
      coverAspect: document.getElementById('proj-aspect').value,
      published: document.getElementById('proj-published').checked,
      featured: document.getElementById('proj-featured').checked,
      media: uploadedMediaBuffer
    };

    try {
      const url = projectId ? `/api/projects/${projectId}` : '/api/projects';
      const method = projectId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify(payload)
      });

      const resData = await res.json();
      if (res.ok && resData.success) {
        showToast(projectId ? 'Proyecto actualizado con éxito' : 'Proyecto creado con éxito');
        currentTab = 'projects';
        initAdminPanel(document.getElementById('app-root'));
      } else {
        showToast(resData.error || 'Error al guardar proyecto', 'error');
      }
    } catch (err) {
      showToast('Error al conectar con el servidor', 'error');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = projectId ? 'Guardar Cambios' : 'Crear Proyecto';
    }
  });
}

function renderMediaManagerGrid() {
  const grid = document.getElementById('media-manager-grid');
  const countLabel = document.getElementById('media-count-label');
  if (!grid) return;

  if (countLabel) countLabel.textContent = `${uploadedMediaBuffer.length} archivos añadidos`;

  if (uploadedMediaBuffer.length === 0) {
    grid.innerHTML = `<p style="grid-column: 1 / -1; color: var(--text-muted); font-size: 0.8125rem; padding: 1rem 0;">Aún no has subido fotografías ni videos para este proyecto.</p>`;
    return;
  }

  grid.innerHTML = uploadedMediaBuffer.map((item, idx) => `
    <div class="media-manager-card ${idx === 0 ? 'is-cover' : ''}" data-index="${idx}">
      ${item.type === 'video' ? `
        <video src="${item.url}" class="media-manager-preview" muted></video>
      ` : `
        <img src="${item.thumbnail || item.url}" class="media-manager-preview" alt="Preview" />
      `}
      <div class="media-manager-meta">
        <span>${item.originalName || item.caption || `Medio #${idx + 1}`}</span>
      </div>
      <input type="text" class="form-input media-caption-input" data-index="${idx}" value="${item.caption || ''}" placeholder="Pie de foto / Alt..." style="padding: 0.35rem 0.5rem; font-size: 0.75rem;" />
      <div class="media-manager-actions">
        <button type="button" class="btn-cover-badge ${idx === 0 ? 'active' : ''} btn-set-cover" data-index="${idx}">
          ${idx === 0 ? '★ Portada' : 'Hacer Portada'}
        </button>
        <button type="button" class="action-icon-btn delete btn-remove-media" data-index="${idx}" title="Eliminar archivo">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>
    </div>
  `).join('');

  // Attach caption change
  grid.querySelectorAll('.media-caption-input').forEach(input => {
    input.addEventListener('input', (e) => {
      const idx = parseInt(input.getAttribute('data-index'), 10);
      if (uploadedMediaBuffer[idx]) {
        uploadedMediaBuffer[idx].caption = e.target.value;
      }
    });
  });

  // Attach set cover
  grid.querySelectorAll('.btn-set-cover').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-index'), 10);
      if (idx > 0) {
        // Move to position 0 (cover)
        const chosen = uploadedMediaBuffer.splice(idx, 1)[0];
        uploadedMediaBuffer.unshift(chosen);
        renderMediaManagerGrid();
        showToast('Portada del proyecto actualizada');
      }
    });
  });

  // Attach delete item
  grid.querySelectorAll('.btn-remove-media').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-index'), 10);
      uploadedMediaBuffer.splice(idx, 1);
      renderMediaManagerGrid();
    });
  });
}

async function handleFilesUpload(fileList) {
  const progressBar = document.getElementById('upload-progress-bar');
  const progressFill = document.getElementById('upload-progress-fill');

  if (progressBar) progressBar.style.display = 'block';
  if (progressFill) progressFill.style.width = '30%';

  const formData = new FormData();
  for (let i = 0; i < fileList.length; i++) {
    formData.append('files', fileList[i]);
  }

  try {
    if (progressFill) progressFill.style.width = '65%';
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      body: formData
    });

    if (progressFill) progressFill.style.width = '100%';
    const data = await res.json();

    if (res.ok && data.success) {
      uploadedMediaBuffer.push(...data.media);
      showToast(`${data.media.length} archivo(s) subido(s) y optimizado(s)`);
      renderMediaManagerGrid();
    } else {
      showToast(data.error || 'Error al subir archivos', 'error');
    }
  } catch (err) {
    showToast('Error en la carga de archivos: ' + err.message, 'error');
  } finally {
    setTimeout(() => {
      if (progressBar) progressBar.style.display = 'none';
      if (progressFill) progressFill.style.width = '0%';
    }, 400);
  }
}

// --------------------------------------------------------------------------
// 5. SETTINGS & PROFILE TAB
// --------------------------------------------------------------------------
async function renderSettingsTab(container) {
  let settings = state.settings || await fetchSettings();
  // Fetch admin settings including password
  try {
    const res = await fetch('/api/admin/settings', {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    if (res.ok) settings = await res.json();
  } catch (err) {
    console.error(err);
  }

  container.innerHTML = `
    <div style="margin-bottom: 2rem;">
      <h2 style="font-size: 1.5rem; font-weight: 600;">Configuración del Portafolio</h2>
      <p style="color: var(--text-muted); font-size: 0.8125rem;">Personaliza tus datos de identidad, servicios, redes y seguridad.</p>
    </div>

    <form id="settings-form" style="display: flex; flex-direction: column; gap: 2rem;">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
        <!-- General Info -->
        <div style="display: flex; flex-direction: column; gap: 1.5rem;">
          <h3 style="font-size: 1.1rem; font-weight: 500; border-bottom: 1px solid var(--border-subtle); padding-bottom: 0.5rem;">Identidad & Textos</h3>

          <div class="form-group">
            <label class="form-label" for="set-name">Nombre Profesional</label>
            <input type="text" id="set-name" class="form-input" value="${settings?.name || ''}" required />
          </div>

          <!-- Profile Photo Upload & Preview -->
          <div class="form-group">
            <label class="form-label">Fotografía de Perfil / Retrato de Autor</label>
            <div style="display: flex; gap: 1.25rem; align-items: center; background: var(--bg-tertiary); padding: 1rem; border-radius: var(--radius-xs); border: 1px solid var(--border-subtle);">
              <div style="width: 85px; height: 105px; border-radius: var(--radius-xs); overflow: hidden; background: #000; flex-shrink: 0; border: 1px solid var(--border-light);">
                <img id="profile-img-preview" src="${settings?.profileImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=85'}" style="width: 100%; height: 100%; object-fit: cover;" alt="Foto de perfil" />
              </div>
              <div style="display: flex; flex-direction: column; gap: 0.6rem; flex-grow: 1;">
                <input type="file" id="profile-file-input" accept="image/*" style="display: none;" />
                <input type="hidden" id="set-profile-image" value="${settings?.profileImage || ''}" />
                <button type="button" class="btn-submit" id="btn-upload-profile" style="padding: 0.5rem 1rem; font-size: 0.75rem; width: fit-content;">
                  📷 Subir Foto de Perfil
                </button>
                <input type="text" id="set-profile-url-input" class="form-input" placeholder="O introduce una URL de imagen..." value="${settings?.profileImage || ''}" style="padding: 0.4rem 0.6rem; font-size: 0.75rem;" />
              </div>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="set-tagline">Tagline / Título Profesional</label>
            <input type="text" id="set-tagline" class="form-input" value="${settings?.tagline || ''}" />
          </div>

          <div class="form-group">
            <label class="form-label" for="set-hero">Subtítulo Hero de Inicio</label>
            <input type="text" id="set-hero" class="form-input" value="${settings?.heroSubtitle || ''}" />
          </div>

          <div class="form-group">
            <label class="form-label" for="set-location">Ubicación / Disponibilidad</label>
            <input type="text" id="set-location" class="form-input" value="${settings?.location || ''}" />
          </div>

          <div class="form-group">
            <label class="form-label" for="set-bio">Biografía / Acerca del Autor</label>
            <textarea id="set-bio" class="form-textarea" style="min-height: 120px;">${settings?.bio || ''}</textarea>
          </div>
        </div>

        <!-- Contact & Channels -->
        <div style="display: flex; flex-direction: column; gap: 1.5rem;">
          <h3 style="font-size: 1.1rem; font-weight: 500; border-bottom: 1px solid var(--border-subtle); padding-bottom: 0.5rem;">Canales de Contacto & Redes</h3>

          <div class="form-group">
            <label class="form-label" for="set-email">Email de Contacto</label>
            <input type="email" id="set-email" class="form-input" value="${settings?.email || ''}" required />
          </div>

          <div class="form-group">
            <label class="form-label" for="set-whatsapp">WhatsApp (con código país)</label>
            <input type="text" id="set-whatsapp" class="form-input" value="${settings?.whatsapp || ''}" placeholder="+34600000000" />
          </div>

          <div class="form-group">
            <label class="form-label" for="set-instagram">URL Perfil de Instagram</label>
            <input type="url" id="set-instagram" class="form-input" value="${settings?.instagram || ''}" placeholder="https://instagram.com/tuusuario" />
          </div>

          <div class="form-group">
            <label class="form-label" for="set-vimeo">URL Vimeo / YouTube</label>
            <input type="url" id="set-vimeo" class="form-input" value="${settings?.vimeo || ''}" placeholder="https://vimeo.com/tuusuario" />
          </div>

          <h3 style="font-size: 1.1rem; font-weight: 500; border-bottom: 1px solid var(--border-subtle); padding-bottom: 0.5rem; margin-top: 1rem;">Seguridad del Panel</h3>

          <div class="form-group">
            <label class="form-label" for="set-pass">Contraseña de Administrador</label>
            <input type="password" id="set-pass" class="form-input" value="${settings?.adminPassword || ''}" />
          </div>
        </div>
      </div>

      <button type="submit" class="btn-submit" id="btn-save-settings" style="align-self: flex-start;">
        Guardar Configuración
      </button>
    </form>
  `;

  // Attach Profile Image Upload Handlers
  const uploadProfileBtn = document.getElementById('btn-upload-profile');
  const profileFileInput = document.getElementById('profile-file-input');
  const profileImgPreview = document.getElementById('profile-img-preview');
  const setProfileImageHidden = document.getElementById('set-profile-image');
  const profileUrlInput = document.getElementById('set-profile-url-input');

  if (uploadProfileBtn && profileFileInput) {
    uploadProfileBtn.addEventListener('click', () => profileFileInput.click());

    profileFileInput.addEventListener('change', async (e) => {
      if (!e.target.files || e.target.files.length === 0) return;
      
      const file = e.target.files[0];
      const formData = new FormData();
      formData.append('files', file);

      uploadProfileBtn.disabled = true;
      uploadProfileBtn.textContent = 'Subiendo...';

      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { Authorization: `Bearer ${authToken}` },
          body: formData
        });
        const data = await res.json();
        if (res.ok && data.success && data.media.length > 0) {
          const uploadedUrl = data.media[0].url;
          profileImgPreview.src = uploadedUrl;
          setProfileImageHidden.value = uploadedUrl;
          profileUrlInput.value = uploadedUrl;
          showToast('Foto de perfil subida y optimizada con éxito');
        } else {
          showToast(data.error || 'Error al subir la imagen', 'error');
        }
      } catch (err) {
        showToast('Error al conectar con el servidor', 'error');
      } finally {
        uploadProfileBtn.disabled = false;
        uploadProfileBtn.textContent = '📷 Subir Foto de Perfil';
      }
    });
  }

  if (profileUrlInput) {
    profileUrlInput.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      setProfileImageHidden.value = val;
      if (val) {
        profileImgPreview.src = val;
      }
    });
  }

  // Save Settings
  const form = document.getElementById('settings-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-save-settings');
    btn.disabled = true;
    btn.textContent = 'Guardando...';

    const updatedSettings = {
      name: document.getElementById('set-name').value.trim(),
      profileImage: document.getElementById('set-profile-image').value.trim(),
      tagline: document.getElementById('set-tagline').value.trim(),
      heroSubtitle: document.getElementById('set-hero').value.trim(),
      location: document.getElementById('set-location').value.trim(),
      bio: document.getElementById('set-bio').value.trim(),
      email: document.getElementById('set-email').value.trim(),
      whatsapp: document.getElementById('set-whatsapp').value.trim(),
      instagram: document.getElementById('set-instagram').value.trim(),
      vimeo: document.getElementById('set-vimeo').value.trim(),
      adminPassword: document.getElementById('set-pass').value.trim()
    };

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify(updatedSettings)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Configuración guardada correctamente');
        await fetchSettings();
      } else {
        showToast(data.error || 'Error al guardar', 'error');
      }
    } catch (err) {
      showToast('Error de conexión', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Guardar Configuración';
    }
  });
}

// --------------------------------------------------------------------------
// 6. MESSAGES & INQUIRIES TAB
// --------------------------------------------------------------------------
async function renderMessagesTab(container) {
  let messagesList = [];
  try {
    const res = await fetch('/api/admin/messages', {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    if (res.ok) messagesList = await res.json();
  } catch (err) {
    console.error(err);
  }

  container.innerHTML = `
    <div style="margin-bottom: 2rem;">
      <h2 style="font-size: 1.5rem; font-weight: 600;">Bandeja de Mensajes de Contacto (${messagesList.length})</h2>
      <p style="color: var(--text-muted); font-size: 0.8125rem;">Consultas y solicitudes de presupuestos recibidas a través de la web.</p>
    </div>

    ${messagesList.length === 0 ? `
      <div class="empty-state" style="background: var(--bg-secondary); border-radius: var(--radius-xs);">
        <p>No has recibido ningún mensaje de contacto todavía.</p>
      </div>
    ` : `
      <div style="display: flex; flex-direction: column; gap: 1.25rem;">
        ${messagesList.map(msg => `
          <div style="background: var(--bg-secondary); border: 1px solid var(--border-subtle); border-radius: var(--radius-xs); padding: 1.5rem; display: flex; flex-direction: column; gap: 0.75rem;">
            <div style="display: flex; justify-content: space-between; align-items: baseline;">
              <div>
                <strong style="font-size: 1.1rem; color: var(--text-primary);">${msg.name}</strong>
                <a href="mailto:${msg.email}" style="color: var(--text-muted); margin-left: 0.75rem; font-size: 0.875rem;">${msg.email}</a>
                <span class="status-badge" style="background: var(--bg-tertiary); color: var(--text-secondary); margin-left: 0.75rem;">${msg.projectType}</span>
              </div>
              <div style="display: flex; align-items: center; gap: 1rem;">
                <span style="font-size: 0.75rem; color: var(--text-muted);">${new Date(msg.date).toLocaleDateString()} ${new Date(msg.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                <button class="action-icon-btn delete btn-del-msg" data-id="${msg.id}" title="Eliminar mensaje">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
              </div>
            </div>
            <p style="color: var(--text-secondary); font-size: 0.95rem; line-height: 1.6; white-space: pre-wrap;">${msg.message}</p>
            <div style="margin-top: 0.5rem;">
              <a href="mailto:${msg.email}?subject=Respuesta a tu consulta de ${encodeURIComponent(msg.projectType)}" class="btn-direct-contact" style="display: inline-flex; font-size: 0.75rem;">
                Responder por Email
              </a>
            </div>
          </div>
        `).join('')}
      </div>
    `}
  `;

  // Attach delete message
  container.querySelectorAll('.btn-del-msg').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      try {
        const res = await fetch(`/api/admin/messages/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${authToken}` }
        });
        if (res.ok) {
          showToast('Mensaje eliminado');
          renderMessagesTab(container);
        }
      } catch (err) {
        showToast('Error al eliminar mensaje', 'error');
      }
    });
  });
}
