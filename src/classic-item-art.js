/** Oakrest Classic Block 3 item art grammar.
 * Pure and deterministic. Item IDs and the catalogue remain authoritative;
 * this module never changes ownership, rarity, crafting or save records.
 */
import {classicVisualItem,classicVisualWeaponFamily} from './classic-avatar-art.js';
const hash=s=>{let n=2166136261;for(const ch of s)n=Math.imul(n^ch.charCodeAt(0),16777619)>>>0;return n;};
const physicalShape=(item)=>{
 const key=item.legacy?.itemId||item.id;
 if(item.kind==='coins')return 'coins';
 if(item.kind==='scroll'||/[-.]scroll$/.test(key))return 'scroll';
 if(item.kind==='weapon')return classicVisualWeaponFamily(key);
 if(item.kind==='armour')return 'chest';
 if(item.kind==='slot')return item.shape==='shield'?'shield':item.shape;
 if(/[-]logs$/.test(key))return 'logs';
 if(/[-]ore$/.test(key))return 'ore';
 if(/[-]bar$/.test(key))return 'ingot';
 if(/ration/.test(key))return 'ration';
 if(/tonic/.test(key))return 'potion';
 if(/arrows/.test(key))return 'arrows';
 if(/hollow-shard/.test(key))return 'crystal';
 if(/warden-heart/.test(key))return 'heart';
 if(/ward-seal/.test(key))return 'seal';
 if(/reed|fibre/.test(key))return 'herbs';
 if(/hide/.test(key))return 'hide';
 return item.shape==='token'?'token':item.shape==='orb'?'crystal':'herbs';
};
export function classicItemArtProfile(item){
 if(!item?.id||typeof item.id!=='string')return null;
 const shape=physicalShape(item);
 const slot=item.kind==='armour'?'chest':item.kind==='weapon'?'weapon':item.kind==='slot'?item.shape:'material';
 const wardrobe=classicVisualItem(item.legacy?.itemId,slot);
 const elemental=/frost|moonwood|ice/.test(item.id);
 const fire=/ember|pyrite|pryrite/.test(item.id);
 const base=(item.kind==='weapon'||item.kind==='armour'||item.kind==='slot')?
  wardrobe?.base||item.accent:item.accent;
 const shade=(item.kind==='weapon'||item.kind==='armour'||item.kind==='slot')?
  wardrobe?.shadow||'#38515a':'#45534a';
 const glint=(item.kind==='weapon'||item.kind==='armour'||item.kind==='slot')?
  wardrobe?.shine||'#e7ddc4':'#f7e4b5';
 const accent=elemental?'#a7d7cf':fire?'#eab27a':item.accent;
 return Object.freeze({id:item.id,shape,material:wardrobe?.material||'natural',
  tier:wardrobe?.tier||'common',base,shade,glint,accent,seed:hash(item.id),
  // Identify resource variants without assigning rarity colors to drops.
  family:item.kind==='weapon'?classicVisualWeaponFamily(item.legacy?.itemId):item.kind});
}
const icons={
 coins:'<ellipse cx="25" cy="37" rx="14" ry="11" fill="#a87b35"/><ellipse cx="38" cy="35" rx="16" ry="12" fill="#e5bc58"/><ellipse cx="33" cy="29" rx="17" ry="13" fill="#f4d87b"/><path d="M27 29h12m-6-7v15" stroke="#8e612f" stroke-width="3"/>',
 logs:'<g transform="rotate(-21 32 32)"><rect x="16" y="12" width="15" height="40" rx="6"/><rect x="34" y="14" width="15" height="38" rx="6"/><ellipse cx="23.5" cy="12" rx="7.5" ry="6" fill="SHINE"/><ellipse cx="41.5" cy="14" rx="7.5" ry="6" fill="SHINE"/><path d="M23 21v23M41 23v22" stroke="SHADE" stroke-width="2"/></g>',
 ore:'<path d="M13 44L19 24L35 15L48 27L51 46L34 54Z"/><path d="M19 24L35 15L33 37L13 44M33 37L48 27L51 46L34 54Z" fill="SHADE"/><path d="M19 24L35 15L41 28L33 37Z" fill="SHINE"/><path d="M13 44L33 37L34 54" fill="none" stroke="SHINE" stroke-width="2"/>',
 ingot:'<path d="M13 28L21 20H43L51 28L47 44H17Z" fill="SHADE"/><path d="M21 20H43L47 29H17Z" fill="SHINE"/><path d="M17 29H47L44 42H20Z"/><path d="M23 34h17" stroke="SHINE" stroke-width="2"/>',
 herbs:'<path d="M30 54L34 17M31 41L19 22M32 35L45 18" stroke="#c5b28b" stroke-width="4" fill="none"/><path d="M32 39Q12 33 17 13Q33 15 32 39M34 29Q38 12 51 15Q54 30 34 36M24 48Q9 39 12 30Q30 29 35 46Z"/><path d="M29 32L23 23M39 27L46 21" stroke="SHINE" stroke-width="2"/>',
 hide:'<path d="M12 16L21 11L31 16L42 10L53 16L48 30L53 47L42 55L32 48L19 56L10 47L15 31Z"/><path d="M20 21Q33 31 44 21M20 43Q33 35 45 46" stroke="SHINE" stroke-width="2" fill="none"/>',
 ration:'<path d="M14 30Q22 17 32 17Q44 17 50 31L48 51H17Z" fill="SHADE"/><path d="M17 31Q33 22 46 31L43 49H21Z"/><path d="M20 32Q32 40 43 31M24 46H41" stroke="SHINE" stroke-width="3" fill="none"/><path d="M20 20L30 15L39 20" stroke="#eacb8c" stroke-width="4" fill="none"/>',
 potion:'<path d="M26 9H38V21L46 29V50Q44 55 32 55Q20 55 18 50V29L26 21Z" fill="#c7d6d1" opacity=".8"/><path d="M21 34H43V50Q32 58 21 50Z"/><path d="M25 9H39M28 16H36" stroke="#e3cc9f" stroke-width="5"/><path d="M27 37l9 8m-1-9l-8 10" stroke="SHINE" stroke-width="2"/>',
 scroll:'<path d="M17 14Q22 10 27 14H47V51H17Z" fill="#ebdbb6"/><path d="M20 18H44V47H20Z" fill="#f4e6c7"/><path d="M16 14H49M16 51H49" stroke="#ae8552" stroke-width="6" stroke-linecap="round"/><path d="M26 28L33 20L40 28L33 39Z" fill="BASE" stroke="SHADE" stroke-width="2"/><path d="M27 42H40" stroke="#9b7b50" stroke-width="2"/>',
 crystal:'<path d="M32 7L49 24L45 47L32 57L18 44L15 24Z" fill="SHADE"/><path d="M32 7L40 25L32 57L22 26Z"/><path d="M32 7L22 26L15 24M40 25L49 24" fill="SHINE"/><path d="M22 26L32 57L40 25" stroke="SHINE" stroke-width="2" fill="none"/>',
 heart:'<path d="M32 55L11 31Q10 14 23 13Q30 13 32 22Q37 11 45 13Q57 15 53 32Z" fill="SHADE"/><path d="M32 49L18 30Q16 20 24 18L32 27L40 18Q50 17 48 29Z"/><path d="M24 26L33 35L40 25" stroke="SHINE" stroke-width="3" fill="none"/>',
 seal:'<circle cx="32" cy="32" r="23" fill="SHADE"/><circle cx="32" cy="32" r="18" stroke="SHINE" stroke-width="3"/><path d="M32 14L43 33L32 50L21 33Z"/><path d="M22 33H42M32 18V47" stroke="SHINE" stroke-width="2"/>',
 token:'<path d="M32 6L51 18V45L32 57L13 45V18Z" fill="SHADE"/><path d="M32 13L45 22V42L32 50L19 42V22Z"/><path d="M32 17L40 32L32 47L24 32Z" fill="SHINE"/>',
 chest:'<path d="M14 16L25 10L32 18L40 10L51 16L56 31L47 36L45 55H19L17 36L8 31Z" fill="SHADE"/><path d="M23 18L32 25L42 18L47 30L43 50H21L17 30Z"/><path d="M20 29L32 35L45 29M26 47H38" stroke="SHINE" stroke-width="3" fill="none"/>',
 helm:'<path d="M12 34Q13 12 32 10Q51 12 52 34L47 50H17Z" fill="SHADE"/><path d="M17 33Q19 17 32 16Q46 17 47 33L43 43H21Z"/><path d="M17 34H47M32 17V44" stroke="SHINE" stroke-width="3"/>',
 legs:'<path d="M17 10H47L44 54H34L32 30L29 54H19Z" fill="SHADE"/><path d="M21 14H43L40 50H36L32 25L28 50H22Z"/><path d="M21 27H43" stroke="SHINE" stroke-width="3"/>',
 boots:'<path d="M12 13H27V38L35 48V55H7V46L13 37ZM37 13H51V38L58 48V55H32V46L38 37Z" fill="SHADE"/><path d="M16 17H25V42L30 49H12V45L16 37ZM40 17H49V42L54 49H36V45L40 37Z"/><path d="M12 49H30M36 49H54" stroke="SHINE" stroke-width="3"/>',
 shield:'<path d="M32 6L53 15V35Q49 51 32 59Q15 51 11 35V15Z" fill="SHADE"/><path d="M32 13L46 20V35L32 50L18 35V20Z"/><path d="M32 17V49M20 31H44" stroke="SHINE" stroke-width="4"/>',
 arrows:'<path d="M13 51L47 13M21 55L51 24M8 39L15 52L30 49M40 11L53 9L51 22" stroke="SHINE" stroke-width="4" fill="none"/><path d="M16 50L47 18" stroke="SHADE" stroke-width="2"/>',
 amulet:'<path d="M17 10Q32 36 47 10" fill="none" stroke="#dcc99a" stroke-width="5"/><path d="M32 31L45 43L32 57L19 43Z" fill="SHADE"/><path d="M32 35L40 43L32 52L24 43Z"/><path d="M32 35V52" stroke="SHINE" stroke-width="2"/>',
 ring:'<circle cx="32" cy="37" r="17" stroke="SHADE" stroke-width="9" fill="none"/><circle cx="32" cy="37" r="17" stroke="SHINE" stroke-width="3" fill="none"/><path d="M32 8L42 19L32 30L22 19Z"/><path d="M32 11L37 19L32 26" stroke="SHINE" stroke-width="2" fill="none"/>',
 orb:'<circle cx="32" cy="29" r="18" fill="SHADE"/><circle cx="32" cy="29" r="14"/><path d="M16 54L32 42L48 54M32 42V58" stroke="#cdbb8e" stroke-width="4" fill="none"/><path d="M21 28L33 17L44 29L33 40Z" fill="SHINE" opacity=".7"/>',
 sword:'<path d="M32 5L39 15L36 39L32 44L27 39L25 15Z" fill="SHADE"/><path d="M32 10L36 16L34 38L32 41Z" fill="SHINE"/><path d="M16 43H48M32 44V58" stroke="#bd9c62" stroke-width="6" stroke-linecap="round"/>',
 greatsword:'<path d="M32 3L39 13L37 42L32 47L27 42L25 13Z" fill="SHADE"/><path d="M32 8L36 14L34 39L32 45Z" fill="SHINE"/><path d="M12 42L52 42M32 42V60" stroke="#d2b17e" stroke-width="6" stroke-linecap="round"/>',
 daggers:'<path d="M20 6L28 16L26 37L20 42L16 36L15 16ZM44 6L49 16L48 36L42 42L37 37L36 16Z" fill="SHADE"/><path d="M20 12L23 17L22 35M43 12L46 17L44 35" stroke="SHINE" stroke-width="3" fill="none"/><path d="M11 43H30M35 43H54M21 43V57M43 43V57" stroke="#b99b67" stroke-width="5"/>',
 axe:'<path d="M18 57L38 9" stroke="#826344" stroke-width="7" stroke-linecap="round"/><path d="M33 8Q50 3 57 18L49 32Q42 22 30 23Z" fill="SHADE"/><path d="M36 12Q49 8 52 19L48 25Q41 20 35 19Z" fill="SHINE"/>',
 bow:'<path d="M25 7Q53 28 25 56" stroke="#8d6746" stroke-width="7" fill="none"/><path d="M25 7L25 56M13 34H47M43 28L52 34L43 40" stroke="SHINE" stroke-width="2.5" fill="none"/>',
 crossbow:'<path d="M32 22V56" stroke="#886542" stroke-width="9"/><path d="M8 17Q32 4 56 17L49 30L32 24L15 30Z" fill="SHADE"/><path d="M15 18Q32 12 49 18" stroke="SHINE" stroke-width="3" fill="none"/><path d="M32 13V40M23 24H41" stroke="SHINE" stroke-width="2"/>',
 staff:'<path d="M19 56L40 13" stroke="#8a6645" stroke-width="7" stroke-linecap="round"/><path d="M41 4L55 17L41 31L27 17Z" fill="SHADE"/><path d="M41 9L49 17L41 25L33 17Z"/><path d="M33 17H49M41 10V24" stroke="SHINE" stroke-width="2"/>',
 wand:'<path d="M20 54L43 19" stroke="#8f704a" stroke-width="8" stroke-linecap="round"/><path d="M43 7L52 16L43 26L34 16Z" fill="SHADE"/><path d="M43 10L48 16L43 22L38 16Z" fill="SHINE"/><path d="M28 49L35 38" stroke="#f3dca5" stroke-width="3"/>'
};
export function classicItemIconSvg(item){
 const p=classicItemArtProfile(item);if(!p)return null;
 const body=(icons[p.shape]||icons.token).replaceAll('BASE',p.base).replaceAll('SHADE',p.shade).replaceAll('SHINE',p.glint);
 const s=p.seed,offset=12+s%11;
 const corners=(s%3===0?'M8 16V8H16':s%3===1?'M48 8H56V16':'M8 48V56H16');
 const border=p.family==='material'?'#668d77':p.material==='metal'?'#9baaa4':'#887d63';
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64" role="img" data-oakrest-id="'+p.id+'">'+
  '<defs><linearGradient id="oakrest-back" x2="1" y2="1"><stop stop-color="#354c40"/><stop offset="1" stop-color="#182d29"/></linearGradient></defs>'+
  '<rect x="1.5" y="1.5" width="61" height="61" rx="8" fill="url(#oakrest-back)" stroke="'+border+'" stroke-width="2"/>'+
  '<path d="'+corners+'" fill="none" stroke="'+p.accent+'" opacity=".78" stroke-width="2"/>'+
  '<ellipse cx="32" cy="53" rx="23" ry="5" fill="#0b201d" opacity=".53"/>'+
  '<g fill="'+p.base+'" stroke-linejoin="round" stroke-linecap="round">'+body+'</g>'+
  '<circle cx="'+offset+'" cy="10" r="2" fill="'+p.accent+'"/>'+
  '<path d="M45 54l3 3 7-8" stroke="'+p.accent+'" stroke-width="1.8" fill="none" opacity=".55"/>'+
  '</svg>';
}
