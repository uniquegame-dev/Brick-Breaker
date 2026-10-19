import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../dist/js/game.js';
import {STAGES,makeLevel,W,H} from '../dist/js/levels.js';
import {themeForLevel} from '../dist/js/themes.js';
import {Progress} from '../dist/js/progress.js';
test('12-stage campaign groups four worlds and places only four progressively stronger bosses',()=>{
  assert.equal(STAGES.length,12);
  const bosses=[];
  for(let level=1;level<=12;level++){
    assert.equal(themeForLevel(level).id,['meadow','ocean','snow','space'][Math.floor((level-1)/3)]);
    const bricks=makeLevel(level),boss=bricks.find(b=>b.type==='boss');
    if(boss)bosses.push([level,boss.maxHP]);
    for(const b of bricks){assert.ok(b.x>0&&b.x+b.w<W);assert.ok(b.y+b.h<H/2);}
    assert.ok(STAGES[level-1].speed<=455);
    assert.ok(bricks.filter(b=>b.type==='strong').every(b=>b.hp<=2));
    if(bricks.some(b=>b.type==='steel'))assert.ok(bricks.some(b=>b.type==='switch'));
  }
  assert.deepEqual(bosses,[[3,6],[6,9],[9,9],[12,12]]);
});
test('every boss honors shield and phase health; intermediate bosses advance instead of ending run',()=>{
  for(const level of [3,6,9,12]){
    const g=new Game();g.start(level);g.launch();const boss=g.bricks.find(b=>b.type==='boss');
    for(const b of g.bricks)if(b!==boss&&b.type!=='steel')while(b.alive)g.hitBrick(b);
    assert.equal(g.state,'playing');
    for(let phase=0;phase<3;phase++){
      assert.equal(boss.phase,phase);const hp=boss.hp;
      g.hitBrick(boss,boss.x+((phase+1)%3+.5)*boss.w/3);assert.equal(boss.hp,hp);
      for(let i=0;i<boss.hitsPerPhase;i++)g.hitBrick(boss,boss.x+(phase+.5)*boss.w/3);
    }
    assert.equal(g.state,'complete');g.next();
    assert.equal(g.state,level===12?'victory':'ready');
    assert.equal(g.level,level===12?12:level+1);
  }
});
test('existing records survive campaign expansion and new levels begin without awarded stars',()=>{
  const values=new Map([['brickBreaker.unlocked','5'],['brickBreaker.records',JSON.stringify({1:{best:800,stars:2},5:{best:2000,stars:3}})]]);
  const p=new Progress({getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)},{allLevelsUnlocked:true});
  assert.deepEqual(p.record(5),{best:2000,stars:3});assert.equal(p.unlocked,5);
  for(let n=6;n<=12;n++){assert.equal(p.canPlay(n),true);assert.deepEqual(p.record(n),{best:0,stars:0});}
});
test('all 12 levels render at phone and desktop sizes; four scenery animations advance and honor reduced motion',async()=>{
  const {Renderer}=await import('../dist/js/renderer.js');
  let operations=[];
  const ctx=new Proxy({}, {get(target,key){if(key in target)return target[key];if(key==='createLinearGradient')return()=>({addColorStop(){}});return(...args)=>{for(const arg of args)if(typeof arg==='number')assert.ok(Number.isFinite(arg),String(key)+' uses finite coordinates');operations.push([key,...args]);};},set(target,key,value){target[key]=value;return true;}});
  for(const reduced of [false,true]){
    globalThis.window={devicePixelRatio:2,matchMedia:()=>({matches:reduced})};
    for(const width of [320,720]){
      const g=new Game(),canvas={getContext:()=>ctx,getBoundingClientRect:()=>({width,height:width*800/720,left:0})};
      const r=new Renderer(canvas,g);
      for(let level=1;level<=12;level++){
        g.start(level);operations=[];r.render();assert.ok(operations.some(([name])=>name==='fillText'));g.launch();g.update(.02);r.render();
      }
    }
    for(const level of [1,4,7,10]){
      const g=new Game();g.start(level);const r=new Renderer({getContext:()=>ctx,getBoundingClientRect:()=>({width:320,height:356,left:0})},g);
      g.clock=0;operations=[];r.background();const first=JSON.stringify(operations);
      g.clock=2;operations=[];r.background();assert.equal(JSON.stringify(operations)===first,reduced,'scenery animation respects motion preference');
    }
  }
  delete globalThis.window;
});
