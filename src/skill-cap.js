/** Current gameplay chapter cap. Higher content is a preview, not an unlock.
 * Raising this constant requires a reviewed progression/zone/content release. */
export const CURRENT_SKILL_CAP=60;

/** Future guide silhouettes are deliberately NON-AUTHORITATIVE. No recipe,
 * resource, combat ability or loot table is generated from this list. */
export const SKILL_FUTURE_TEASERS=Object.freeze({
 melee:[{level:70,name:'Forgotten combat techniques',detail:'A future chapter may reveal new ways to fight.'}],
 ranged:[{level:70,name:'Long-range disciplines',detail:'Beyond the current frontier — methods unrevealed.'}],
 magic:[{level:70,name:'Ancient spellcraft',detail:'The next spellcraft chapter remains sealed.'}],
 vitality:[{level:70,name:'Wilderness endurance',detail:'Future challenges will test how far adventurers can go.'}],
 mining:[{level:70,name:'Unexplored mineral seams',detail:'New regions and ores have yet to be revealed.'}],
 foraging:[{level:70,name:'Uncharted flora',detail:'Unknown woodland ingredients await future exploration.'}],
 blacksmithing:[{level:70,name:'Forgotten alloys',detail:'Future forging methods and materials remain undiscovered.'}],
 fletching:[{level:70,name:'Master bowcraft',detail:'Future ranged equipment plans are under wraps.'}],
 inscription:[{level:70,name:'Sealed inscriptions',detail:'Older magical techniques are still a mystery.'}],
 cooking:[{level:70,name:'Beyond the frontier',detail:'Later journeys may call for specialist field provisions.'}]
});
export function futureSkillTeasers(skill){
 return (SKILL_FUTURE_TEASERS[skill]||[]).map(entry=>({
  ...entry,type:'Future chapter',previewOnly:true,authoritative:false
 }));
}
