import {themeForLevel} from './themes.js';
export const W = 720, H = 800;
// Four worlds: introduction, practice, then a guardian. Keep speeds moderate.
export const STAGES = [
  {name:'FIRST CONTACT', difficulty:'EASY', mechanic:'CLASSIC', speed:355, rows:4},
  {name:'GENTLE MOTION', difficulty:'EASY+', mechanic:'MOVING ROWS', speed:370, rows:4, moving:true},
  {name:'MEADOW GUARDIAN', difficulty:'EASY BOSS', mechanic:'GUARDIAN BOSS', speed:380, rows:4, bossHP:6},
  {name:'TIDAL GATES', difficulty:'EASY+', mechanic:'SWITCH GATES', speed:385, rows:5, gates:true},
  {name:'DRIFTING REEF', difficulty:'MEDIUM', mechanic:'MOVING GATES', speed:395, rows:5, moving:true, gates:true},
  {name:'OCEAN GUARDIAN', difficulty:'MEDIUM BOSS', mechanic:'GUARDIAN BOSS', speed:405, rows:4, bossHP:9},
  {name:'FROST GARDEN', difficulty:'MEDIUM', mechanic:'ARMORED BRICKS', speed:410, rows:5, armor:2},
  {name:'SNOW DRIFT', difficulty:'MEDIUM', mechanic:'MOVING GATES', speed:420, rows:5, moving:true, gates:true, armor:2},
  {name:'SNOW GUARDIAN', difficulty:'MEDIUM BOSS', mechanic:'GUARDIAN BOSS', speed:430, rows:4, bossHP:9, armor:2},
  {name:'ORBIT ENTRY', difficulty:'MEDIUM', mechanic:'SWITCH GATES', speed:435, rows:5, gates:true, armor:2},
  {name:'STAR CURRENT', difficulty:'MEDIUM+', mechanic:'MOVING GATES', speed:445, rows:6, moving:true, gates:true, armor:2},
  {name:'CORE GUARDIAN', difficulty:'MEDIUM+ BOSS', mechanic:'FINAL GUARDIAN BOSS', speed:455, rows:5, bossHP:12, armor:2}
];
export const COLORS = ['#a38aee','#65cee3','#b6f76a','#ed7aab','#f4ac68'];
export function makeLevel(level) {
  const stage=STAGES[level-1];
  if(!stage)throw new RangeError("Unknown level");
  const theme=themeForLevel(level);
  const bricks=[], cols=9, width=64, height=25, gap=8, left=(W-cols*(width+gap)+gap)/2;
  const rows=stage.rows;
  for(let row=0;row<rows;row++) for(let col=0;col<cols;col++) {
    // Leave small openings and keep every layout in the upper half of the board.
    if(level%3===2 && row===1 && (col===1||col===7))continue;
    if(stage.bossHP && row===1 && (col===0||col===8))continue;
    let type='normal', hp=1;
    if(stage.gates && row===rows-2 && (col===2||col===6)) {type='steel';hp=Infinity;}
    else if((col+row*3)%8===3) type='bonus';
    else if(stage.armor && (row+col)%4===0){type='strong';hp=stage.armor;}
    if(stage.gates&&row===rows-1&&col===4){type='switch';hp=1;}
    const color=type==='steel'?'#707585':type==='bonus'?theme.bonus:theme.bricks[row%theme.bricks.length];
    bricks.push({id:bricks.length,x:left+col*(width+gap),y:90+row*(height+gap),w:width,h:height,type,hp,maxHP:hp,color,alive:true,flash:0,baseX:left+col*(width+gap),motion:stage.moving&&row%2===0&&type!=='steel'&&type!=='switch'?{amplitude:18,direction:row%4===0?1:-1,rate:.8}:null});
  }
  if(stage.bossHP){
    // Keep the guardian above the regular layout, accessible from both side lanes.
    bricks.push({id:bricks.length,x:W/2-126,y:57,w:252,h:24,type:'boss',hp:stage.bossHP,maxHP:stage.bossHP,hitsPerPhase:stage.bossHP/3,color:'#8850b0',alive:true,flash:0,baseX:W/2-126,phase:0,motion:null});
  }
  return bricks;
}
export const BOOSTS = {
  wide:{name:'Wide paddle',symbol:'↔',color:'#b6f76a',duration:18},
  multi:{name:'Multiball',symbol:'•••',color:'#a38aee',duration:0},
  slow:{name:'Slow motion',symbol:'◷',color:'#65cee3',duration:12},
  life:{name:'Extra life',symbol:'♥',color:'#ed7aab',duration:0},
  fire:{name:'Fireball',symbol:'↟',color:'#f4ac68',duration:10},
  double:{name:'Double score',symbol:'×2',color:'#ebd76d',duration:15}
};
