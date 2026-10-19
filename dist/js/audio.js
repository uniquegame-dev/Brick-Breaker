export class ArcadeAudio {
  constructor(){this._enabled=true;this.context=null;this.master=null;this.voices=new Set();this.lastBrick=-Infinity;}
  get enabled(){return this._enabled;}
  set enabled(on){
    this._enabled=Boolean(on);
    if(this.master)this.master.gain.setValueAtTime(this._enabled ? .8 : 0,this.context.currentTime);
    if(!this._enabled){
      for(const voice of this.voices){try{voice.stop();}catch{}voice.disconnect();}
      this.voices.clear();this.lastBrick=-Infinity;
    }
  }
  async unlock(){
    if(!this.enabled)return false;
    try{
      if(!this.context){
        const context=new(window.AudioContext||window.webkitAudioContext)();
        const master=context.createGain(),limiter=context.createDynamicsCompressor();
        // Louder effects, with headroom for overlapping multiball collisions.
        master.gain.setValueAtTime(.8,context.currentTime);
        limiter.threshold.setValueAtTime(-6,context.currentTime);
        limiter.knee.setValueAtTime(6,context.currentTime);
        limiter.ratio.setValueAtTime(12,context.currentTime);
        limiter.attack.setValueAtTime(.003,context.currentTime);
        limiter.release.setValueAtTime(.12,context.currentTime);
        master.connect(limiter);limiter.connect(context.destination);
        this.context=context;this.master=master;
      }
      if(this.context.state==='suspended'||this.context.state==='interrupted')await this.context.resume();
      return this.enabled&&this.context.state==='running';
    }catch{return false;}
  }
  tone(freq,duration=.07,type='sine',volume=.035,delay=0,endFreq=null){
    if(!this.enabled||!this.master||this.context.state!=='running'||this.voices.size>=24)return;
    const c=this.context,time=c.currentTime+delay,o=c.createOscillator(),g=c.createGain();
    o.type=type;o.frequency.setValueAtTime(freq,time);if(endFreq)o.frequency.exponentialRampToValueAtTime(endFreq,time+duration);
    g.gain.setValueAtTime(0,time);g.gain.linearRampToValueAtTime(volume*3,time+.005);g.gain.exponentialRampToValueAtTime(.001,time+duration);
    o.connect(g);g.connect(this.master);this.voices.add(o);
    o.onended=()=>{this.voices.delete(o);o.disconnect();g.disconnect();};
    o.start(time);o.stop(time+duration+.01);
  }
  play(name){
    if(!this.enabled)return;
    if(name==='paddle')this.tone(230,.09,'triangle',.055,0,400);
    if(name==='wall')this.tone(280,.045,'triangle',.03);
    if(name==='brick'){const now=this.context?.currentTime??0;if(now-this.lastBrick<.025)return;this.lastBrick=now;this.tone(620,.085,'triangle',.05,0,900);}
    if(name==='power')[500,750,1000].forEach((n,i)=>this.tone(n,.15,'sine',.055,i*.065));
    if(name==='lost')this.tone(240,.25,'triangle',.07,0,75);
    if(name==='complete')[392,494,587,784].forEach((n,i)=>this.tone(n,.22,'triangle',.055,i*.11));
    if(name==='over')[294,247,196,147].forEach((n,i)=>this.tone(n,.25,'triangle',.06,i*.13));
    if(name==='launch')this.tone(350,.12,'sine',.05,0,700);
    if(name==='preview')[660,880].forEach((n,i)=>this.tone(n,.1,'sine',.045,i*.08));
  }
}
