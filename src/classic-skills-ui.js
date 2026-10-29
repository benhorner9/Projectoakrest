import {skillBookSnapshot,CLASSIC_SKILLS} from './classic-skill-catalogue.js';
const make=(parent,tag,name,text)=>{const e=document.createElement(tag);if(name)e.className=name;if(text!==undefined)e.textContent=String(text);parent.append(e);return e;};
export function setupClassicSkills({combat,windowUi}){
 const host=document.getElementById('classic-skill-book');
 const popup=document.createElement('dialog');
 popup.id='classic-skill-popup';popup.className='oakrest-skill-popup';
 popup.setAttribute('aria-labelledby','classic-skill-popup-title');
 const header=make(popup,'header','oakrest-skill-popup-header');
 const title=make(header,'strong','', 'SKILL UNLOCKS');title.id='classic-skill-popup-title';
 const close=make(header,'button','oakrest-skill-popup-close','×');
 close.id='classic-skill-popup-close';
 close.type='button';close.setAttribute('aria-label','Close skill unlocks');
 const popupContent=make(popup,'div','oakrest-skill-popup-content');
 document.getElementById('classic-app').append(popup);
 let selected='melee',rendered=null,lastKey='',lastPoll=-Infinity;
 const showSkill=id=>{
  selected=id;
  render();
  if(!popup.open)popup.showModal();
  renderDetail(skillBookSnapshot(combat.sandboxSave()).find(s=>s.id===selected));
 };
 close.addEventListener('click',()=>popup.close());
 popup.addEventListener('click',e=>{if(e.target===popup)popup.close();});
 popup.addEventListener('keydown',e=>e.stopPropagation());
 popup.addEventListener('close',()=>host.querySelector('.classic-skill-card[data-skill-id="'+selected+'"]')?.focus({preventScroll:true}));
 windowUi.subscribe?.(name=>{if(name!=='skills'&&popup.open)popup.close();});
 function renderDetail(current){
  if(!current)return;
  const scroll=rendered===selected?popupContent.querySelector('.classic-skill-detail')?.scrollTop||0:0;
  popupContent.replaceChildren();
  const detail=make(popupContent,'section','classic-skill-detail');
  make(detail,'h2','',current.icon+' '+current.name);
  make(detail,'p','skill-description',current.description);
  make(detail,'div','skill-progress-heading',
   'Level '+current.level+' / '+current.cap+' · '+current.totalXp.toLocaleString('en-GB')+' XP');
  const track=make(detail,'div','skill-xp-track');
  const fill=make(track,'div');fill.style.width=(100*current.progress).toFixed(2)+'%';
  make(detail,'p','skill-xp-caption',current.maxed?'CURRENT LEVEL CAP REACHED — '+current.cap+'/'+current.cap:
   current.needed.toLocaleString('en-GB')+' XP to level '+(current.level+1));
  make(detail,'h3','',current.next?'NEXT UNLOCK · Level '+current.next.level:'UNLOCKED METHODS');
  if(current.next)make(detail,'p','skill-next',current.next.name);
  make(detail,'h3','','AVAILABLE THIS CHAPTER — LEVELS 1–'+current.cap);
  if(!current.milestones.length)make(detail,'p','skill-description','More training methods will arrive as Oakrest grows.');
  for(const m of current.milestones){
   const unlocked=m.level<=current.level;
   const row=make(detail,'div','classic-skill-unlock'+(unlocked?' unlocked':' locked'));
   make(row,'span','skill-unlock-level','LV '+m.level);
   const text=make(row,'div','skill-unlock-text');
   make(text,'strong','',m.name);
   make(text,'small','',m.type+' · '+m.detail);
   make(row,'span','skill-unlock-status',unlocked?'✓':'○');
  }
  // Future entries are lore/teasers only: not used by crafting, gathering,
  // item requirements or the authoritative unlock table.
  if(current.future.length){
   make(detail,'h3','skill-future-heading','BEYOND THE HORIZON');
   make(detail,'p','skill-description skill-future-intro',
    'Sealed until a future level-cap expansion. Preview only — cannot unlock yet.');
   for(const m of current.future){
    const row=make(detail,'div','classic-skill-unlock future-preview');
    make(row,'span','skill-unlock-level','LV '+m.level);
    const copy=make(row,'div','skill-unlock-text');
    make(copy,'strong','',m.name);
    make(copy,'small','',m.detail);
    make(row,'span','skill-unlock-status','🔒');
   }
  }
  if(current.id==='fletching'||current.id==='inscription'||current.id==='cooking')
   make(detail,'p','skill-hint','Make these items in BAG → MAKE. No crafting table needed.');
  if(current.id==='blacksmithing')
   make(detail,'p','skill-hint','The forge is required for smelting and metalworking.');
  if(current.id==='woodcutting')
   make(detail,'p','skill-hint','Learn Woodcutting from Alden in the Forester’s Lodge; take an axe to the trees.');
  detail.scrollTop=scroll;rendered=selected;

 }
 function render(){
  if(windowUi.current()!=='skills')return;
  const skills=skillBookSnapshot(combat.sandboxSave());
  host.replaceChildren();
  const root=make(host,'div','classic-skill-layout');
  const sidebar=make(root,'nav','classic-skill-list');
  sidebar.setAttribute('aria-label','All character skills');
  for(const group of ['Combat','Gathering','Making']){
   make(sidebar,'h3','',group);
   const grid=make(sidebar,'div','classic-skill-grid');
   for(const skill of skills.filter(s=>s.group===group)){
    const button=make(grid,'button','classic-skill-card');
    button.type='button';button.dataset.skillId=skill.id;
    button.setAttribute('aria-label',skill.name+' level '+skill.level+', inspect unlocks');
    make(button,'span','skill-icon',skill.icon);
    make(button,'span','skill-name',skill.name);
    make(button,'strong','skill-level',skill.level);
    button.addEventListener('click',()=>showSkill(skill.id));
   }
  }
  if(popup.open)renderDetail(skills.find(s=>s.id===selected));
  lastKey=JSON.stringify(skills.map(s=>[s.id,s.totalXp]));
 }
 return {open(){selected=CLASSIC_SKILLS.some(s=>s.id===selected)?selected:'melee';lastKey='';windowUi.open('skills');render();},
  render,closePopup:()=>{if(popup.open)popup.close();},
  tick(){if(windowUi.current()!=='skills')return;
   const time=combat.getState().time;
   if(time-lastPoll<.35)return;lastPoll=time;
   const key=JSON.stringify(skillBookSnapshot(combat.sandboxSave()).map(s=>[s.id,s.totalXp]));
   if(key!==lastKey)render();
  }};
}
