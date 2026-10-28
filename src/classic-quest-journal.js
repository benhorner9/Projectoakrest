/**
 * Oakrest's compact Classic quest journal. Reads the existing adventure projection;
 * this module deliberately does not mutate quests, save keys, currency or progression.
 */
const node=(tag,className,text,parent)=>{
 const element=document.createElement(tag);
 if(className)element.className=className;
 if(text!==undefined&&text!==null)element.textContent=text;
 parent?.append(element);
 return element;
};
const labels=Object.freeze({
 available:'Not started',
 active:'In progress',
 ready:'Ready to finish',
 completed:'Completed',
 locked:'Locked'
});
export function questStatusLabel(status){return labels[status]||'Unknown';}
export function questCompletionSummary(catalogue){
 const entries=Array.isArray(catalogue)?catalogue:[];
 return {completed:entries.filter(q=>q.status==='completed').length,total:entries.length};
}
export function renderClassicQuestJournal(root,adventure,{view='list',selectedQuest=null,onSelect,onBack,onTrack,findTarget}={}){
 const quests=adventure.catalogue||[],summary=questCompletionSummary(quests);
 root.replaceChildren();
 root.classList.toggle('oakrest-quest-detail-open',view==='detail');
 const entry=view==='detail'?quests.find(q=>q.id===selectedQuest):null;
 if(!entry){
  const overview=node('div','oakrest-quest-overview',null,root);
  const header=node('div','oakrest-quest-heading',null,overview);
  node('strong','', 'QUEST LIST',header);
  node('span','oakrest-quest-progress',summary.completed+' / '+summary.total+' complete',header);
  const legend=node('div','oakrest-quest-legend',null,overview);
  for(const [tone,label] of [['available','Not started'],['active','In progress'],['completed','Complete'],['locked','Locked']]){
   const item=node('span','oakrest-quest-legend-item status-'+tone,null,legend);
   node('span','oakrest-quest-legend-dot','●',item);
   node('span','',label,item);
  }
  const list=node('nav','oakrest-quest-scroll',null,root);
  list.setAttribute('aria-label','Quests in story order');
  // Canonical story order matters: do not sort by current completion status.
  for(const q of quests){
   const button=node('button','classic-quest-entry oakrest-quest-row status-'+q.status,null,list);
   button.type='button';
   button.dataset.questId=q.id;
   button.setAttribute('aria-label',q.title+', '+questStatusLabel(q.status)+(adventure.tracked===q.id?', tracked':''));
   const name=node('span','oakrest-quest-name',q.title,button);
   name.title=q.title;
   if(adventure.tracked===q.id)node('span','oakrest-quest-tracked','◆',button).title='Currently tracked';
   if(q.status==='completed')node('span','oakrest-quest-finished','✓',button).setAttribute('aria-hidden','true');
   button.addEventListener('click',()=>onSelect?.(q.id));
  }
  if(!quests.length)node('p','oakrest-quest-empty','No quests are available yet.',list);
  const footer=node('div','oakrest-quest-footer',null,root);
  node('span','', 'Select a quest to read its journal',footer);
  node('strong','',summary.completed+' / '+summary.total,footer);
  return;
 }
 const page=node('div','oakrest-quest-page',null,root);
 const toolbar=node('div','oakrest-quest-toolbar',null,page);
 const back=node('button','oakrest-quest-back','← Back to quests',toolbar);
 back.type='button';
 back.addEventListener('click',()=>onBack?.());
 node('span','oakrest-quest-toolbar-label','QUEST JOURNAL',toolbar);
 const body=node('div','oakrest-quest-page-scroll',null,page);
 node('h2','oakrest-quest-title',entry.title,body);
 node('p','oakrest-quest-state status-'+entry.status,questStatusLabel(entry.status),body);
 if(entry.status==='locked'){
  node('p','oakrest-quest-intro','Complete the earlier story quests to unlock this chapter.',body);
  if(entry.prerequisites?.length){
   node('h3','oakrest-quest-section','Requirements',body);
   const reqs=node('ul','oakrest-quest-objectives',null,body);
   for(const id of entry.prerequisites){
    const prerequisite=quests.find(q=>q.id===id);
    const complete=prerequisite?.status==='completed';
    node('li',complete?'done':'pending',(complete?'✓ ':'○ ')+(prerequisite?.title||id),reqs);
   }
  }
 }else{
  node('p','oakrest-quest-intro',entry.status==='completed'?entry.end:entry.intro,body);
  if(entry.status==='active'||entry.status==='ready'){
   node('h3','oakrest-quest-section','Journal objectives',body);
   const objectives=node('ul','oakrest-quest-objectives',null,body);
   for(const [flag,description] of entry.objectives||[]){
    const complete=entry.flags?.includes(flag);
    node('li',complete?'done':'pending',(complete?'✓ ':'○ ')+description,objectives);
   }
  }
  const contact=findTarget?.(entry.npc);
  const npcName=contact?.name||contact?.label||(entry.npc==='citizen:guard'?'Elowen':entry.npc==='service:forester'?'Alden':entry.npc.split(':').at(-1));
  if(entry.status==='available')node('p','oakrest-quest-contact','Speak to '+npcName+' to begin.',body);
  if(entry.status==='active'||entry.status==='ready')node('p','oakrest-quest-contact',
   (entry.status==='ready'?'Return to ':'Quest contact: ')+npcName,body);
  if(entry.status!=='completed'){
   const tracked=adventure.tracked===entry.id;
   const action=node('button','oakrest-quest-track',tracked?'✓ Currently tracked':'Track this quest',body);
   action.type='button';action.disabled=tracked;
   action.addEventListener('click',()=>onTrack?.(entry.id));
  }
 }
 if(entry.status!=='locked')node('p','oakrest-quest-reward','Reward: '+entry.coins+' coins'+(entry.status==='completed'?' · Claimed':''),body);
 node('h3','oakrest-quest-section','Adventure record',body);
 node('p','oakrest-quest-record','Hollow clears: '+adventure.clears+' · Discoveries: '+adventure.discoveries.length+'/2',body);
 if(adventure.run)node('p','oakrest-quest-record','Expedition: '+adventure.run.kills.length+'/6 guardians · '+adventure.run.wards.length+'/3 wards',body);
 node('p','oakrest-quest-record','Quests completed: '+summary.completed+' / '+summary.total,body);
}
