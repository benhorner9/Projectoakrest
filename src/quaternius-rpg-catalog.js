/** Authentic Quaternius Ultimate RPG Pack (2019), author's original CC0 Drive.
 * Model IDs map to pre-existing Oakrest IDs; cosmetics never affect stats.
 * Source: https://drive.google.com/drive/folders/1IhdL3W5XdJrjf_axqAnKvEybMaC3FwF-
 */
const row=(name,obj,mtl,icon,bytes)=>Object.freeze({name,obj,mtl,icon,bytes:Object.freeze(bytes)});
export const RPG_SOURCE=Object.freeze([
 row('Sword','1DG6oPY7TmhOrSdoShMzYsqwbBRDYksOj','1y1D7nbOREHldrhmcXmk7UzNGvTZK18m2','1TwRb0WUzQuFyZQnOZef2pvbaTigRHmCu',[35633,960,241108]),
 row('Sword_big','1L5wXP3LN5WYs74lofNpflBUVVAFOJj-P','1XQj0Pg_eMO6um5-kF6vcog_wCssRleM1','1JzRi-v91kYvxZskIWEkHhNuJo2LL3FWX',[33832,964,165347]),
 row('Dagger','1Q7MelQfjK62ZXcZXXx_UHFGkDu4gE5w3','1ed1QCuEek21kHgIZH60XmGRLkXT6appe','1-5J2j-JPtphLxLoIAa1qRs7qtz0nfLas',[29512,961,158901]),
 row('Bow_Wooden','1Uio6Wxh1erD0KV0O0lsiu31yBIRQqt01','187yq0QQAslrkeV3ZxU9PKBLN6HBXAXpd','1gm4HJ3Olr_iNeuutW4TwUmxRN3pRQXXN',[29583,600,132463]),
 row('Axe_small','1gPnCO4p6CcdVUBfYEe8dBckU7bxeWMcA','1AEOJAFBCHL-KhaMpJikzhXjIdJxsAjLG','1TIF7rKr_EeS6_DTvTYp9MbbMDIaPeEfK',[41490,782,212694]),
 row('Arrow','1eBuNqvSUiYrqK23vACOQN_G_ymjJ021q','1vfCwzsLdfDcTN5QPtyd5rkJmHYj0DZSU','1kk8U6UE1UqOLLHyrLZL2xiyXnU34vFy_',[8610,777,101969])
]);
export const RPG_MODELS=Object.freeze({
 sword_1handed:'Sword',sword_2handed:'Sword_big',dagger:'Dagger',
 axe_1handed:'Axe_small',bow:'Bow_Wooden',arrow:'Arrow'
});
export function rpgModelName(name){return RPG_MODELS[name]||null;}
export function rpgIconName(name){return rpgModelName(name);}
