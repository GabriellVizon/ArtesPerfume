(() => {
  const FAVORITOS_KEY = 'artesperfume:favoritos:v3';
  const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  function escapeHtml(value){ return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c])); }
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
  async function loadConfig(){
    try { const {data}=await fetchJson('/api/config'); window.AP_CONFIG=data; return data; }
    catch { window.AP_CONFIG={}; return {}; }
  }
  async function loadCatalog(){ const {data,response}=await fetchJson('/api/catalogo'); return {products:Array.isArray(data)?data:[],mode:response.headers.get('X-Catalogo-Modo')||'demo'}; }
  function safeImageSource(value){
    const raw=String(value||'').trim();
    if(/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=\r\n]+$/i.test(raw)) return raw;
    return safeUrl(raw);
  }
  function productImage(product){ return safeImageSource(product?.imagem) || 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600"><rect width="100%" height="100%" fill="#ece1cd"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#473469" font-family="serif" font-size="38">Aura Noir</text></svg>`); }
  function productBadges(product){ return [product.novo&&'Novo',product.destaque&&'Destaque',product.recomendado&&'Recomendado'].filter(Boolean); }
  function card(product,{quick=false}={}){
    const article=document.createElement('article'); article.className='product-card'; article.dataset.id=product.id;
    const media=document.createElement('div'); media.className='product-image';
    const img=document.createElement('img'); img.src=productImage(product); img.alt=product.nome||'Perfume'; img.loading='lazy'; media.append(img);
    const fav=document.createElement('button'); fav.className='fav-btn'+(isFavorite(product.id)?' saved':''); fav.type='button'; fav.dataset.favorite=product.id; fav.setAttribute('aria-label','Adicionar aos favoritos'); fav.textContent=isFavorite(product.id)?'♥':'♡'; media.append(fav);
    const badges=productBadges(product); if(badges.length){ const row=document.createElement('div'); row.className='badge-row'; badges.forEach(b=>{const s=document.createElement('span');s.className='badge';s.textContent=b;row.append(s)}); media.append(row); }
    const body=document.createElement('div'); body.className='product-body';
    const eye=document.createElement('p');eye.className='eyebrow';eye.textContent=product.origem==='instagram'?'Curadoria do Instagram':product.origem==='manual'?'Seleção da loja':'Acervo demonstrativo';
    const h=document.createElement('h3');h.textContent=product.nome||'Perfume';
    const desc=document.createElement('p');desc.textContent=product.descricao||'Conheça esta fragrância e fale com o atelier para saber mais.';
    const meta=document.createElement('div');meta.className='product-meta';meta.innerHTML=`<span class="price">${price(product.preco)}</span><span class="stock${product.estoque===0?' off':''}">${statusLabel(product)}</span>`;
    const actions=document.createElement('div');actions.className='card-actions';
    const details=document.createElement('a');details.className='btn secondary';details.href=`/detalhes.html?id=${encodeURIComponent(product.id)}`;details.textContent='Ver detalhes';actions.append(details);
    if(quick){const q=document.createElement('button');q.type='button';q.className='btn ghost';q.dataset.quick=product.id;q.textContent='Visão rápida';actions.append(q)}
    body.append(eye,h,desc,meta,actions);article.append(media,body);return article;
  }
  function bindFavoriteButtons(root=document){
    root.addEventListener('click',e=>{const btn=e.target.closest('[data-favorite]');if(!btn)return; const saved=toggleFavorite(btn.dataset.favorite); btn.classList.toggle('saved',saved);btn.textContent=saved?'♥':'♡';toast(saved?'Perfume salvo nos favoritos.':'Perfume removido dos favoritos.');});
  }
  function setActiveNav(name){ document.querySelectorAll(`[data-nav="${name}"]`).forEach(a=>a.classList.add('active')); }
  function syncBrand(config){
    const name=config.brandName||'Aura Noir'; const subtitle=config.brandSubtitle||'Atelier';
    document.querySelectorAll('[data-brand-name]').forEach(el=>el.textContent=name);
    document.querySelectorAll('[data-brand-subtitle]').forEach(el=>el.textContent=subtitle);
  }
  async function initShell(nav){ updateFavoriteCounters(); setActiveNav(nav); const cfg=await loadConfig(); syncBrand(cfg); return cfg; }

  window.AP={escapeHtml,price,getFavorites,setFavorites,isFavorite,toggleFavorite,updateFavoriteCounters,statusLabel,ctaLabel,whatsappUrl,toast,fetchJson,loadConfig,loadCatalog,productImage,productBadges,card,bindFavoriteButtons,setActiveNav,syncBrand,initShell,safeUrl,safeImageSource};
})();
