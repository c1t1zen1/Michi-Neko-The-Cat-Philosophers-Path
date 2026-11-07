import * as THREE from 'three';

export const PALETTE = { fresh:'#a9af72', aged:'#b9ac78', gold:'#c4ad65', cedar:'#9c6946', dark:'#584434', ochre:'#c5b184', earth:'#a78d6c', cream:'#d8d0b4', sage:'#a5ad95', rust:'#a45138', indigo:'#3f5d6d', moss:'#727c4c' };
export function random(seed=1) { return () => { let t=seed+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296; }; }
const cache = new Map();
export function isSharedResource(resource){for(const value of cache.values())if(value===resource)return true;return false;}
const rgb = (hex) => [parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5,7),16)];

/** All raster surfaces are painted locally at 256 px; scalar bump has no colour space. */
export function painted(kind, finish='fresh', data=false) {
  const key=`${kind}/${finish}/${data}`;
  if(cache.has(key)) return cache.get(key);
  const c=document.createElement('canvas');c.width=c.height=256;
  const ctx=c.getContext('2d'), rnd=random(491+finish.length*129+kind.length*81);
  const base=rgb(data?'#888888':PALETTE[finish]||'#d9d3b6');
  const im=ctx.createImageData(256,256);
  for(let y=0;y<256;y++) for(let x=0;x<256;x++) {
    let v=(rnd()-.5)*9;
    if(kind==='tatami') v+=Math.sin(y*Math.PI*.5)*11+Math.sin(x*.16+Math.sin(y*.1)) * 3+(x%22<2? -13:0)+(y%4===0?-9:0);
    if(kind==='wood') v+=Math.sin(x*.5+Math.sin(y*.023)*2)*6+Math.sin(x*.14+Math.sin(y*.012)*3)*10+Math.sin(x*.035+Math.sin(y*.03)) * 9;
    if(kind==='plaster') v+=Math.sin(x*.07+Math.sin(y*.06))*3;
    if(kind==='cloth') v+=(x%3===0?-8:0)+(y%3===0?-7:0);
    if(kind==='paper') v+=Math.sin(x*.08+Math.sin(y*.023)*4)*2;
    if(kind==='ceramic') v+=Math.sin(y*.09)*3;
    const i=(y*256+x)*4;
    for(let k=0;k<3;k++) im.data[i+k]=Math.max(0,Math.min(255,base[k]+v));
    im.data[i+3]=255;
  }
  ctx.putImageData(im,0,0);
  if(kind==='paper'||kind==='plaster') {
    ctx.strokeStyle=data?'#929292':'#faf5df2a';ctx.lineWidth=.5;
    for(let i=0;i<700;i++){let x=rnd()*256,y=rnd()*256;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+(rnd()-.5)*10,y+1+rnd()*10);ctx.stroke();}
  }
  if(kind==='heri') {
    ctx.fillStyle=data?'#888888':finish==='indigo'?'#344d52':'#4d533c';ctx.fillRect(0,0,256,256);
    ctx.strokeStyle=data?'#b0b0b0':'#9f9f6a';ctx.lineWidth=1;
    for(let y=-16;y<280;y+=16)for(let x=-16;x<280;x+=16){ctx.beginPath();ctx.moveTo(x,y+8);ctx.lineTo(x+8,y);ctx.lineTo(x+16,y+8);ctx.lineTo(x+8,y+16);ctx.closePath();ctx.stroke();}
  }
  if(kind==='cloth'&&finish==='indigo') {
    ctx.strokeStyle=data?'#999':'#b0b6a160';ctx.lineWidth=.7;
    for(let y=0;y<280;y+=22)for(let x=0;x<280;x+=22){ctx.beginPath();ctx.arc(x,y,9,Math.PI,2*Math.PI);ctx.stroke();ctx.beginPath();ctx.arc(x+11,y+11,9,Math.PI,2*Math.PI);ctx.stroke();}
  }
  if(kind==='ceramic') {
    ctx.strokeStyle=data?'#77777780':'#5f6f6240';ctx.lineWidth=.4;
    for(let i=0;i<65;i++){let x=rnd()*256,y=rnd()*256;ctx.beginPath();ctx.moveTo(x,y);for(let j=0;j<5;j++){x+=(rnd()-.5)*24;y+=rnd()*12;ctx.lineTo(x,y);}ctx.stroke();}
    if(finish==='indigo') {ctx.strokeStyle='#d6decd';ctx.lineWidth=2;for(let x=0;x<256;x+=40){ctx.beginPath();ctx.moveTo(x,220);ctx.bezierCurveTo(x+14,180,x-12,150,x+6,120);ctx.stroke();for(let y=140;y<210;y+=20){ctx.beginPath();ctx.ellipse(x+6,y,9,3,-.4,0,6.28);ctx.stroke();}}}
  }
  const t=new THREE.CanvasTexture(c);t.colorSpace=data?THREE.NoColorSpace:THREE.SRGBColorSpace;
  t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;cache.set(key,t);return t;
}
export function material(kind,finish,extra={}) {
  const key=`mat/${kind}/${finish}/${JSON.stringify(extra)}`;
  if(cache.has(key))return cache.get(key);
  const m=new THREE.MeshStandardMaterial({map:painted(kind,finish),bumpMap:painted(kind,finish,true),bumpScale:kind==='tatami'?.009:kind==='plaster'?.015:.004,roughness:kind==='ceramic'?.28:kind==='wood'?.67:.94,...extra});
  cache.set(key,m);return m;
}
export function plain(color,roughness=.85) { const key=`plain/${color}/${roughness}`;if(!cache.has(key))cache.set(key,new THREE.MeshStandardMaterial({color,roughness}));return cache.get(key); }

