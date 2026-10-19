import {STAGES} from './levels.js';
const validLevel=level=>Number.isInteger(level)&&level>=1&&level<=STAGES.length;
// Count actual losses: extra-life drops must not hide a missed ball.
export const starsForLosses=losses=>losses===0?3:losses===1?2:1;
export class Progress {
  constructor(storage,{allLevelsUnlocked=false}={}){
    this.storage=storage;this.allLevelsUnlocked=allLevelsUnlocked;this.unlocked=1;this.records={};
    try{const value=Number(storage?.getItem('brickBreaker.unlocked'));if(validLevel(value))this.unlocked=value;}catch{}
    try{
      const saved=JSON.parse(storage?.getItem('brickBreaker.records')||'{}');
      for(let level=1;level<=STAGES.length;level++){
        const r=saved?.[level];
        if(r&&Number.isSafeInteger(r.best)&&r.best>=0&&Number.isInteger(r.stars)&&r.stars>=1&&r.stars<=3)this.records[level]={best:r.best,stars:r.stars};
      }
    }catch{}
  }
  canPlay(level){return validLevel(level)&&(this.allLevelsUnlocked||level<=this.unlocked);}
  record(level){return this.records[level]||{best:0,stars:0};}
  complete(level,result){
    if(!this.canPlay(level))return;
    if(level<=this.unlocked)this.unlocked=Math.max(this.unlocked,Math.min(STAGES.length,level+1));
    if(result&&Number.isSafeInteger(result.score)&&result.score>=0&&Number.isInteger(result.losses)&&result.losses>=0){
      const old=this.record(level);this.records[level]={best:Math.max(old.best,result.score),stars:Math.max(old.stars,starsForLosses(result.losses))};
    }
    try{this.storage?.setItem('brickBreaker.unlocked',String(this.unlocked));this.storage?.setItem('brickBreaker.records',JSON.stringify(this.records));}catch{}
  }
}
