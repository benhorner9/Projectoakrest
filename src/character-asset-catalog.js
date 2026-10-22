/** CC0 KayKit character-art sources pinned to immutable commits and Git blob IDs.
 * Source assets are downloaded ONLY at build/dev preparation time, not at gameplay runtime.
 */
export const CHARACTER_ART=Object.freeze({
 knight:Object.freeze({
  file:'Knight.glb',size:3659532,blob:'717b56ca2b5ff5392679774725201ba03a3eefab',
  repo:'KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0',
  commit:'672074b73ba276876a19e8816ecdc5241817ab47',
  path:'addons/kaykit_character_pack_adventures/Characters/gltf/Knight.glb'
 }),
 rogue:Object.freeze({
  file:'Rogue.glb',size:3616284,blob:'c8827661105eef7b2bfbef3bc676d41a47625733',
  repo:'KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0',
  commit:'672074b73ba276876a19e8816ecdc5241817ab47',
  path:'addons/kaykit_character_pack_adventures/Characters/gltf/Rogue.glb'
 }),
 mage:Object.freeze({
  file:'Mage.glb',size:3589240,blob:'c89f19f6e707f6e07e4632a08876bd6d0172b082',
  repo:'KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0',
  commit:'672074b73ba276876a19e8816ecdc5241817ab47',
  path:'addons/kaykit_character_pack_adventures/Characters/gltf/Mage.glb'
 }),
 skeleton:Object.freeze({
  file:'Skeleton_Warrior.glb',size:4863620,blob:'769e85c9e4cee8d1bd0952ddb3e9d26293144581',
  repo:'KayKit-Game-Assets/KayKit-Character-Pack-Skeletons-1.0',
  commit:'15b62b9bad122f72926c10fb14d622c73819fa54',
  path:'addons/kaykit_character_pack_skeletons/Characters/gltf/Skeleton_Warrior.glb'
 })
});
export const CHARACTER_ART_KEYS=Object.freeze(Object.keys(CHARACTER_ART));
/** Cosmetic only. Melee/ranged/magic loadouts NEVER select the player's body. */
export function characterModelForAppearance(profile){
 if(profile?.outfit==='scholar')return 'mage';
 if(profile?.outfit==='wanderer'||profile?.outfit==='traveller')return 'rogue';
 return 'knight';
}
export function characterClipKind({speed=0,attack=null,hit=false,dead=false,dodge=0,chopping=null}={}){
 if(dead)return 'death';
 if(hit)return 'hit';
 if(dodge>.18)return 'dodge';
 if(chopping)return 'attack';
 if(attack)return 'attack';
 if(speed>3.8)return 'run';
 if(speed>.25)return 'walk';
 return 'idle';
}
