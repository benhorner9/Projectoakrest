/** Pure, deterministic cosmetic routing. No changes to NPC identities, jobs or AI. */
export const CITIZEN_ART_LIMIT=8;
export const CITIZEN_ART_LOAD_RADIUS=27;
export const CITIZEN_ART_RETAIN_RADIUS=31;
export function citizenModel(role='',index=0){
 const title=String(role).toLowerCase();
 if(/(watch|warden|guard|sentry|captain)/.test(title))return 'knight';
 if(/(banker|merchant|shopkeeper|market|trader|porter|courier|farmer|forester|gardener|craft)/.test(title))return 'rogue';
 if(/(archivist|scholar|apprentice|steward)/.test(title))return 'mage';
 return ['rogue','knight','mage'][Math.abs(index)%3];
}
/** Sorted by proximity, keeping a mounted villager until it leaves the
 * slightly wider retention radius to prevent camera-boundary flicker.
 */
export function chooseDetailedCitizens(citizens,player,existing=new Set(),limit=CITIZEN_ART_LIMIT){
 if(!player||!Number.isFinite(player.x)||!Number.isFinite(player.z))return [];
 return citizens.map((citizen,index)=>({
  citizen,index,distance:Math.hypot(citizen.x-player.x,citizen.z-player.z)
 })).filter(({citizen,distance})=>distance<=(existing.has(citizen)?CITIZEN_ART_RETAIN_RADIUS:CITIZEN_ART_LOAD_RADIUS))
 .sort((a,b)=>a.distance-b.distance||a.index-b.index)
 .slice(0,Math.max(0,limit)).map(({citizen})=>citizen);
}
