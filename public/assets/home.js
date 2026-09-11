document.addEventListener('DOMContentLoaded', async()=>{
  await AP.initShell('inicio'); AP.bindFavoriteButtons();
  const featured=document.getElementById('home-featured');
  try{
    const {products}=await AP.loadCatalog();
    const preferred=products.filter(p=>p.destaque||p.recomendado||p.novo);
    const selection=(preferred.length?preferred:products).slice(0,3);
    selection.forEach(p=>featured.append(AP.card(p)));
    const hero=selection[0]||products[0]; if(hero){document.getElementById('hero-image').src=AP.productImage(hero);document.getElementById('hero-name').textContent=hero.nome;}
    document.getElementById('kpi-total').textContent=products.length;
    document.getElementById('kpi-available').textContent=products.filter(p=>p.estoque!==0).length;
    document.getElementById('kpi-new').textContent=products.filter(p=>p.novo).length;
  }catch(e){featured.innerHTML=`<div class="empty-state"><h2>Catálogo indisponível</h2><p>${e.message}</p></div>`;}
  document.getElementById('kpi-favs').textContent=AP.getFavorites().length;
});
