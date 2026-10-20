/** Browser-local character roster; account syncing comes in the online phase. */
export const CHARACTER_LIMIT=3;
export const APPEARANCE_OPTIONS=Object.freeze({
 sex:['male','female'],
 hairstyle:['short','swept','buzz','long','ponytail','curly'],
 hairColor:['#39271f','#765037','#b99056','#d2b888','#24262a','#a75539','#f3e7d4','#4e536c'],
 skinTone:['#f0ceaa','#dcaf88','#c9956f','#aa7153','#7b503d','#51392d'],
 outfit:['tunic','wanderer','scholar','traveller'],
 outfitColor:['#607b7c','#4d745a','#7e5c48','#626392','#a88e67','#854f58','#474f54','#9c8373']
});
const validId=id=>typeof id==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
export function normaliseCharacterName(name){
 if(typeof name!=='string')return '';
 const trimmed=name.trim().replace(/\s+/g,' ');
 return /^[-\p{L}\p{N} ]{3,20}$/u.test(trimmed) ? trimmed : '';
}
export function safeAppearance(value={}){
 const result={};
 for(const [key,options] of Object.entries(APPEARANCE_OPTIONS))
  result[key]=typeof value[key]==='string'&&options.includes(value[key])?value[key]:options[0];
 return result;
}
export function normaliseCharacter(raw){
 if(!raw||!validId(raw.id))return null;
 const name=normaliseCharacterName(raw.name);
 return name?{id:raw.id,name,...safeAppearance(raw)}:null;
}
export function readCharacters(storage,key){
 try{
  const raw=JSON.parse(storage.getItem(key)||'[]');
  if(!Array.isArray(raw))return [];
  const ids=new Set(),names=new Set(),out=[];
  for(const item of raw){
   const c=normaliseCharacter(item);if(!c||ids.has(c.id)||names.has(c.name.toLowerCase()))continue;
   ids.add(c.id);names.add(c.name.toLowerCase());out.push(c);
   if(out.length===CHARACTER_LIMIT)break;
  }
  return out;
 }catch{return [];}
}
export function createCharacter(input,existing=[],id){
 const name=normaliseCharacterName(input?.name);
 if(!name)throw new Error('Choose a name containing 3–20 letters, numbers, spaces or hyphens.');
 if(existing.some(c=>c.name.toLowerCase()===name.toLowerCase()))throw new Error('You already have a character with that name.');
 if(existing.length>=CHARACTER_LIMIT)throw new Error('All three character slots are occupied.');
 if(!validId(id))throw new Error('Could not create a unique character ID.');
 return {id,name,...safeAppearance(input)};
}
