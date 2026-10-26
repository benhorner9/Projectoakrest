/** Character-owned bindings; abilities refer to the current style's slot. */
export const DEFAULT_QUICK_SLOTS=Object.freeze(['ability0','ability1','ability2','ability3','eat','drink','dodge','attack']);
export const QUICK_ACTIONS=Object.freeze([...DEFAULT_QUICK_SLOTS,'inventory','equipment','quests','skills','map']);
export function normalizeQuickSlots(raw,knownItem=()=>false){
 if(!Array.isArray(raw))return null;
 const seen=new Set();
 return Array.from({length:8},(_,i)=>{
  const key=raw[i];
  if(typeof key!=='string'||seen.has(key)||!QUICK_ACTIONS.includes(key)&&!knownItem(key))return null;
  seen.add(key);return key;
 });
}
export function assignQuickSlot(current,index,binding){
 if(!Number.isInteger(index)||index<0||index>=8)return null;
 const next=(current||DEFAULT_QUICK_SLOTS).slice(),previous=next[index];
 const other=binding===null?-1:next.indexOf(binding);
 if(other>=0&&other!==index)next[other]=previous;
 next[index]=binding;return next;
}
