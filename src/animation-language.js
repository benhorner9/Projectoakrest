/**
 * Visual-only attack language for tribrid combat. Degrees of motion are in
 * radians and are never used by hit detection, cooldowns or attack timings.
 * The caller supplies anticipation (windup) and follow-through (release)
 * directly from the real weapon clock. No independent cosmetic timer.
 */
const clamp01=value=>Math.min(1,Math.max(0,Number.isFinite(value)?value:0));
export function abilityMotion(family,kind='basic',windup=0,release=0,combo=0){
 const w=clamp01(windup),r=clamp01(release);
 const c=Number.isFinite(combo)?Math.abs(Math.trunc(combo))%3:0;
 const motion={right:0,left:0,elbow:0,twist:0,lean:0,head:0};
 const melee=!['bow','shortbow','crossbow','frost','ember'].includes(family);
 const heavy=family==='greatsword',fast=family==='daggers'||family==='shortbow';
 // Baseline family silhouettes are present even without a special ability.
 if(heavy){motion.right=-.25*w+.20*r;motion.left=-.18*w;motion.twist=(c===1?-.13:.13)*r;motion.lean=.11*w-.08*r;}
 else if(family==='daggers'){motion.left=.34*r-.12*w;motion.right=(c===1?-.25:.24)*r;motion.twist=(c===1?-.18:.18)*r;}
 else if(family==='crossbow'){motion.lean=.10*w-.05*r;motion.elbow=.18*w;}
 else if(family==='bow'||family==='shortbow'){motion.left=.12*w;motion.lean=-.04*r;}
 else if(family==='frost'||family==='ember'){motion.head=.045*w;motion.right=.15*r;motion.lean=-.06*w;}
 const k=kind||'basic';
 if(k==='sweep'){motion.right+=.75*w-.43*r;motion.left+=.25*w+.24*r;motion.twist+=-.55*w+.15*r;motion.lean+=-.13*r;}
 else if(k==='execute'||k==='hit'){motion.right+=-(k==='execute'?.78:.48)*w+.54*r;motion.left+=-.16*w;motion.lean+=.21*w-.22*r;}
 else if(k==='nova'){motion.right+=-.68*w+.38*r;motion.left+=-.9*w+.52*r;motion.twist+=.16*r;motion.head+=-.08*r;}
 else if(k==='bolt'){motion.right+=.53*w+.25*r;motion.left+=.18*w;motion.lean+=.1*r;}
 else if(k==='burst'){motion.right+=.32*w+.38*r;motion.left+=.37*w;motion.twist+=fast?-.09*r:.12*r;}
 else if(k==='shield'){motion.right+=-.95*r;motion.left+=-.85*r;motion.elbow+=.65*r;motion.lean+=-.13*r;}
 else if(k==='heal'){motion.right+=1.04*r;motion.left+=1.0*r;motion.elbow+=-.38*r;motion.head+=-.10*r;}
 else if(k==='dash'||k==='dashback'||k==='retreat'){
  const sign=k==='dash'?1:-1;
  motion.lean+=sign*.42*r;motion.right+=-.16*r;motion.left+=.24*r;motion.twist+=sign*.10*r;
 }
 // Bound procedurally-authored poses: never let a cue invert a character rig.
 for(const key of Object.keys(motion))motion[key]=Math.max(-1.35,Math.min(1.35,motion[key]));
 return motion;
}
