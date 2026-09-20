document.addEventListener('DOMContentLoaded',async()=>{
  AP.initShell('catalogo');
  const loading=document.getElementById('details-loading'),content=document.getElementById('details-content');
  const params=new URLSearchParams(location.search);
  const id=params.get('id');
  const requestedFrom=params.get('from');
  const back=document.getElementById('details-back');

  function inferSource(){
    if(['inicio','catalogo','favoritos'].includes(requestedFrom)) return requestedFrom;
    try{
      const ref=new URL(document.referrer);
      if(ref.origin===location.origin){
        if(ref.pathname.includes('catalogo')) return 'catalogo';
        if(ref.pathname.includes('favoritos')) return 'favoritos';
        if(ref.pathname==='/' || ref.pathname.endsWith('/index.html')) return 'inicio';
      }
    }catch{}
    return 'inicio';
  }

  const source=inferSource();
  const backMap={
    inicio:{href:'/#home-featured',label:'← Voltar para início'},
    catalogo:{href:'/catalogo.html',label:'← Voltar ao catálogo'},
    favoritos:{href:'/favoritos.html',label:'← Voltar aos favoritos'}
  };
  const backTarget=backMap[source]||backMap.inicio;
  if(back){
    back.href=backTarget.href;
    back.textContent=backTarget.label;
    back.addEventListener('click',e=>{
      try{
        const ref=new URL(document.referrer);
        const sameOrigin=ref.origin===location.origin;
        const cameFromExpected = source==='inicio'
          ? (ref.pathname==='/' || ref.pathname.endsWith('/index.html'))
          : source==='catalogo'
            ? ref.pathname.includes('catalogo')
            : ref.pathname.includes('favoritos');
        if(sameOrigin && cameFromExpected && history.length>1){
          e.preventDefault();
          history.back();
        }
      }catch{}
    });
  }

  if(!id){loading.textContent='Perfume não informado.';return}

  function render(p){
    document.title=`${p.nome} | Aura Noir`;
    document.getElementById('details-image').src=AP.productImage(p);
    document.getElementById('details-image').alt=p.nome;
    document.getElementById('details-name').textContent=p.nome;
    document.getElementById('details-description').textContent=p.descricao||'Fale com o atelier para conhecer melhor esta fragrância.';
    document.getElementById('details-price').textContent=AP.price(p.preco);
    document.getElementById('details-volume').textContent=AP.volumeLabel(p.volumeMl);
    document.getElementById('details-stock').textContent=AP.statusLabel(p);
    document.getElementById('details-source').textContent=p.origem==='manual'?'Cadastro da loja':p.origem==='instagram'?'Curadoria da loja':'Acervo da loja';
    const badges=document.getElementById('details-badges');badges.replaceChildren();
    AP.productBadges(p).forEach(t=>{const s=document.createElement('span');s.className='pill';s.textContent=t;badges.append(s)});
    const w=AP.whatsappUrl(p),interest=document.getElementById('details-interest');
    interest.textContent=`${AP.ctaLabel(p)} →`;interest.href=w||'#';interest.target=w?'_blank':'_self';interest.onclick=w?null:(ev=>{ev.preventDefault();AP.toast('WhatsApp ainda não configurado.')});
    const fav=document.getElementById('details-favorite');
    function sync(){const saved=AP.isFavorite(p.id);fav.textContent=saved?'♥ Salvo nos favoritos':'♡ Favoritar';}
    sync();
    fav.onclick=()=>{const saved=AP.toggleFavorite(p.id);sync();AP.toast(saved?'Perfume salvo nos favoritos.':'Perfume removido dos favoritos.')};
    loading.hidden=true;content.hidden=false;
  }

  try{
    let p=await AP.getCachedProduct(id);
    if(p){
      render(p);
      AP.loadCatalog().catch(()=>{});
    }else{
      const {data}=await AP.fetchJson(`/api/catalogo/${encodeURIComponent(id)}`,{cache:'no-store'});
      p=data;
      render(p);
    }

    window.addEventListener('ap:catalog-updated',e=>{
      const updated=(e.detail.products||[]).find(item=>String(item.id)===String(id));
      if(updated) render(updated);
    });
  }catch(e){loading.textContent=e.message;}
});
