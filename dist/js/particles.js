export class Effects {
  constructor(random=Math.random){this.random=random;this.particles=[];this.texts=[];this.shards=[];this.shake=0;this.glow=0;}
  burst(x,y,color,count=12,force=140){
    for(let i=0;i<count;i++){const angle=this.random()*Math.PI*2,speed=force*(.3+this.random());this.particles.push({x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,color,life:.3+this.random()*.4,max:.7,r:1.2+this.random()*2.4});}
    if(this.particles.length>220)this.particles.splice(0,this.particles.length-220);
  }
  score(x,y,value,color='#d7eac2'){this.texts.push({x,y,text:value,color,life:.8});if(this.texts.length>25)this.texts.shift();}
  shatter(brick){this.shards.push({...brick,life:.2});if(this.shards.length>35)this.shards.shift();}
  celebrate(){for(let i=0;i<8;i++)this.burst(70+this.random()*580,100+this.random()*330,['#b6f76a','#a38aee','#65cee3'][i%3],18,210);}
  update(dt){
    this.shake=Math.max(0,this.shake-dt*18);this.glow=Math.max(0,this.glow-dt*2);
    for(const p of this.particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=180*dt;}
    this.particles=this.particles.filter(p=>p.life>0);
    for(const t of this.texts){t.life-=dt;t.y-=34*dt;}this.texts=this.texts.filter(t=>t.life>0);
    for(const s of this.shards)s.life-=dt;this.shards=this.shards.filter(s=>s.life>0);
  }
  clear(){this.particles=[];this.texts=[];this.shards=[];this.shake=0;this.glow=0;}
}
