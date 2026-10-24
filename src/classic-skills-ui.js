import {skillBookSnapshot,CLASSIC_SKILLS} from './classic-skill-catalogue.js';
const make=(parent,tag,name,text)=>{const e=document.createElement(tag);if(name)e.className=name;if(text!==undefined)e.textContent=String(text);parent.append(e);return e;};
export function setupClassicSkills({combat,windowUi}){
 const host=document.getElementById('classic-skill-book');
 let selected='melee',lastKey='',lastPoll=-Infinity;
 function render(){
  if(windowUi.current()!=='skills')return;
  const skills=skillBookSnapshot(combat.sandboxSave());
  const current=skills.find(s=>s.id===selected)||skills[0];
  host.replaceChildren();
  const root=make(host,'div','classic-skill-layout');
  const sidebar=make(root,'nav','classic-skill-list');
  sidebar.setAttribute('aria-label','All character skills');
  for(const group of ['Combat','Gathering','Making']){
   make(sidebar,'h3','',group);
   const grid=make(sidebar,'div','classic-skill-grid');
   for(const skill of skills.filter(s=>s.group===group)){
    const button=make(grid,'button','classic-skill-card'+(selected===skill.id?' active':''));button.type='button';
    button.setAttribute('aria-pressed',String(selected===skill.id));button.setAttribute('aria-label',skill.name+' level '+skill.level+', inspect unlocks');
    make(button,'span','skill-icon',skill.icon);
    make(button,'span','skill-name',skill.name);
    make(button,'strong','skill-level',skill.level);
    button.addEventListener('click',()=>{selected=skill.id;render();});
   }
  }
  const detail=make(root,'section','classic-skill-detail');
  make(detail,'h2','',current.icon+' '+current.name);
  make(detail,'p','skill-description',current.description);
  make(detail,'div','skill-progress-heading',
   'Level '+current.level+' / 99 · '+current.totalXp.toLocaleString('en-GB')+' XP');
  const track=make(detail,'div','skill-xp-track');
  const fill=make(track,'div');fill.style.width=(100*current.progress).toFixed(2)+'%';
  make(detail,'p','skill-xp-caption',current.maxed?'Level 99 reached':
   current.needed.toLocaleString('en-GB')+' XP to level '+(current.level+1));
  make(detail,'h3','',current.next?'NEXT UNLOCK · Level '+current.next.level:'UNLOCKED METHODS');
  if(current.next)make(detail,'p','skill-next',current.next.name);
  make(detail,'h3','','LEVEL UNLOCKS');
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
  if(current.id==='fletching'||current.id==='inscription'||current.id==='cooking')
   make(detail,'p','skill-hint','Make these items in BAG → MAKE. No crafting table needed.');
  if(current.id==='blacksmithing')
   make(detail,'p','skill-hint','The forge is required for smelting and metalworking.');
  if(current.id==='woodcutting')
   make(detail,'p','skill-hint','Learn Woodcutting from Alden in the Forester’s Lodge; take an axe to the trees.');
  lastKey=JSON.stringify(skills.map(s=>[s.id,s.totalXp]));
 }
 return {open(){selected=CLASSIC_SKILLS.some(s=>s.id===selected)?selected:'melee';lastKey='';windowUi.open('skills');render();},
  render,
  tick(){if(windowUi.current()!=='skills')return;
   const time=combat.getState().time;
   if(time-lastPoll<.35)return;lastPoll=time;
   const key=JSON.stringify(skillBookSnapshot(combat.sandboxSave()).map(s=>[s.id,s.totalXp]));
   if(key!==lastKey)render();
  }};
}
