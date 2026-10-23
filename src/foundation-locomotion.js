/** Grounded, in-place locomotion. Simulation owns position, heading and speed.
 * Feet are solved in actor space after the torso pose; a bow aim cannot rotate
 * both planted feet with the chest. Ground sampling is optional and visual only.
 */
import * as THREE from 'three';
import {solveTwoBone} from './two-bone-constraint.js';
const TAU=Math.PI*2,STANCE=.6,ANKLE_HEIGHT=.14;
const inverse=new THREE.Matrix4(),hip=new THREE.Vector3(),goal=new THREE.Vector3(),pole=new THREE.Vector3(),orientation=new THREE.Quaternion();
const up=new THREE.Vector3(0,1,0),xAxis=new THREE.Vector3(1,0,0),surfaceNormal=new THREE.Vector3(),footOrientation=new THREE.Quaternion(),footTilt=new THREE.Quaternion(),toeRoll=new THREE.Quaternion();
const left=new THREE.Vector3(),right=new THREE.Vector3();
const clamp=v=>Math.max(0,Math.min(1,v));
const smooth=v=>v*v*(3-2*v);
const positive=v=>((v%1)+1)%1;

export function locomotionFrame(u,info){
 const dt=Math.min(.1,Math.max(0,info.dt||0)),speed=Math.max(0,Math.min(8,info.speed||0));
 const state=u.locomotion||(u.locomotion={speed:0,weight:0,phase:.3,turn:0,side:0,forward:1,heading:u.rig.parent.rotation.y,stage:'idle'});
 const prior=state.speed;
 const side=Math.max(-1,Math.min(1,info.side||0)),forward=(info.backwards?-1:1)*Math.sqrt(1-side*side);
 const blend=info.sample?1:1-Math.exp(-16*dt);
 state.side+=(side-state.side)*blend;state.forward+=(forward-state.forward)*blend;
 if(info.sample){state.speed=speed;state.weight=speed>.01?1:0;state.phase=positive((info.stride||0)/TAU);state.turn=info.turnRate||0;}
 else{
  state.weight+=((speed>.01?1:0)-state.weight)*(1-Math.exp(-14*dt));
  state.speed+=(speed-state.speed)*(1-Math.exp(-14*dt));
  if(speed===0&&state.speed<.001)state.speed=0;
  const length=.60+.36*clamp(state.speed/4.7);
  state.phase=positive(state.phase+speed*dt*STANCE/length);
  const heading=u.rig.parent.rotation.y,delta=Math.atan2(Math.sin(heading-state.heading),Math.cos(heading-state.heading));
  const turn=info.turnRate??(dt?delta/dt:0);
  state.turn+=(Math.max(-4,Math.min(4,turn))-state.turn)*(1-Math.exp(-16*dt));state.heading=heading;
  if(speed<.1)state.phase=positive(state.phase+Math.abs(state.turn)*dt*.3);
 }
 state.stage=speed>.1?(state.speed<speed-.3?'start':state.speed>speed+.3?'decelerate':speed>2.5?'run':'walk'):
  state.speed>.03?'stop':Math.abs(state.turn)>.2?'turn':'idle';
 state.acceleration=dt?(state.speed-prior)/dt:0;
 return state;
}

function footTarget(out,side,phase,motion,info){
 const p=positive(phase),swing=p>=STANCE,q=swing?(p-STANCE)/(1-STANCE):p/STANCE;
 const strength=motion.weight,run=clamp(motion.speed/4.7),length=(.60+.36*run)*strength;
 const travel=swing?length*(.5-smooth(q)):length*(q-.5);
 const sideways=motion.side,forward=motion.forward;
 // A short alternating step allows an explicitly commanded turn; facing itself
 // remains entirely on the simulation root. Stationary civilians stay planted.
 const turnStep=clamp(Math.abs(motion.turn)/2)*(1-strength);
 out.set(side*.19+travel*sideways,ANKLE_HEIGHT+(swing?Math.sin(q*Math.PI)*(.10+.09*run)*strength:0),travel*forward);
 if(turnStep){out.y+=Math.max(0,Math.sin(p*TAU))*.045*turnStep;}
 const ground=info.groundHeightAt?.(out.x,out.z)??0;
 if(Number.isFinite(ground))out.y+=Math.max(-.18,Math.min(.18,ground));
}

