import {W,H,BOOSTS} from './levels.js';
import {clamp} from './physics.js';
import {themeForLevel} from './themes.js';
export class Renderer {
  constructor(canvas,game){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.game=game;this.scale=1;this.ox=0;this.oy=0;this.reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;this.resize();}
  resize(){const r=this.canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2);this.width=r.width;this.height=r.height;this.canvas.width=Math.round(r.width*dpr);this.canvas.height=Math.round(r.height*dpr);this.dpr=dpr;this.scale=Math.min(r.width/W,r.height/H);this.ox=(r.width-W*this.scale)/2;this.oy=(r.height-H*this.scale)/2;}
  get theme(){return themeForLevel(this.game.level);}
  pointerX(clientX){const rect=this.canvas.getBoundingClientRect();return(clientX-rect.left-this.ox)/this.scale;}
  rounded(x,y,w,h,r=5){const c=this.ctx;c.beginPath();c.roundRect(x,y,w,h,r);}
  render(){
    const c=this.ctx,g=this.game;
    c.setTransform(this.dpr,0,0,this.dpr,0,0);c.globalAlpha=1;c.shadowBlur=0;c.fillStyle=this.theme.sky[1];c.fillRect(0,0,this.width,this.height);
    c.translate(this.ox,this.oy);c.scale(this.scale,this.scale);c.save();c.beginPath();c.rect(0,0,W,H);c.clip();
    if(g.effects.shake&&!this.reduced)c.translate(Math.sin(g.clock*91)*g.effects.shake,Math.cos(g.clock*111)*g.effects.shake*.6);
    this.background();
    const isMenu=g.state==='menu';
    for(const b of g.bricks)if(b.alive)this.brick(b,isMenu ? .8 : 1);
    const guardian=g.bricks.find(b=>b.type==='boss'&&b.alive);
    if(guardian){c.font='bold 10px Arial';c.textAlign='center';c.fillStyle=this.theme.ink;c.fillText('CORE GUARDIAN · '+guardian.hp+' / '+guardian.maxHP+' · HIT GLOWING SECTION',W/2,21);}
    this.effects();
    for(const d of g.drops)this.drop(d);
    this.paddle();
    if(g.state==='ready')this.aim();
    for(const b of g.balls)this.ball(b);
    if(isMenu){this.ball({x:530+Math.sin(g.clock*.5)*35,y:580+Math.cos(g.clock*.8)*35,r:6,trail:[]});}
    if(g.effects.glow){c.globalAlpha=g.effects.glow*.14;c.fillStyle='#b6f76a';c.fillRect(0,0,W,H);c.globalAlpha=1;}
    c.restore();
  }
  background(){
    const c=this.ctx,t=this.reduced?0:this.game.clock,theme=this.theme;
    const gradient=c.createLinearGradient(0,0,W,H);theme.sky.forEach((color,i)=>gradient.addColorStop(i/2,color));c.fillStyle=gradient;c.fillRect(0,0,W,H);
    c.save();this.scenery(theme.scene,t);c.restore();
    c.strokeStyle=theme.grid;c.lineWidth=.65;c.globalAlpha=.09;
    for(let x=0;x<=W;x+=40){c.beginPath();c.moveTo(x,0);c.lineTo(x,H);c.stroke();}
    for(let y=0;y<=H;y+=40){c.beginPath();c.moveTo(0,y);c.lineTo(W,y);c.stroke();}c.globalAlpha=1;
    c.strokeStyle=theme.border;c.lineWidth=2;c.beginPath();c.moveTo(1,0);c.lineTo(1,H);c.moveTo(W-1,0);c.lineTo(W-1,H);c.stroke();
    c.font='9px Arial';c.textAlign='center';c.fillStyle=theme.muted;c.fillText(theme.name+' · FIND YOUR ANGLE',W/2,48);
    c.setLineDash([3,7]);c.strokeStyle=theme.border;c.beginPath();c.moveTo(25,H-43);c.lineTo(W-25,H-43);c.stroke();c.setLineDash([]);
  }
  scenery(scene,t){
    const c=this.ctx;
    // Small fixed scenery budgets and low contrast leave moving balls easy to track.
    const circle=(x,y,r,color)=>{c.fillStyle=color;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();};
    const wave=(base,amp,color,phase)=>{c.fillStyle=color;c.beginPath();c.moveTo(0,H);c.lineTo(0,base);for(let x=0;x<=W;x+=16)c.lineTo(x,base+Math.sin(x*.009+phase)*amp);c.lineTo(W,H);c.closePath();c.fill();};
    if(scene==='meadow'){
      c.globalAlpha=.18;wave(660,42,'#a2c387',.4);wave(715,30,'#80b595',2);
      c.globalAlpha=.15;for(let i=0;i<7;i++){const x=(i*137+t*6)%(W+100)-50,y=440+i%3*72;c.fillStyle='#fff';c.beginPath();c.ellipse(x,y,42,12,0,0,Math.PI*2);c.fill();}
      c.globalAlpha=.23;for(let i=0;i<12;i++){const x=30+i*61+Math.sin(t*.6+i)*9,y=520+(i*37)%165+Math.cos(t*.5+i)*8;c.fillStyle=i%2?'#b49b51':'#6caa80';c.beginPath();c.ellipse(x,y,3,6,Math.sin(t*.5+i),0,Math.PI*2);c.fill();}
    }else if(scene==='sunset'){
      c.globalAlpha=.2;circle(545,515,63,'#e9ae63');wave(654,38,'#c594ad',.2);wave(722,24,'#ba8396',2.4);
      c.globalAlpha=.17;for(let i=0;i<9;i++){const x=(i*89+t*8)%(W+80)-40,y=452+i%3*58;c.fillStyle='#fff';c.beginPath();c.ellipse(x,y,48,6,0,0,Math.PI*2);c.fill();}
    }else if(scene==='ocean'){
      c.globalAlpha=.15;wave(590,17,'#69c2c4',t*.32);wave(660,22,'#519ebe',t*.4+2);wave(723,15,'#5fabb6',t*.25+4);
      c.globalAlpha=.24;c.strokeStyle='#669eac';c.lineWidth=1.2;for(let i=0;i<15;i++){const x=28+(i*83)%(W-56)+Math.sin(t*.25+i)*10,y=H-((i*47+t*13)%360);c.beginPath();c.arc(x,y,3+i%3,0,Math.PI*2);c.stroke();}
    }else if(scene==='snow'){
      c.globalAlpha=.2;for(const [x,y,size] of [[-40,685,230],[205,638,240],[455,690,250]]){c.fillStyle='#a1b5d1';c.beginPath();c.moveTo(x,y+100);c.lineTo(x+size/2,y-size*.65);c.lineTo(x+size,y+100);c.closePath();c.fill();c.fillStyle='#fff';c.beginPath();c.moveTo(x+size/2,y-size*.65);c.lineTo(x+size*.35,y-size*.35);c.lineTo(x+size*.64,y-size*.35);c.closePath();c.fill();}
      c.globalAlpha=.38;for(let i=0;i<28;i++){const x=20+(i*103)%(W-40)+Math.sin(t*.4+i)*9,y=400+(i*57+t*15)%340;circle(x,y,1.5+i%2,'#91a7c4');}
    }else{
      c.globalAlpha=.23;circle(566,566,54,'#b3a2d8');c.strokeStyle='#9186bf';c.lineWidth=9;c.beginPath();c.ellipse(566,566,86,20,-.35,0,Math.PI*2);c.stroke();circle(110,674,30,'#b5bfdc');
      for(let i=0;i<30;i++){c.globalAlpha=.12+.12*(1+Math.sin(t*.8+i))/2;circle(25+(i*113)%(W-50),410+(i*71)%300,1+i%2,'#7f6f9f');}
      c.globalAlpha=.2;c.strokeStyle='#947eae';c.lineWidth=1;const x=(t*17)%(W+120)-60;c.beginPath();c.moveTo(x,466);c.lineTo(x-25,451);c.stroke();
    }
    c.globalAlpha=1;
  }
  brick(b,opacity=1){
    if(b.type==='boss'){this.guardian(b);return;}
    const c=this.ctx,damage=b.type==='strong' ? .55+.45*b.hp/b.maxHP : 1;
    c.globalAlpha=opacity*damage;c.fillStyle=b.color;this.rounded(b.x,b.y,b.w,b.h,4);c.fill();
    c.strokeStyle='#3a234b35';c.lineWidth=1; c.stroke();
    c.fillStyle='#ffffff24';this.rounded(b.x+2,b.y+2,b.w-4,3,1);c.fill();
    c.fillStyle='#00000024';c.fillRect(b.x+3,b.y+b.h-5,b.w-6,2);
    c.textAlign='center';c.textBaseline='middle';
    if(b.type==='strong'){
      c.strokeStyle='#ffffff75';c.lineWidth=1;this.rounded(b.x+3,b.y+3,b.w-6,b.h-6,2);c.stroke();
      c.fillStyle='#ffffffad';for(let i=0;i<b.hp;i++)c.fillRect(b.x+b.w/2+(i-(b.hp-1)/2)*7-1.5,b.y+b.h/2-1.5,3,3);
      if(b.hp<b.maxHP){c.strokeStyle='#0b101866';c.beginPath();c.moveTo(b.x+b.w*.67,b.y);c.lineTo(b.x+b.w*.54,b.y+9);c.lineTo(b.x+b.w*.63,b.y+16);c.lineTo(b.x+b.w*.48,b.y+b.h);c.stroke();}
    }
    if(b.motion){c.fillStyle='#223044';c.font='bold 10px Arial';c.fillText('↔',b.x+10,b.y+b.h/2+1);}
    if(b.type==='switch'){c.font='bold 16px Arial';c.fillStyle='#243644';c.fillText('◇',b.x+b.w/2,b.y+b.h/2);}
    if(b.type==='bonus'){c.font='16px Arial';c.fillStyle='#32451c';c.fillText('✧',b.x+b.w/2,b.y+b.h/2+1);}
    if(b.type==='steel'){
      c.strokeStyle='#b3b9cd';c.lineWidth=1;this.rounded(b.x+1,b.y+1,b.w-2,b.h-2,4);c.stroke();c.font='17px Arial';c.fillStyle='#dfe4f5';c.fillText('∞',b.x+b.w/2,b.y+b.h/2);
      c.fillStyle='#343944';c.fillRect(b.x+6,b.y+8,2,9);c.fillRect(b.x+b.w-8,b.y+8,2,9);
    }
    if(b.flash){c.globalAlpha=b.flash*.7;c.fillStyle='#fff';this.rounded(b.x,b.y,b.w,b.h,4);c.fill();}c.globalAlpha=1;c.textBaseline='alphabetic';
  }
  guardian(b){
    const c=this.ctx,segment=b.w/3,phase=b.phase||0,hits=b.hitsPerPhase||3;
    c.save();
    for(let i=0;i<3;i++){
      const active=i===phase,cleared=i<phase,x=b.x+i*segment;
      c.fillStyle=active?'#8850b0':cleared?'#dad1e6':'#848594';
      c.shadowColor='#b471e3';c.shadowBlur=active&&!this.reduced?12:0;
      this.rounded(x+1,b.y,segment-2,b.h,5);c.fill();c.shadowBlur=0;
      c.strokeStyle=active?'#502d74':'#676778';c.lineWidth=active?2:1;c.stroke();
      c.font='bold 9px Arial';c.textAlign='center';c.textBaseline='middle';c.fillStyle=active?'#fff':'#252736';
      c.fillText(active?'HIT HERE':cleared?'CLEARED':'SHIELD',x+segment/2,b.y+b.h/2);
      const health=cleared?0:active?b.hp-(2-phase)*hits:hits;
      for(let j=0;j<hits;j++){c.fillStyle=j<health?'#fcdd75':'#493358';c.fillRect(x+segment/2-(hits-1)*4-2.5+j*8,b.y+b.h+3,5,3);}
    }
    if(b.flash){c.globalAlpha=b.flash*.4;c.fillStyle='#fff';this.rounded(b.x,b.y,b.w,b.h,5);c.fill();}
    c.restore();
  }
  paddle(){
    const c=this.ctx,p=this.game.paddle;
    c.shadowColor=this.game.active.fire?'#e46b22':this.theme.paddle;c.shadowBlur=12;c.fillStyle=this.game.active.fire?'#c45a19':this.theme.paddle;this.rounded(p.x-p.w/2,p.y,p.w,p.h,6);c.fill();c.shadowBlur=0;
    c.fillStyle='#ffffff80';this.rounded(p.x-p.w/2+8,p.y+2,p.w-16,2,1);c.fill();
    c.fillStyle='#4b642966';for(const s of [-1,1])c.fillRect(p.x+s*(p.w/2-10)-1,p.y+4,2,5);
    c.fillStyle=this.theme.muted;c.font='8px Arial';c.textAlign='center';c.fillText('←  MOVE  →',p.x,p.y+35);
  }
  ball(b){const c=this.ctx,fire=this.game.active.fire,color=fire?'#b84916':this.theme.ball;
    if(!this.reduced){for(let i=b.trail.length-1;i>=0;i--){const t=b.trail[i];c.globalAlpha=(1-i/b.trail.length)*.22;c.fillStyle=fire?'#d16d28':this.theme.trail;c.beginPath();c.arc(t.x,t.y,b.r*(1-i/b.trail.length*.65),0,Math.PI*2);c.fill();}}
    c.globalAlpha=1;c.shadowBlur=fire?20:12;c.shadowColor=fire?'#e88332':this.theme.trail;c.fillStyle=color;c.beginPath();c.arc(b.x,b.y,b.r,0,Math.PI*2);c.fill();c.shadowBlur=0;
    c.fillStyle='#fff9f0';c.beginPath();c.arc(b.x-b.r*.2,b.y-b.r*.2,b.r*.3,0,Math.PI*2);c.fill();
  }
  aim(){const c=this.ctx,b=this.game.balls[0];if(!b)return;c.fillStyle=this.theme.ball;for(let i=1;i<11;i++){c.globalAlpha=.6*(1-i/12);c.beginPath();c.arc(b.x+b.vx*i*17,b.y+b.vy*i*17,1.5,0,Math.PI*2);c.fill();}c.globalAlpha=1;}
  drop(d){const c=this.ctx,b=BOOSTS[d.type],s=28;c.save();c.translate(d.x,d.y);c.rotate(Math.sin(this.game.clock*4+d.x)*.07);c.shadowBlur=12;c.shadowColor=b.color;c.fillStyle='#171c27';this.rounded(-s/2,-s/2,s,s,7);c.fill();c.shadowBlur=0;c.strokeStyle=b.color;c.lineWidth=1.5;c.stroke();c.font='bold 15px Arial';c.textAlign='center';c.textBaseline='middle';c.fillStyle=b.color;c.fillText(b.symbol,0,1);c.restore();}
  effects(){
    const c=this.ctx,e=this.game.effects;
    for(const s of e.shards){const progress=1-s.life/.2;c.globalAlpha=s.life/.2*.75;c.fillStyle=s.color;for(const side of [-1,1]){c.save();c.translate(s.x+s.w/2+side*progress*13,s.y+s.h/2+progress*8);c.rotate(side*progress*.25);const size=1+progress*.15;this.rounded(side<0?-s.w/2*size:2, -s.h/2*size,s.w/2*size-2,s.h*size,3);c.fill();c.restore();}}
    for(const p of e.particles){c.globalAlpha=clamp(p.life/p.max,0,1);c.fillStyle=p.color;c.fillRect(p.x-p.r,p.y-p.r,p.r*2,p.r*2);}
    c.font='bold 13px Arial';c.textAlign='center';for(const t of e.texts){c.globalAlpha=Math.min(1,t.life*2);c.fillStyle=this.theme.ink;c.fillText(t.text,t.x,t.y);}c.globalAlpha=1;
  }
}
