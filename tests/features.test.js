import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../dist/js/game.js';
import {Progress} from '../dist/js/progress.js';
import {H,W} from '../dist/js/levels.js';
const memory=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};};
function clear(g){for(const b of g.bricks)if(b.type!=='steel')while(b.alive)g.hitBrick(b);}
function loss(g){g.launch();g.balls.forEach(b=>{b.y=H+25;b.vy=1;});g.update(1/120);}
function game(level=1){const g=new Game({random:()=>.2});g.start(level);g.launch();return g;}
test('level rating uses lost lives, not lives remaining after extra-life boosts',()=>{
  for(const losses of [0,1,2,3]){
    const g=game();for(let i=0;i<losses;i++){g.collect('life');loss(g);g.launch();}
    clear(g);assert.equal(g.result.losses,losses);assert.equal(g.result.stars,Math.max(1,3-losses));assert.equal(g.lives,3);assert.equal(g.result.score,g.score);
  }
});
test('level scores and stars retain independent personal bests after reload',()=>{
  const storage=memory(),p=new Progress(storage);p.complete(1,{score:900,losses:0});p.complete(1,{score:1400,losses:2});p.complete(1,{score:200,losses:1});
  const restored=new Progress(storage);assert.deepEqual(restored.record(1),{best:1400,stars:3});assert.equal(restored.canPlay(2),true);assert.deepEqual(restored.record(2),{best:0,stars:0});
});
test('bad records and unavailable storage do not break play or overwrite valid data',()=>{
  const storage=memory();storage.setItem('brickBreaker.records',JSON.stringify({1:{best:100,stars:3},2:{best:-1,stars:3},3:{best:2,stars:8}}));const p=new Progress(storage);
  assert.equal(p.record(1).best,100);assert.equal(p.record(2).stars,0);p.complete(1,{score:NaN,losses:0});assert.equal(p.record(1).best,100);
  for(const value of ['null','[]','invalid'])assert.doesNotThrow(()=>new Progress({getItem:()=>value}));
  const blocked=new Progress({getItem(){throw Error();},setItem(){throw Error();}});blocked.complete(1,{score:600,losses:0});assert.equal(blocked.record(1).stars,3);
});
test('replayed stage stores its own score and resets level losses on next stage',()=>{
  const p=new Progress(memory());p.complete(1);p.complete(2);const g=new Game({onEvent:(t,d)=>{if(t==='levelcomplete')p.complete(d.level,d);}});g.start(2);g.launch();loss(g);g.launch();clear(g);assert.equal(g.result.stars,2);const previousScore=g.score;g.next();g.launch();clear(g);assert.equal(p.record(3).best,g.score-previousScore);assert.equal(g.result.losses,0);assert.equal(g.result.stars,3);
});
test('moving rows stay inside the board and freeze in ready and pause states',()=>{
  const g=new Game();g.start(2);const b=g.bricks.find(b=>b.motion),x=b.x;g.update(.04);assert.equal(b.x,x);g.launch();g.update(.04);assert.notEqual(b.x,x);g.pause();const pausedX=b.x,time=g.levelTime;g.update(.04);assert.equal(b.x,pausedX);assert.equal(g.levelTime,time);
  g.resume();for(let i=0;i<1200;i++){g.advanceBricks(1/120);for(const b of g.bricks){assert.ok(b.x>=10&&b.x+b.w<=W-10);}}
});
test('moving brick swept collision damages one brick and reflects the ball',()=>{
  const g=game(2),moving=g.bricks.find(b=>b.motion&&b.type==='normal');const ball=g.balls[0];ball.x=moving.x+moving.w/2;ball.y=moving.y+moving.h+ball.r+1;ball.vx=.12;ball.vy=-.993;g.update(.02);assert.equal(moving.alive,false);assert.ok(ball.vy>0);assert.ok(g.score>0);
});
test('switch gates are invulnerable until the switch is destroyed, once only',()=>{
  const events=[],g=new Game({onEvent:(t,d)=>events.push([t,d])});g.start(4);g.launch();const gate=g.bricks.find(b=>b.type==='steel'),toggle=g.bricks.find(b=>b.type==='switch');g.hitBrick(gate);assert.equal(gate.hp,Infinity);assert.equal(gate.alive,true);g.hitBrick(toggle);assert.equal(g.bricks.some(b=>b.alive&&b.type==='steel'),false);const score=g.score;g.hitBrick(toggle);assert.equal(g.score,score);assert.equal(events.filter(([t])=>t==='gatesopen').length,1);assert.equal(g.state,'playing');
});
test('boss shields reject wrong segments and weak spot shifts through all three phases',()=>{
  const g=game(6),boss=g.bricks.find(b=>b.type==='boss');
  for(let phase=0;phase<3;phase++){
    assert.equal(boss.phase,phase);const hp=boss.hp;g.hitBrick(boss,boss.x+((phase+1)%3+.5)*boss.w/3);assert.equal(boss.hp,hp);
    for(let hit=0;hit<3;hit++)g.hitBrick(boss,boss.x+(phase+.5)*boss.w/3);
  }
  assert.equal(boss.hp,0);assert.equal(boss.alive,false);assert.ok(g.score>=1500);assert.equal(g.state,'playing');
});
test('boss cannot be skipped by clearing regular bricks; fireball obeys shields',()=>{
  const g=game(12);for(const b of g.bricks)if(!['boss','steel'].includes(b.type))while(b.alive)g.hitBrick(b);assert.equal(g.state,'playing');assert.equal(g.remaining,1);g.collect('fire');
  const boss=g.bricks.find(b=>b.type==='boss'),ball=g.balls[0];ball.x=boss.x+boss.w*.5;ball.y=boss.y+boss.h+ball.r+1;ball.vx=.12;ball.vy=-.993;g.update(.02);assert.equal(boss.hp,12);assert.ok(ball.vy>0);while(boss.alive)g.hitBrick(boss);assert.equal(g.state,'complete');g.next();assert.equal(g.state,'victory');
});
test('run missions complete once, carry across stages, and reset on restart',()=>{
  const events=[],g=new Game({onEvent:(t,d)=>{if(t==='mission')events.push(d.id);},random:()=>.2});g.start();g.launch();g.collect('life');g.collect('slow');assert.equal(g.missions.collector.value,2);g.collect('multi');g.collect('life');assert.equal(g.missions.collector.done,true);assert.equal(events.filter(id=>id==='collector').length,1);clear(g);assert.equal(g.missions.flawless.done,true);assert.equal(g.missions.combo.done,true);g.next();assert.equal(g.missions.collector.done,true);g.start(2);assert.deepEqual(Object.values(g.missions).map(m=>m.done),[false,false,false]);
});
test('a lost life blocks flawless mission even if an extra life restores the count',()=>{
  const g=game();g.collect('life');loss(g);g.launch();clear(g);assert.equal(g.missions.flawless.done,false);g.next();g.launch();clear(g);assert.equal(g.missions.flawless.done,true);
});
