// A single metre-based world frame for everything rooted beside the railway.
// Perspective supplies parallax; rooted objects never get a separate speed.
import {CHAPTERS,DURATION,clamp} from './route.js';
export const SCENERY_SPAN=1800;
export const wrap=(n,span)=>((n%span)+span)%span;
export function sceneryZ(seed,travel,span=SCENERY_SPAN){return wrap(seed+travel,span)-span*.7;}
// Integral of routeAt's smooth speed blend, including the last chapter's stop.
export function travelAt(time){
  let distance=0;
  for(let i=0;i<CHAPTERS.length;i++){
    const c=CHAPTERS[i],duration=c.end-c.start,t=clamp((Math.min(time,DURATION)-c.start)/duration,0,1);
    const u=clamp((t-.82)/.18,0,1),next=CHAPTERS[Math.min(i+1,CHAPTERS.length-1)];
    distance+=duration*(c.speed*t+(next.speed-c.speed)*.18*(u*u*u-.5*u*u*u*u))/3.6;
  }
  return distance;
}
