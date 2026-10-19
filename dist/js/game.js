import {W,H,STAGES,makeLevel,BOOSTS} from './levels.js';
import {clamp,sweep,safeDirection,paddleBounce} from './physics.js';
import {Effects} from './particles.js';
import {newMissions,MISSIONS} from './missions.js';
import {starsForLosses} from './progress.js';
export class Game {
  constructor({audio={play(){}},onEvent=()=>{},random=Math.random}={}){
    this.audio=audio;this.onEvent=onEvent;this.random=random;this.effects=new Effects(random);this.state='menu';this.score=0;this.lives=3;this.level=1;this.combo=1;this.streak=0;this.clock=0;this.balls=[];this.drops=[];this.active={};this.bricks=makeLevel(1);this.paddle={x:W/2,target:W/2,y:H-64,w:116,h:13};this.keys={left:false,right:false};this.levelStartScore=0;this.completeTimer=0;this.levelLosses=0;this.levelTime=0;this.result=null;this.missions=newMissions();
  }
  emit(type,data={}){this.onEvent(type,data);}
  start(level=1){if(!Number.isInteger(level)||level<1||level>STAGES.length)return;this.score=0;this.lives=3;this.level=level;this.missions=newMissions();this.result=null;this.keys.left=this.keys.right=false;this.effects.clear();this.setupLevel();}
  setupLevel(){this.levelStartScore=this.score;this.levelLosses=0;this.levelTime=0;this.result=null;this.bricks=makeLevel(this.level);this.clearBoosts();this.paddle.x=this.paddle.target=W/2;this.streak=0;this.combo=1;this.waitBall();this.emit('level');}
  clearBoosts(){this.active={};this.drops=[];this.paddle.w=116;}
  waitBall(){this.balls=[this.newBall(this.paddle.x,this.paddle.y-9,.28,-.96)];this.state='ready';this.emit('state');}
  newBall(x,y,vx,vy){const ball={x,y,vx,vy,r:6,trail:[]};safeDirection(ball);return ball;}
  launch(){if(this.state!=='ready')return;this.state='playing';this.audio.play('launch');this.emit('state');}
  pause(){if(this.state==='playing'||this.state==='ready'){this.beforePause=this.state;this.state='paused';this.keys.left=this.keys.right=false;this.emit('state');}}
  resume(){if(this.state==='paused'){this.state=this.beforePause;this.emit('state');}}
  menu(){this.state='menu';this.keys.left=this.keys.right=false;this.clearBoosts();this.balls=[];this.bricks=makeLevel(1);this.paddle.x=this.paddle.target=W/2;this.emit('state');}
  next(){if(this.state!=='complete')return;if(this.level===STAGES.length){this.state='victory';this.emit('state');return;}this.level++;this.setupLevel();}
  moveTo(x){this.paddle.target=clamp(x,this.paddle.w/2+10,W-this.paddle.w/2-10);}
  get remaining(){return this.bricks.filter(b=>b.alive&&b.type!=='steel').length;}
  get speed(){return STAGES[this.level-1].speed*(this.active.slow ? .65 : 1);}
  update(dt){
    dt=Math.min(dt,.04);
    if(this.state==='paused')return;
    this.clock+=dt;this.effects.update(dt);
    for(const b of this.bricks)b.flash=Math.max(0,b.flash-dt*6);
    if(this.state==='complete'){this.completeTimer-=dt;if(this.completeTimer<=0)this.next();return;}
    if(!['ready','playing'].includes(this.state))return;
    if(this.keys.left||this.keys.right)this.moveTo(this.paddle.target+(Number(this.keys.right)-Number(this.keys.left))*640*dt);
    this.paddle.x+=(this.paddle.target-this.paddle.x)*(1-Math.exp(-24*dt));
    this.paddle.x=clamp(this.paddle.x,this.paddle.w/2+10,W-this.paddle.w/2-10);
    if(this.state==='ready'){this.balls[0].x=this.paddle.x;this.balls[0].y=this.paddle.y-9;return;}
    for(const key of Object.keys(this.active)){this.active[key]-=dt;if(this.active[key]<=0){delete this.active[key];if(key==='wide'){this.paddle.w=116;this.moveTo(this.paddle.target);}this.emit('boosts');}}
    // Split long frames to keep paddle collisions and falling drops responsive as well.
    const steps=Math.ceil(dt/(1/120)),slice=dt/steps;
    for(let i=0;i<steps && this.state==='playing';i++){
      this.advanceBricks(slice);
      for(const ball of this.balls){this.advanceBall(ball,slice);if(this.state!=='playing')break;}
      if(this.state!=='playing')break;
      this.balls=this.balls.filter(ball=>ball.y-ball.r<H+12);
      if(!this.balls.length){this.loseLife();break;}
      for(const drop of this.drops){drop.y+=125*slice;const p=this.paddle;if(drop.y+13>=p.y&&drop.y-13<=p.y+p.h&&Math.abs(drop.x-p.x)<=p.w/2+13){drop.collected=true;this.collect(drop.type);}}
      this.drops=this.drops.filter(d=>!d.collected&&d.y<H+25);
    }
  }
  advanceBricks(dt){
    this.levelTime+=dt;
    for(const brick of this.bricks){
      const old=brick.x;
      if(brick.alive&&brick.motion){const m=brick.motion;brick.x=brick.baseX+Math.sin(this.levelTime*m.rate)*m.amplitude*m.direction;}
      brick.motionVX=(brick.x-old)/dt;
    }
  }
  advanceBall(ball,dt){
    ball.trail.unshift({x:ball.x,y:ball.y});if(ball.trail.length>9)ball.trail.pop();
    let remaining=dt, count=0;const ignored=new Set();
    while(remaining>.000001&&count++<14&&this.state==='playing'){
      const dx=ball.vx*this.speed*remaining,dy=ball.vy*this.speed*remaining;
      let nearest={t:1.00001},target=null;
      const test=(hit,item)=>{if(hit&&hit.t>=0&&hit.t<=1&&hit.t<nearest.t){nearest=hit;target=item;}};
      if(dx<0)test({t:(ball.r-ball.x)/dx,nx:1,ny:0},'wall');
      if(dx>0)test({t:(W-ball.r-ball.x)/dx,nx:-1,ny:0},'wall');
      if(dy<0)test({t:(ball.r-ball.y)/dy,nx:0,ny:1},'wall');
      const p=this.paddle;
      // Top face only. Balls below the paddle cannot be rescued by its underside.
      if(dy>0&&ball.y<=p.y-ball.r+.01){const t=(p.y-ball.r-ball.y)/dy,x=ball.x+dx*t;if(x>=p.x-p.w/2-ball.r&&x<=p.x+p.w/2+ball.r)test({t,nx:0,ny:-1},'paddle');}
      // Sweep in each brick's moving frame, using its position at this substep time.
      for(const brick of this.bricks)if(brick.alive&&!ignored.has(brick.id)){
        const motion=brick.motionVX||0,box=motion?{x:brick.x-motion*remaining,y:brick.y,w:brick.w,h:brick.h}:brick;
        test(sweep(ball,dx-motion*remaining,dy,box),brick);
      }
      if(!target){ball.x+=dx;ball.y+=dy;break;}
      ball.x+=dx*nearest.t;ball.y+=dy*nearest.t;remaining*=1-nearest.t;
      if(target==='paddle'){
        paddleBounce(ball,p);ball.y=p.y-ball.r-.1;this.combo=1;this.streak=0;this.effects.burst(ball.x,p.y,'#b6f76a',7,65);this.effects.shake=1.3;this.audio.play('paddle');this.emit('stats');
      }else{
        const passes=typeof target==='object'&&target.type==='normal'&&this.active.fire;
        if(typeof target==='object'){this.hitBrick(target,ball.x);ignored.add(target.id);}
        else this.audio.play('wall');
        if(!passes){if(nearest.nx)ball.vx=-ball.vx;if(nearest.ny)ball.vy=-ball.vy;safeDirection(ball);ball.x+=nearest.nx*.12;ball.y+=nearest.ny*.12;}
        else{ball.x+=ball.vx*.12;ball.y+=ball.vy*.12;}
      }
      ball.x=clamp(ball.x,ball.r,W-ball.r);ball.y=Math.max(ball.r,ball.y);
    }
  }
  mission(id,value){
    const entry=this.missions[id],spec=MISSIONS.find(m=>m.id===id);
    if(!entry||entry.done)return;
    entry.value=Math.min(spec.target,Math.max(entry.value,value));
    if(entry.value>=spec.target){entry.done=true;this.emit('mission',{id,name:spec.name});}
  }
  hitBrick(brick,impactX){
    if(!brick.alive)return;
    brick.flash=1;
    if(brick.type==='steel'){this.effects.burst(brick.x+brick.w/2,brick.y+brick.h/2,'#aeb4c6',3,55);this.audio.play('wall');return;}
    if(brick.type==='boss'){
      const phase=Math.min(2,Math.floor((brick.maxHP-brick.hp)/(brick.hitsPerPhase||3)));
      const section=impactX===undefined?phase:clamp(Math.floor((impactX-brick.x)/(brick.w/3)),0,2);
      if(section!==phase){this.audio.play('wall');return;}
    }
    brick.hp--;this.audio.play('brick');
    if(brick.type==='boss'){
      const nextPhase=Math.min(2,Math.floor((brick.maxHP-brick.hp)/(brick.hitsPerPhase||3)));brick.phase=nextPhase;
      if(brick.hp>0&&brick.hp%(brick.hitsPerPhase||3)===0){this.effects.score(W/2,110,'WEAK SPOT SHIFTED');this.emit('bossphase',{phase:nextPhase});}
    }
    if(brick.hp>0){this.effects.burst(brick.x+brick.w/2,brick.y+brick.h/2,brick.color,4,70);return;}
    brick.alive=false;this.streak++;this.combo=Math.min(4,1+Math.floor(this.streak/3));
    this.mission('combo',this.combo);
    if(brick.type==='switch'){
      for(const gate of this.bricks)if(gate.alive&&gate.type==='steel'){
        gate.alive=false;this.effects.shatter(gate);this.effects.burst(gate.x+gate.w/2,gate.y+gate.h/2,gate.color,8);
      }
      this.emit('gatesopen');
    }
    const base=brick.type==='boss'?1500:brick.type==='switch'?300:brick.type==='strong'?250:brick.type==='bonus'?150:100,points=base*this.combo*(this.active.double?2:1);
    this.score+=points;this.effects.burst(brick.x+brick.w/2,brick.y+brick.h/2,brick.color,12);this.effects.shatter(brick);this.effects.score(brick.x+brick.w/2,brick.y,'+'+points);
    if(brick.type==='bonus'&&this.random()<.8){const types=Object.keys(BOOSTS),type=types[Math.min(types.length-1,Math.floor(this.random()*types.length))];this.drops.push({x:brick.x+brick.w/2,y:brick.y+brick.h/2,type});}
    this.emit('stats');
    if(this.remaining===0){this.state='complete';this.completeTimer=6;this.result={level:this.level,score:this.score-this.levelStartScore,losses:this.levelLosses,stars:starsForLosses(this.levelLosses)};if(this.levelLosses===0)this.mission('flawless',1);this.clearBoosts();this.combo=1;this.streak=0;this.effects.celebrate();this.audio.play('complete');this.emit('levelcomplete',this.result);this.emit('state');}
  }
  collect(type){
    const boost=BOOSTS[type];if(!boost)return;
    if(this.state==='playing')this.mission('collector',this.missions.collector.value+1);
    if(boost.duration)this.active[type]=boost.duration;
    if(type==='wide'){this.paddle.w=174;this.moveTo(this.paddle.target);}
    if(type==='life')this.lives++;
    if(type==='multi'&&this.balls.length){const original=this.balls[0];for(const angle of [-.42,.42]){if(this.balls.length>=6)break;const c=Math.cos(angle),s=Math.sin(angle);this.balls.push(this.newBall(original.x,original.y,original.vx*c-original.vy*s,original.vx*s+original.vy*c));}}
    this.effects.glow=1;this.effects.burst(this.paddle.x,this.paddle.y,boost.color,24,130);this.audio.play('power');this.emit('power',{type,name:boost.name});this.emit('stats');this.emit('boosts');
  }
  loseLife(){
    this.lives--;this.levelLosses++;this.combo=1;this.streak=0;this.clearBoosts();this.effects.shake=2.5;this.audio.play('lost');
    if(this.lives<=0){this.state='gameover';this.audio.play('over');this.emit('state');}else{this.waitBall();this.emit('lost',{lives:this.lives});}this.emit('stats');
  }
}
