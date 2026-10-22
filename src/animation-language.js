/**
 * Visual-only attack language for tribrid combat. Degrees of motion are in
 * radians and are never used by hit detection, cooldowns or attack timings.
 * The caller supplies anticipation (windup) and follow-through (release)
 * directly from the real weapon clock. No independent cosmetic timer.
 */
const clamp01=value=>Math.min(1,Math.max(0,Number.isFinite(value)?value:0));

// Cue-specific *joint* offsets layered on baseline weapon poses. The visible
// player rig carries these tells even at low graphics quality (no VFX needed).
// Pair format: anticipation vector, release vector. Order: right, left, elbow,
// torso twist, torso lean, head tilt. Bounded below to protect custom rigs.
const CUE_POSES={
 overhand:[[-.94,-.50,.42,.10,.26,-.04],[.80,.50,.20,-.16,-.27,.06]],
 cleave:[[.62,.32,.30,-.67,-.10,0],[-.36,.34,.16,.56,-.15,0]],
 break:[[-.35,-.17,.70,-.23,-.18,-.06],[.80,.10,.43,.15,.19,.04]],
 parry:[[-.53,-.72,.88,-.08,-.14,0],[-.38,-.57,.50,.02,-.08,0]],
 slice:[[-.42,-.06,.36,-.14,.25,0],[.66,.24,.04,.42,-.14,0]],
 cross:[[-.56,-.72,.40,-.25,.13,0],[.72,.94,.10,.25,-.13,0]],
 rush:[[-.16,-.25,.18,.06,.62,-.07],[.30,.28,-.08,.18,.30,.02]],
 execute:[[-.82,-.16,.65,-.32,.21,-.05],[.84,-.05,.08,.22,-.34,.03]],
 pierce:[[.15,.31,.55,-.12,-.15,-.07],[.29,-.28,-.25,.06,-.07,0]],
 rapid:[[.14,-.25,.38,-.13,.04,0],[.54,.21,-.13,.11,-.02,0]],
 pin:[[.28,-.32,.72,-.20,-.12,-.06],[.48,.02,-.12,.05,-.07,.01]],
 retreat:[[-.11,-.03,.28,.10,-.41,-.04],[.32,.16,-.20,-.12,-.52,.04]],
 reload:[[-.33,.43,.70,.04,.21,-.04],[.74,-.11,.13,-.14,-.19,.05]],
 scatter:[[.15,.60,.34,-.54,.16,0],[.39,.45,.20,.45,-.21,.02]],
 snare:[[.14,-.24,.61,.26,-.07,-.04],[.65,.14,-.17,-.13,-.11,0]],
 roll:[[-.48,-.46,.49,.15,-.48,-.10],[-.05,.22,-.17,-.21,-.56,.05]],
 cast:[[.66,-.15,.20,-.10,.08,-.04],[.43,.10,-.12,.11,-.14,0]],
 wave:[[.24,-.93,.13,-.55,.06,-.04],[.35,.93,-.06,.45,-.17,0]],
 bind:[[-.64,.42,.61,.16,-.16,-.12],[.14,-.74,.39,-.22,-.06,.06]],
 barrier:[[-.80,-.95,.62,.0,-.13,-.05],[-.66,-.85,.46,0,-.08,0]],
 blink:[[-.44,-.26,.40,.03,.46,-.09],[.34,.11,-.13,.14,.35,.04]],
 heal:[[.46,.58,.18,0,-.08,-.13],[.66,.69,-.18,0,-.09,.05]],
 focus:[[.28,-.38,.73,-.11,-.17,-.14],[.52,-.08,-.19,.11,-.11,.05]],
 flare:[[.32,-.44,.33,-.18,.04,-.05],[.81,.31,-.07,.19,-.08,.02]],
 nova:[[-.90,-1.04,.15,-.06,-.16,-.08],[.42,.61,-.14,.10,-.12,.05]]
};

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
 if(CUE_POSES[k]){
  const [inPose,outPose]=CUE_POSES[k];
  for(const [i,key] of ['right','left','elbow','twist','lean','head'].entries())
   motion[key]+=inPose[i]*w+outPose[i]*r;
 }
 else if(k==='sweep'){motion.right+=.75*w-.43*r;motion.left+=.25*w+.24*r;motion.twist+=-.55*w+.15*r;motion.lean+=-.13*r;}
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
