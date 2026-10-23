/**
 * Oakrest Quaternius integration, curated CC0 models.
 * Only STANDARD/free sources. Files are build-fetched from immutable GitHub
 * mirrors of the originals, checked against Git object SHA-1 + exact size.
 *
 * This is an intentionally small playable subset, NOT every file in 5 packs.
 * The Ultimate RPG Pack original ZIP is not sourced by this manifest yet.
 */
export const PACKS=Object.freeze({
  base:{name:'Universal Base Characters',url:'https://quaternius.com/packs/universalbasecharacters.html',license:'CC0-1.0'},
  outfits:{name:'Modular Character Outfits - Fantasy',url:'https://quaternius.com/packs/modularcharacteroutfitsfantasy.html',license:'CC0-1.0'},
  monsters:{name:'Ultimate Monsters',url:'https://quaternius.com/packs/ultimatemonsters.html',license:'CC0-1.0'},
  medieval:{name:'Medieval Village MegaKit',url:'https://quaternius.com/packs/medievalvillagemegakit.html',license:'CC0-1.0'},
  rpg:{name:'Ultimate RPG Pack',url:'https://quaternius.com/packs/ultimaterpg.html',license:'CC0-1.0'}
});
const common='Dallolz/moorfall-assets',commonCommit='1e83864f55ff8646e929ac9b73faa75df29161de';
const gate='Hakhyun-Kim/constellation-defense',gateCommit='8ad1c93e382e2a6a5755882c1b9b2922877fab6e';
const village='J-Ponzo/gltf-medieval-village-megakit',villageCommit='21104b4045261c28fc312360841ed1a7b0ac8782';
const model=(pack,id,path,size,blob,repo=common,commit=commonCommit)=>Object.freeze({
 pack,id,file:id+'.glb',path,size,blob,repo,commit
});
export const QUATERNIUS_MODELS=Object.freeze([
 model('outfits','universal-animations','animations/UAL1.glb',7618436,'473e59080288428d0b6da826ba19324d07b191f0'),
 model('base','base-male','characters/Superhero_Male.glb',2507724,'2ce8c2efd4f15837d2f4326c7e06bb10e5eb1fea'),
 model('base','base-female','characters/Superhero_Female.glb',2853588,'73ec2fb65d2be88eaa3bdb86bad0621ca14440fc'),
 model('outfits','peasant-male','outfits/Male_Peasant.glb',2157460,'d8fafddb0b27ab73f0686d555e66099437790ea5'),
 model('outfits','peasant-female','outfits/Female_Peasant.glb',1517444,'5a6e0c248db1efe739493efb1b26ba641c50c3bb'),
 model('outfits','ranger-male','outfits/Male_Ranger.glb',3428448,'e804d5eeef4b7583b50d4d7704f905e3c144e96a'),
 model('outfits','ranger-female','outfits/Female_Ranger.glb',3659960,'6d1a6194b7b804ddf2c4511926e32d9f7ed7ee1e'),
 model('monsters','mushnub','enemies/Mushnub.glb',55688,'5ddab1bb95eff294bcef79e7abc747d7157c6804'),
 model('monsters','green-blob','enemies/Green_Blob.glb',62492,'09d39186aaf9fe001e09acf45f94b29318253731'),
 model('monsters','orc','enemies/Orc.glb',371448,'d010fc9a855e65f7e72909ba8e5c43dd9e594fba'),
 model('monsters','demon','enemies/Demon.glb',249848,'d6129e96ad3d3166cee8f5a778478a581ae0631c'),
 model('medieval','gate-tower','assets/models/quaternius-gate-tower.glb',308092,'bf9a58d08ccb7310d8cf0bcd5a1cc6e41877b107',gate,gateCommit),
 model('medieval','gate-wall','assets/models/quaternius-gate-wall.glb',66220,'b0ced5f50ea1885dea301f85f0e5619c1851a244',gate,gateCommit),
 model('medieval','gate-wall-straight','assets/models/quaternius-gate-wall-straight.glb',63604,'116f23e51d63bbf2850a32e713091914e340bf74',gate,gateCommit),
 model('medieval','gate-door','assets/models/quaternius-gate-door.glb',139604,'ba1533fc2e83302a23ff4a50a852cd01a46b0177',gate,gateCommit)
]);
const part=(id,file,size,blob)=>Object.freeze({pack:'medieval',id,file,path:'glTF/'+file,size,blob,repo:village,commit:villageCommit});
// Faithful medieval building-detail modules. Material atlases are compressed
// by dropping optional normal/ORM maps at build time; no false geometry.
export const VILLAGE_MODULE_FILES=Object.freeze([
 part('round-door-gltf','DoorFrame_Round_Brick.gltf',2223,'b6d9f5f4519e8730f5a89e75c9f892ee7acd1b7c'),
 part('round-door-bin','DoorFrame_Round_Brick.bin',63988,'7fd2257fd57dbb636006b006e08236e812369f95'),
 part('roof-gltf','Roof_RoundTiles_4x6.gltf',4341,'272d57f1a17ecf06cdbee58dc0bfb162cbe809de'),
 part('roof-bin','Roof_RoundTiles_4x6.bin',129840,'c7e538d1d1d7a79653b1ab5d2fb5d868d2afc8e3'),
 part('wall-window-gltf','Wall_Plaster_Window_Wide_Round.gltf',5967,'343e874fbad32990eae96b4e979a3f8e8eeb7f26'),
 part('wall-window-bin','Wall_Plaster_Window_Wide_Round.bin',6664,'1904c63a82972b06d7ff7a6ad233b582ec0579b4'),
 part('rock-colour','T_RockTrim_BaseColor.png',1908835,'66d38c3389b53c261dca7253a8898a5fa92cec'),
 part('wood-colour','T_WoodTrim_BaseColor.png',2082310,'3547da835b7b1aa89e27e98c68b1582bd203ef93'),
 part('roof-colour','T_RoundTiles_BaseColor.png',4352034,'1499f2b4d6eda2da8ca7512c342ed29632cf3d1e'),
 part('plaster-colour','T_Plaster_BaseColor.png',3316410,'14ff755f0dc786a775faea8eb9d51ef1e4dcd613')
]);
export const CURATED_QUATERNIUS_IDS=Object.freeze(QUATERNIUS_MODELS.map(m=>m.id));
export const MODEL_BY_ID=Object.freeze(Object.fromEntries(QUATERNIUS_MODELS.map(m=>[m.id,m])));
export function townOutfit(role='',index=0){
 const text=String(role).toLowerCase();
 const gender=(Math.abs(index)%2)?'female':'male';
 // Strictly peaceful civic outfits, never ranger armour or weapons on citizens.
 return /(?:watch|guard|warden|sentry|captain)/.test(text)?'peasant-'+gender:
   'peasant-'+gender;
}
export function monsterModel(type){
 return type==='mossling'?'mushnub':null; // boars remain quadrupeds; no misleading swaps.
}
export function playerOutfit(profile){
 return /woman|female/i.test(profile?.body||profile?.gender||'')?'ranger-female':'ranger-male';
}
