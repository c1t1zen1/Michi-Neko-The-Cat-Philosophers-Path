/* PCM capture runs on the audio rendering thread; messages are transferable. */
class DawcatPcmRecorder extends AudioWorkletProcessor {
  constructor() { super(); this.L = new Float32Array(2048); this.R = new Float32Array(2048); this.cursor = 0;
    this.port.onmessage = ({ data }) => { if (data === 'flush') { this.flush(); this.port.postMessage({ flushed: true }); } };
  }
  flush() {
    if (!this.cursor) return;
    const L = this.L.slice(0,this.cursor), R = this.R.slice(0,this.cursor);
    this.port.postMessage({ L,R },[L.buffer,R.buffer]); this.cursor = 0;
  }
  process(inputs) {
    const input = inputs[0]; if (!input?.length) return true;
    const L = input[0], R = input[1] || L;
    for (let i=0;i<L.length;i++) { this.L[this.cursor]=L[i];this.R[this.cursor]=R[i];if(++this.cursor===this.L.length)this.flush(); }
    return true;
  }
}
registerProcessor('dawcat-pcm-recorder',DawcatPcmRecorder);
