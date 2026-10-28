/** Oakrest-owned spellbook presentation only; no changes to ability rules/IDs. */
const KIND_ICONS=Object.freeze({
 hit:'slash',sweep:'sweep',shield:'shield',dash:'dash',dashback:'retreat',
 bolt:'bolt',burst:'burst',root:'root',nova:'nova',heal:'heal',
 execute:'execute',retreat:'retreat'
});
const STYLE_NAMES=Object.freeze({
 melee:'Melee techniques',magic:'Magic spellbook',ranged:'Ranged techniques'
});
export const classicBookIcon=kind=>KIND_ICONS[kind]||'combat';
export const classicBookStyleName=style=>STYLE_NAMES[style]||'Combat abilities';
