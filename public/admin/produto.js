document.addEventListener('DOMContentLoaded',async()=>{
  await AdminAP.requireAuth();
  AdminAP.bindLogout();

  const form=document.getElementById('product-form');
  const msg=document.getElementById('message');
  const id=new URLSearchParams(location.search).get('id');
  const el=n=>document.getElementById(n);
  let product=null;
  let imageValue=null;

  function message(text,error=false){
    msg.textContent=text;
    msg.className='message '+(error?'error':'success');
    msg.hidden=!text;
  }

  function isDisplayableImage(value){
    return /^https:\/\//i.test(value||'') || /^data:image\/(?:jpeg|png|webp);base64,/i.test(value||'');
  }

  function setImage(value,statusText){
    imageValue=value||null;
    if(statusText) el('imagem-status').textContent=statusText;
    updatePreview();
  }

  function updatePreview(){
    el('preview-name').textContent=el('nome').value.trim()||'Novo Perfume';
    const raw=el('preco').value.trim().replace(/\./g,'').replace(',','.');
    const num=raw===''?null:Number(raw);
    el('preview-price').textContent=Number.isFinite(num)?AdminAP.money(num):'Preço sob consulta';
    el('preview-desc').textContent=el('descricao').value.trim()||'A descrição aparecerá aqui.';

    const typedUrl=el('imagem').value.trim();
    if(typedUrl && /^https:\/\//i.test(typedUrl)) imageValue=typedUrl;

    const media=el('preview-media');
    media.replaceChildren();
    if(isDisplayableImage(imageValue)){
      const img=document.createElement('img');
      img.src=imageValue;
      img.alt='Prévia';
      media.append(img);
    }else{
      const s=document.createElement('span');
      s.textContent='Sem imagem';
      media.append(s);
    }

    const badges=el('preview-badges');
    badges.innerHTML=[el('novo').checked&&'Novo',el('destaque').checked&&'Destaque',el('recomendado').checked&&'Recomendado']
      .filter(Boolean).map(x=>`<span class="badge">${x}</span>`).join('');
  }

  function fill(p){
    el('nome').value=p.nome||'';
    el('preco').value=p.preco??'';
    el('estoque').value=p.estoque??'';
    el('imagem').value=/^https:\/\//i.test(p.imagem||'')?p.imagem:'';
    el('descricao').value=p.descricao||'';
    el('ativo').checked=!!p.ativo;
    el('destaque').checked=!!p.destaque;
    el('recomendado').checked=!!p.recomendado;
    el('novo').checked=!!p.novo;
    imageValue=p.imagem||null;
    el('imagem-status').textContent=imageValue
      ? (/^data:image\//i.test(imageValue)?'Foto salva no catálogo. Escolha outra para substituir.':'Imagem atual carregada por URL.')
      : 'Nenhuma nova foto selecionada.';
    updatePreview();
  }

  function loadImage(dataUrl){
    return new Promise((resolve,reject)=>{
      const img=new Image();
      img.onload=()=>resolve(img);
      img.onerror=()=>reject(new Error('Não foi possível abrir esta imagem.'));
      img.src=dataUrl;
    });
  }

  function readFile(file){
    return new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onload=()=>resolve(reader.result);
      reader.onerror=()=>reject(new Error('Não foi possível ler o arquivo selecionado.'));
      reader.readAsDataURL(file);
    });
  }

  async function optimizeImage(file){
    if(!file || !file.type.startsWith('image/')) throw new Error('Selecione uma imagem válida.');
    if(file.size>12*1024*1024) throw new Error('A foto original é muito grande. Use uma imagem de até 12 MB.');

    const source=await readFile(file);
    const img=await loadImage(source);
    const originalWidth=img.naturalWidth||img.width;
    const originalHeight=img.naturalHeight||img.height;
    const targetLength=320000;

    for(const maxSide of [1200,1000,850,700]){
      const scale=Math.min(1,maxSide/Math.max(originalWidth,originalHeight));
      const width=Math.max(1,Math.round(originalWidth*scale));
      const height=Math.max(1,Math.round(originalHeight*scale));
      const canvas=document.createElement('canvas');
      canvas.width=width;
      canvas.height=height;
      const ctx=canvas.getContext('2d',{alpha:false});
      ctx.fillStyle='#ffffff';
      ctx.fillRect(0,0,width,height);
      ctx.drawImage(img,0,0,width,height);

      for(const quality of [0.82,0.72,0.62,0.52,0.44]){
        const dataUrl=canvas.toDataURL('image/jpeg',quality);
        if(dataUrl.length<=targetLength) return dataUrl;
      }
    }
    throw new Error('A foto continuou muito grande após a otimização. Tente outra imagem.');
  }

  if(id){
    try{
      product=await AdminAP.api(`/api/admin/produtos/${encodeURIComponent(id)}`);
      fill(product);
      el('page-title').textContent='Editar Perfume & Curadoria Visual';
      el('crumb-mode').textContent=product.nome;
      el('save-button').textContent='Salvar alterações';
      el('delete-button').hidden=false;
    }catch(e){
      message(e.message,true);
    }
  }else{
    updatePreview();
  }

  el('imagem-arquivo').addEventListener('change',async e=>{
    const file=e.target.files?.[0];
    if(!file)return;
    try{
      el('imagem-status').textContent='Otimizando foto…';
      const optimized=await optimizeImage(file);
      el('imagem').value='';
      setImage(optimized,`${file.name} selecionada e pronta para salvar.`);
    }catch(err){
      e.target.value='';
      message(err.message,true);
      el('imagem-status').textContent='Não foi possível usar esta foto.';
    }
  });

  el('imagem').addEventListener('input',()=>{
    const url=el('imagem').value.trim();
    if(url){
      imageValue=url;
      el('imagem-arquivo').value='';
      el('imagem-status').textContent='Usando a URL informada.';
    }
    updatePreview();
  });

  el('imagem-remover').addEventListener('click',()=>{
    el('imagem').value='';
    el('imagem-arquivo').value='';
    setImage(null,'Imagem removida. Salve as alterações para confirmar.');
  });

  form.addEventListener('input',e=>{
    if(e.target.id!=='imagem-arquivo') updatePreview();
  });

  form.addEventListener('submit',async e=>{
    e.preventDefault();
    message('');
    const payload={
      nome:el('nome').value,
      descricao:el('descricao').value||null,
      preco:el('preco').value||null,
      estoque:el('estoque').value===''?null:Number(el('estoque').value),
      imagem:imageValue||null,
      ativo:el('ativo').checked,
      destaque:el('destaque').checked,
      recomendado:el('recomendado').checked,
      novo:el('novo').checked
    };
    try{
      el('save-button').disabled=true;
      el('save-button').textContent='Salvando…';
      const result=id
        ? await AdminAP.api(`/api/admin/produtos/${encodeURIComponent(id)}`,{method:'PATCH',body:JSON.stringify(payload)})
        : await AdminAP.api('/api/admin/produtos',{method:'POST',body:JSON.stringify(payload)});
      await AdminAP.invalidatePublicCache();
      message('Alterações salvas com sucesso.');
      if(!id){
        setTimeout(()=>location.replace(`/admin/produto.html?id=${encodeURIComponent(result.id)}`),600);
      }else{
        el('save-button').disabled=false;
        el('save-button').textContent='Salvar alterações';
      }
    }catch(err){
      el('save-button').disabled=false;
      el('save-button').textContent=id?'Salvar alterações':'Salvar perfume';
      message(err.message,true);
    }
  });

  el('delete-button').addEventListener('click',async()=>{
    if(!id||!confirm('Confirmar remoção/arquivamento deste perfume?'))return;
    try{
      await AdminAP.api(`/api/admin/produtos/${encodeURIComponent(id)}`,{method:'DELETE'});
      await AdminAP.invalidatePublicCache();
      location.replace('/admin/dashboard.html');
    }catch(e){
      message(e.message,true);
    }
  });
});
