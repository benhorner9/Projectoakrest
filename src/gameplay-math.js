import {segmentSphere} from './combat-physics.js';
export const segmentHit=segmentSphere;
export function attackPose(t,attack){if(!attack)return {phase:'idle',amount:0};const windup=attack.impactAt-attack.start;if(t<attack.impactAt)return {phase:'windup',amount:Math.max(0,(t-attack.start)/windup)};const p=(t-attack.impactAt)/Math.max(.12,attack.interval-windup);return {phase:p<1?'release':'idle',amount:Math.max(0,1-p)};}
export function dodgeDirection(input,yaw){const len=Math.hypot(input.x,input.z);if(len<.15)return {x:Math.sin(yaw),z:-Math.cos(yaw)};return {x:(input.x*Math.cos(yaw)-input.z*Math.sin(yaw))/len,z:(input.x*Math.sin(yaw)+input.z*Math.cos(yaw))/len};}
export function weaponComparison(a,b){const signed=v=>(v>0?'+':'')+Number(v.toFixed(2));return `${signed(a.basic-b.basic)} damage · ${signed(a.interval-b.interval)}s cycle · ${signed(a.reach-b.reach)} reach`;}
