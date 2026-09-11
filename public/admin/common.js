window.AdminAP=(()=>{
  async function api(url,options={}){const response=await fetch(url,{credentials:'same-origin',headers:{'Content-Type':'application/json',...(options.headers||{})},...options});let data=null;try{data=await response.json()}catch{}if(!response.ok){const e=new Error(data?.erro||'Não foi possível concluir a operação.');e.status=response.status;e.codigo=data?.codigo;throw e}return data}
  async function requireAuth(){try{const data=await api('/api/auth/me');document.querySelectorAll('[data-admin-email]').forEach(el=>el.textContent=data.usuario?.email||'Administrador');return data.usuario}catch(e){location.href='/admin/';throw e}}
  async function logout(){try{await api('/api/auth/logout',{method:'POST',body:'{}'})}catch{}location.href='/admin/'}
  function bindLogout(){document.querySelectorAll('[data-logout]').forEach(b=>b.addEventListener('click',logout))}
  function money(v){return typeof v==='number'?new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v):'Sob consulta'}
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
  return{api,requireAuth,logout,bindLogout,money,esc};
})();
