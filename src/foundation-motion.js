/** Canonical visual driver, trialled in the reference scene before live migration.
 * Inputs observe authoritative movement/action timestamps; no root motion.
 * Unlike imported additive deltas, this writes a complete, bounded pose each frame.
 */
import {damp} from './motion.js';
import {abilityMotion} from './animation-language.js';
import {constrainWeaponHands} from './weapon-handling.js';
import {locomotionFrame,plantFoundationFeet} from './foundation-locomotion.js';
import {visualActionClock} from './visual-action-clock.js';
const clamp=v=>Math.min(1,Math.max(0,v));
const smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
export function foundationState({t=0,attack=null,dead=false,hit=false,dodge=0,chopping=null,speed=0,combat=false}){
 if(dead)return 'death';if(hit)return 'hit';if(dodge>0)return 'dodge';
 if(chopping)return 'work';
 if(attack&&t>=attack.start&&t<attack.start+attack.interval)return t<attack.impactAt?'anticipation':'recovery';
 if(speed>.1)return speed>2.5?'run':'walk';return combat?'ready':'idle';
}
export function animateFoundation(u,info){
 const {dt=0,t=0,stride=0,speed=0,attack=null,combat=false,dead=false,hit=false,dodge=0,chopping=null,backwards=false,side=0}=info;
 const state=foundationState(info),family=u.family,active=state==='anticipation'||state==='recovery';
 const clock=visualActionClock(t,active?attack:null),wind=clock.wind,recovery=clock.recovery,release=clock.contact;
 const cue=abilityMotion(family,active?attack.abilityKind:null,wind,release,attack?.combo);
 const motion=locomotionFrame(u,info),strength=clamp(motion.speed/4.7),s=Math.sin(motion.phase*Math.PI*2)*(backwards?-1:1),alert=combat||active;
 u.animationState=state;
 const snap=info.sample||!u.foundationPosed;
 const rotation=(node,x,y,z)=>{if(snap)node.rotation.set(x,y,z);else node.rotation.set(damp(node.rotation.x,x,18,dt),damp(node.rotation.y,y,18,dt),damp(node.rotation.z,z,18,dt));};
 rotation(u.rig,dodge*.45+cue.lean*.3,0,dead?-1.5:hit?.08:-side*.04-motion.turn*.012);
 rotation(u.upperBody,0,(family==='bow'||family==='shortbow'?-1:0)+cue.twist*.35,0);
 // Knees compensate swing clearance. No imported leg rotations at idle.
 u.rig.position.y=dead?.08:0;
 for(const [sign,leg,knee] of [[1,u.leftLeg,u.leftKnee],[-1,u.rightLeg,u.rightKnee]]){
  leg.rotation.set(sign*s*.45*strength,0,0);
  knee.rotation.set(Math.max(0,-sign*s)*.65*strength,0,0);
 }
 rotation(u.head,0,Math.sin(t*.55)*.045*(1-strength),cue.head*.3);
 u.cape.rotation.x=.08+strength*.18+Math.sin(t*3)*.018;
 u.leftArm.rotation.set(-.05-s*.25*strength,0,.08);
 u.rightArm.rotation.set(-.05+s*.25*strength,0,-.08);
 u.leftElbow.rotation.set(-.12,0,0);u.rightElbow.rotation.set(-.12,0,0);
 u.leftHand.rotation.set(0,0,0);u.rightHand.rotation.set(0,0,0);
 let x=.30,y=1.16,z=-.24,rx=-.55,ry=0,rz=0;
 if(family==='bow'||family==='shortbow'){
  x=-.32;y=alert?1.83:1.30;z=alert?-.60:-.40;rx=0;ry=1.0;rz=alert?0:-.18;
 }else if(family==='crossbow'){
  x=.17;y=alert?1.46:1.22;z=alert?-.25:-.22;rx=alert?0:-.35;
 }else if(family==='frost'||family==='ember'){
  x=.34;y=1.28+wind*.20+release*.08;z=-.28-wind*.12-release*.12;
  rx=family==='frost'?1.28+wind*.30-release*.50:alert?.15+wind*.65-release*.20:1.15;
  // Distinct tactical cues move the free hand, not only an effect colour.
  u.leftArm.rotation.set(-.22+cue.left*.65,0,.16+Math.abs(cue.left)*.2);
  u.leftElbow.rotation.x=-.25-cue.elbow*.5;
 }else{
  const heavy=family==='greatsword'||family==='woodaxe';
  x=heavy?.10:.30;y=alert?1.36:1.16;z=heavy?-.36:-.30;
  rx=alert?.55:-.85;
  if(active){
   // Hand trajectory is bounded inside both arm reach envelopes. Blade rotates
   // around its authored grip; wind-up and contact use the supplied action clock.
   y+=wind*.36-release*.13;z-=release*.13;
   rx=.55+wind*1.35-release*.65;
   ry=wind*-.5+release*.55+cue.twist*.25;
   x+=(heavy?.07:.14)*(wind-release);
  }
  if(chopping){const p=((t-chopping.start)/(chopping.period||1.18))%1;
   const raise=p<.48?smooth(p/.48):1-smooth((p-.48)/.52);
   x=.10;y=1.35+raise*.35;z=-.36;rx=.15+raise*1.8;
  }
 }
 const w=u.weapon,blend=1-Math.exp(-24*Math.max(0,Math.min(.1,dt)));
 // Ease only the entrance to an action. A continuously damped weapon would lag
 // behind its authoritative contact time, even if timeline scrubbing looked right.
 if(active&&!info.sample){
  const key=`${family}/${attack.start}/${attack.abilityId||attack.abilityKind||'basic'}`;
  if(u.visualActionStart?.key!==key)u.visualActionStart={key,position:w.position.clone(),rotation:w.quaternion.clone()};
  const entrance=Math.min(.1,Math.max(.001,(attack.impactAt-attack.start)*.4));
  const weight=smooth((t-attack.start)/entrance);
  w.position.set(x,y,z).lerp(u.visualActionStart.position,1-weight);w.rotation.set(rx,ry,rz);w.quaternion.slerp(u.visualActionStart.rotation,1-weight);
 }else if(info.sample||!u.foundationPosed){w.position.set(x,y,z);w.rotation.set(rx,ry,rz);}
 else {w.position.x=damp(w.position.x,x,24,dt);w.position.y=damp(w.position.y,y,24,dt);w.position.z=damp(w.position.z,z,24,dt);w.rotation.x+=(rx-w.rotation.x)*blend;w.rotation.y+=(ry-w.rotation.y)*blend;w.rotation.z+=(rz-w.rotation.z)*blend;}
 if(!active)u.visualActionStart=null;
 u.foundationPosed=true;
 const pull=clock.draw;
 if(u.bowString){u.bowString.positions[5]=.18+.34*pull;u.bowString.geometry.attributes.position.needsUpdate=true;}
 if(u.nockedArrow){u.nockedArrow.position.z=u.bowString?.31+.34*pull:0;u.nockedArrow.visible=state!=='recovery'||recovery>.6;}
 if(u.crossbowSlider)u.crossbowSlider.position.z=-.57+.26*wind;
 if(u.magicFocus)u.magicFocus.scale.setScalar((family==='ember'?.6:1)*(1+.10*wind));
 constrainWeaponHands(u,pull);
 plantFoundationFeet(u,info,motion);
}
