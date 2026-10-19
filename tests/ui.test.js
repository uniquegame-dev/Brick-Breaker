import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Renderer} from '../dist/js/renderer.js';

test('main module wires level selection, ratings, missions, next level and menu with a minimal DOM',async()=>{
  // Wiring check only: CSS layout, browser input and audio still need device QA.
  class Element {
    constructor(id=''){this.id=id;this.dataset={};this.handlers={};this.hidden=false;this.disabled=false;this.innerHTML='';this.textContent='';this.attributes={};this.classes=new Set();this.classList={add:c=>this.classes.add(c),remove:c=>this.classes.delete(c),toggle:(c,on)=>on?this.classes.add(c):this.classes.delete(c)};}
    addEventListener(type,fn){(this.handlers[type]??=[]).push(fn);}
    emit(type,event={}){for(const fn of this.handlers[type]||[])fn(event);}
    setAttribute(k,v){this.attributes[k]=v;}
    setPointerCapture(id){this.capturedPointer=id;}
    focus(){}
  }
  globalThis.HTMLButtonElement=class extends Element{};
  const html=readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]),nodes=Object.fromEntries(ids.map(id=>[id,new Element(id)]));
  assert.equal(new Set(ids).size,ids.length,'all HTML ids are unique');
  const menuButtons=Array.from({length:4},()=>new Element());
  const screens=['paused','complete','gameover'].map(id=>nodes[id]);
  globalThis.document={body:{dataset:{}},hidden:false,getElementById:id=>{assert.ok(nodes[id],id+' exists in HTML');return nodes[id];},querySelectorAll:q=>q==='.screen'?screens:q==='.menu-button'?menuButtons:[],addEventListener(){}};
  globalThis.window={devicePixelRatio:1,matchMedia:()=>({matches:false}),addEventListener(){},close(){}};
  globalThis.ResizeObserver=class{observe(){}};
  const values=new Map([['brickBreaker.finished','yes'],['brickBreaker.unlocked','3'],['brickBreaker.records',JSON.stringify({1:{best:1000,stars:2}})]]);
  globalThis.localStorage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};
  nodes.canvas.getContext=()=>({});nodes.canvas.getBoundingClientRect=()=>({width:336,height:336*800/720,left:0});
  let frame;globalThis.requestAnimationFrame=fn=>{frame=fn;};
  let game;const originalRender=Renderer.prototype.render;Renderer.prototype.render=function(){game=this.game;};
  try{
    await import('../dist/js/main.js');
    assert.equal(nodes.menuPage.hidden,false);assert.equal(nodes.gamePage.hidden,true);assert.equal(nodes.menuStars.textContent,'2 / 36 STARS');
    assert.equal(nodes.sound.attributes['aria-pressed'],'true');assert.match(nodes.sound.innerHTML,/sound-icon/);assert.equal(nodes.sound.attributes['aria-label'],'Mute sound');
    nodes.sound.emit('click');assert.equal(nodes.sound.attributes['aria-pressed'],'false');assert.equal(nodes.sound.attributes['aria-label'],'Unmute sound');assert.match(nodes.sound.innerHTML,/m16 9 6 6/);assert.equal(values.get('brickBreaker.sound'),'off');
    nodes.sound.emit('click');assert.equal(nodes.sound.attributes['aria-pressed'],'true');assert.equal(values.get('brickBreaker.sound'),'on');assert.match(nodes.sound.innerHTML,/SOUND ON/);

    nodes.levels.emit('click');assert.equal(nodes.levelsPage.hidden,false);assert.match(nodes.levelGrid.innerHTML,/LEVEL BEST · 1,000/);
    assert.doesNotMatch(nodes.levelGrid.innerHTML,/disabled|LOCKED/);
    assert.match(nodes.levelGrid.innerHTML,/<button class="level-card" data-level="12"/,'old five-stage completion does not mark level 12 cleared');
    for(let level=1;level<=12;level++){
      nodes.levelGrid.emit('click',{target:{closest:()=>({disabled:false,dataset:{level:String(level)}})}});
      frame(performance.now()+20);assert.equal(game.level,level);assert.equal(game.state,'ready');
      if(level%3===0)assert.ok(game.bricks.some(b=>b.type==='boss'));
      nodes.pause.emit('click');menuButtons[0].emit('click');nodes.levels.emit('click');
    }
    nodes.levelGrid.emit('click',{target:{closest:()=>({disabled:false,dataset:{level:'3'}})}});
    frame(performance.now()+20);assert.equal(game.level,3);assert.equal(game.state,'ready');assert.equal(nodes.gamePage.hidden,false);assert.match(nodes.stageLabel.textContent,/GUARDIAN BOSS/);
    nodes.pause.emit('click');assert.equal(game.state,'paused');assert.equal(nodes.paused.classes.has('active'),true);assert.match(nodes.runMissions.innerHTML,/BOOST HUNTER/);
    nodes.resume.emit('click');game.launch();
    for(const b of game.bricks)if(b.type!=='steel')while(b.alive)game.hitBrick(b);
    assert.equal(game.state,'complete');assert.equal(nodes.levelStars.textContent,'★★★');assert.match(nodes.ratingCopy.textContent,/NEW LEVEL BEST/);assert.equal(nodes.complete.classes.has('active'),true);assert.equal(JSON.parse(values.get('brickBreaker.records'))[3].stars,3);
    nodes.next.emit('click');assert.equal(game.level,4);assert.equal(game.missions.flawless.done,true);
    nodes.pause.emit('click');menuButtons[0].emit('click');assert.equal(nodes.menuPage.hidden,false);assert.equal(game.state,'menu');
    nodes.levels.emit('click');assert.match(nodes.levelGrid.innerHTML,/data-level="4"[^>]*aria-label="Level 4, OCEAN, play"/);
    nodes.play.emit('click');assert.equal(game.level,1);assert.equal(game.score,0);assert.equal(game.missions.flawless.done,false);
    // The lower phone control area moves relatively, without obscuring the board.
    const pad=nodes.touchControls,canvas=nodes.canvas;
    const touch=(id,x,y=600)=>({pointerId:id,pointerType:'touch',clientX:x,clientY:y,preventDefault(){}});
    const center=game.paddle.target;
    pad.emit('pointerdown',touch(1,40));assert.equal(game.paddle.target,center,'touchdown does not jump');assert.equal(pad.capturedPointer,1);
    pad.emit('pointermove',touch(1,100));assert.ok(game.paddle.target>center,'right swipe moves right');
    const right=game.paddle.target;
    pad.emit('pointerdown',touch(2,250));pad.emit('pointermove',touch(2,300));pad.emit('pointercancel',touch(2,300));assert.equal(game.paddle.target,right,'second finger cannot steal or cancel drag');
    pad.emit('pointermove',touch(1,-200,1000));assert.ok(game.paddle.target<center,'captured drag can leave area');assert.ok(game.paddle.target>=game.paddle.w/2+10,'paddle stays within board');
    pad.emit('pointermove',touch(1,40));pad.emit('pointerup',touch(1,40));assert.equal(game.state,'ready','out-and-back drag is not a launch tap');
    pad.emit('pointerdown',touch(3,120));pad.emit('pointercancel',touch(3,120));const canceled=game.paddle.target;
    pad.emit('pointermove',touch(3,220));pad.emit('pointerup',touch(3,220));assert.equal(game.paddle.target,canceled);assert.equal(game.state,'ready');
    pad.emit('pointerdown',touch(4,120));pad.emit('lostpointercapture',touch(4,120));pad.emit('pointerup',touch(4,120));assert.equal(game.state,'ready');
    pad.emit('pointerdown',touch(5,120));nodes.pause.emit('click');const pausedTarget=game.paddle.target;
    pad.emit('pointermove',touch(5,220));pad.emit('pointerup',touch(5,220));assert.equal(game.paddle.target,pausedTarget);assert.equal(game.state,'paused');assert.equal(pad.classes.has('dragging'),false);
    nodes.resume.emit('click');pad.emit('pointermove',touch(5,250));assert.equal(game.paddle.target,pausedTarget,'resume ignores stale drag');
    pad.emit('pointerdown',touch(6,150));pad.emit('pointerup',touch(6,150));assert.equal(game.state,'playing','lower area tap launches');
    canvas.emit('pointermove',{pointerType:'mouse',clientX:250});assert.ok(game.paddle.target>center,'desktop mouse still moves');
    canvas.emit('pointerdown',touch(7,100));canvas.emit('pointermove',touch(7,150));canvas.emit('pointerup',touch(7,150));assert.ok(game.paddle.target<center,'board touch still works');
    nodes.pause.emit('click');menuButtons[0].emit('click');
    pad.emit('pointerdown',touch(8,150));pad.emit('pointerup',touch(8,150));assert.equal(game.state,'menu','control area cannot launch from menu');
  }finally{Renderer.prototype.render=originalRender;}
});
