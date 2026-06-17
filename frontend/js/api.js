const API_BASE = '/api';

function getToken() { return localStorage.getItem('token'); }
function getUser()  {
  try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
}

async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res  = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.erro || `Erro ${res.status}`);
  return data;
}

const api = {
  get:    (path)       => apiFetch(path),
  post:   (path, body) => apiFetch(path, { method: 'POST',   body: JSON.stringify(body) }),
  put:    (path, body) => apiFetch(path, { method: 'PUT',    body: JSON.stringify(body) }),
  delete: (path)       => apiFetch(path, { method: 'DELETE' }),
};

function saveSession(token, id, nome, perfil) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify({ id, nome, perfil }));
}
function clearSession() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}
function isLoggedIn() { return !!getToken(); }

function setupNav() {
  const user = getUser();
  document.querySelectorAll('.guest-only').forEach(el =>
    el.style.display = user ? 'none' : ''
  );
  document.querySelectorAll('.auth-only').forEach(el =>
    el.style.display = user ? 'inline-flex' : 'none'
  );
  const nomeEl = document.querySelector('.nav-username');
  if (nomeEl && user) nomeEl.textContent = user.nome;
}

function logout() {
  clearSession();
  window.location.href = '/pages/login.html';
}

function toast(msg, tipo = 'info') {
  const t = document.createElement('div');
  t.className = `toast toast-${tipo}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3000);
}

function fmtDate(d) {
  return new Date(d).toLocaleDateString('pt-BR', { day:'2-digit', month:'short', year:'numeric' });
}

// ── Busca global com dropdown (jogos + usuários) ──────────────────
function initSearch(inputEl, dropdownEl) {
  if (!inputEl || !dropdownEl) return;

  // Estilos inline para o dropdown (sem depender de CSS extra)
  Object.assign(dropdownEl.style, {
    position: 'absolute',
    top: '46px',
    left: '0',
    right: '0',
    background: '#15151a',
    border: '1px solid rgba(255,255,255,0.10)',
    borderRadius: '10px',
    boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
    zIndex: '9999',
    overflow: 'hidden',
    display: 'none',
    maxHeight: '420px',
    overflowY: 'auto',
  });
  // Garante que o pai tem position relative
  inputEl.parentElement.style.position = 'relative';

  let debounceTimer;
  let currentQuery = '';

  inputEl.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    const q = inputEl.value.trim();
    if (!q) { dropdownEl.style.display = 'none'; return; }
    debounceTimer = setTimeout(() => runSearch(q), 220);
  });

  inputEl.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      dropdownEl.style.display = 'none';
      const q = inputEl.value.trim();
      if (q) window.location.href = `/pages/catalogo.html?search=${encodeURIComponent(q)}`;
    }
    if (e.key === 'Escape') { dropdownEl.style.display = 'none'; }
  });

  document.addEventListener('click', e => {
    if (!inputEl.parentElement.contains(e.target)) dropdownEl.style.display = 'none';
  });

  inputEl.addEventListener('focus', () => {
    if (inputEl.value.trim() && dropdownEl.innerHTML) dropdownEl.style.display = 'block';
  });

  async function runSearch(q) {
    if (q === currentQuery) return;
    currentQuery = q;
    dropdownEl.style.display = 'block';
    dropdownEl.innerHTML = renderSearchLoading();

    try {
      const [jogos, usuarios] = await Promise.all([
        fetch(`/api/jogos?search=${encodeURIComponent(q)}&limit=4`).then(r => r.json()),
        fetch(`/api/usuarios/buscar?q=${encodeURIComponent(q)}`).then(r => r.json()),
      ]);

      if (q !== currentQuery) return; // descarta resultado desatualizado

      const jogosList = jogos.jogos || [];
      const usuariosList = Array.isArray(usuarios) ? usuarios : [];

      if (!jogosList.length && !usuariosList.length) {
        dropdownEl.innerHTML = renderSearchEmpty(q);
      } else {
        dropdownEl.innerHTML = renderSearchResults(jogosList, usuariosList, q);
      }
    } catch {
      dropdownEl.style.display = 'none';
    }
  }

  function renderSearchLoading() {
    return `<div style="padding:16px;text-align:center;color:#888;font-size:13px">Buscando...</div>`;
  }

  function renderSearchEmpty(q) {
    return `<div style="padding:20px;text-align:center;color:#888;font-size:13px">
      Nenhum resultado para "<strong style="color:#f0f0f0">${esc(q)}</strong>"
    </div>`;
  }

  function renderSearchResults(jogos, usuarios, q) {
    const COLORS = ['#e8ff47','#ff4f4f','#47c5ff','#ff9f47','#a78bfa','#34d399'];
    function colorFor(name) { let h=0; for(const c of name) h+=c.charCodeAt(0); return COLORS[h%COLORS.length]; }

    let html = '';

    if (jogos.length) {
      html += `<div style="padding:8px 14px 4px;font-size:10px;font-weight:700;color:#888;letter-spacing:1px;text-transform:uppercase;">🎮 Jogos</div>`;
      html += jogos.map(g => {
        const nota = g.nota_media ? parseFloat(g.nota_media).toFixed(1) : '—';
        const img = g.capa
          ? `<img src="${esc(g.capa)}" style="width:32px;height:42px;object-fit:cover;border-radius:4px;flex-shrink:0" onerror="this.style.display='none'">`
          : `<div style="width:32px;height:42px;border-radius:4px;background:#1c1c24;flex-shrink:0"></div>`;
        return `<a href="/pages/jogo.html?id=${g.id_jogo}" style="display:flex;align-items:center;gap:12px;padding:8px 14px;text-decoration:none;color:#f0f0f0;transition:background .15s;" onmouseenter="this.style.background='rgba(255,255,255,0.05)'" onmouseleave="this.style.background=''">
          ${img}
          <div style="flex:1;min-width:0">
            <div style="font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(g.nome_jogo)}</div>
            <div style="font-size:11px;color:#888">${esc(g.desenvolvedora)}</div>
          </div>
          <div style="font-size:14px;font-weight:700;color:#e8ff47;flex-shrink:0">★ ${nota}</div>
        </a>`;
      }).join('');
    }

    if (usuarios.length) {
      html += `<div style="padding:${jogos.length?'12px':'8px'} 14px 4px;font-size:10px;font-weight:700;color:#888;letter-spacing:1px;text-transform:uppercase;${jogos.length?'border-top:1px solid rgba(255,255,255,0.07)':''}">👤 Jogadores</div>`;
      html += usuarios.map(u => {
        const col = colorFor(u.nome_usuario);
        const iniciais = u.nome_usuario.slice(0,2).toUpperCase();
        return `<a href="/pages/usuario.html?id=${u.id_usuario}" style="display:flex;align-items:center;gap:12px;padding:8px 14px;text-decoration:none;color:#f0f0f0;transition:background .15s;" onmouseenter="this.style.background='rgba(255,255,255,0.05)'" onmouseleave="this.style.background=''">
          <div style="width:32px;height:32px;border-radius:50%;background:${col};display:flex;align-items:center;justify-content:center;font-family:'Bebas Neue',sans-serif;font-size:14px;color:#0d0d0f;flex-shrink:0">${iniciais}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:14px;font-weight:600">${esc(u.nome_usuario)}</div>
            <div style="font-size:11px;color:#888">${u.total_avaliacoes} avaliações · ${u.total_seguidores} seguidores</div>
          </div>
          <div style="font-size:11px;color:#888;flex-shrink:0">${esc(u.nome_perfil)}</div>
        </a>`;
      }).join('');
    }

    const hasMore = jogos.length >= 4;
    if (hasMore) {
      html += `<a href="/pages/catalogo.html?search=${encodeURIComponent(q)}" style="display:block;padding:10px 14px;text-align:center;font-size:12px;color:#e8ff47;text-decoration:none;border-top:1px solid rgba(255,255,255,0.07);">
        Ver todos os resultados para "${esc(q)}" →
      </a>`;
    }

    return html;
  }

  function esc(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
}
