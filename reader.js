function safeHtml(s){return String(s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
function inlineMd(s){
  return safeHtml(s)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,'<a href="$2" target="_blank" rel="noopener noreferrer">$1 ↗</a>')
    .replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>')
    .replace(/`([^`]+)`/g,'<code>$1</code>');
}
function markdownToHtml(input){
  const lines=String(input).replace(/\r/g,'').split('\n');let out=[],para=[],list='',code=false,codeLines=[];
  const flush=()=>{if(para.length){out.push(`<p>${inlineMd(para.join(' '))}</p>`);para=[];}if(list){out.push(`</${list}>`);list='';}};
  for(let i=0;i<lines.length;i++){
    const line=lines[i].trim();
    if(line.startsWith('```')){flush();if(code){out.push(`<pre><code>${safeHtml(codeLines.join('\n'))}</code></pre>`);codeLines=[];}code=!code;continue;}
    if(code){codeLines.push(lines[i]);continue;}
    if(!line){flush();continue;}
    if(/^\|.*\|$/.test(line)&&/^\|[\s:|-]+\|$/.test((lines[i+1]||'').trim())){
      flush();const cells=x=>x.trim().slice(1,-1).split('|').map(y=>y.trim());const head=cells(line);i+=1;let rows=[];
      while(i+1<lines.length&&/^\|.*\|$/.test(lines[i+1].trim()))rows.push(cells(lines[++i]));
      out.push(`<div class="table-scroll"><table><thead><tr>${head.map(x=>`<th>${inlineMd(x)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(x=>`<td>${inlineMd(x)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);continue;
    }
    const h=line.match(/^(#{1,5})\s+(.+)/);if(h){flush();const level=Math.min(h[1].length+2,6);out.push(`<h${level}>${inlineMd(h[2])}</h${level}>`);continue;}
    if(/^---+$/.test(line)){flush();out.push('<hr>');continue;}
    if(/^>\s?/.test(line)){flush();out.push(`<blockquote>${inlineMd(line.replace(/^>\s?/,''))}</blockquote>`);continue;}
    const bullet=line.match(/^[-*]\s+(.+)/),number=line.match(/^\d+\.\s+(.+)/);
    if(bullet||number){if(para.length){out.push(`<p>${inlineMd(para.join(' '))}</p>`);para=[];}const target=bullet?'ul':'ol';if(list!==target){if(list)out.push(`</${list}>`);out.push(`<${target}>`);list=target;}out.push(`<li>${inlineMd((bullet||number)[1])}</li>`);continue;}
    if(list){out.push(`</${list}>`);list='';}para.push(line);
  }
  flush();return out.join('');
}

function renderLesson(id){
  const l=LESSONS[id];if(!l)return '';
  const steps=l.steps.map(([title,body],i)=>`<article class="lesson-step"><span>${String(i+1).padStart(2,'0')}</span><div><h4>${safeHtml(title)}</h4><p>${safeHtml(body)}</p></div></article>`).join('');
  const table=`<div class="table-scroll"><table><thead><tr>${l.table.head.map(x=>`<th>${safeHtml(x)}</th>`).join('')}</tr></thead><tbody>${l.table.rows.map(row=>`<tr>${row.map(x=>`<td>${safeHtml(x)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  return `<section class="lesson-section" aria-label="逐步弄懂"><span class="lesson-kicker">完整推演 · 用同一组数字看明白</span><h2>${safeHtml(l.question)}</h2><div class="lesson-steps">${steps}</div><h3>放在一起比较</h3>${table}<div class="scenario-grid"><article class="positive"><b>经营向好时</b><p>${safeHtml(l.good)}</p></article><article class="negative"><b>意外发生时</b><p>${safeHtml(l.bad)}</p></article></div><div class="lesson-usage"><b>实际看公司怎么用</b><p>${safeHtml(l.use)}</p></div></section>`;
}

function renderDialogues(id){
  const items=DIALOGUE_ARCHIVE.filter(d=>d.concepts.includes(id));if(!items.length)return '';
  return `<section class="dialogue-section"><span class="lesson-kicker">原对话精讲</span><h2>把当时讲透的过程找回来</h2><p class="dialogue-intro">保留此前完整解释的数字、对比表和推理顺序。案例中的小熊公司为教学假设；涉及历史会计规则时，以原文所处年代为准。</p>${items.map((d,i)=>`<details class="dialogue-item" ${items.length===1&&i===0?'open':''}><summary>${safeHtml(d.title)}<span>展开全文</span></summary><div class="markdown-body">${markdownToHtml(d.body)}</div></details>`).join('')}</section>`;
}
