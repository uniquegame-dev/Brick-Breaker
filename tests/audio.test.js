import test from 'node:test';
import assert from 'node:assert/strict';
import {ArcadeAudio} from '../dist/js/audio.js';

class Param {
  constructor(){this.calls=[];}
  setValueAtTime(value,time){this.calls.push(['set',value,time]);}
  linearRampToValueAtTime(value,time){this.calls.push(['linear',value,time]);}
  exponentialRampToValueAtTime(value,time){this.calls.push(['exponential',value,time]);}
}
class Node {
  constructor(){this.gain=new Param();this.frequency=new Param();this.stops=[];}
  connect(to){this.output=to;}
  disconnect(){this.disconnected=true;}
  start(time){this.started=time;}
  stop(time){this.stops.push(time);}
}
class Context {
  constructor(){this.currentTime=0;this.state='running';this.destination={};this.oscillators=[];}
  createGain(){return new Node();}
  createDynamicsCompressor(){const node=new Node();for(const key of ['threshold','knee','ratio','attack','release'])node[key]=new Param();return node;}
  createOscillator(){const node=new Node();this.oscillators.push(node);return node;}
  async resume(){this.resumes=(this.resumes||0)+1;this.state='running';}
}
function fakeWindow(t,value){const previous=globalThis.window;globalThis.window=value;t.after(()=>{globalThis.window=previous;});}

test('sound defaults on and stronger brick effect routes through master and compressor',async t=>{
  fakeWindow(t,{AudioContext:Context});const audio=new ArcadeAudio();assert.equal(audio.enabled,true);assert.equal(await audio.unlock(),true);
  audio.play('brick');const [voice]=audio.context.oscillators;
  assert.ok(voice,'first hit at time zero is audible');assert.equal(voice.type,'triangle');
  assert.ok(voice.output.gain.calls.some(([kind,value])=>kind==='linear'&&Math.abs(value-.15)<1e-8));
  assert.equal(voice.output.output,audio.master);assert.deepEqual(audio.master.gain.calls[0],['set',.8,0]);
  assert.equal(audio.master.output.output,audio.context.destination);assert.equal(audio.master.output.ratio.calls[0][1],12);
  voice.onended();assert.equal(audio.voices.size,0);assert.equal(voice.output.disconnected,true);
});

test('mute immediately silences and cancels current and scheduled notes; unmute previews',async t=>{
  fakeWindow(t,{AudioContext:Context});const audio=new ArcadeAudio();await audio.unlock();audio.play('complete');
  const notes=[...audio.context.oscillators];assert.equal(notes.length,4);assert.ok(notes[3].started>0);
  audio.enabled=false;assert.equal(audio.master.gain.calls.at(-1)[1],0);assert.equal(audio.voices.size,0);
  for(const voice of notes){assert.equal(voice.stops.at(-1),undefined);assert.equal(voice.disconnected,true);}
  audio.play('preview');assert.equal(audio.context.oscillators.length,4);
  audio.enabled=true;assert.equal(await audio.unlock(),true);audio.play('preview');assert.equal(audio.context.oscillators.length,6);assert.equal(audio.master.gain.calls.at(-1)[1],.8);
});

test('muted startup creates no context; suspended and interrupted contexts resume',async t=>{
  fakeWindow(t,{webkitAudioContext:Context});const audio=new ArcadeAudio();audio.enabled=false;assert.equal(await audio.unlock(),false);assert.equal(audio.context,null);
  audio.enabled=true;await audio.unlock();
  for(const state of ['suspended','interrupted']){audio.context.state=state;assert.equal(await audio.unlock(),true);}
  assert.equal(audio.context.resumes,2);
});

test('unsupported or rejected audio does not stop the game',async t=>{
  fakeWindow(t,{});const audio=new ArcadeAudio();assert.equal(await audio.unlock(),false);assert.doesNotThrow(()=>audio.play('launch'));
  globalThis.window={AudioContext:Context};await audio.unlock();audio.context.state='suspended';audio.context.resume=()=>Promise.reject(new Error('blocked'));
  assert.equal(await audio.unlock(),false);assert.doesNotThrow(()=>audio.play('launch'));
});

test('multiball sounds have a voice cap and brick collision throttle',async t=>{
  fakeWindow(t,{AudioContext:Context});const audio=new ArcadeAudio();await audio.unlock();audio.play('brick');audio.play('brick');assert.equal(audio.voices.size,1);
  audio.context.currentTime=.03;audio.play('brick');assert.equal(audio.voices.size,2);
  for(let i=0;i<100;i++)audio.play('wall');assert.equal(audio.voices.size,24);
  for(const voice of [...audio.voices])voice.onended();assert.equal(audio.voices.size,0);
});
