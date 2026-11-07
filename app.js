const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const byId = id => CONCEPTS.find(x => x.id === id);
const caseById = id => CASES.find(x => x.id === id);
const domainById = id => DOMAINS.find(x => x.id === id);

const state = {
  route: 'home', domain: 'all', caseType: 'all', industry: 'all', company: 'all',
  saved: new Set(JSON.parse(localStorage.getItem('bearSaved') || '[]')),
  mastered: new Set(JSON.parse(localStorage.getItem('bearMastered') || '[]')),
  recent: JSON.parse(localStorage.getItem('bearRecent') || '[]')
};

function persist(){
  localStorage.setItem('bearSaved', JSON.stringify([...state.saved]));
  localStorage.setItem('bearMastered', JSON.stringify([...state.mastered]));
  localStorage.setItem('bearRecent', JSON.stringify(state.recent.slice(0,12)));
  updateCounts();
}

function updateCounts(){
  $('#conceptCount').textContent = CONCEPTS.length;
  $('#caseCount').textContent = CASES.length;
  $('#progressCount').textContent = state.mastered.size;
  $('#reviewMastered').textContent = state.mastered.size;
  $('#reviewSaved').textContent = state.saved.size;
}

function route(name, updateHash=true){
  state.route = name;
  $$('.view').forEach(v => v.classList.toggle('active', v.id === `view-${name}`));
  $$('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.route === name));
  if(updateHash) history.replaceState(null,'',`#${name}`);
  if(name === 'review') renderReview();
  window.scrollTo({top:0,behavior:'smooth'});
}

function conceptCard(c){
  const d = domainById(c.domain);
  return `<article class="concept-card" data-concept="${c.id}">
    <div class="card-top"><span class="domain-dot" style="color:${d.color}">● ${d.name}</span><span class="level">${c.level}</span></div>
    <h3>${c.title}</h3><p>${c.oneLine}</p>
    <div class="card-foot"><span class="${state.mastered.has(c.id)?'mastered-mark':''}">${state.mastered.has(c.id)?'✓ 已掌握':'查看解释 →'}</span>
    <button class="bookmark ${state.saved.has(c.id)?'saved':''}" data-bookmark="${c.id}" aria-label="收藏">${state.saved.has(c.id)?'★':'☆'}</button></div>
  </article>`;
}

function renderHome(){
  $('#pathGrid').innerHTML = PATHS.map(p => `<article class="path-card" data-path="${p.id}"><span class="number">${p.index}</span><span class="kicker">学习路径</span><h3>${p.title}</h3><p>${p.desc}</p><div class="path-steps">${p.steps.map(id=>`<span>${byId(id).title}</span>`).join('')}</div></article>`).join('');
  $('#domainGrid').innerHTML = DOMAINS.map(d => `<button class="domain-card" data-domain-jump="${d.id}" style="background:${d.color}"><span>${d.short}</span><div><b>${d.name}</b><p>${d.desc}</p></div></button>`).join('');
  $('#homeCases').innerHTML = CASES.slice(0,3).map(c => `<article class="case-tile" data-case="${c.id}"><div><small>${c.type}</small><h3>${c.title}</h3><p>${c.lead}</p></div><span class="arrow">↗</span></article>`).join('');
}

function renderFilters(){
  $('#domainFilters').innerHTML = [{id:'all',name:'全部'},...DOMAINS].map(d=>`<button class="filter-chip ${state.domain===d.id?'active':''}" data-domain-filter="${d.id}">${d.name}</button>`).join('');
  const types = ['all',...new Set(CASES.map(c=>c.type))];
  $('#caseFilters').innerHTML = types.map(t=>`<button class="filter-chip ${state.caseType===t?'active':''}" data-case-filter="${t}">${t==='all'?'全部案例':t}</button>`).join('');
  const industries = ['all',...new Set(Object.values(CASE_TAXONOMY).map(x=>x.industry))];
  $('#industryFilters').innerHTML = industries.map(i=>`<button class="filter-chip ${state.industry===i?'active':''}" data-industry-filter="${i}">${i==='all'?'全部行业':i}</button>`).join('');
  const companies = ['all',...new Set(CASES.filter(c=>state.industry==='all'||CASE_TAXONOMY[c.id]?.industry===state.industry).map(c=>CASE_TAXONOMY[c.id]?.company).filter(Boolean))];
  $('#companyFilter').innerHTML = companies.map(c=>`<option value="${c}">${c==='all'?'全部公司':c}</option>`).join('');
  $('#companyFilter').value = companies.includes(state.company)?state.company:'all';
}

function renderIndustryGuide(){
  $('#industryGuide').innerHTML = INDUSTRY_METHODS.map(item=>`<button class="industry-card" data-industry-filter="${item.industry}"><small>${item.industry}</small><b>${item.companies}</b><span>${item.method}</span><em>查看这一类案例 →</em></button>`).join('');
}

function renderConcepts(){
  const q = ($('#atlasSearch').value || '').trim().toLowerCase();
  const rows = CONCEPTS.filter(c => (state.domain==='all'||c.domain===state.domain) && (!q || [c.title,c.oneLine,c.example,c.distinction,c.pitfall,c.why,c.mechanism,TODAY_NOTES[c.id],...Object.values(c.lenses||{}),...(c.questions||[]),LESSONS[c.id]?.question,LESSONS[c.id]?.use,...DIALOGUE_ARCHIVE.filter(d=>d.concepts.includes(c.id)).map(d=>d.title)].join(' ').toLowerCase().includes(q)));
  $('#atlasMeta').textContent = `找到 ${rows.length} 个知识点${state.domain==='all'?'':` · ${domainById(state.domain).name}`}`;
  $('#conceptGrid').innerHTML = rows.length ? rows.map(conceptCard).join('') : '<div class="empty-state">没有匹配结果，试试更短的关键词。</div>';
  renderFilters();
}

function renderCases(){
  const q = ($('#caseSearch').value || '').trim().toLowerCase();
  const rows = CASES.filter(c => (state.caseType==='all'||c.type===state.caseType) && (state.industry==='all'||CASE_TAXONOMY[c.id]?.industry===state.industry) && (state.company==='all'||CASE_TAXONOMY[c.id]?.company===state.company) && (!q || [c.title,c.lead,c.conclusion,...c.numbers,CASE_TAXONOMY[c.id]?.industry,CASE_TAXONOMY[c.id]?.company,CASE_NOTES[c.id]].join(' ').toLowerCase().includes(q)));
  $('#caseMeta').textContent = `找到 ${rows.length} 个案例${state.industry==='all'?'':` · ${state.industry}`}${state.company==='all'?'':` · ${state.company}`}`;
  $('#caseGrid').innerHTML = rows.length ? rows.map(c=>`<article class="case-card" data-case="${c.id}"><small>${CASE_TAXONOMY[c.id]?.industry||c.type} · ${CASE_TAXONOMY[c.id]?.company||'综合案例'}</small><h3>${c.title}</h3><p>${c.lead}</p>${MINISO_LEARNING[c.id]?`<div class="case-learning-preview"><b>通过这篇学会</b><span>${MINISO_LEARNING[c.id].join(' · ')}</span></div>`:''}<div class="number-row">${c.numbers.map(n=>`<span>${n}</span>`).join('')}</div></article>`).join('') : '<div class="empty-state">没有匹配案例。试试切换行业或公司。</div>';
  renderFilters();
}

function openConcept(id, pushHash=true){
  const c = byId(id); if(!c) return;
  state.recent = [id,...state.recent.filter(x=>x!==id)].slice(0,12); persist();
  const d = domainById(c.domain);
  $('#drawerContent').innerHTML = `<div class="drawer-label"><span class="eyebrow" style="color:${d.color}">${d.name} · ${c.level}</span></div>
    <h1>${c.title}</h1><p class="drawer-lead">${c.oneLine}</p>
    <div class="depth-callout"><small>它为什么重要</small><p>${c.why}</p></div>
    <div class="formula-box"><small>公式 / 核心结构</small><div>${c.formula}</div></div>
    ${renderLesson(c.id)}
    ${TODAY_NOTES[c.id]?`<section class="dialogue-section"><span class="lesson-kicker">本次对话 · 完整解释</span><div class="markdown-body">${markdownToHtml(TODAY_NOTES[c.id])}</div></section>`:''}
    <div class="detail-block"><h3>${TODAY_NOTES[c.id]?'名创真实例子':'小熊例子'}</h3><p>${c.example}</p></div>
    <div class="detail-block"><h3>从三个角色看</h3><div class="lens-grid">${Object.entries(c.lenses||{}).map(([who,look])=>`<article><b>${who}</b><p>${look}</p></article>`).join('')}</div></div>
    <div class="detail-block"><h3>它如何影响企业与判断</h3><p>${c.mechanism}</p></div>
    <div class="detail-block judgement-block"><h3>拿到财报后，继续追问</h3><ol>${(c.questions||[]).map(q=>`<li>${q}</li>`).join('')}</ol></div>
    <div class="detail-block"><h3>最容易混淆</h3><p>${c.distinction}</p></div>
    <div class="detail-block"><h3>分析时的陷阱</h3><p>${c.pitfall}</p></div>
    ${renderDialogues(c.id)}
    <div class="detail-block"><h3>相关概念</h3><div class="related-row">${c.related.map(r=>`<button class="related-btn" data-concept="${r}">${byId(r)?.title||r}</button>`).join('')}</div></div>
    <div class="drawer-actions"><button class="master-btn" data-master="${c.id}">${state.mastered.has(c.id)?'✓ 已掌握':'标记为已掌握'}</button><button class="save-btn" data-bookmark="${c.id}">${state.saved.has(c.id)?'★ 已收藏':'☆ 收藏'}</button></div>`;
  $('#drawer').classList.add('open'); $('#drawer').setAttribute('aria-hidden','false');
  document.body.style.overflow='hidden';
  if(pushHash) history.replaceState(null,'',`#concept/${id}`);
}

function openCase(id, pushHash=true){
  const c = caseById(id); if(!c) return;
  $('#drawerContent').innerHTML = `<div class="drawer-label"><span class="eyebrow">${CASE_TAXONOMY[c.id]?.industry||c.type} · ${CASE_TAXONOMY[c.id]?.company||'综合案例'}</span></div><h1>${c.title}</h1><p class="drawer-lead">${c.lead}</p>
    ${MINISO_LEARNING[c.id]?`<div class="detail-block case-learning"><h3>通过这个案例学什么</h3><ul>${MINISO_LEARNING[c.id].map(item=>`<li>${item}</li>`).join('')}</ul></div>`:''}
    <div class="detail-block"><h3>关键数字</h3><div class="number-row">${c.numbers.map(n=>`<span>${n}</span>`).join('')}</div></div>
    ${CASE_NOTES[c.id]?`<section class="dialogue-section"><span class="lesson-kicker">完整案例 · 分层拆解</span><div class="markdown-body">${markdownToHtml(CASE_NOTES[c.id])}</div></section>`:''}
    <div class="detail-block"><h3>核心结论</h3><p class="case-conclusion">${c.conclusion}</p></div>
    <div class="detail-block"><h3>继续追问</h3><ul class="case-questions">${c.questions.map(q=>`<li>${q}</li>`).join('')}</ul></div>
    <div class="detail-block"><h3>涉及知识点</h3><div class="related-row">${c.concepts.map(r=>`<button class="related-btn" data-concept="${r}">${byId(r).title}</button>`).join('')}</div></div>`;
  $('#drawer').classList.add('open'); $('#drawer').setAttribute('aria-hidden','false'); document.body.style.overflow='hidden';
  if(pushHash) history.replaceState(null,'',`#case/${id}`);
}

function closeDrawer(){
  $('#drawer').classList.remove('open'); $('#drawer').setAttribute('aria-hidden','true'); document.body.style.overflow='';
  history.replaceState(null,'',`#${state.route}`);
}

function renderCompareOptions(){
  const options = CONCEPTS.map(c=>`<option value="${c.id}">${c.title}</option>`).join('');
  $('#compareLeft').innerHTML=options; $('#compareRight').innerHTML=options;
  $('#compareLeft').value='fcf'; $('#compareRight').value='owner-earnings';
  $('#quickPairs').innerHTML=QUICK_PAIRS.map(([a,b])=>`<button class="pair-btn" data-pair="${a},${b}">${byId(a).title} ↔ ${byId(b).title}</button>`).join('');
  renderCompare();
}

function compareSide(c){
  const d=domainById(c.domain); return `<article class="compare-side"><span class="eyebrow" style="color:${d.color}">${d.name}</span><h2>${c.title}</h2>
    <div class="compare-row"><b>本质</b><p>${c.oneLine}</p></div><div class="compare-row"><b>为什么重要</b><p>${c.why}</p></div><div class="compare-row"><b>公式 / 结构</b><p>${c.formula}</p></div>
    <div class="compare-row"><b>例子</b><p>${c.example}</p></div><div class="compare-row"><b>边界</b><p>${c.distinction}</p></div>
    <div class="compare-row"><b>如何用于判断</b><p>${c.mechanism}</p></div><div class="compare-row"><b>第一追问</b><p>${c.questions?.[0]||c.pitfall}</p></div><div class="compare-row"><b>风险提示</b><p>${c.pitfall}</p></div></article>`;
}
function renderCompare(){ $('#compareOutput').innerHTML=compareSide(byId($('#compareLeft').value))+compareSide(byId($('#compareRight').value)); }

function renderReview(){
  updateCounts();
  const saved=CONCEPTS.filter(c=>state.saved.has(c.id)); const recent=state.recent.map(byId).filter(Boolean);
  $('#savedGrid').innerHTML=saved.length?saved.map(conceptCard).join(''):'<div class="empty-state">还没有收藏。看到想反复复习的概念，点一下星标。</div>';
  $('#recentGrid').innerHTML=recent.length?recent.map(conceptCard).join(''):'<div class="empty-state">浏览知识卡后，这里会出现最近记录。</div>';
}

function toggleSaved(id){ state.saved.has(id)?state.saved.delete(id):state.saved.add(id); persist(); renderConcepts(); renderReview(); if($('#drawer').classList.contains('open')) openConcept(id,false); toast(state.saved.has(id)?'已收藏':'已取消收藏'); }
function toggleMastered(id){ state.mastered.has(id)?state.mastered.delete(id):state.mastered.add(id); persist(); renderConcepts(); renderReview(); openConcept(id,false); toast(state.mastered.has(id)?'已标记为掌握':'已移出掌握'); }
function randomUnmastered(){ const pool=CONCEPTS.filter(c=>!state.mastered.has(c.id)); openConcept((pool.length?pool:CONCEPTS)[Math.floor(Math.random()*(pool.length||CONCEPTS.length))].id); }
function toast(msg){ const el=$('#toast'); el.textContent=msg; el.classList.add('show'); clearTimeout(window.toastTimer); window.toastTimer=setTimeout(()=>el.classList.remove('show'),1600); }

function openSearch(){ $('#searchOverlay').classList.add('open'); $('#searchOverlay').setAttribute('aria-hidden','false'); setTimeout(()=>$('#globalSearch').focus(),60); renderGlobalSearch(); }
function closeSearch(){ $('#searchOverlay').classList.remove('open'); $('#searchOverlay').setAttribute('aria-hidden','true'); }
function renderGlobalSearch(){
  const q=($('#globalSearch').value||'').trim().toLowerCase();
  const cs=CONCEPTS.filter(c=>!q||[c.title,c.oneLine,c.example,c.why,c.mechanism,TODAY_NOTES[c.id],...(c.questions||[]),LESSONS[c.id]?.question,LESSONS[c.id]?.use,...DIALOGUE_ARCHIVE.filter(d=>d.concepts.includes(c.id)).map(d=>d.title)].join(' ').toLowerCase().includes(q)).slice(0,10);
  const ks=CASES.filter(c=>q&&[c.title,c.lead,CASE_TAXONOMY[c.id]?.company,CASE_TAXONOMY[c.id]?.industry,CASE_NOTES[c.id]].join(' ').toLowerCase().includes(q)).slice(0,5);
  $('#globalResults').innerHTML=[...cs.map(c=>`<button class="global-result" data-concept="${c.id}"><b>${c.title}</b><span>${c.oneLine}</span></button>`),...ks.map(c=>`<button class="global-result" data-case="${c.id}"><b>${c.title}</b><span>${c.type} · ${c.lead}</span></button>`)].join('')||'<div class="empty-state">没有找到结果。</div>';
}

document.addEventListener('click', async e=>{
  const routeEl=e.target.closest('[data-route]'); if(routeEl){route(routeEl.dataset.route);return;}
  const bookmark=e.target.closest('[data-bookmark]'); if(bookmark){e.stopPropagation();toggleSaved(bookmark.dataset.bookmark);return;}
  const master=e.target.closest('[data-master]'); if(master){toggleMastered(master.dataset.master);return;}
  const conceptEl=e.target.closest('[data-concept]'); if(conceptEl){closeSearch();openConcept(conceptEl.dataset.concept);return;}
  const caseEl=e.target.closest('[data-case]'); if(caseEl){closeSearch();openCase(caseEl.dataset.case);return;}
  if(e.target.closest('[data-close-drawer]')){closeDrawer();return;}
  const domain=e.target.closest('[data-domain-jump]'); if(domain){state.domain=domain.dataset.domainJump;route('atlas');renderConcepts();return;}
  const df=e.target.closest('[data-domain-filter]'); if(df){state.domain=df.dataset.domainFilter;renderConcepts();return;}
  const cf=e.target.closest('[data-case-filter]'); if(cf){state.caseType=cf.dataset.caseFilter;renderCases();return;}
  const inf=e.target.closest('[data-industry-filter]'); if(inf){state.industry=inf.dataset.industryFilter;state.company='all';route('cases');renderCases();return;}
  const pair=e.target.closest('[data-pair]'); if(pair){const[a,b]=pair.dataset.pair.split(',');$('#compareLeft').value=a;$('#compareRight').value=b;renderCompare();return;}
  const path=e.target.closest('[data-path]'); if(path){const p=PATHS.find(x=>x.id===path.dataset.path);openConcept(p.steps[0]);toast(`已从“${p.title}”第一张开始`);return;}
});

$('#atlasSearch').addEventListener('input',renderConcepts); $('#caseSearch').addEventListener('input',renderCases);
$('#companyFilter').addEventListener('change',e=>{state.company=e.target.value;renderCases();});
$('#compareLeft').addEventListener('change',renderCompare); $('#compareRight').addEventListener('change',renderCompare);
$('#swapCompare').addEventListener('click',()=>{const a=$('#compareLeft').value;$('#compareLeft').value=$('#compareRight').value;$('#compareRight').value=a;renderCompare();});
$('#randomConcept').addEventListener('click',randomUnmastered); $('#reviewRandom').addEventListener('click',randomUnmastered);
$('#searchOpen').addEventListener('click',openSearch); $('#searchClose').addEventListener('click',closeSearch); $('#globalSearch').addEventListener('input',renderGlobalSearch);
$('#searchOverlay').addEventListener('click',e=>{if(e.target===$('#searchOverlay'))closeSearch();});
$('#shareButton').addEventListener('click',async()=>{try{if(navigator.share)await navigator.share({title:document.title,url:location.href});else{await navigator.clipboard.writeText(location.href);toast('链接已复制');}}catch(_){}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeDrawer();closeSearch();} if((e.metaKey||e.ctrlKey)&&e.key==='k'){e.preventDefault();openSearch();}});

function bootFromHash(){
  const h=location.hash.replace('#','');
  if(h.startsWith('concept/')){route('atlas',false);openConcept(h.split('/')[1],false);}
  else if(h.startsWith('case/')){route('cases',false);openCase(h.split('/')[1],false);}
  else if(['home','atlas','cases','compare','review'].includes(h)) route(h,false);
}

renderHome(); renderIndustryGuide(); renderFilters(); renderConcepts(); renderCases(); renderCompareOptions(); renderReview(); updateCounts(); bootFromHash();
