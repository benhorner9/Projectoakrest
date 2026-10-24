import {QUESTS,RECIPES,ADVENTURE_TARGETS,ADVENTURE_MATERIALS} from './adventure-content.js';
import {woodcuttingLevel} from './woodcutting.js';
const el=(tag,text,parent)=>{const e=document.createElement(tag);e.textContent=text;parent?.append(e);return e;};
export function setupAdventureUI({combat,player,windowUi,notify,changed,teleport,findTarget}){
 const dialog=document.getElementById('classic-dialogue'),title=document.getElementById('classic-dialogue-name'),body=document.getElementById('classic-dialogue-text');
 const content=el('div','',dialog);content.id='adventure-content';
 dialog.insertBefore(content,document.getElementById('classic-dialogue-close'));
 let current=null,journal=false,lastWork='';
 const eatButton=el('button','Eat',document.querySelector('.classic-item-buttons'));eatButton.type='button';eatButton.id='adventure-eat';eatButton.title='Eat field ration (35 Health)';el('small','RATION',eatButton);
 const work=el('button','',document.body);work.id='adventure-work';work.hidden=true;work.type='button';work.title='Cancel gathering or crafting';
 const tracker=el('button','',document.querySelector('.classic-panel'));tracker.id='adventure-journal';tracker.type='button';tracker.title='Open quest journal';
 const btn=(text,fn)=>{const b=el('button',text,content);b.type='button';b.addEventListener('click',fn);return b;};
 function open(){if(windowUi.current()!=='dialogue')windowUi.open('dialogue');content.hidden=false;body.textContent='';}
 function act(kind,choice){
  const result=combat.adventureAction(kind,{target:current,choice},player());notify(result?.reason||'Action unavailable');
  if(result?.ok){changed();if(result.teleport){windowUi.hide();teleport(result.teleport);}else if(kind==='gather'||kind==='craft'){windowUi.hide();}else render();}
  return result;
 }
 function talk(target){
  combat.adventureVisit(target.id);current=target;journal=false;
  if(target.kind==='discovery'||target.kind==='entrance')act('inspect');
  if(['adventure-npc','station','resource','grove','discovery','entrance','exit','ward','heart'].includes(target.kind)||['citizen:guard','service:forester'].includes(target.id)){
   open();render();return true;
  }
  content.hidden=true;return false;
 }
 function render(){
  if(journal){renderJournal();return;}
  if(!current)return;
  content.replaceChildren();const state=combat.adventureState(),q=state.quest,t=current;
  title.textContent=t.id==='citizen:guard'?'Elowen · north-gate warden':t.name;
  if(q?.npc===t.id){
   el('h3',q.title,content);el('p',state.accepted?(state.ready?q.end:q.intro):q.intro,content);
   if(!state.accepted)btn('Accept quest',()=>act('accept'));
   else {for(const [id,text] of q.objectives)el('p',(state.flags.includes(id)?'✓ ':'○ ')+text,content);if(state.ready)btn('Complete quest · '+q.coins+' coins',()=>act('finish'));}
  }else el('p',({
   'adventure:rowan':'Try all three styles on the dummy. Red shapes warn where an enemy attack will land. Step clear or dodge before it flashes.',
   'adventure:smith':'The forge turns copper and tin into bronze. Take your metal to the anvil for shields and helms. Equip your work from the backpack.',
   'adventure:scout':'I am Nessa. Something is ringing below the hill. Read the old journal and memorial before judging the watch’s purpose.',
   'adventure:scribe':'One spell, one scroll. Frostwood uses frost scrolls; Ember uses ember scrolls. Reeds and timber make a renewable supply.',
   'citizen:guard':state.index===8?'The watch needs your help keeping the Hollow stable.':'Your journal will point you to the next person who needs you.',
   'service:forester':'Carry an axe, select a softwood tree, and stay nearby while cutting. Bank excess logs or sell five at a time to Darrin.'
  })[t.id]||t.text||(t.kind==='grove'?'Woodcutting: stay beside the tree while chopping.':'Select an action below.'),content);
  if(t.id==='service:forester')btn('Learn Woodcutting / collect axe',()=>act('teach'));
  if(t.id==='adventure:smith')el('p','Forge: just east of Brann. Quarry: outside the north gate, west path.',content);
  if(t.id==='adventure:scout'&&state.index===5&&state.accepted){
   btn('The watch protected the living forest',()=>act('answer','protect'));
   btn('The watch hid a treasure vault',()=>act('answer','treasure'));
  }
  if(t.id==='citizen:guard'&&state.index===6)btn('Check my expedition supplies',()=>act('prepare'));
  if(t.id==='citizen:guard'&&state.index===8)btn('Supply the watch · 2 shards',()=>act('contract'));
  if(t.id==='adventure:stump')btn('Calm guardian · 1 restoration seal',()=>act('calm'));
  if(t.id==='adventure:spring'||t.id==='adventure:cook')btn('Rest and recover Health',()=>act('rest'));
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
 function showJournal(){journal=true;current=null;open();renderJournal();}
 function renderJournal(){
  title.textContent='The First Adventure';content.replaceChildren();const a=combat.adventureState();
  el('p','Begin at Elowen by the village square. Gold diamonds on the map show people, supplies and discoveries. Your next objective is marked with a bright ring.',content);
  for(const [i,q] of QUESTS.entries()){
   const d=el('details','',content);d.open=i===a.index;
   el('summary',(i<a.index?'✓ ':i===a.index?'◆ ':'○ ')+q.title,d);
   el('p',i<a.index?q.end:q.intro,d);
   if(i===a.index){
    for(const [id,text] of q.objectives)el('p',(a.flags.includes(id)?'✓ ':'○ ')+text,d);
    el('p',a.accepted?(a.ready?'Return to your quest giver.':'Quest in progress.'):'Speak to the quest giver to accept.',d);
   }
   el('small','Reward: '+q.coins+' coins',d);
  }
  el('h3','Professions',content);
  for(const [name,xp] of Object.entries(a.skills))el('p',name+' · level '+woodcuttingLevel(xp).level+' · '+xp+' XP',content);
  el('p','Woodcutting · level '+woodcuttingLevel(combat.sandboxSave().professions.woodcuttingXp).level,content);
  el('p','Hollow clears: '+a.clears+' · Discoveries: '+a.discoveries.length+'/2',content);
  if(a.run)el('p','Current expedition: '+a.run.kills.length+'/6 guardians · '+a.run.wards.length+'/3 wards · '+Math.floor(a.run.seconds/60)+' min',content);
  el('p','After the story: repeat the Hollow, forge improved level-6 weapons, sell timber, and supply Elowen’s watch. Existing gear level requirements still apply.',content);
 }
 function objective(){
  const a=combat.adventureState(),q=a.quest;if(!q)return ADVENTURE_TARGETS.find(t=>t.kind==='entrance');
  if(!a.accepted||a.ready)return findTarget(q.npc);
  const key=q.objectives.find(o=>!a.flags.includes(o[0]))?.[0];
  if(key?.startsWith('visit:'))return findTarget(key.slice(6));
  const ids={'hit:melee':'rowan','hit:magic':'rowan','hit:ranged':'rowan','gather:copper-ore':'copper','gather:tin-ore':'tin','gather:softwood-logs':'softwood','craft:useful':'fletch','inspect:cart':'cart','inspect:tracks':'tracks','inspect:stump':'stump','resolve:guardian':'stump','inspect:journal':'journal','inspect:memorial':'memorial','solve:watch':'scout','prepare:supplies':'inscribe','inspect:entrance':'entrance','dungeon:clear':'entrance'};
  return findTarget('adventure:'+ids[key]);
 }
 tracker.addEventListener('click',showJournal);eatButton.addEventListener('click',()=>act('eat'));work.addEventListener('click',()=>act('cancel'));
 return {talk,showJournal,objective,hideContent:()=>{content.hidden=true;},tick(){
  const a=combat.adventureState(),state=combat.getState();
  const text=a.work?a.work.name+' · '+Math.max(0,a.work.end-state.time).toFixed(1)+'s · tap to cancel':'';
  if(text!==lastWork){work.textContent=text;work.hidden=!text;lastWork=text;}
  tracker.textContent=a.quest?(a.accepted?'◆ ':'! ')+a.quest.title:'✓ First Adventure complete';
  eatButton.disabled=state.hp<=0;tracker.hidden=!document.getElementById('classic-creator').hidden;
 }};
}
