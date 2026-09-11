(() => {
  const FAVORITOS_KEY = 'artesperfume:favoritos:v3';
  const CATALOG_DATA_KEY = 'artesperfume:catalogo:v4';
  const CONFIG_DATA_KEY = 'artesperfume:config:v2';
  const RUNTIME_CACHE = 'artesperfume-runtime-v1';
  const CATALOG_CACHE_URL = '/__artesperfume_cache__/catalogo-v1';
  const CATALOG_TTL = 2 * 60 * 1000;
  const CONFIG_TTL = 15 * 60 * 1000;
  const SESSION_SAFE_SIZE = 3_200_000;
  const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  let memoryCatalog = null;
  let catalogRefreshPromise = null;
  let prefetchStarted = false;

  function escapeHtml(value){ return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c])); }
  function safeUrl(value){
    try { const url = new URL(value); return url.protocol === 'https:' ? url.href : null; }
    catch { return null; }
  }
  function price(value){ return typeof value === 'number' ? money.format(value) : 'Preço sob consulta'; }
  function getFavorites(){
    try { const parsed = JSON.parse(localStorage.getItem(FAVORITOS_KEY) || '[]'); return Array.isArray(parsed) ? [...new Set(parsed.map(String))] : []; }
    catch { return []; }
  }
  function setFavorites(ids){ localStorage.setItem(FAVORITOS_KEY, JSON.stringify([...new Set(ids.map(String))])); updateFavoriteCounters(); }
  function isFavorite(id){ return getFavorites().includes(String(id)); }
  function toggleFavorite(id){
    const key = String(id); const list = getFavorites(); const exists = list.includes(key);
    setFavorites(exists ? list.filter(x => x !== key) : [...list, key]);
    return !exists;
  }
  function updateFavoriteCounters(){
    const n = getFavorites().length;
    document.querySelectorAll('[data-favorite-count]').forEach(el => { el.textContent = n; el.hidden = n === 0; });
  }
  function statusLabel(product){
    if (product.estoque === 0) return 'Indisponível no momento';
    if (product.estoque === null || product.estoque === undefined) return 'Disponibilidade sob consulta';
    return `${product.estoque} unidade${product.estoque === 1 ? '' : 's'} disponível${product.estoque === 1 ? '' : 'is'}`;
  }
  function ctaLabel(product){ return product.estoque === 0 ? 'Consultar disponibilidade' : 'Tenho interesse'; }
  function whatsappUrl(product, customMessage){
    const phone = String(product?.whatsapp || window.AP_CONFIG?.whatsapp || '').replace(/\D/g, '');
    if (!/^\d{10,15}$/.test(phone)) return null;
    const msg = customMessage || `Olá! Tenho interesse no perfume ${product.nome}${typeof product.preco === 'number' ? `, no valor de ${price(product.preco)}` : ''}. Gostaria de saber mais sobre a disponibilidade.`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  }
  function toast(text){
    let el = document.getElementById('ap-toast');
    if (!el){ el = document.createElement('div'); el.id='ap-toast'; el.className='toast hide'; document.body.append(el); }
    el.textContent=text; el.classList.remove('hide'); clearTimeout(toast.timer); toast.timer=setTimeout(()=>el.classList.add('hide'),2300);
  }
  async function fetchJson(url, options={}){
    const response = await fetch(url, { credentials:'same-origin', ...options });
    let data = null; try { data = await response.json(); } catch {}
    if (!response.ok) throw new Error(data?.erro || 'Não foi possível concluir a operação.');
    return { data, response };
  }

  function readSession(key){
    try {
      const raw = sessionStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }
  function writeSession(key, value){
    try {
      const raw = JSON.stringify(value);
      if (raw.length > SESSION_SAFE_SIZE) return false;
      sessionStorage.setItem(key, raw);
      return true;
    } catch { return false; }
  }
  function removeSession(key){ try { sessionStorage.removeItem(key); } catch {} }

  async function readCatalogCache(){
    if (memoryCatalog?.products) return memoryCatalog;

    const stored = readSession(CATALOG_DATA_KEY);
    if (stored?.products && Array.isArray(stored.products)) {
      memoryCatalog = stored;
      return stored;
    }

    if ('caches' in window) {
      try {
        const cache = await caches.open(RUNTIME_CACHE);
        const response = await cache.match(CATALOG_CACHE_URL);
        if (response) {
          const payload = await response.json();
          if (payload?.products && Array.isArray(payload.products)) {
            memoryCatalog = payload;
            return payload;
          }
        }
      } catch {}
    }
    return null;
  }

  async function writeCatalogCache(payload){
    memoryCatalog = payload;
    const storedInSession = writeSession(CATALOG_DATA_KEY, payload);

    if ('caches' in window) {
      try {
        const cache = await caches.open(RUNTIME_CACHE);
        await cache.put(CATALOG_CACHE_URL, new Response(JSON.stringify(payload), {
          headers: { 'Content-Type': 'application/json', 'X-AP-Cache': storedInSession ? 'mirror' : 'large-payload' }
        }));
      } catch {}
    }
  }

  async function fetchCatalogNetwork(){
    const {data,response} = await fetchJson('/api/catalogo', { cache:'no-store' });
    const payload = {
      products: Array.isArray(data) ? data : [],
      mode: response.headers.get('X-Catalogo-Modo') || 'catalogo',
      savedAt: Date.now()
    };
    await writeCatalogCache(payload);
    window.dispatchEvent(new CustomEvent('ap:catalog-updated', { detail: payload }));
    return { ...payload, cached:false, stale:false };
  }

  async function refreshCatalog(){
    if (!catalogRefreshPromise) {
      catalogRefreshPromise = fetchCatalogNetwork().finally(() => { catalogRefreshPromise = null; });
    }
    return catalogRefreshPromise;
  }

  async function loadCatalog({ force=false, background=true }={}){
    if (force) return refreshCatalog();

    const cached = await readCatalogCache();
    if (cached?.products) {
      const stale = !cached.savedAt || (Date.now() - cached.savedAt) > CATALOG_TTL;
      if (stale && background) refreshCatalog().catch(() => {});
      return { ...cached, cached:true, stale };
    }
    return refreshCatalog();
  }

  async function getCachedProduct(id){
    const cached = await readCatalogCache();
    if (!cached?.products) return null;
    return cached.products.find(item => String(item.id) === String(id)) || null;
  }

  async function invalidateCatalogCache(){
    memoryCatalog = null;
    removeSession(CATALOG_DATA_KEY);
    if ('caches' in window) {
      try {
        const cache = await caches.open(RUNTIME_CACHE);
        await cache.delete(CATALOG_CACHE_URL);
      } catch {}
    }
  }

  async function fetchConfigNetwork(){
    const {data} = await fetchJson('/api/config', { cache:'force-cache' });
    const payload = { data:data || {}, savedAt:Date.now() };
    writeSession(CONFIG_DATA_KEY, payload);
    window.AP_CONFIG = payload.data;
    syncBrand(payload.data);
    return payload.data;
  }

  async function loadConfig({ force=false, background=true }={}){
    if (!force) {
      const cached = readSession(CONFIG_DATA_KEY);
      if (cached?.data) {
        window.AP_CONFIG = cached.data;
        const stale = !cached.savedAt || (Date.now() - cached.savedAt) > CONFIG_TTL;
        if (stale && background) fetchConfigNetwork().catch(() => {});
        return cached.data;
      }
    }
    try { return await fetchConfigNetwork(); }
    catch { window.AP_CONFIG = window.AP_CONFIG || {}; return window.AP_CONFIG; }
  }

  function safeImageSource(value){
    const raw=String(value||'').trim();
    if(/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=\r\n]+$/i.test(raw)) return raw;
    return safeUrl(raw);
  }
  function productImage(product){ return safeImageSource(product?.imagem) || 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600"><rect width="100%" height="100%" fill="#ece1cd"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#473469" font-family="serif" font-size="38">Aura Noir</text></svg>`); }
  function productBadges(product){ return [product.novo&&'Novo',product.destaque&&'Destaque',product.recomendado&&'Recomendado'].filter(Boolean); }
  function currentDetailSource(){
    const path=location.pathname.toLowerCase();
    if(path.includes('catalogo')) return 'catalogo';
    if(path.includes('favoritos')) return 'favoritos';
    return 'inicio';
  }
  function detailHref(id, from=currentDetailSource()){
    const params=new URLSearchParams({id:String(id),from});
    return `/detalhes.html?${params.toString()}`;
  }
  function prefetchHref(href){
    if (!href || !href.startsWith('/') || href.startsWith('/admin/')) return;
    if (document.head.querySelector(`link[data-ap-prefetch="${CSS.escape(href)}"]`)) return;
    const link=document.createElement('link');
    link.rel='prefetch'; link.href=href; link.as='document'; link.dataset.apPrefetch=href;
    document.head.append(link);
  }
  function prefetchPublicPages(){
    if (prefetchStarted) return;
    prefetchStarted = true;
    const run=()=>['/','/catalogo.html','/favoritos.html'].forEach(prefetchHref);
    if ('requestIdleCallback' in window) requestIdleCallback(run,{timeout:1200}); else setTimeout(run,350);
  }
  function card(product,{quick=false}={}){
    const article=document.createElement('article'); article.className='product-card'; article.dataset.id=product.id;
    const media=document.createElement('div'); media.className='product-image';
    const img=document.createElement('img'); img.src=productImage(product); img.alt=product.nome||'Perfume'; img.loading='lazy'; img.decoding='async'; media.append(img);
    const fav=document.createElement('button'); fav.className='fav-btn'+(isFavorite(product.id)?' saved':''); fav.type='button'; fav.dataset.favorite=product.id; fav.setAttribute('aria-label','Adicionar aos favoritos'); fav.textContent=isFavorite(product.id)?'♥':'♡'; media.append(fav);
    const badges=productBadges(product); if(badges.length){ const row=document.createElement('div'); row.className='badge-row'; badges.forEach(b=>{const s=document.createElement('span');s.className='badge';s.textContent=b;row.append(s)}); media.append(row); }
    const body=document.createElement('div'); body.className='product-body';
    const eye=document.createElement('p');eye.className='eyebrow';eye.textContent=product.origem==='instagram'?'Curadoria da loja':product.origem==='manual'?'Seleção da loja':'Curadoria';
    const h=document.createElement('h3');h.textContent=product.nome||'Perfume';
    const desc=document.createElement('p');desc.textContent=product.descricao||'Conheça esta fragrância e fale com o atelier para saber mais.';
    const meta=document.createElement('div');meta.className='product-meta';meta.innerHTML=`<span class="price">${price(product.preco)}</span><span class="stock${product.estoque===0?' off':''}">${statusLabel(product)}</span>`;
    const actions=document.createElement('div');actions.className='card-actions';
    const details=document.createElement('a');details.className='btn secondary';details.href=detailHref(product.id);details.textContent='Ver detalhes';details.addEventListener('pointerenter',()=>prefetchHref(details.href.replace(location.origin,'')),{once:true});actions.append(details);
    if(quick){const q=document.createElement('button');q.type='button';q.className='btn ghost';q.dataset.quick=product.id;q.textContent='Visão rápida';actions.append(q)}
    body.append(eye,h,desc,meta,actions);article.append(media,body);return article;
  }
  function bindFavoriteButtons(root=document){
    root.addEventListener('click',e=>{const btn=e.target.closest('[data-favorite]');if(!btn)return; const saved=toggleFavorite(btn.dataset.favorite); btn.classList.toggle('saved',saved);btn.textContent=saved?'♥':'♡';toast(saved?'Perfume salvo nos favoritos.':'Perfume removido dos favoritos.');});
  }
  function setActiveNav(name){ document.querySelectorAll(`[data-nav="${name}"]`).forEach(a=>a.classList.add('active')); }
  function syncBrand(config){
    const name=config?.brandName||'Aura Noir'; const subtitle=config?.brandSubtitle||'Atelier';
    document.querySelectorAll('[data-brand-name]').forEach(el=>el.textContent=name);
    document.querySelectorAll('[data-brand-subtitle]').forEach(el=>el.textContent=subtitle);
  }
  async function initShell(nav){
    updateFavoriteCounters();
    setActiveNav(nav);
    syncBrand(window.AP_CONFIG || {});
    prefetchPublicPages();
    loadConfig().then(syncBrand).catch(()=>{});
    return window.AP_CONFIG || {};
  }

  window.AP={escapeHtml,price,getFavorites,setFavorites,isFavorite,toggleFavorite,updateFavoriteCounters,statusLabel,ctaLabel,whatsappUrl,toast,fetchJson,loadConfig,loadCatalog,refreshCatalog,getCachedProduct,invalidateCatalogCache,productImage,productBadges,currentDetailSource,detailHref,card,bindFavoriteButtons,setActiveNav,syncBrand,initShell,safeUrl,safeImageSource,prefetchHref};
})();
