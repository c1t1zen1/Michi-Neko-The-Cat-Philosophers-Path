import * as THREE from 'three';

export const SIZE = 256, SPAN = 180;
export const fract = x => x-Math.floor(x);
export const clamp = (v,a=0,b=1) => Math.min(b,Math.max(a,v));
const smooth = x => x*x*(3-2*x);
export function hash(x,y,z=0) { return fract(Math.sin(x*127.1+y*311.7+z*74.7+19.8)*43758.5453); }
// Periodic lattice noise: the weather tile and the volume meet at their edges.
export function noise(x,y,cells=8,cellsY=cells) {
  const ix=Math.floor(x),iy=Math.floor(y),fx=smooth(fract(x)),fy=smooth(fract(y));
  const h=(a,b)=>hash((a%cells+cells)%cells,(b%cellsY+cellsY)%cellsY);
  return THREE.MathUtils.lerp(THREE.MathUtils.lerp(h(ix,iy),h(ix+1,iy),fx),THREE.MathUtils.lerp(h(ix,iy+1),h(ix+1,iy+1),fx),fy);
}
function fbm(u,v) { return noise(u*4,v*4,4)*.55+noise(u*8,v*8,8)*.28+noise(u*16,v*16,16)*.12+noise(u*32,v*32,32)*.05; }
function cellDistance(u,v,n) {
  const x=u*n,y=v*n,ix=Math.floor(x),iy=Math.floor(y);let d=4;
  for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++) {
    const a=ix+i,b=iy+j,px=a+.5+(hash((a+n)%n,(b+n)%n)-.5)*.5,py=b+.5+(hash((a+n)%n,(b+n)%n,3)-.5)*.5;
    d=Math.min(d,Math.hypot(px-x,py-y));
  }
  return d;
}

export class WeatherField {
  constructor(shape='cumulus') {
    this.raw=new Float32Array(SIZE*SIZE);this.brush=new Float32Array(SIZE*SIZE);
    this.bytes=new Uint8Array(SIZE*SIZE*4);
    this.texture=new THREE.DataTexture(this.bytes,SIZE,SIZE,THREE.RGBAFormat);
    this.texture.wrapS=this.texture.wrapT=THREE.RepeatWrapping;
    this.texture.minFilter=this.texture.magFilter=THREE.LinearFilter;
    this.texture.generateMipmaps=false;
    this.canvas=document.createElement('canvas');this.canvas.width=this.canvas.height=SIZE;
    this.ctx=this.canvas.getContext('2d');this.image=this.ctx.createImageData(SIZE,SIZE);
    this.painting=new THREE.CanvasTexture(this.canvas);
    this.painting.colorSpace=THREE.SRGBColorSpace;
    this.painting.flipY=false;
    this.painting.wrapS=this.painting.wrapT=THREE.RepeatWrapping;
    this.painting.minFilter=this.painting.magFilter=THREE.LinearFilter;
    this.painting.generateMipmaps=false;
    this.revision=0;this.dirty=true;this.setShape(shape);
  }
  setShape(shape) {
    if(this.shape===shape)return;
    this.shape=shape;
    for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++) {
      const u=x/SIZE,v=y/SIZE,n=fbm(u,v);let value=clamp((n-.28)*1.9);
      if(shape==='cirrus') value=.21+.63*(noise(u*2,v*32+Math.sin(u*Math.PI*4)*1.2,2,32)*.7+noise(u*4,v*64,4,64)*.3);
      else if(shape==='scales') value=.2+.68*Math.max(0,1-cellDistance(u,v,22)*2.2)*(.78+.22*Math.sin(v*Math.PI*32+Math.sin(u*Math.PI*4)));
      else if(shape==='sheep') value=.2+.72*Math.sqrt(Math.max(0,1-cellDistance(u,v,9)*1.9))*(.6+n*.4);
      else if(shape==='veil') value=.3+n*.55;
      else if(shape==='storm') value=.12+n*.88;
      this.raw[y*SIZE+x]=value;
    }
    this.brush.fill(0);this.flush();
  }
  reset() { this.brush.fill(0);this.dirty=true;this.flush(); }
  stamp(u,v,amount,radius=.07) {
    const cx=fract(u)*SIZE,cy=fract(v)*SIZE,r=radius*SIZE;
    for(let j=-Math.ceil(r);j<=Math.ceil(r);j++)for(let i=-Math.ceil(r);i<=Math.ceil(r);i++) {
      const dist=Math.hypot(i,j)/r;if(dist>1)continue;
      const x=(Math.floor(cx+i)+SIZE)%SIZE,y=(Math.floor(cy+j)+SIZE)%SIZE,k=y*SIZE+x;
      this.brush[k]=clamp(this.brush[k]+amount*(1-smooth(dist)),-1,1);
    }
    this.dirty=true;
  }
  value(x,y) { return clamp(this.raw[((y+SIZE)%SIZE)*SIZE+(x+SIZE)%SIZE]+this.brush[((y+SIZE)%SIZE)*SIZE+(x+SIZE)%SIZE]); }
  flush() {
    for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++) {
      const k=(y*SIZE+x)*4,v=this.value(x,y);
      this.bytes[k]=Math.round(v*255);this.bytes[k+1]=Math.round(hash(x,y)*255);this.bytes[k+2]=Math.round(this.raw[y*SIZE+x]*255);this.bytes[k+3]=255;
    }
    this.texture.needsUpdate=true;this.dirty=false;this.revision++;
  }
  bake(sun,crown,belly,pigment) {
    const top=crown.clone().convertLinearToSRGB(),bottom=belly.clone().convertLinearToSRGB(),pixels=this.image.data;
    for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++) {
      const k=(y*SIZE+x)*4,v=this.value(x,y),gx=(this.value(x+1,y)-this.value(x-1,y))*18,gz=(this.value(x,y+1)-this.value(x,y-1))*18;
      const inv=1/Math.hypot(gx,.7,gz),lit=clamp(((-gx*sun.x+.7*Math.max(.3,sun.y)-gz*sun.z)*inv)*.55+.45);
      const grain=1+(hash(x>>1,y>>1)-.5)*.12*pigment;
      pixels[k]=clamp((bottom.r+(top.r-bottom.r)*lit)*grain)*255;
      pixels[k+1]=clamp((bottom.g+(top.g-bottom.g)*lit)*grain)*255;
      pixels[k+2]=clamp((bottom.b+(top.b-bottom.b)*lit)*grain)*255;
      pixels[k+3]=v*255;
    }
    this.ctx.putImageData(this.image,0,0);this.painting.needsUpdate=true;
  }
  drawMap(ctx,state,offset,pointer) {
    const img=ctx.createImageData(SIZE,SIZE),threshold=.8-state.coverage*.65;
    for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++) {
      const d=clamp((this.value(x,y)-threshold+.07)/.22),k=(y*SIZE+x)*4;
      img.data[k]=58+d*183;img.data[k+1]=114+d*129;img.data[k+2]=145+d*100;img.data[k+3]=255;
    }
    ctx.putImageData(img,0,0);
    // Where the stage origin projects into the current moving tile.
    const px=fract(.5+offset.x)*SIZE,py=fract(.5+offset.y)*SIZE;
    ctx.strokeStyle='#bd7643';ctx.lineWidth=2;ctx.beginPath();ctx.arc(px,py,5,0,Math.PI*2);ctx.stroke();
    if(pointer) {ctx.strokeStyle='#fff';ctx.beginPath();ctx.arc(pointer.u*SIZE,pointer.v*SIZE,.07*SIZE,0,Math.PI*2);ctx.stroke();}
  }
  dispose() {this.texture.dispose();this.painting.dispose();}
}

