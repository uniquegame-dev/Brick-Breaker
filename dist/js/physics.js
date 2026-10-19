export const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
// Swept point against an expanded box: checks the entire movement, not just its endpoint.
export function sweep(ball, dx, dy, box) {
  const minX=box.x-ball.r,maxX=box.x+box.w+ball.r,minY=box.y-ball.r,maxY=box.y+box.h+ball.r;
  if(dx===0&&(ball.x<minX||ball.x>maxX)) return null;
  if(dy===0&&(ball.y<minY||ball.y>maxY)) return null;
  const tx1=dx?(minX-ball.x)/dx:-Infinity, tx2=dx?(maxX-ball.x)/dx:Infinity;
  const ty1=dy?(minY-ball.y)/dy:-Infinity, ty2=dy?(maxY-ball.y)/dy:Infinity;
  const nearX=Math.min(tx1,tx2), nearY=Math.min(ty1,ty2), enter=Math.max(nearX,nearY), leave=Math.min(Math.max(tx1,tx2),Math.max(ty1,ty2));
  if(enter>leave||leave<0||enter<-.00001||enter>1) return null;
  return {t:Math.max(0,enter),nx:nearX>nearY?(dx>0?-1:1):0,ny:nearY>=nearX?(dy>0?-1:1):0};
}
export function safeDirection(ball) {
  let len=Math.hypot(ball.vx,ball.vy)||1;
  ball.vx/=len;ball.vy/=len;
  // Keep a useful vertical component and enough sideways drift to avoid a vertical loop.
  if(Math.abs(ball.vy)<.32){ball.vy=Math.sign(ball.vy||-1)*.32;ball.vx=Math.sign(ball.vx||1)*Math.sqrt(1-.32**2);}
  if(Math.abs(ball.vx)<.12){ball.vx=Math.sign(ball.vx||1)*.12;ball.vy=Math.sign(ball.vy||-1)*Math.sqrt(1-.12**2);}
}
export function paddleBounce(ball,paddle) {
  const offset=clamp((ball.x-paddle.x)/(paddle.w/2),-1,1), angle=offset*1.08;
  ball.vx=Math.sin(angle);ball.vy=-Math.cos(angle);safeDirection(ball);
}
