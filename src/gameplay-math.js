import { combatAim } from './combat-feel.js';

// Touch assists yaw within a small cone. Desktop keeps the player's yaw but
// adjusts elevation for a closely aligned target because there is no pitch aim.
export function projectileAim(origin,heading,enemies,reach,touch,heightAt){
 const target=combatAim(origin,heading,enemies.filter(e=>!e.retreating),reach,touch?.24:.06);
 let {x,z}=heading;
 if(!target)return {x,y:0,z};
 const distance=Math.hypot(target.x-origin.x,target.z-origin.z);
 if(touch){x=(target.x-origin.x)/distance;z=(target.z-origin.z)/distance;}
 const y=(heightAt(target.x,target.z)+(target.type==='mossling'?.75:1.25)-origin.y-1.3)/distance;
 return {x,y,z};
}
export function segmentHit(a,b,c,r){const dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z,l=dx*dx+dy*dy+dz*dz;const t=l?Math.max(0,Math.min(1,((c.x-a.x)*dx+(c.y-a.y)*dy+(c.z-a.z)*dz)/l)):0;return Math.hypot(a.x+dx*t-c.x,a.y+dy*t-c.y,a.z+dz*t-c.z)<=r?t:null;}
export function attackPose(t,attack){if(!attack)return {phase:'idle',amount:0};const windup=attack.impactAt-attack.start;if(t<attack.impactAt)return {phase:'windup',amount:Math.max(0,(t-attack.start)/windup)};const p=(t-attack.impactAt)/Math.max(.12,attack.interval-windup);return {phase:p<1?'release':'idle',amount:Math.max(0,1-p)};}
export function dodgeDirection(input,yaw){const len=Math.hypot(input.x,input.z);if(len<.15)return {x:Math.sin(yaw),z:-Math.cos(yaw)};return {x:(input.x*Math.cos(yaw)-input.z*Math.sin(yaw))/len,z:(input.x*Math.sin(yaw)+input.z*Math.cos(yaw))/len};}
export function weaponComparison(a,b){const signed=v=>(v>0?'+':'')+Number(v.toFixed(2));return `${signed(a.basic-b.basic)} damage · ${signed(a.interval-b.interval)}s cycle · ${signed(a.reach-b.reach)} reach`;}
