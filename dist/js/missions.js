export const MISSIONS = [
  {id:'collector',name:'BOOST HUNTER',description:'Catch 3 power-ups in one run',target:3},
  {id:'combo',name:'CHAIN REACTION',description:'Reach a ×4 combo',target:4},
  {id:'flawless',name:'CLEAN SWEEP',description:'Clear a level without losing a life',target:1}
];
export function newMissions(){return Object.fromEntries(MISSIONS.map(m=>[m.id,{value:0,done:false}]));}