/** Estimate a normal in actor coordinates, not world coordinates: groundHeightAt
 * already samples in the actor's horizontal frame. Ignore cliff/step edges,
 * missing samples and grades above 29 degrees rather than snapping an ankle.
 * Lifted toes relax toward level, then realign as they approach foot strike.
 * The simulation's collision normal and root heading remain untouched.
 */
function sampledSoleNormal(out,target,phase,motion,heightAt){
 out.copy(up);
 if(typeof heightAt!=='function')return out;
 const d=.08,x=target.x,z=target.z;
 const hx1=heightAt(x+d,z),hx0=heightAt(x-d,z),hz1=heightAt(x,z+d),hz0=heightAt(x,z-d);
 if(![hx1,hx0,hz1,hz0].every(Number.isFinite))return out;
 const gx=(hx1-hx0)/(2*d),gz=(hz1-hz0)/(2*d);
 if(!Number.isFinite(gx)||!Number.isFinite(gz)||Math.hypot(gx,gz)>.55)return out;
 out.set(-gx,1,-gz).normalize();
 const p=positive(phase);
 if(p>=STANCE){
  const airborne=Math.sin(Math.PI*(p-STANCE)/(1-STANCE))*motion.weight;
  out.lerp(up,clamp(airborne)).normalize();
 }
 return out;
}

export function plantFoundationFeet(u,info,motion){
 if(!u.leftAnkle||!u.rightAnkle)return;
 if(info.dead||info.dodge>0){
  u.leftAnkle.quaternion.identity();u.rightAnkle.quaternion.identity();u.footError=0;return;
 }
 footTarget(left,-1,motion.phase,motion,info);footTarget(right,1,motion.phase+.5,motion,info);
 // Lower the VISUAL pelvis only as far as the most extended leg needs. This
 // protects fixed bone lengths at full stride and compensates torso leaning.
 u.rig.updateMatrix();let lowerBy=0;
 for(const [leg,knee,ankle,target] of [[u.leftLeg,u.leftKnee,u.leftAnkle,left],[u.rightLeg,u.rightKnee,u.rightAnkle,right]]){
  hip.copy(leg.position).applyMatrix4(u.rig.matrix);
  const reach=knee.position.length()+ankle.position.length();
  const horizontal=(hip.x-target.x)**2+(hip.z-target.z)**2;
  const maxY=target.y+Math.sqrt(Math.max(0,reach*reach-horizontal));
  lowerBy=Math.max(lowerBy,hip.y-maxY);
 }
 u.rig.position.y-=Math.min(.24,Math.max(0,lowerBy));u.rig.updateMatrix();inverse.copy(u.rig.matrix).invert();
 orientation.copy(u.rig.quaternion).invert();pole.set(0,0,-1).applyQuaternion(orientation);
 u.footError=0;
 for(const [side,target] of [['left',left],['right',right]]){
  goal.copy(target).applyMatrix4(inverse);
  const phase=motion.phase+(side==='right'?.5:0),p=positive(phase);
  sampledSoleNormal(surfaceNormal,target,phase,motion,info.groundHeightAt);
  footTilt.setFromUnitVectors(up,surfaceNormal);
  // The toe only lifts in the aerial swing. On planted frames the fixed-length
  // IK sets a fully grounded ankle, irrespective of combat or aiming pose.
  const lift=p>=STANCE?Math.sin(Math.PI*(p-STANCE)/(1-STANCE)):0;
  toeRoll.setFromAxisAngle(xAxis,.16*lift*motion.weight);
  footOrientation.copy(orientation).multiply(footTilt).multiply(toeRoll);
  u.footError=Math.max(u.footError,solveTwoBone(u[side+'Leg'],u[side+'Knee'],u[side+'Ankle'],goal,pole,footOrientation));
 }
}
