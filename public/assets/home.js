document.addEventListener('DOMContentLoaded', async()=>{
  AP.initShell('inicio');
  AP.bindFavoriteButtons();
  const featured=document.getElementById('home-featured');

  function render(products){
    featured.replaceChildren();
    const preferred=products.filter(p=>p.destaque||p.recomendado||p.novo);
    const selection=(preferred.length?preferred:products).slice(0,3);
    selection.forEach(p=>featured.append(AP.card(p)));
    const hero=selection[0]||products[0];
    if(hero){
      const heroImage=document.getElementById('hero-image');
      heroImage.src=AP.productImage(hero);
      heroImage.alt=hero.nome||'Perfume em destaque';
      heroImage.fetchPriority='high';
      document.getElementById('hero-name').textContent=hero.nome;
    }
    document.getElementById('kpi-total').textContent=products.length;
    document.getElementById('kpi-available').textContent=products.filter(p=>p.estoque!==0).length;
    document.getElementById('kpi-new').textContent=products.filter(p=>p.novo).length;
  }

  window.addEventListener('ap:catalog-updated',e=>render(e.detail.products||[]));

  try{
    const {products}=await AP.loadCatalog();
    render(products);
  }catch(e){
    featured.innerHTML=`<div class="empty-state"><h2>Catálogo indisponível</h2><p>${AP.escapeHtml(e.message)}</p></div>`;
  }
  document.getElementById('kpi-favs').textContent=AP.getFavorites().length;
});
