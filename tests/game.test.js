import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../dist/js/game.js';
import {W,H,makeLevel,STAGES,BOOSTS} from '../dist/js/levels.js';
import {sweep,safeDirection,paddleBounce} from '../dist/js/physics.js';
function create(){return new Game({random:()=>.2});}
function tick(game,seconds){for(let i=0;i<Math.ceil(seconds*120);i++)game.update(1/120);}
function lose(game){game.launch();game.balls.forEach(b=>{b.y=H+25;b.vy=1;});game.update(1/120);}
function clear(game){for(const b of game.bricks)if(b.type!=='steel')while(b.alive)game.hitBrick(b);}
test('all twelve levels increase speed and include the required brick types',()=>{
  let speed=0;const seen=new Set();for(let i=1;i<=STAGES.length;i++){assert.ok(STAGES[i-1].speed>speed);speed=STAGES[i-1].speed;const bricks=makeLevel(i);assert.ok(bricks.length>=30);bricks.forEach(b=>{seen.add(b.type);assert.ok(b.x>0&&b.x+b.w<W&&b.y<H/2);});}assert.deepEqual([...seen].sort(),['bonus','boss','normal','steel','strong','switch']);
});
test('swept collision catches thin bricks even with a 600px movement',()=>{
  const hit=sweep({x:100,y:600,r:6},0,-600,{x:70,y:120,w:64,h:25});assert.ok(hit);assert.equal(hit.ny,1);assert.ok(hit.t>0&&hit.t<1);
  assert.equal(sweep({x:10,y:600,r:6},0,-600,{x:70,y:120,w:64,h:25}),null);
});
test('direction constraints prevent horizontal and vertical loops',()=>{
  for(const [vx,vy] of [[1,0],[0,-1],[.0001,.9],[-1,.01]]){const b={vx,vy};safeDirection(b);assert.ok(Math.abs(b.vx)>=.119);assert.ok(Math.abs(b.vy)>=.319);assert.ok(Math.abs(Math.hypot(b.vx,b.vy)-1)<1e-9);}
});
test('paddle impact changes angle according to hit position',()=>{
  const p={x:360,w:116},left={x:310,vx:0,vy:1},center={x:360,vx:0,vy:1},right={x:410,vx:0,vy:1};[left,center,right].forEach(b=>paddleBounce(b,p));assert.ok(left.vx<0&&right.vx>0);assert.ok(Math.abs(center.vx)<Math.abs(right.vx));assert.ok([left,center,right].every(b=>b.vy<0));
});
test('full flow: menu, ready, launch, lose life, boosts, complete, next, game over, restart',()=>{
  const g=create();assert.equal(g.state,'menu');g.start();assert.equal(g.state,'ready');assert.equal(g.lives,3);g.launch();assert.equal(g.state,'playing');lose(g);assert.equal(g.lives,2);assert.equal(g.state,'ready');g.launch();g.collect('multi');assert.equal(g.balls.length,3);g.collect('wide');assert.equal(g.paddle.w,174);clear(g);assert.equal(g.state,'complete');const score=g.score;g.next();assert.equal(g.level,2);assert.equal(g.state,'ready');assert.equal(g.score,score);assert.equal(g.paddle.w,116);lose(g);lose(g);assert.equal(g.state,'gameover');assert.equal(g.lives,0);g.start();assert.equal(g.level,1);assert.equal(g.score,0);assert.equal(g.lives,3);assert.equal(g.balls.length,1);assert.deepEqual(g.active,{});
});
test('steel bricks do not block completion and all stages reach victory',()=>{
  const g=create();g.start();for(let level=1;level<=STAGES.length;level++){assert.equal(g.level,level);g.launch();clear(g);assert.equal(g.state,'complete');assert.equal(g.remaining,0);if(STAGES[level-1].gates)assert.ok(g.bricks.some(b=>b.type==='steel'&&!b.alive));tick(g,6.1);assert.equal(g.state,level===STAGES.length?'victory':'ready');}g.menu();assert.equal(g.state,'menu');g.start();assert.equal(g.state,'ready');
});
test('a live multiball prevents life loss; losing the last ball costs exactly one life',()=>{
  const g=create();g.start();g.launch();g.collect('multi');g.balls[0].y=H+25;g.update(1/120);assert.equal(g.lives,3);assert.equal(g.balls.length,2);lose(g);assert.equal(g.lives,2);assert.equal(g.state,'ready');g.update(1/120);assert.equal(g.lives,2);
});
test('pause freezes balls, particles and boost timers, then resumes the correct state',()=>{
  const g=create();g.start();g.pause();g.resume();assert.equal(g.state,'ready');g.launch();g.collect('slow');const time=g.active.slow,pos=g.balls[0].y;g.pause();tick(g,2);assert.equal(g.balls[0].y,pos);assert.equal(g.active.slow,time);g.resume();assert.equal(g.state,'playing');g.update(.02);assert.ok(g.active.slow<time);assert.notEqual(g.balls[0].y,pos);
});
test('all boost mechanics, refresh, expiry and ball cap',()=>{
  const g=create();g.start();g.launch();g.collect('life');assert.equal(g.lives,4);g.collect('wide');assert.equal(g.paddle.w,174);g.active.wide=1;g.collect('wide');assert.equal(g.active.wide,18);g.collect('slow');assert.equal(g.speed,STAGES[0].speed*.65);g.collect('fire');g.collect('double');for(const key of ['wide','slow','fire','double']){assert.equal(g.active[key],BOOSTS[key].duration);g.active[key]=.001;}g.update(.01);assert.equal(g.paddle.w,116);assert.equal(g.speed,STAGES[0].speed);assert.deepEqual(g.active,{});g.collect('multi');g.collect('multi');g.collect('multi');assert.equal(g.balls.length,6);lose(g);assert.deepEqual(g.active,{});
});
test('falling boosts are collected by actual paddle overlap',()=>{
  const g=create();g.start();g.launch();g.drops=[{x:g.paddle.x,y:g.paddle.y-14,type:'life'}];g.update(.02);assert.equal(g.lives,4);assert.equal(g.drops.length,0);
});
test('paddle collisions reset combo, reflect upward and preserve speed',()=>{
  const g=create();g.start();g.launch();g.combo=4;g.streak=12;const b=g.balls[0];b.x=g.paddle.x+40;b.y=g.paddle.y-b.r-1;b.vx=.2;b.vy=.98;g.update(.02);assert.ok(b.vy<0);assert.ok(b.vx>.4);assert.equal(g.combo,1);assert.equal(g.streak,0);assert.ok(b.y<g.paddle.y-b.r);
});
test('a ball below the paddle cannot bounce from the underside',()=>{
  const g=create();g.start();g.launch();const b=g.balls[0];b.x=g.paddle.x;b.y=g.paddle.y+20;b.vy=1;b.vx=.12;g.update(.02);assert.ok(b.vy>0);
});
test('fast movement hits and destroys a brick through actual simulation',()=>{
  const g=create();g.start();g.launch();g.bricks=[{id:0,x:300,y:300,w:64,h:25,type:'normal',hp:1,maxHP:1,color:'#aaa',alive:true,flash:0},{id:1,x:100,y:100,w:64,h:25,type:'normal',hp:1,maxHP:1,color:'#aaa',alive:true,flash:0}];const b=g.balls[0];b.x=320;b.y=335;b.vx=.12;b.vy=-.993;g.update(.04);assert.equal(g.bricks[0].alive,false);assert.ok(b.vy>0);assert.equal(g.score,100);
});
test('fire penetrates normal bricks but bounces from armored and steel',()=>{
  for(const type of ['normal','strong','steel']){
    const g=create();g.start();g.launch();g.collect('fire');g.bricks=[{id:0,x:300,y:300,w:64,h:25,type,hp:type==='steel'?Infinity:type==='strong'?3:1,maxHP:3,color:'#aaa',alive:true,flash:0},{id:1,x:100,y:100,w:64,h:25,type:'normal',hp:1,color:'#aaa',alive:true,flash:0}];const b=g.balls[0];b.x=320;b.y=335;b.vx=.12;b.vy=-.993;g.update(.04);assert.equal(b.vy<0,type==='normal');if(type==='strong')assert.equal(g.bricks[0].hp,2);if(type==='steel')assert.equal(g.bricks[0].hp,Infinity);
  }
});
test('combos increase on destruction, armor needs all hits, score boost doubles',()=>{
  const g=create();g.start();g.launch();const normal=g.bricks.filter(b=>b.type==='normal');normal.slice(0,9).forEach(b=>g.hitBrick(b));assert.equal(g.combo,4);g.loseLife();assert.equal(g.combo,1);g.setupLevel();g.level=7;g.bricks=makeLevel(7);g.launch();const armor=g.bricks.find(b=>b.type==='strong');g.hitBrick(armor);assert.equal(armor.hp,1);assert.equal(armor.alive,true);assert.equal(g.score,g.levelStartScore);g.collect('double');g.hitBrick(armor);assert.equal(armor.alive,false);assert.equal(g.score-g.levelStartScore,500);
});
test('bonus drops are bounded and expired drops leave the board',()=>{
  const g=create();g.start();g.launch();g.hitBrick(g.bricks.find(b=>b.type==='bonus'));assert.equal(g.drops.length,1);assert.ok(BOOSTS[g.drops[0].type]);g.drops[0].y=H+30;g.update(.01);assert.equal(g.drops.length,0);
});
test('large frame delays are capped and effects remain bounded',()=>{
  const g=create();g.start();g.launch();const y=g.balls[0].y;g.update(10);assert.ok(Math.abs(g.balls[0].y-y)<20);for(let i=0;i<100;i++)g.effects.burst(100,100,'#fff',20);assert.ok(g.effects.particles.length<=220);g.effects.update(2);assert.equal(g.effects.particles.length,0);
});
test('sustained autopaddle simulation stays finite across collisions and boosts',()=>{
  const g=create();g.start();g.launch();for(let i=0;i<120*90;i++){
    if(g.state==='playing'){const lowest=g.balls.reduce((a,b)=>a.y>b.y?a:b);g.moveTo(lowest.x+lowest.vx*20);if(i===150)g.collect('multi');if(i===800)g.collect('fire');if(i===1200)g.collect('slow');}
    if(g.state==='ready')g.launch();if(g.state==='complete')g.next();g.update(1/120);
    for(const b of g.balls){assert.ok(Number.isFinite(b.x)&&Number.isFinite(b.y));assert.ok(b.x>=b.r-.1&&b.x<=W-b.r+.1);}
    if(g.state==='gameover'||g.state==='victory')break;
  }assert.ok(g.score>0);
});
