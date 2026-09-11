window.AdminAP=(()=>{
  const PUBLIC_CATALOG_KEYS=['artesperfume:catalogo:v4','artesperfume:config:v2'];
  async function api(url,options={}){const response=await fetch(url,{credentials:'same-origin',headers:{'Content-Type':'application/json',...(options.headers||{})},...options});let data=null;try{data=await response.json()}catch{}if(!response.ok){const e=new Error(data?.erro||'Não foi possível concluir a operação.');e.status=response.status;e.codigo=data?.codigo;throw e}return data}
  async function requireAuth(){try{const data=await api('/api/auth/me');document.querySelectorAll('[data-admin-email]').forEach(el=>el.textContent=data.usuario?.email||'Administrador');return data.usuario}catch(e){location.href='/admin/';throw e}}
  async function logout(){try{await api('/api/auth/logout',{method:'POST',body:'{}'})}catch{}location.href='/admin/'}
  function bindLogout(){document.querySelectorAll('[data-logout]').forEach(b=>b.addEventListener('click',logout))}
  async function invalidatePublicCache(){
    PUBLIC_CATALOG_KEYS.forEach(key=>{try{sessionStorage.removeItem(key)}catch{}});
    if('caches' in window){try{const cache=await caches.open('artesperfume-runtime-v1');await cache.delete('/__artesperfume_cache__/catalogo-v1')}catch{}}
  }
  function bindMobileMenu(){
    const sidebar=document.getElementById('admin-sidebar');
    const toggle=document.querySelector('[data-menu-toggle]');
    const backdrop=document.querySelector('.sidebar-backdrop');
    const closers=[...document.querySelectorAll('[data-menu-close]')];
    if(!sidebar||!toggle)return;
    const setOpen=open=>{
      sidebar.classList.toggle('is-open',open);
      backdrop?.classList.toggle('is-open',open);
      document.body.classList.toggle('admin-menu-open',open);
      toggle.setAttribute('aria-expanded',String(open));
      toggle.querySelector('.mobile-menu-icon')?.replaceChildren(document.createTextNode(open?'×':'☰'));
    };
    toggle.addEventListener('click',()=>setOpen(!sidebar.classList.contains('is-open')));
    closers.forEach(el=>el.addEventListener('click',()=>setOpen(false)));
    sidebar.querySelectorAll('a,button[data-logout]').forEach(el=>el.addEventListener('click',()=>setOpen(false)));
    document.addEventListener('keydown',e=>{if(e.key==='Escape')setOpen(false)});
    const mq=window.matchMedia('(min-width:1051px)');
    const reset=e=>{if(e.matches)setOpen(false)};
    mq.addEventListener?.('change',reset);
  }
  function money(v){return typeof v==='number'?new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v):'Sob consulta'}
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
  document.addEventListener('DOMContentLoaded',bindMobileMenu);
  return{api,requireAuth,logout,bindLogout,bindMobileMenu,invalidatePublicCache,money,esc};
})();
