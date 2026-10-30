import {REGIONAL_ENCOUNTERS} from './classic-world-expansion.js';
/** Habitat-grouped overworld encounter coordinates, the shared source
 * of truth for combat and the World Atlas. IDs are save/drop-table contracts. */
export const CLASSIC_OVERWORLD_SPAWNS=Object.freeze([
 Object.freeze({id:'practice',type:'dummy',x:-1,z:73,maxHp:100}),
 Object.freeze({id:'moss-a',type:'mossling',x:-11,z:94,maxHp:58,habitat:'meadow'}),
 Object.freeze({id:'moss-b',type:'mossling',x:-14,z:98,maxHp:58,habitat:'meadow'}),
 Object.freeze({id:'boar-a',type:'boar',x:19,z:109,maxHp:100,habitat:'creek'}),
 Object.freeze({id:'bandit-a',type:'bandit',x:37,z:147,maxHp:148,habitat:'camp'}),
  ...REGIONAL_ENCOUNTERS
]);
