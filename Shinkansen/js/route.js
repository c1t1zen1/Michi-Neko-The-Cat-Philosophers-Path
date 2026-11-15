// Authored travel time, never a deadline. The train waits at Tokyo indefinitely.
export const DURATION = 1800;
export const CAR_LENGTH = 25;
export const CAR_PITCH = 25.85;
export const CAR_COUNT = 16;
export const TRAIN_LENGTH = (CAR_COUNT - 1) * CAR_PITCH + CAR_LENGTH;
export const ENTRY = 6 * CAR_PITCH + 5;
export const EXIT = 9 * CAR_PITCH + 19;
export const FLOOR = 1.15;
export const CHAPTERS = [
  { id:'kyoto', name:'The hills let go', jp:'京都 · 出発', place:'Kyoto', start:0, end:150, terrain:'paddy', hour:9.3, speed:180, color:0x93aa65, message:'A red bridge, a white train, a very small passenger. The hills of Kyoto wave goodbye.', wow:'Petals over the departure bridge', side:'left' },
  { id:'biwa', name:'A thousand green mirrors', jp:'近江 · 田園', place:'Ōmi countryside', start:150, end:300, terrain:'paddy', hour:10, speed:265, color:0x9cae65, message:'Rice fields catch the clouds. Keep your paws low when the amber hoops approach.', wow:'The mirrored rice terraces', side:'both' },
  { id:'ibuki', name:'Into the mountain', jp:'伊吹 · 山の中へ', place:'Mount Ibuki', start:300, end:450, terrain:'mountain', hour:10.6, speed:280, color:0x69865b, message:'The wind becomes a whisper, then a roar. Crouch through the low service hoops inside the tunnel.', wow:'A tunnel of warm golden lights', side:'front', tunnel:[.25,.70] },
  { id:'kiso', name:'The river in the sky', jp:'木曽川 · 鉄橋', place:'Kiso River', start:450, end:600, terrain:'river', hour:11.2, speed:275, color:0x8fa77a, message:'A broad river flashes silver below the viaduct. A sister train is coming the other way!', wow:'Two trains meet above the river', side:'right', bridge:true },
  { id:'coach', name:'A little world inside', jp:'車内 · 旅の仲間', place:'The travelling coach', start:600, end:750, terrain:'town', hour:12, speed:270, color:0x9eae79, message:'The green hatch leads down to the coach. Sora has saved you a window seat. Find the café farther forward.', wow:'Sunbeams in the moving coach', side:'both' },
  { id:'tea', name:'The Cloud Café', jp:'喫茶 · 雲のカフェ', place:'Cloud Café', start:750, end:900, terrain:'tea', hour:13, speed:265, color:0x8fa565, message:'Follow the smell of hōjicha. Greet Yuzu at the counter, then take the brass ladder back to the sky.', wow:'Tea fields unroll like green corduroy', side:'left' },
  { id:'oi', name:'Between mountains and sea', jp:'大井川 · 風の道', place:'Ōi River', start:900, end:1050, terrain:'river', hour:14.1, speed:285, color:0x86a174, message:'Back on the roof, the wind has found its voice. Lean low through the gusts; the train will hold you.', wow:'A long red bridge across the blue', side:'both', bridge:true },
  { id:'fuji', name:'There you are, Fuji', jp:'富士山 · 左を見て', place:'Mount Fuji', start:1050, end:1200, terrain:'fuji', hour:15.2, speed:270, color:0x9eaf80, message:'Look left. Beyond the tea fields, the white peak rises out of the clouds. Stay a while.', wow:'Fuji fills the left-hand horizon', side:'left' },
  { id:'suruga', name:'An ocean made of light', jp:'駿河湾 · 右は海', place:'Suruga Bay', start:1200, end:1350, terrain:'coast', hour:16.3, speed:285, color:0xaeb68a, message:'Ocean to the right, green Japan to the left. Fishing boats leave white threads across the bay.', wow:'Sailboats, gulls, and a glittering coast', side:'right' },
  { id:'hakone', name:'The last mountain breath', jp:'箱根 · 最後の山', place:'Hakone hills', start:1350, end:1500, terrain:'mountain', hour:17.1, speed:260, color:0x7f9276, message:'One last tunnel. The roof lights will lead you through; a whole city is waiting on the other side.', wow:'From amber darkness into the sunset', side:'front', tunnel:[.28,.62] },
  { id:'tokyo', name:'A million little windows', jp:'東京 · 夕暮れ', place:'Tokyo approaches', start:1500, end:1650, terrain:'city', hour:17.9, speed:210, color:0x9d9f91, message:'The houses grow into towers. Follow the blue roof stripe toward the front observation perch.', wow:'Tokyo Tower appears between the buildings', side:'left' },
  { id:'arrival', name:'A cat at the edge of Tokyo', jp:'東京 · おかえり', place:'Tokyo', start:1650, end:1800, terrain:'city', hour:18.7, speed:100, color:0xa7a092, message:'The city glows like a box of lanterns. At the front of the train, press E to take in the arrival.', wow:'The city lights come on around Michi', side:'both' }
];
export const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
export const mix = (a,b,t) => a+(b-a)*t;
export const smooth = (a,b,x) => { const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t); };
export function chapterAt(time) { return CHAPTERS.find(c=>time<c.end) || CHAPTERS.at(-1); }
export function routeAt(time) {
  const c=chapterAt(time), i=CHAPTERS.indexOf(c), t=clamp((time-c.start)/(c.end-c.start),0,1);
  const blend=smooth(.82,1,t), next=CHAPTERS[Math.min(i+1,CHAPTERS.length-1)];
  const tunnel=c.tunnel ? smooth(c.tunnel[0]-.035,c.tunnel[0]+.035,t)*(1-smooth(c.tunnel[1]-.035,c.tunnel[1]+.035,t)) : 0;
  return { c,i,t,blend,next,tunnel,hour:mix(c.hour,next.hour,t),speed:mix(c.speed,next.speed,blend)*(time>=DURATION?0:1),ocean:c.terrain==='coast'||c.terrain==='fuji',city:c.terrain==='city' };
}
export function carAt(s) { return clamp(Math.floor((s+.425)/CAR_PITCH),0,CAR_COUNT-1); }
export function inGap(s) { const i=Math.floor(s/CAR_PITCH);return i<CAR_COUNT-1 && s-i*CAR_PITCH>CAR_LENGTH; }
export function roofHeight(x=0) { return 3.8+.55*Math.sqrt(Math.max(0,1-(x/1.78)**2)); }
export const POSTCARDS = [
  {id:'departure',s:20,label:'Kyoto farewell',icon:'桜'},
  {id:'rice',s:68,label:'A thousand green mirrors',icon:'田'},
  {id:'river',s:122,label:'The river in the sky',icon:'川'},
  {id:'coach',s:ENTRY+19,label:'A window seat',icon:'窓',inside:true},
  {id:'cafe',s:8*CAR_PITCH+10,label:'Cloud Café',icon:'茶',inside:true},
  {id:'fuji',s:285,label:'Fuji in the clouds',icon:'山'},
  {id:'ocean',s:339,label:'Ocean light',icon:'海'},
  {id:'tokyo',s:TRAIN_LENGTH-7,label:'Tokyo, at last',icon:'灯'}
];

// Fixed route beats supplement the repeating overhead rhythm. No damaging wires.
export function windAt(time) { return Math.sin(time*.31)*Math.sin(time*.079)*(.4+smooth(850,1080,time)*.6); }
