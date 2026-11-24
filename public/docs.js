/* Resume file generation: real PDF (1.4, Helvetica) and DOCX (OOXML in a ZIP). No dependencies. */
(function(root){
const WID=[278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584];
const tw=(t,sz,b)=>{let w=0;for(const c of t){const k=c.charCodeAt(0);w+=k==0x95?350:(k>=32&&k<=126?WID[k-32]:556)}return w*sz/1000*(b?1.06:1)};
const BUL=/^[-•*▪●◦·]\s*\S/;
function buildModel(text,improve,useImproved){
 const L=text.split(/\r?\n/).map(x=>x.trim());
 const isHead=l=>l&&l.length<40&&!BUL.test(l)&&(/^[A-Z][A-Z &/,-]+:?$/.test(l)||/^(education|(technical )?skills?|projects?|(work )?experience|internships?|certifications?|achievements?|awards?|summary|objective)\s*:?$/i.test(l));
 let i=L.findIndex(Boolean);if(i<0)return{name:"",contact:[],sections:[]};
 const name=L[i++],contact=[];while(i<L.length&&!isHead(L[i])){if(L[i])contact.push(L[i]);i++}
 const sections=[];let cur=null;
 for(;i<L.length;i++){const l=L[i];if(!l)continue;
  if(isHead(l)){cur={title:l.replace(/:$/,""),items:[]};sections.push(cur);continue}
  if(!cur){cur={title:"",items:[]};sections.push(cur)}
  if(BUL.test(l)){let t=l.replace(/^[-•*▪●◦·]\s*/,"");if(useImproved&&improve)t=improve(t).after;cur.items.push({b:1,t})}else cur.items.push({b:0,t:l})}
 return{name,contact,sections}}
function latin1(s){let lost=0;const o=s.replace(/[‘’]/g,"'").replace(/[“”]/g,'"').replace(/[–—]/g,"-").replace(/…/g,"...").replace(/\u00a0/g," ").replace(/[^\x00-\xff]/g,()=>{lost++;return"?"});return{s:o,lost}}
function pdf(m){let lost=0;const fix=t=>{const r=latin1(t);lost+=r.lost;return r.s};
 const pages=[];let ops="",y=792;const M=50,PW=495;
 const np=()=>{pages.push(ops);ops="";y=792};
 const esc=t=>t.replace(/[\\()]/g,"\\$&");
 const line=(t,x,sz,b)=>{if(y<60)np();ops+=`BT /F${b?2:1} ${sz} Tf ${x} ${y.toFixed(1)} Td (${esc(t)}) Tj ET\n`;y-=sz*1.35};
 const wrap=(t,sz,b,mw)=>{const out=[];let cur="";for(const w of t.split(/\s+/)){const n=cur?cur+" "+w:w;if(tw(n,sz,b)>mw&&cur){out.push(cur);cur=w}else cur=n}if(cur)out.push(cur);return out};
 if(m.name)line(fix(m.name),M,20,1);
 if(m.contact.length){y-=2;wrap(fix(m.contact.join("  |  ")),10,0,PW).forEach(l=>line(l,M,10,0))}
 for(const s of m.sections){if(s.title){y-=8;if(y<90)np();line(fix(s.title.toUpperCase()),M,12,1);ops+=`0.5 w ${M} ${(y+8).toFixed(1)} m ${M+PW} ${(y+8).toFixed(1)} l S\n`;y-=3}
  for(const it of s.items){const t=fix(it.t);if(it.b){wrap(t,10.5,0,PW-14).forEach((l,k)=>{if(k==0&&y<60)np();if(k==0)ops+=`BT /F1 10.5 Tf ${M+2} ${y.toFixed(1)} Td (\x95) Tj ET\n`;line(l,M+14,10.5,0)})}else wrap(t,10.5,0,PW).forEach(l=>line(l,M,10.5,0));y-=2}}
 np();if(pages.length>1&&!pages[pages.length-1])pages.pop();
 let out="%PDF-1.4\n";const off=[];const put=(n,b)=>{off[n]=out.length;out+=n+" 0 obj\n"+b+"\nendobj\n"};
 put(1,"<< /Type /Catalog /Pages 2 0 R >>");
 put(2,`<< /Type /Pages /Kids [${pages.map((_,k)=>(6+2*k)+" 0 R").join(" ")}] /Count ${pages.length} >>`);
 put(3,"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
 put(4,"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
 pages.forEach((c,k)=>{put(5+2*k,`<< /Length ${c.length} >>\nstream\n${c}endstream`);put(6+2*k,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${5+2*k} 0 R >>`)});
 const n=4+2*pages.length,xr=out.length;
 out+=`xref\n0 ${n+1}\n0000000000 65535 f \n`+off.slice(1).map(o=>String(o).padStart(10,"0")+" 00000 n \n").join("")+`trailer\n<< /Size ${n+1} /Root 1 0 R >>\nstartxref\n${xr}\n%%EOF`;
 api.lost=lost;return Uint8Array.from(out,c=>c.charCodeAt(0)&255)}
const T=new Array(256).fill(0).map((_,n)=>{let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;return c>>>0});
const crc=b=>{let c=0xFFFFFFFF;for(const x of b)c=T[(c^x)&255]^(c>>>8);return(c^0xFFFFFFFF)>>>0};
function zip(files){const enc=new TextEncoder(),u16=v=>[v&255,v>>8&255],u32=v=>[v&255,v>>8&255,v>>16&255,v>>>24&255],parts=[],cen=[];let off=0;
 for(const[n,s]of files){const d=enc.encode(s),nb=enc.encode(n),c=crc(d);
  const lh=Uint8Array.from([0x50,0x4b,3,4,20,0,0,0,0,0,0,0,33,0,...u32(c),...u32(d.length),...u32(d.length),...u16(nb.length),0,0,...nb]);
  cen.push(Uint8Array.from([0x50,0x4b,1,2,20,0,20,0,0,0,0,0,0,0,33,0,...u32(c),...u32(d.length),...u32(d.length),...u16(nb.length),0,0,0,0,0,0,0,0,0,0,0,0,...u32(off),...nb]));
  parts.push(lh,d);off+=lh.length+d.length}
 const cs=cen.reduce((a,b)=>a+b.length,0),end=Uint8Array.from([0x50,0x4b,5,6,0,0,0,0,...u16(files.length),...u16(files.length),...u32(cs),...u32(off),0,0]);
 const all=[...parts,...cen,end],o=new Uint8Array(all.reduce((a,b)=>a+b.length,0));let p=0;for(const a of all){o.set(a,p);p+=a.length}return o}
function docx(m){const x=s=>s.replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
 const r=(t,o="")=>`<w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>${o}</w:rPr><w:t xml:space="preserve">${x(t)}</w:t></w:r>`;
 const p=(pr,c)=>`<w:p><w:pPr>${pr}</w:pPr>${c}</w:p>`;let b="";
 if(m.name)b+=p('<w:spacing w:after="40"/>',r(m.name,'<w:b/><w:sz w:val="40"/>'));
 if(m.contact.length)b+=p('<w:spacing w:after="80"/>',r(m.contact.join("  |  "),'<w:sz w:val="20"/>'));
 for(const s of m.sections){if(s.title)b+=p('<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="888888"/></w:pBdr><w:spacing w:before="200" w:after="80"/>',r(s.title.toUpperCase(),'<w:b/><w:sz w:val="24"/>'));
  for(const it of s.items)b+=it.b?p('<w:spacing w:after="40"/><w:ind w:left="360" w:hanging="260"/>',r("\u2022  "+it.t,'<w:sz w:val="21"/>')):p('<w:spacing w:after="40"/>',r(it.t,'<w:sz w:val="21"/>'))}
 const W='xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"',H='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
 return zip([["[Content_Types].xml",H+'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'],
 ["_rels/.rels",H+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'],
 ["word/document.xml",H+`<w:document ${W}><w:body>${b}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1000" w:right="1000" w:bottom="1000" w:left="1000" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>`]])}
function previewHTML(m,esc){return`<div style="font:14px/1.5 Georgia,serif;color:#111;background:#fff;padding:22px 26px;border-radius:10px;max-height:380px;overflow:auto"><div style="font-size:22px;font-weight:700">${esc(m.name)}</div><div style="font-size:12px;color:#444;margin-bottom:6px">${esc(m.contact.join("  |  "))}</div>${m.sections.map(s=>(s.title?`<div style="font-weight:700;font-size:13px;letter-spacing:.04em;border-bottom:1px solid #999;margin:12px 0 5px">${esc(s.title.toUpperCase())}</div>`:"")+s.items.map(i=>`<div style="${i.b?"padding-left:16px;text-indent:-12px":""}">${i.b?"• ":""}${esc(i.t)}</div>`).join("")).join("")}</div>`}
const api={buildModel,pdf,docx,previewHTML,lost:0};root.CVDocs=api;if(typeof module!=="undefined")module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
