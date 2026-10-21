// Native menu pages. Quest content comes from the existing saved state, not a parallel quest model.
function element(parent,tag,text,cls){
 const node=parent.ownerDocument.createElement(tag);
 if(text!==undefined&&text!==null)node.textContent=String(text);
 if(cls)node.className=cls;
 parent.append(node);return node;
}
export function renderQuestPage(host,{area,defeated,quest,progress}){
 const root=element(host,'section',null,'oak-page');
 element(root,'h2','Quest Journal');
 element(root,'p','Active objectives and training progress','oak-page-subtitle');
 const card=element(root,'article',null,'oak-page-card');
 if(area==='tutorial'){
  element(card,'strong','The First Steps');
  element(card,'p','Land a successful hit with Melee, Ranged and Magic, complete your training, then claim your portal scroll.');
  element(card,'p','Track your current task using the tutorial instructions in the world.','oak-page-progress');
 }else if(area==='realm'){
  element(card,'strong','The Portal Realm');
  element(card,'p','Use the unlocked Oakrest gateway to enter the starting town. More portals will become available as you explore.');
 }else{
  element(card,'strong',defeated>=3?'First Challenge · Complete':'Your First Challenge');
  element(card,'p',quest);
  element(card,'p',progress,'oak-page-progress');
 }
 element(root,'p','Additional quests will appear as new regions and storylines become available.');
 return root;
}
export function renderWorldPage(host,{area,x=0,z=0}){
 const root=element(host,'section',null,'oak-page');
 element(root,'h2','World Map');
 element(root,'p','A visible Greenwood region guide without fog of war. Detailed terrain mapping will expand with the world.','oak-page-subtitle');
 if(area!=='world'){
  const card=element(root,'article',null,'oak-page-card');
  element(card,'strong',area==='tutorial'?'The First Steps':'Portal Realm');
  element(card,'p',area==='tutorial'?'Finish the combat tutorial to unlock your first travel scroll.':'The Oakrest gate is the first active portal. Enter it to reach the Greenwood.');
  return root;
 }
 const map=element(root,'div',null,'oak-region-map');
 map.setAttribute('role','img');
 map.setAttribute('aria-label','Schematic north-to-south Greenwood guide, with approximate player marker');
 map.style.setProperty('--map-x',Math.max(8,Math.min(92,(x+65)/130*100)).toFixed(1)+'%');
 map.style.setProperty('--map-y',Math.max(8,Math.min(92,(42-z)/155*100)).toFixed(1)+'%');
 for(const [name,label] of [['deep','Deep Greenwood'],['road','Forest Road'],['greenbelt','Greenbelt'],['village','Oakrest Town']])
  element(map,'span',label,'region '+name);
 element(map,'span','N ↑','north');
 element(map,'span','✥','player-marker');
 element(root,'p','✥ Your approximate position · This is a regional schematic, not a detailed terrain map.');
 return root;
}
