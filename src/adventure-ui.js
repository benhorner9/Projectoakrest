import {QUESTS,RECIPES,ADVENTURE_TARGETS,ADVENTURE_MATERIALS} from './adventure-content.js';
import {woodcuttingLevel} from './woodcutting.js';
const el=(tag,text,parent)=>{const e=document.createElement(tag);e.textContent=text;parent?.append(e);return e;};
export function setupAdventureUI({combat,player,windowUi,notify,changed,teleport,findTarget}){
 const dialog=document.getElementById('classic-dialogue'),title=document.getElementById('classic-dialogue-name'),body=document.getElementById('classic-dialogue-text');
 const content=el('div','',dialog);content.id='adventure-content';
 dialog.insertBefore(content,document.getElementById('classic-dialogue-close'));
 let current=null,lastWork='',selectedQuest=null,lastJournalKey='';
 const questBook=document.getElementById('classic-quest-book');
 const eatButton=el('button','Eat',document.querySelector('.classic-item-buttons'));eatButton.type='button';eatButton.id='adventure-eat';eatButton.title='Eat field ration (35 Health)';el('small','RATION',eatButton);
 const work=el('button','',document.querySelector('.classic-footer-events'));work.id='adventure-work';work.hidden=true;work.type='button';work.title='Cancel gathering or crafting';
 const tracker=el('button','',document.querySelector('.classic-sidebar-map'));tracker.id='adventure-journal';tracker.type='button';tracker.title='Open quest journal';
 const btn=(text,fn)=>{const b=el('button',text,content);b.type='button';b.addEventListener('click',fn);return b;};
 function open(){if(windowUi.current()!=='dialogue')windowUi.open('dialogue');content.hidden=false;body.textContent='';}
 function act(kind,choice){
  const result=combat.adventureAction(kind,{target:current,choice},player());notify(result?.reason||'Action unavailable');
  if(result?.ok){changed();if(result.teleport){windowUi.hide();teleport(result.teleport);}else if(kind==='gather'||kind==='craft'){windowUi.hide();}else render();}
  return result;
 }
 function talk(target){
  combat.adventureVisit(target.id);current=target;
  if(target.kind==='discovery'||target.kind==='entrance')act('inspect');
  if(['adventure-npc','station','resource','grove','discovery','entrance','exit','ward','heart'].includes(target.kind)||['citizen:guard','service:forester'].includes(target.id)){
   open();render();return true;
  }
  content.hidden=true;return false;
 }
 function render(){
  if(!current)return;
  content.replaceChildren();const state=combat.adventureState(),t=current;
  title.textContent=t.id==='citizen:guard'?'Elowen · north-gate warden':t.name;
  const offering=state.catalogue.filter(q=>q.npc===t.id&&['available','active','ready'].includes(q.status));
  if(offering.length){
   for(const q of offering){
    el('h3',q.title,content);
    el('p',q.status==='ready'?q.end:q.intro,content);
    if(q.status==='available')btn('Accept quest',()=>act('accept',q.id));
    else {
     for(const [id,description] of q.objectives)
      el('p',(q.flags.includes(id)?'✓ ':'○ ')+description,content);
     if(q.status==='ready')btn('Complete quest · '+q.coins+' coins',()=>act('finish',q.id));
     else btn('Track this quest',()=>act('track',q.id));
    }
   }
  }else el('p',({
   'adventure:rowan':'Try all three styles on the dummy. Red shapes warn where an enemy attack will land. Step clear or dodge before it flashes.',
   'adventure:smith':'Metalwork needs a real forge. Fletching, Inscription and Cooking happen from the backpack: select materials and choose MAKE or USE WITH.',
   'adventure:scout':'I am Nessa. Something is ringing below the hill. Read the old journal and memorial before judging the watch’s purpose.',
   'adventure:scribe':'A spell consumes one scroll. You can inscribe scrolls anywhere with reeds and other materials. Open BAG → MAKE; no writing desk is required.',
   'citizen:guard':state.catalogue.find(q=>q.id==='hollow')?.status==='completed'?'The watch needs your help keeping the Hollow stable.':'Your journal will point you to the next person who needs you.',
   'service:forester':'Carry an axe, select a softwood tree, and stay nearby while cutting. Bank excess logs or sell five at a time to Darrin.'
  })[t.id]||t.text||(t.kind==='grove'?'Woodcutting: stay beside the tree while chopping.':'Select an action below.'),content);
  if(t.id==='service:forester')btn('Learn Woodcutting / collect axe',()=>act('teach'));
  if(t.id==='adventure:smith')el('p','The anvil is east of Brann for metalwork. All field supplies can be made from the BAG → MAKE menu, anywhere outside combat.',content);
  if(t.id==='adventure:scout'&&state.catalogue.find(q=>q.id==='outpost')?.status==='active'){
   btn('The watch protected the living forest',()=>act('answer','protect'));
   btn('The watch hid a treasure vault',()=>act('answer','treasure'));
  }
  if(t.id==='citizen:guard'&&state.catalogue.find(q=>q.id==='seal')?.status==='active')btn('Check my expedition supplies',()=>act('prepare'));
  if(t.id==='citizen:guard'&&state.catalogue.find(q=>q.id==='hollow')?.status==='completed')btn('Supply the watch · 2 shards',()=>act('contract'));
  if(t.id==='adventure:stump')btn('Calm guardian · 1 restoration seal',()=>act('calm'));
  if(t.id==='adventure:spring')btn('Rest and recover Health',()=>act('rest'));
  if(t.kind==='resource'||t.kind==='grove')btn(t.kind==='grove'||t.material==='softwood-logs'?'Chop softwood':'Gather resource',()=>act('gather'));
  if(t.kind==='station'){
   const data=combat.sandboxSave();
   for(const r of RECIPES.filter(r=>r.station===t.station)){
    const row=el('section','',content);row.className='adventure-recipe';el('strong',r.title,row);
    el('p',Object.entries(r.cost).map(([id,n])=>(ADVENTURE_MATERIALS[id]?.[0]||id)+': '+(data.inventory.materials[id]||0)+' / '+n).join(' · '),row);
    if(r.profession)el('small',r.profession+' '+woodcuttingLevel(state.skills[r.profession]).level+' / requires '+r.level,row);
    const b=el('button','Craft',row);b.type='button';b.addEventListener('click',()=>act('craft',r.id));
   }
  }
  if(t.kind==='entrance')btn(state.run&&!state.run.complete?'Resume expedition':'Begin expedition · 1 seal',()=>act('enter'));
  if(t.kind==='exit')btn('Return to forest',()=>act('leave'));
  if(t.kind==='ward')btn('Restore chamber ward',()=>act('ward'));
  if(t.kind==='heart')btn('Restore the keeper’s heart',()=>act('heart'));
  btn('View quest journal',showJournal);
 }
 function showJournal(){
  current=null;windowUi.open('quests');
  if(windowUi.current()==='quests'){lastJournalKey='';renderJournal();}
 }
 function renderJournal(){
  if(windowUi.current()!=='quests')return;
  const a=combat.adventureState();
  const selected=a.catalogue.find(q=>q.id===selectedQuest);
  if(!selectedQuest||!selected||selected.status==='locked'&&selectedQuest===a.tracked)
   selectedQuest=a.tracked||a.catalogue.find(q=>q.status==='active'||q.status==='available')?.id||a.catalogue[0]?.id;
  const entry=a.catalogue.find(q=>q.id===selectedQuest);
  const scroll=questBook.querySelector(".classic-quest-detail")?.scrollTop||0;
  questBook.replaceChildren();
  const layout=el('div','',questBook);layout.className='classic-quest-layout';
  const left=el('nav','',layout);left.className='classic-quest-list';left.setAttribute('aria-label','Quest list');
  const detail=el('section','',layout);detail.className='classic-quest-detail';
  const groups=[['In progress',['active','ready']],['Available',['available']],['Completed',['completed']],['Locked',['locked']]];
  for(const [heading,statuses] of groups){
   const entries=a.catalogue.filter(q=>statuses.includes(q.status));
   if(!entries.length)continue;
   el('h3',heading+' ('+entries.length+')',left);
   for(const q of entries){
    const b=el('button',(q.status==='completed'?'✓ ':q.status==='ready'?'◆ ':q.status==='locked'?'◌ ':'✦ ')+q.title,left);
    b.type='button';b.className='classic-quest-entry status-'+q.status;
    if(q.id===selectedQuest)b.classList.add('selected');
    b.setAttribute('aria-current',q.id===selectedQuest?'true':'false');
    b.addEventListener('click',()=>{selectedQuest=q.id;renderJournal();});
   }
  }
  if(!entry)return;
  el('h2',entry.title,detail);
  el('p',({available:'Available to start',active:'Quest in progress',
   ready:'Ready to complete',completed:'Quest completed',locked:'Not yet unlocked'})[entry.status],detail).className='quest-state status-'+entry.status;
  if(entry.status==='locked'){
   el('h3','Requirements',detail);
   for(const dep of entry.prerequisites){
    const prerequisite=a.catalogue.find(q=>q.id===dep);
    el('p',(prerequisite?.status==='completed'?'✓ ':'○ ')+(prerequisite?.title||dep),detail);
   }
  }else{
   el('p',entry.status==='completed'?entry.end:entry.intro,detail);
   if(entry.status==='active'||entry.status==='ready'){
    el('h3','Objectives',detail);
    for(const [flag,description] of entry.objectives)
     el('p',(entry.flags.includes(flag)?'✓ ':'○ ')+description,detail).className=entry.flags.includes(flag)?'quest-done':'';
   }
   if(entry.status==='available')el('p','Speak to '+(entry.npc==='citizen:guard'?'Elowen':entry.npc==='service:forester'?'Alden':entry.npc.split(':')[1])+' to begin.',detail);
   if(entry.status!=='completed'){
    const b=el('button',a.tracked===entry.id?'✓ Currently tracked':'Track this quest',detail);
    b.disabled=a.tracked===entry.id;b.type='button';
    b.addEventListener('click',()=>{
     const result=combat.adventureAction('track',{choice:entry.id},player());
     notify(result.reason);if(result.ok){changed();renderJournal();}
    });
   }
  }
  if(['active','ready'].includes(entry.status))el('p','Quest contact: '+(findTarget(entry.npc)?.name||findTarget(entry.npc)?.label||entry.npc.split(':')[1]),detail);
  detail.scrollTop=scroll;
  el('p','Reward: '+entry.coins+' coins',detail).className='quest-reward';
  if(entry.status==='completed')el('p','You have finished this quest.',detail);
  el('h3','Your adventure',detail);
  el('p','Hollow clears: '+a.clears+' · Discoveries: '+a.discoveries.length+'/2',detail);
  if(a.run)el('p','Expedition: '+a.run.kills.length+'/6 guardians · '+a.run.wards.length+'/3 wards',detail);
  const total=a.catalogue.filter(q=>q.status==='completed').length;
  el('p','Quests completed: '+total+' / '+a.catalogue.length,detail);
  lastJournalKey=JSON.stringify([a.tracked,a.catalogue.map(q=>[q.id,q.status,q.flags]),a.clears,a.discoveries,a.run?.kills,a.run?.wards]);
 }
 function objective(){
  const a=combat.adventureState(),q=a.quest;
  if(!q)return null;
  const progress=a.catalogue.find(x=>x.id===q.id);
  if(!progress||['completed','locked'].includes(progress.status))return null;
  if(progress.status==='available'||progress.status==='ready')return findTarget(q.npc);
  const key=q.objectives.find(o=>!progress.flags.includes(o[0]))?.[0];
  if(key?.startsWith('visit:'))return findTarget(key.slice(6));
  const ids={'hit:melee':'rowan','hit:magic':'rowan','hit:ranged':'rowan','gather:copper-ore':'copper',
   'gather:tin-ore':'tin','gather:softwood-logs':'softwood','craft:useful':'smith',
   'inspect:cart':'cart','inspect:tracks':'tracks','inspect:stump':'stump',
   'resolve:guardian':'stump','inspect:journal':'journal','inspect:memorial':'memorial',
   'solve:watch':'scout','prepare:supplies':'smith','inspect:entrance':'entrance',
   'dungeon:clear':'entrance'};
  return findTarget('adventure:'+ids[key]);
 }
 tracker.addEventListener('click',showJournal);eatButton.addEventListener('click',()=>act('eat'));work.addEventListener('click',()=>act('cancel'));
 return {talk,showJournal,objective,hideContent:()=>{content.hidden=true;},tick(){
  const a=combat.adventureState(),state=combat.getState();
  const text=a.work?a.work.name+' · '+Math.max(0,a.work.end-state.time).toFixed(1)+'s · tap to cancel':'';
  if(text!==lastWork){work.textContent=text;work.hidden=!text;lastWork=text;}
  const tracking=a.catalogue.find(q=>q.id===a.tracked);
  tracker.textContent=tracking?(tracking.status==='completed'?'✓ ':tracking.status==='ready'?'◆ ':tracking.status==='active'?'✦ ':'! ')+tracking.title:'✓ All quests complete';
  if(windowUi.current()==='quests'){
   const key=JSON.stringify([a.tracked,a.catalogue.map(q=>[q.id,q.status,q.flags]),a.clears,a.discoveries,a.run?.kills,a.run?.wards]);
   if(key!==lastJournalKey)renderJournal();
  }
  eatButton.disabled=state.hp<=0;tracker.hidden=!document.getElementById('classic-creator').hidden;
 }};
}
