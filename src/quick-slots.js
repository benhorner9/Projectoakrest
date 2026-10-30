/** Four configured combat abilities plus four fixed, non-assignable utility controls.
 * Legacy saves may contain item or gear quick-slot bindings. They are migrated
 * to this safe layout; owned items and weapon-specific ability loadouts remain.
 */
export const DEFAULT_QUICK_SLOTS=Object.freeze(['ability0','ability1','ability2','ability3','eat','drink','dodge','attack']);
export const QUICK_ACTIONS=Object.freeze([...DEFAULT_QUICK_SLOTS,'inventory','equipment','quests','skills','map']);

/** Never load old item/weapon bindings onto the combat bar. */
export function normalizeQuickSlots(raw){
 return Array.isArray(raw)?DEFAULT_QUICK_SLOTS.slice():null;
}

/** Retained for old integrations; changing combat-bar bindings is prohibited. */
export function assignQuickSlot(){
 return null;
}
