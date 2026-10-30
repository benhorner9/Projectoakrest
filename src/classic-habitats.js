/** Explicit encounter territories. Stable monster IDs preserve quest/drop contracts.
 * These boundaries are spawn/AI limits, not invisible walls for the player. */
export const CLASSIC_HABITATS=Object.freeze({
 meadow:{name:'Mossy meadow',minX:-19,maxX:-7,minZ:91,maxZ:101,colour:'#657e4f'},
 creek:{name:'Boar rooting grounds',minX:12,maxX:30,minZ:101,maxZ:134,colour:'#786d4c'},
 roots:{name:'Rootbound grove',minX:-44,maxX:-15,minZ:120,maxZ:150,colour:'#425f48'},
 camp:{name:'Poacher encampment',minX:24,maxX:42,minZ:136,maxZ:163,colour:'#877759'},
 shrine:{name:'Sap shrine',minX:-18,maxX:6,minZ:151,maxZ:175,colour:'#536756'}
});
export function insideHabitat(point,id,radius=0){
 const b=CLASSIC_HABITATS[id];
 return !b||(point.x>=b.minX+radius&&point.x<=b.maxX-radius&&point.z>=b.minZ+radius&&point.z<=b.maxZ-radius);
}
export function classicMonsterRadius(enemy){return enemy.boss?1.2:enemy.id==='guardian'?1:enemy.type==='boar'?.85:.6;}