export function artwork(kind='landscape',season='green') {
  const key=`art/${kind}/${season}`;if(cache.has(key))return cache.get(key);
  const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d'),rnd=random(752);
  g.fillStyle='#d6d0b4';g.fillRect(0,0,256,256);
  for(let i=0;i<3200;i++){g.fillStyle=`rgba(104,91,58,${rnd()*.045})`;g.fillRect(rnd()*256,rnd()*256,1+rnd()*3,1);}
  if(kind==='paper-shadow') {
    g.strokeStyle='#807e5b33';g.lineWidth=3;g.beginPath();g.moveTo(260,240);g.bezierCurveTo(140,180,220,120,150,-10);g.stroke();
    for(let i=0;i<65;i++){let y=rnd()*260,x=160+Math.sin(y*.025)*30+(rnd()-.5)*90;g.fillStyle=`rgba(81,94,60,${.035+rnd()*.075})`;g.beginPath();g.ellipse(x,y,10+rnd()*13,3+rnd()*5,rnd()*5,0,6.28);g.fill();}
  } else if(kind==='maple') {
    g.strokeStyle='#5b5144';g.lineWidth=2;g.beginPath();g.moveTo(60,240);g.bezierCurveTo(70,170,170,80,140,10);g.stroke();
    for(let i=0;i<45;i++){g.fillStyle=['#985b3b99','#a7794799','#86784888'][i%3];const x=80+rnd()*100,y=25+rnd()*160;g.beginPath();g.moveTo(x,y-7);g.lineTo(x+7,y-4);g.lineTo(x+3,y+2);g.lineTo(x,y+7);g.lineTo(x-7,y-2);g.closePath();g.fill();}
  } else {
    for(let layer=0;layer<4;layer++){g.fillStyle=`rgba(65,82,75,${.09+layer*.08})`;g.beginPath();g.moveTo(0,220);for(let x=0;x<=256;x+=3)g.lineTo(x,150+layer*18-Math.sin(x*.025+layer*1.2)*20-Math.sin(x*.06+layer)*8);g.lineTo(256,256);g.lineTo(0,256);g.fill();}
    g.fillStyle='#5a665b';g.beginPath();g.arc(170,65,18,0,6.28);g.fill();
    g.strokeStyle='#414f43';g.lineWidth=2;g.beginPath();g.moveTo(60,214);g.lineTo(65,135);g.stroke();
    for(let j=0;j<5;j++){g.beginPath();g.moveTo(65,144+j*12);g.lineTo(40-j*3,155+j*12);g.lineTo(80+j*3,155+j*12);g.stroke();}
  }
  if(kind!=='paper-shadow'){g.fillStyle='#a04c35';g.fillRect(208,216,13,16);g.fillStyle='#d4c3a1';g.fillRect(211,220,2,7);g.fillRect(216,219,2,10);}
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;cache.set(key,t);return t;
}
export function shadowTexture() {
  if(cache.has('shadow'))return cache.get('shadow');const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d');
  const r=g.createRadialGradient(128,128,10,128,128,124);r.addColorStop(0,'rgba(36,34,22,.3)');r.addColorStop(.45,'rgba(36,34,22,.12)');r.addColorStop(1,'rgba(36,34,22,0)');g.fillStyle=r;g.fillRect(0,0,256,256);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;cache.set('shadow',t);return t;
}
