import {Game} from './game.js';
import {ArcadeAudio} from './audio.js';
import {Renderer} from './renderer.js';
import {STAGES,BOOSTS} from './levels.js';
import {Progress} from './progress.js';
import {MISSIONS} from './missions.js';
import {themeForLevel} from './themes.js';
const $=id=>document.getElementById(id), audio=new ArcadeAudio();
let best=0;try{const saved=Number(localStorage.getItem('brickBreaker.best'));best=Number.isFinite(saved)&&saved>0?saved:0;audio.enabled=localStorage.getItem('brickBreaker.sound')!=='off';}catch{}
let storage;try{storage=localStorage;}catch{}
const progress=new Progress(storage,{allLevelsUnlocked:true});
let page='menu',runStartLevel=1,toastTimer=0,toastActive=false,toastQueue=[],uiTimer=0,previousScreen=undefined;
const game=new Game({audio,onEvent:handleEvent}),renderer=new Renderer($('canvas'),game);
function handleEvent(type,data){
  if(type==='levelcomplete'){data.newBest=data.score>progress.record(data.level).best;progress.complete(data.level,data);if(data.level===STAGES.length)try{storage?.setItem('brickBreaker.finished12','yes');}catch{}}
  if(type==='mission')toast('✓ '+data.name);
  if(type==='gatesopen')toast('GATES OPEN');
  if(type==='bossphase')toast('HIT THE GLOWING SECTION');
  if(type==='power')toast(data.name+' '+(BOOSTS[data.type].duration?`· ${BOOSTS[data.type].duration}s`:data.type==='life'?'+1':''));
  if(type==='lost')toast('BALL LOST · '+data.lives+' '+(data.lives===1?'LIFE':'LIVES')+' LEFT');
  updateUI();
}
function toast(text){
  if(toastActive){if(toastQueue.length<4)toastQueue.push(text);return;}
  const notice=$('toast');
  toastActive=true;notice.textContent=text;notice.classList.remove('show');
  // Restart the brief pop for each queued event, even within the same frame.
  void notice.offsetWidth;notice.classList.add('show');
  toastTimer=setTimeout(()=>{notice.classList.remove('show');toastActive=false;if(toastQueue.length)toast(toastQueue.shift());},900);
}
function clearToasts(){clearTimeout(toastTimer);toastQueue=[];toastActive=false;$('toast').classList.remove('show');}
function updateUI(){
  document.body.dataset.page=page;
  if(page!=='game'||!['ready','playing'].includes(game.state))clearPointer();
  if(game.score>best){best=game.score;try{localStorage.setItem('brickBreaker.best',String(best));}catch{}}
  $('menuStars').textContent=Object.values(progress.records).reduce((sum,r)=>sum+r.stars,0)+' / '+(STAGES.length*3)+' STARS';
  const done=MISSIONS.filter(m=>game.missions[m.id].done).length;
  $('missionSummary').textContent=done+' / 3 MISSIONS COMPLETED';
  const missionHTML=MISSIONS.map(m=>{const entry=game.missions[m.id];return `<div class="mission-row${entry.done?' done':''}"><span><b>${entry.done?'✓ ':''}${m.name}</b><small>${m.description}</small></span><strong>${entry.value} / ${m.target}</strong></div>`;}).join('');
  if($('runMissions').innerHTML!==missionHTML)$('runMissions').innerHTML=missionHTML;
  $('score').textContent=String(game.score).padStart(6,'0');$('best').textContent=String(best).padStart(6,'0');$('menuBest').textContent=String(best).padStart(6,'0');
  const displayLevel=game.state==='menu'?1:game.level,stage=STAGES[displayLevel-1];
  const theme=themeForLevel(page==='game'?displayLevel:1);
  document.body.dataset.theme=theme.id;
  $('level').textContent=String(displayLevel).padStart(2,'0');$('lives').textContent=game.lives<=5?'♥ '.repeat(Math.max(0,game.lives)).trim():'♥ ×'+game.lives;$('lives').setAttribute('aria-label',game.lives+' lives');$('combo').textContent='×'+game.combo;
  $('stageLabel').textContent=String(displayLevel).padStart(2,'0')+' — '+themeForLevel(displayLevel).name+' · '+stage.mechanic;
  $('remaining').textContent=game.state==='menu'?'READY TO PLAY':game.remaining+' BRICKS LEFT';
  for(const name of ['menu','levels','about','quit','game'])$(name+'Page').hidden=page!==name;
  $('pause').hidden=page!=='game';
  const screens={paused:'paused',complete:'complete',gameover:'gameover',victory:'gameover'},screen=page==='game'?screens[game.state]:null;
  $('overlay').hidden=!screen;document.querySelectorAll('.screen').forEach(el=>el.classList.toggle('active',el.id===screen));
  const focusKey=page==='game'?screen||'canvas':page;
  if(previousScreen!==focusKey){previousScreen=focusKey;const focusId={menu:'play',levels:'levelGrid',about:'aboutPage',quit:'quitPage',paused:'resume',complete:'next',gameover:'restart'}[focusKey]||'canvas';$(focusId).focus({preventScroll:true});}
  $('pause').disabled=!['ready','playing','paused'].includes(game.state);$('pause').innerHTML=game.state==='paused'?'▶ <span>RESUME</span>':'Ⅱ <span>PAUSE</span>';$('pause').setAttribute('aria-label',game.state==='paused'?'Resume game':'Pause game');
  $('launchHint').hidden=game.state!=='ready';$('launchText').textContent=game.lives<3?'NEW BALL · SPACE OR TAP TO LAUNCH':'SPACE / TAP TO LAUNCH · MISSIONS IN PAUSE';
  if(game.state==='complete'){
    const result=game.result;
    $('levelStars').textContent='★'.repeat(result.stars)+'☆'.repeat(3-result.stars);$('levelStars').setAttribute('aria-label',result.stars+' out of 3 stars');
    $('ratingCopy').textContent=result.losses+' '+(result.losses===1?'life':'lives')+' lost · '+(result.newBest?'NEW LEVEL BEST':'BEST '+progress.record(game.level).best.toLocaleString());
    $('levelScore').textContent=(game.score-game.levelStartScore).toLocaleString();$('completeEyebrow').textContent='STAGE '+String(game.level).padStart(2,'0')+' CLEARED';
    $('completeTitle').innerHTML=STAGES[game.level-1].bossHP?'GUARDIAN<br>DEFEATED<span>!</span>':'LEVEL<br>COMPLETE<span>!</span>';
    $('completeCopy').textContent=game.level===STAGES.length?'All 12 stages cleared. Core Guardian defeated!':'Next: Level '+(game.level+1)+' · '+themeForLevel(game.level+1).name.toLowerCase()+'.';
    $('next').innerHTML=game.level===STAGES.length?'SEE RESULTS <span>→</span>':'NEXT LEVEL <span>→</span>';
    $('countdown').textContent=(game.level===STAGES.length?'Results':'Next stage')+' in '+Math.max(1,Math.ceil(game.completeTimer))+'s';
  }
  const won=game.state==='victory';$('overTitle').innerHTML=won?'YOU<br>WIN<span>!</span>':'GAME<br>OVER<span>.</span>';$('overEyebrow').textContent=won?'THE WHOLE BOARD IS YOURS':game.score>=best&&game.score>0?'NEW PERSONAL BEST':'ONE MORE TRY?';
  $('finalScore').textContent=game.score.toLocaleString();$('finalBest').textContent=best.toLocaleString();
  const effects=Object.entries(game.active).map(([type,time])=>`<span class="effect-chip" style="border-color:${BOOSTS[type].color}55;color:${BOOSTS[type].color}">${BOOSTS[type].symbol} ${BOOSTS[type].name.toUpperCase()} ${Math.ceil(time)}s</span>`).join('');if($('activeEffects').innerHTML!==effects)$('activeEffects').innerHTML=effects;
}
function syncSound(){
  const on=audio.enabled,button=$('sound');
  const mark=on?'<path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>':'<path d="m16 9 6 6m0-6-6 6"/>';
  button.innerHTML=`<svg class="sound-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4 5 9H2v6h3l6 5Z"/>${mark}</svg><span>SOUND ${on?'ON':'OFF'}</span>`;
  button.setAttribute('aria-pressed',String(on));button.setAttribute('aria-label',on?'Mute sound':'Unmute sound');button.setAttribute('title',on?'Mute sound':'Unmute sound');
}
function showPage(name){
  if(name!=='game')game.keys.left=game.keys.right=false;
  page=name;updateUI();
  if(name==='levels')renderLevels();
}
function renderLevels(){
  $('levelGrid').innerHTML=STAGES.map((stage,i)=>{
    const level=i+1,locked=!progress.canPlay(level),theme=themeForLevel(level),completed=progress.record(level).stars>0||level<progress.unlocked||level===STAGES.length&&progressFinished();
    return `<button class="level-card${completed?' completed':''}" data-level="${level}" data-theme="${theme.id}" ${locked?'disabled':''} aria-label="Level ${level}, ${theme.name}, ${locked?'locked':'play'}"><strong>${String(level).padStart(2,'0')} ${locked?'⌑':''}</strong><span>${theme.name} · ${stage.difficulty}</span><span class="card-stars" aria-label="${progress.record(level).stars} out of 3 stars">${locked?'LOCKED':'★'.repeat(progress.record(level).stars)+'☆'.repeat(3-progress.record(level).stars)}</span>${!locked?`<small class="level-best">LEVEL BEST · ${progress.record(level).stars?progress.record(level).best.toLocaleString():'—'}</small>`:''}<small>${locked?'CLEAR LEVEL '+i+' TO UNLOCK':completed?'CLEARED · PLAY AGAIN':stage.mechanic+' · PLAY'}</small></button>`;
  }).join('');
}
function progressFinished(){try{return storage?.getItem('brickBreaker.finished12')==='yes';}catch{return false;}}
function start(level=1){
  if(!progress.canPlay(level))return;
  clearToasts();audio.unlock();page='game';runStartLevel=level;game.start(level);renderer.resize();
}
function backToMenu(){page='menu';game.menu();clearToasts();}
$('play').addEventListener('click',()=>start());$('restart').addEventListener('click',()=>start(runStartLevel));$('resume').addEventListener('click',()=>game.resume());$('next').addEventListener('click',()=>game.next());
$('levels').addEventListener('click',()=>showPage('levels'));
$('about').addEventListener('click',()=>showPage('about'));
$('home').addEventListener('click',()=>{if(page==='game'){if(game.state==='paused')backToMenu();else game.pause();}else backToMenu();});
$('quit').addEventListener('click',()=>{game.menu();showPage('quit');try{window.close();}catch{}});
$('levelGrid').addEventListener('click',e=>{const button=e.target.closest('button[data-level]');if(button&&!button.disabled)start(Number(button.dataset.level));});
document.querySelectorAll('.menu-button').forEach(button=>button.addEventListener('click',backToMenu));
$('boostGuide').innerHTML=Object.values(BOOSTS).map(boost=>`<div><b style="color:${boost.color}">${boost.symbol} ${boost.name}</b><small>${boost.duration?boost.duration+' seconds':boost.name==='Extra life'?'+1 life':'+2 balls'}</small></div>`).join('');
$('pause').addEventListener('click',()=>game.state==='paused'?game.resume():game.pause());
$('sound').addEventListener('click',async()=>{
  audio.enabled=!audio.enabled;syncSound();
  try{localStorage.setItem('brickBreaker.sound',audio.enabled?'on':'off');}catch{}
  if(audio.enabled&&await audio.unlock())audio.play('preview');
});
function action(){audio.unlock();if(page==='menu'){start();return;}if(page!=='game')return;if(game.state==='gameover'||game.state==='victory')start(runStartLevel);else if(game.state==='ready')game.launch();else if(game.state==='complete')game.next();else if(game.state==='paused')game.resume();}
document.addEventListener('keydown',e=>{
  if(e.target instanceof HTMLButtonElement&&(e.code==='Space'||['ArrowLeft','ArrowRight','KeyA','KeyD'].includes(e.code)))return;
  if(page!=='game'){if(e.code==='Escape'){e.preventDefault();backToMenu();}else if(e.code==='Space'&&page==='menu'){e.preventDefault();action();}return;}
  if(['ArrowLeft','ArrowRight','KeyA','KeyD','Space','KeyP','Escape'].includes(e.code))e.preventDefault();
  if(e.code==='ArrowLeft'||e.code==='KeyA')game.keys.left=true;
  if(e.code==='ArrowRight'||e.code==='KeyD')game.keys.right=true;
  if(e.repeat)return;
  if(e.code==='Space')action();
  if(e.code==='KeyP'||e.code==='Escape'){if(game.state==='paused')game.resume();else game.pause();}
});
document.addEventListener('keyup',e=>{if(e.code==='ArrowLeft'||e.code==='KeyA')game.keys.left=false;if(e.code==='ArrowRight'||e.code==='KeyD')game.keys.right=false;});
const canvas=$('canvas'),touchControls=$('touchControls');let pointer=null;
const canMove=()=>page==='game'&&['ready','playing'].includes(game.state);
function clearPointer(){pointer=null;touchControls.classList.remove('dragging');}
function bindPointer(surface,relative=false){
  const owns=e=>pointer?.surface===surface&&pointer.id===e.pointerId;
  surface.addEventListener('pointerdown',e=>{
    if(!canMove()||pointer||(e.pointerType==='mouse'&&e.button!==0))return;
    e.preventDefault();audio.unlock();surface.setPointerCapture(e.pointerId);
    pointer={surface,id:e.pointerId,startX:e.clientX,startY:e.clientY,lastX:e.clientX,maxDistance:0,time:performance.now()};
    if(relative)touchControls.classList.add('dragging');else game.moveTo(renderer.pointerX(e.clientX));
  });
  surface.addEventListener('pointermove',e=>{
    if(!canMove())return;
    if(owns(e)){
      e.preventDefault();pointer.maxDistance=Math.max(pointer.maxDistance,Math.hypot(e.clientX-pointer.startX,e.clientY-pointer.startY));
      game.moveTo(relative?game.paddle.target+renderer.pointerX(e.clientX)-renderer.pointerX(pointer.lastX):renderer.pointerX(e.clientX));
      pointer.lastX=e.clientX;
    }else if(!relative&&!pointer&&e.pointerType==='mouse')game.moveTo(renderer.pointerX(e.clientX));
  });
  surface.addEventListener('pointerup',e=>{
    if(!owns(e))return;
    const tap=Math.max(pointer.maxDistance,Math.hypot(e.clientX-pointer.startX,e.clientY-pointer.startY))<16&&performance.now()-pointer.time<400;
    clearPointer();if(tap&&canMove()&&game.state==='ready')game.launch();
  });
  for(const type of ['pointercancel','lostpointercapture'])surface.addEventListener(type,e=>{if(owns(e))clearPointer();});
}
bindPointer(canvas);bindPointer(touchControls,true);
function suspend(){game.keys.left=game.keys.right=false;clearPointer();game.pause();}
window.addEventListener('blur',suspend);document.addEventListener('visibilitychange',()=>{if(document.hidden)suspend();});
new ResizeObserver(()=>{if(page==='game')renderer.resize();}).observe($('playArea'));
let last=performance.now(),accumulator=0;const STEP=1/120;
function frame(now){const elapsed=Math.min((now-last)/1000,.06);last=now;accumulator+=elapsed;let ticks=0;while(accumulator>=STEP&&ticks++<8){game.update(STEP);accumulator-=STEP;}if(page==='game')renderer.render();uiTimer+=elapsed;if(uiTimer>.15){updateUI();uiTimer=0;}requestAnimationFrame(frame);}
syncSound();updateUI();requestAnimationFrame(frame);
