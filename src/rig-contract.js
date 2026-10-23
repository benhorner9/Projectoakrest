/** Oakrest humanoid v2 contract. Visual units preserve the existing 2.5-unit actor.
 * -Z forward, +Y up, +X character-left from the viewer facing the actor.
 * No profile may change a gameplay range, attack clock or collision shape.
 */
export const HUMANOID_RIG_VERSION='oakrest-humanoid-2';
export const HUMANOID_JOINTS=Object.freeze(['rig','head','leftArm','rightArm','leftElbow','rightElbow','leftHand','rightHand','leftLeg','rightLeg','leftKnee','rightKnee']);
export const WEAPON_PROFILES=Object.freeze({
 sword:{style:'melee',primary:'right',grip:[0,0,0],muzzle:[0,0,-1.23]},
 greatsword:{style:'melee',primary:'right',grip:[0,0,0],secondary:[0,0,.18],muzzle:[0,0,-1.65]},
 daggers:{style:'melee',primary:'right',grip:[0,0,0],muzzle:[0,0,-.72]},
 bow:{style:'ranged',primary:'left',grip:[0,0,0],draw:true,muzzle:[0,0,-.56]},
 shortbow:{style:'ranged',primary:'left',grip:[0,0,0],draw:true,muzzle:[0,0,-.56]},
 crossbow:{style:'ranged',primary:'right',grip:[0,0,0],secondary:[0,0,-.38],muzzle:[0,0,-.80]},
 frost:{style:'magic',primary:'right',grip:[0,0,0],muzzle:[0,0,-1.58]},
 ember:{style:'magic',primary:'right',grip:[0,0,0],muzzle:[0,0,-.72]},
 woodaxe:{style:'melee',primary:'right',grip:[0,0,0],secondary:[0,0,.18],muzzle:[-.25,0,-.96]}
});
for(const profile of Object.values(WEAPON_PROFILES)){
 for(const value of Object.values(profile))if(Array.isArray(value))Object.freeze(value);
 Object.freeze(profile);
}
export function validateHumanoidRig(actor){
 const u=actor?.userData,errors=[];
 for(const name of HUMANOID_JOINTS)if(!u?.[name]?.isObject3D)errors.push('Missing joint '+name);
 for(const name of ['weapon','offhand'])if(!u?.[name]?.isObject3D)errors.push('Missing socket '+name);
 if(u?.foundation&&u.weapon.parent!==u.rig)errors.push('Weapon control must belong to visual rig');
 return errors;
}
