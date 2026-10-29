import {CLASSIC_WORLD_ZONES,worldZoneAt,findWorldZone,
 worldZoneBlueprint,worldZoneBrief,worldZoneEntities} from './classic-world-atlas.js';

/** Read-only Zone Inspector in the existing full-map sidebar.
 * Selecting an area never writes a character save, changes combat,
 * teleports the player or publishes source code. No fake admin permission.
 */
export function setupClassicWorldAtlas({root,canvas,onChange=()=>{}}){
 const doc=root.ownerDocument;
 const make=(tag,className,text,parent)=>{
  const e=doc.createElement(tag);if(className)e.className=className;
  if(text!==undefined)e.textContent=text;parent?.append(e);return e;
 };
 const intro=root.querySelector('.classic-modal-intro');
 const toolbar=make('section','oakrest-atlas-toolbar');
 toolbar.setAttribute('aria-label','World atlas area selection');
 const top=make('div','oakrest-atlas-controls',null,toolbar);
 const modeButton=make('button','oakrest-atlas-mode','Inspect map',top);
 modeButton.type='button';modeButton.id='oakrest-atlas-mode';modeButton.setAttribute('aria-pressed','false');
 const label=make('label','oakrest-atlas-picker-label','AREA',top);
 const picker=make('select','oakrest-atlas-picker',null,label);
 picker.id='oakrest-atlas-picker';picker.setAttribute('aria-label','Select named Oakrest area');
 for(const zone of CLASSIC_WORLD_ZONES){
  const option=make('option','',zone.name+' · '+zone.id,picker);option.value=zone.id;
 }
 root.insertBefore(toolbar,canvas);
 const panel=make('section','oakrest-atlas-panel');
 panel.setAttribute('aria-label','Selected zone reference');
 const heading=make('strong','oakrest-atlas-title','',panel);
 const subtitle=make('p','oakrest-atlas-id','',panel);
 const description=make('p','oakrest-atlas-description','',panel);
 const counts=make('p','oakrest-atlas-counts','',panel);
 const actions=make('div','oakrest-atlas-actions',null,panel);
 const copyBrief=make('button','','Copy area brief',actions);
 const copyJSON=make('button','','Copy JSON',actions);
 copyBrief.id='oakrest-atlas-copy-brief';copyJSON.id='oakrest-atlas-copy-json';
 const expand=make('details','oakrest-atlas-details',null,panel);
 make('summary','','Read or manually copy the brief',expand);
 const preview=make('textarea','oakrest-atlas-preview','',expand);
 preview.readOnly=true;preview.rows=6;preview.setAttribute('aria-label','Area brief for copying into ChatGPT');
 const status=make('p','oakrest-atlas-status','Read-only atlas. No world edits are published.',panel);
 status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 canvas.insertAdjacentElement('afterend',panel);

 let selectedId=CLASSIC_WORLD_ZONES[0].id,inspecting=false;
 const show=()=>{
  const zone=findWorldZone(selectedId),entities=worldZoneEntities(selectedId);
  picker.value=selectedId;
  heading.textContent=zone.name;
  subtitle.textContent=zone.id+' · '+zone.region+' · '+(zone.safe?'Safe zone':'Adventure zone');
  description.textContent=zone.description;
  counts.textContent=entities.filter(e=>e.type==='npc').length+' NPCs · '+
   entities.filter(e=>e.type==='enemy').length+' enemy spawns · '+
   entities.filter(e=>e.type==='interaction').length+' interactions';
  preview.value=worldZoneBrief(selectedId);
  onChange(selectedId);
 };
 const select=id=>{if(!findWorldZone(id))return false;selectedId=id;show();return true;};
 const setInspect=value=>{
  inspecting=!!value;
  modeButton.setAttribute('aria-pressed',String(inspecting));
  modeButton.textContent=inspecting?'Inspecting · tap an area':'Inspect map';
  canvas.style.cursor=inspecting?'crosshair':'pointer';
  if(intro)intro.textContent=inspecting?
   'Tap a named map area to inspect it. No walking orders will be sent.':
   'Tap to walk, or choose Inspect map to select and copy an area reference.';
  status.textContent=inspecting?'Inspect mode: tapping the map will not move your character.':
   'Travel mode: tapping the map sets a walking destination.';
 };
 async function copy(text){
  preview.value=text;
  try{
   if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');
   await navigator.clipboard.writeText(text);
   status.textContent='Copied. Paste the reference into ChatGPT and describe the change.';
  }catch{
   expand.open=true;preview.focus();preview.select();
   status.textContent='The clipboard is unavailable here. Select and copy the text shown below.';
  }
 }
 picker.addEventListener('change',()=>select(picker.value));
 modeButton.addEventListener('click',()=>setInspect(!inspecting));
 copyBrief.type='button';copyBrief.addEventListener('click',()=>copy(worldZoneBrief(selectedId)));
 copyJSON.type='button';copyJSON.addEventListener('click',()=>copy(JSON.stringify(worldZoneBlueprint(selectedId),null,2)));
 show();setInspect(false);
 return {selectedId:()=>selectedId,isInspecting:()=>inspecting,
  select,selectAt:point=>select(worldZoneAt(point)?.id),setInspect,
  exportBrief:()=>worldZoneBrief(selectedId),blueprint:()=>worldZoneBlueprint(selectedId)};
}