let noiseTexture;
export function volumeNoise() {
  if(noiseTexture)return noiseTexture;
  const n=64,bytes=new Uint8Array(n*n*n);
  function n3(x,y,z,period) {
    const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z),fx=smooth(fract(x)),fy=smooth(fract(y)),fz=smooth(fract(z));
    const h=(a,b,c)=>hash((a+period)%period,(b+period)%period,(c+period)%period);
    const l=THREE.MathUtils.lerp;
    return l(l(l(h(ix,iy,iz),h(ix+1,iy,iz),fx),l(h(ix,iy+1,iz),h(ix+1,iy+1,iz),fx),fy),l(l(h(ix,iy,iz+1),h(ix+1,iy,iz+1),fx),l(h(ix,iy+1,iz+1),h(ix+1,iy+1,iz+1),fx),fy),fz);
  }
  for(let z=0;z<n;z++)for(let y=0;y<n;y++)for(let x=0;x<n;x++)bytes[(z*n+y)*n+x]=255*(n3(x/16,y/16,z/16,4)*.65+n3(x/8,y/8,z/8,8)*.35);
  noiseTexture=new THREE.Data3DTexture(bytes,n,n,n);noiseTexture.format=THREE.RedFormat;noiseTexture.minFilter=noiseTexture.magFilter=THREE.LinearFilter;
  noiseTexture.wrapS=noiseTexture.wrapT=noiseTexture.wrapR=THREE.RepeatWrapping;noiseTexture.unpackAlignment=1;noiseTexture.needsUpdate=true;
  return noiseTexture;
}

// Shared literally between the sky and each receiving material.
export const FIELD_GLSL=/*glsl*/`
uniform sampler2D uField;
uniform vec2 uCloudOffset;
uniform float uCoverage, uCloudBase, uCloudDepth;
uniform vec3 uSun;
vec2 cloudUV(vec2 p) { return p/180.0+0.5+uCloudOffset; }
float fieldDensity(vec2 uv) {
  if(uCoverage<0.001)return 0.0;
  float threshold=0.8-uCoverage*0.65;
  return smoothstep(threshold-0.07,threshold+0.15,texture2D(uField,uv).r);
}
float cloudAtWorld(vec2 p) { return fieldDensity(cloudUV(p)); }
`;
