// Small painted surface studies adapted from the Ground, Alley and Lantern
// labs. Shared maps/materials; no downloads, reflection pass or postprocess.
import * as THREE from 'three';
const hash = n => { const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v); };
export function streetPaint(M, canvasTex) {
  // Weathered kawara stays blue-grey in the sun, with a soft broken highlight.
  M.roof.color.setHex(0x879ba9); M.roof.roughness=.84; M.roof.normalScale.setScalar(.28); M.roof.envMapIntensity=.22;
  const timber=canvasTex(256,256,c=>{
    c.fillStyle='#89795f';c.fillRect(0,0,256,256);
    for(let i=0;i<220;i++) {
      const x=hash(i+8)*256, y=hash(i+19)*256;
      c.strokeStyle=i%3?'rgba(52,46,36,.21)':'rgba(224,205,161,.28)';c.lineWidth=.5+hash(i)*1.5;
      c.beginPath();c.moveTo(x,y);c.bezierCurveTo(x+4,y+15,x-4,y+35,x+1,y+75);c.stroke();
    }
    for(const x of [2,64,128,192,254]) {c.fillStyle='rgba(35,34,29,.33)';c.fillRect(x,0,1,256);}
    for(let i=0;i<8;i++) {const x=hash(i+44)*256,y=hash(i+72)*256;c.strokeStyle='rgba(49,42,33,.22)';for(let j=1;j<4;j++){c.beginPath();c.ellipse(x,y,j*1.6,j*4,0,0,Math.PI*2);c.stroke();}}
  },[1,1]);
  for(const m of [M.agedWood,M.timber,M.timberMed]) {m.map=timber;m.bumpMap=timber;m.bumpScale=.014;m.normalMap=null;m.roughness=.94;}
  const planks=timber.clone();planks.repeat.set(1.2,.35);planks.needsUpdate=true;
  M.hull=new THREE.MeshStandardMaterial({map:planks,color:0x776b54,roughness:.87,side:THREE.DoubleSide});
  M.hullBand=new THREE.MeshStandardMaterial({color:0x394b48,roughness:.74});
  M.enamel=new THREE.MeshStandardMaterial({color:0xe2ddd0,roughness:.38,metalness:.15});
  M.rust=new THREE.MeshStandardMaterial({color:0x8c553d,roughness:1});
  // Sashiko dots, woven stripes and loose seigaiha, varied by household.
  M.cloth.forEach((m,i)=>{
    m.map=canvasTex(128,128,c=>{
      c.fillStyle='#eee5ce';c.fillRect(0,0,128,128);
      c.strokeStyle='rgba(75,84,82,.34)';c.lineWidth=1;
      if(i%3===0) for(let y=8;y<144;y+=20) for(let x=-10;x<144;x+=24) {c.beginPath();c.arc(x+(y%40?12:0),y,12,Math.PI,Math.PI*2);c.stroke();}
      else if(i%3===1) for(let x=8;x<128;x+=14) {c.fillStyle='rgba(60,82,92,.20)';c.fillRect(x,0,4,128);}
      else for(let y=6;y<128;y+=12) for(let x=6;x<128;x+=12) {c.beginPath();c.moveTo(x-2,y);c.lineTo(x+2,y);c.moveTo(x,y-2);c.lineTo(x,y+2);c.stroke();}
      for(let i=0;i<400;i++){c.fillStyle='rgba(83,76,58,.07)';c.fillRect(hash(i)*128,hash(i+35)*128,1,3);}
      c.strokeStyle='rgba(72,64,51,.35)';c.strokeRect(3,3,122,122);
    });
    m.userData.panel=true;
  });
  M.straw.map=canvasTex(256,256,c=>{
    c.fillStyle='#b9a170';c.fillRect(0,0,256,256);
    for(let i=0;i<1300;i++){const x=hash(i)*256,y=hash(i+6)*256;c.strokeStyle=i%3?'rgba(238,218,158,.35)':'rgba(85,72,46,.32)';c.lineWidth=.65+hash(i+1);c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+2,y+8,x-1,y+12+hash(i+2)*35);c.stroke();}
  },[1,1]);M.straw.normalMap=null;M.straw.bumpMap=M.straw.map;M.straw.bumpScale=.012;M.straw.roughness=1;
  M.cobble.color.setHex(0xc0c9bd);M.slab.color.setHex(0xd4d6c6);
  M.gardenMoss=new THREE.MeshStandardMaterial({map:canvasTex(128,128,c=>{
    for(let i=0;i<900;i++){const a=hash(i)*Math.PI*2,r=Math.sqrt(hash(i+7))*51;c.globalAlpha=.35+hash(i+8)*.6;c.fillStyle=i%3?'#697747':'#485c37';c.beginPath();c.ellipse(64+Math.cos(a)*r,64+Math.sin(a)*r,1.5+hash(i+3)*5,1.5+hash(i+4)*3,a,0,Math.PI*2);c.fill();}
    c.globalAlpha=1;
  }),alphaTest:.45,roughness:1,side:THREE.DoubleSide});
  const menus={'yakitori':'焼鳥','hiyashi-ame':'冷あめ','kingyo-sukui':'金魚','kakigori':'氷','takoyaki':'たこ焼','ringo-ame':'りんご飴','wind chimes':'風鈴','yakisoba':'焼そば','sweet ayu':'鮎','cotton candy':'綿菓子','taiyaki':'鯛焼','matcha':'抹茶','ramune':'ラムネ','dango':'団子','okonomiyaki':'お好み焼','festival masks':'お面','candied chestnuts':'甘栗','sweet ame':'飴'};
  M.stallSigns=Object.fromEntries(Object.entries(menus).map(([fare,word],i)=>[fare,new THREE.MeshStandardMaterial({map:canvasTex(128,256,c=>{
    c.fillStyle='#e5d2a7';c.fillRect(0,0,128,256);c.fillStyle=i%2?'#274c60':'#843c31';c.fillRect(0,0,128,27);c.fillRect(0,229,128,27);
    c.strokeStyle='rgba(100,76,46,.27)';for(let j=0;j<60;j++){c.beginPath();c.moveTo(hash(j)*128,hash(j+2)*256);c.lineTo(hash(j)*128+8,hash(j+2)*256+1);c.stroke();}
    c.fillStyle='#443d32';c.textAlign='center';c.textBaseline='middle';const size=Math.min(63,180/word.length);c.font='bold '+size+'px serif';[...word].forEach((a,j)=>c.fillText(a,64,128+(j-(word.length-1)/2)*size));
  }),roughness:1})]));
  for(const m of Object.values(M.stallSigns))m.userData.panel=true;
  // Washi fibres, uneven ribs and the warm belly of the paper lantern.
  for(const [mat,paper] of [[M.lanternWhite,'#f6e5bb'],[M.lanternRed,'#cc6248']]) {
    mat.map=canvasTex(128,256,c=>{
      const wash=c.createLinearGradient(0,0,0,256);wash.addColorStop(0,'#8d6a4d');wash.addColorStop(.28,paper);wash.addColorStop(.66,paper);wash.addColorStop(1,'#8d6a4d');c.fillStyle=wash;c.fillRect(0,0,128,256);
      for(let i=0;i<700;i++){c.strokeStyle='rgba(116,76,37,.12)';c.lineWidth=.6;c.beginPath();const x=hash(i)*128,y=hash(i+9)*256;c.moveTo(x,y);c.lineTo(x+hash(i+2)*14-7,y+hash(i+3)*9);c.stroke();}
      for(let y=8;y<256;y+=14){c.fillStyle='rgba(63,42,27,.32)';c.fillRect(0,y,128,1.5);c.fillStyle='rgba(255,248,214,.24)';c.fillRect(0,y+2,128,1);}
      c.fillStyle='#302c26';c.fillRect(0,0,128,12);c.fillRect(0,244,128,12);
    });mat.emissiveMap=mat.map;
  }
}
