// A synthesized sound bed: wheel rhythms, wind, tunnel resonance and soft chimes.
// Created only after a gesture. No media downloads; sound defaults off.
export class TrainAudio {
  constructor(){this.ctx=null;this.enabled=false;this.tick=0;}
  async setEnabled(on){
    this.enabled=on;
    if(!on){if(this.master)this.master.gain.setTargetAtTime(0,this.ctx.currentTime,.18);return;}
    if(!this.ctx){
      const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
      this.ctx=new AC();const c=this.ctx;this.master=c.createGain();this.master.gain.value=0;this.master.connect(c.destination);
      const buffer=c.createBuffer(1,c.sampleRate*3,c.sampleRate),d=buffer.getChannelData(0);let last=0;
      for(let i=0;i<d.length;i++){last=(last+(Math.random()*2-1)*.025)/1.025;d[i]=last*6;}
      const noise=c.createBufferSource();noise.buffer=buffer;noise.loop=true;
      this.filter=c.createBiquadFilter();this.filter.type='lowpass';this.filter.frequency.value=800;
      this.wind=c.createGain();this.wind.gain.value=.08;noise.connect(this.filter);this.filter.connect(this.wind);this.wind.connect(this.master);noise.start();
      this.rumble=c.createOscillator();this.rumble.type='sine';this.rumble.frequency.value=48;this.low=c.createGain();this.low.gain.value=.035;this.rumble.connect(this.low);this.low.connect(this.master);this.rumble.start();
    }
    try{await this.ctx.resume();this.master.gain.setTargetAtTime(.6,this.ctx.currentTime,.25);}catch{}
  }
  chime(kind='postcard'){
    if(!this.enabled||!this.ctx)return;
    const c=this.ctx,notes=kind==='arrival'?[523.25,659.25,783.99,1046.5]:kind==='jump'?[440]:[659.25,880];
    notes.forEach((f,i)=>{const o=c.createOscillator(),g=c.createGain(),t=c.currentTime+i*.14;o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(kind==='jump'?.014:.055,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+.75);o.connect(g);g.connect(this.master);o.start(t);o.stop(t+.8);});
  }
  update(dt,route,inside,paused){
    if(!this.ctx||!this.enabled)return;
    const c=this.ctx,t=c.currentTime,pace=route.speed/285;
    this.master.gain.setTargetAtTime(paused?.06:.6,t,.2);
    this.wind.gain.setTargetAtTime((inside?.025:.10)*pace,t,.2);
    this.filter.frequency.setTargetAtTime(inside?280:route.tunnel>.5?520:1000,t,.25);
    this.rumble.frequency.setTargetAtTime(35+pace*26,t,.2);this.low.gain.setTargetAtTime(.025+route.tunnel*.02,t,.2);
    this.tick+=dt*pace;
    if(this.tick>.68&&!paused){this.tick=0;const o=c.createOscillator(),g=c.createGain();o.frequency.setValueAtTime(90,t);o.frequency.exponentialRampToValueAtTime(35,t+.10);g.gain.setValueAtTime(inside?.018:.035,t);g.gain.exponentialRampToValueAtTime(.0001,t+.15);o.connect(g);g.connect(this.master);o.start();o.stop(t+.16);}
  }
}
