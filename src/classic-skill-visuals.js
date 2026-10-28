/** Ephemeral Classic skilling presentation. Never awards XP or mutates saves. */
export const VISUAL_SKILLS=Object.freeze([
 'woodcutting','mining','foraging','blacksmithing','fletching','inscription','cooking'
]);
const supported=new Set(VISUAL_SKILLS);
const clamp=v=>Math.max(0,Math.min(1,v));

/** Convert authoritative work/craft timestamps into a 3-pose action cycle.
 * Each handcraft has a short success-only visual, while world work follows its
 * real gathering duration. Callers may render the same snapshot repeatedly.
 */
export function skillVisualFrame(adventure,time){
 if(!Number.isFinite(time))return null;
 const work=adventure?.work;
 if(work&&supported.has(work.skill)&&Number.isFinite(work.start)&&
    Number.isFinite(work.end)&&time>=work.start&&time<=work.end){
  const duration=Math.max(.12,work.end-work.start);
  const progress=clamp((time-work.start)/duration);
  const pose=progress<.35?'work-raise':progress<.73?'work-contact':'work-recover';
  return {skill:work.skill,pose,progress,targetId:work.targetId||null,
   target:Number.isFinite(work.x)&&Number.isFinite(work.z)?{x:work.x,z:work.z}:null,
   kind:'working'};
 }
 const crafted=adventure?.recentCraft;
 if(crafted&&supported.has(crafted.skill)&&Number.isFinite(crafted.time)){
  const elapsed=time-crafted.time;
  if(elapsed>=0&&elapsed<.85){
   const progress=elapsed/.85;
   return {skill:crafted.skill,pose:progress<.25?'work-raise':progress<.65?'work-contact':'work-recover',
    progress,targetId:null,target:null,kind:'crafted'};
  }
 }
 return null;
}

/** The whole low-poly tree pivots from its roots; falling and respawn
 * are driven by the same cooldown state as the authoritative transaction. */
export function applySkillTreeVisual(tree,stump,status,action,time){
 if(!tree)return;
 const recovering=Number.isFinite(status?.respawnAt)&&status.respawnAt>time;
 const fallAge=recovering&&Number.isFinite(status?.fallAt)?time-status.fallAt:Infinity;
 const falling=fallAge>=0&&fallAge<.85;
 const active=action?.skill==='woodcutting'&&action?.targetId===tree.userData.interactId;
 tree.visible=!recovering||falling;
 if(stump)stump.visible=recovering&&!falling;
 if(falling){
  const progress=clamp(fallAge/.85);
  tree.rotation.z=progress*progress*1.38;
  tree.rotation.x=progress*.12;
 }else{
  const shake=active&&action.pose==='work-contact'?Math.sin(action.progress*36)*.105:0;
  tree.rotation.z=shake;
  tree.rotation.x=shake*.25;
 }
}
