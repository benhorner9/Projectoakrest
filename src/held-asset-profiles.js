/** Retained KayKit accessory sources have authored grip origins, not centred bounds.
 * Preserve those origins. The crossbow points +Z; blades/staff/wand point +Y.
 * Scale is explicit per source asset, never inferred from an arbitrary item class.
 * These candidate adapters require motion review before enabling in live gameplay.
 */
export const HELD_ASSET_PROFILES=Object.freeze({
 sword_1handed:{scale:1.48/1.7752615213394165,rotation:[-Math.PI/2,0,0],grip:[0,0,0]},
 sword_2handed:{scale:1.95/2.3658006489276886,rotation:[-Math.PI/2,0,0],grip:[0,0,0]},
 dagger:{scale:.74/1.2058458477258682,rotation:[-Math.PI/2,0,0],grip:[0,0,0]},
 axe_1handed:{scale:1.15/1.2444227039813995,rotation:[-Math.PI/2,0,0],grip:[0,0,0]},
 staff:{scale:1.85/2.154699683189392,rotation:[-Math.PI/2,0,0],grip:[0,0,0]},
 wand:{scale:.92/.9661402404308319,rotation:[-Math.PI/2,0,0],grip:[0,0,0]},
 crossbow_2handed:{scale:1.2/1.4408700466156006,rotation:[0,Math.PI,0],grip:[0,0,0]}
});
for(const p of Object.values(HELD_ASSET_PROFILES)){Object.freeze(p.rotation);Object.freeze(p.grip);Object.freeze(p);}
