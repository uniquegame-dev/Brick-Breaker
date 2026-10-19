import test from 'node:test';
import assert from 'node:assert/strict';
import {Progress} from '../dist/js/progress.js';
import {Game} from '../dist/js/game.js';
const memory=()=>{const values=new Map();return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};};
test('testing access opens all stages without awarding records or clearing skipped levels',()=>{
  for(const storage of [memory(),{getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}}]){
    const progress=new Progress(storage,{allLevelsUnlocked:true});
    for(let level=1;level<=12;level++){assert.equal(progress.canPlay(level),true);assert.equal(progress.record(level).stars,0);}
    for(const invalid of [0,13,2.5,'5',NaN])assert.equal(progress.canPlay(invalid),false);
    progress.complete(5,{score:1500,losses:0});assert.equal(progress.record(5).stars,3);assert.equal(progress.unlocked,1);
    for(let level=1;level<=4;level++)assert.equal(progress.record(level).stars,0);
  }
});
test('only level one is initially playable and completion persists sequential unlocks',()=>{
  const storage=memory(),progress=new Progress(storage);assert.equal(progress.unlocked,1);assert.equal(progress.canPlay(2),false);progress.complete(4);assert.equal(progress.unlocked,1);
  for(let level=1;level<=12;level++){assert.equal(progress.canPlay(level),true);progress.complete(level);assert.equal(new Progress(storage).unlocked,Math.min(12,level+1));}progress.complete(1);assert.equal(progress.unlocked,12);assert.equal(progress.canPlay(13),false);
});
test('invalid or inaccessible saved progress cannot unlock stages or prevent play',()=>{
  for(const value of ['garbage','0','13','Infinity','2.5']){const p=new Progress({getItem:()=>value});assert.equal(p.unlocked,1);}
  const p=new Progress({getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}});p.complete(1);assert.equal(p.unlocked,2);assert.equal(p.canPlay('2'),false);
});
test('the completion event saves the next unlock before automatic transition',()=>{
  const progress=new Progress(memory());const g=new Game({onEvent:(type,data)=>{if(type==='levelcomplete')progress.complete(data.level);}});g.start();g.launch();
  for(const b of g.bricks)while(b.alive)g.hitBrick(b);
  assert.equal(g.state,'complete');assert.equal(progress.unlocked,2);g.next();assert.equal(g.level,2);assert.equal(g.state,'ready');
});
test('selecting an unlocked stage starts a fresh run there and rejects invalid stages',()=>{
  const g=new Game();g.start(3);assert.equal(g.level,3);assert.equal(g.lives,3);assert.equal(g.score,0);assert.equal(g.state,'ready');assert.ok(g.bricks.some(b=>b.type==='boss'));
  g.start(13);assert.equal(g.level,3);g.start(0);assert.equal(g.level,3);g.score=3000;g.lives=1;g.collect('wide');g.start(3);assert.equal(g.score,0);assert.equal(g.lives,3);assert.deepEqual(g.active,{});
});
