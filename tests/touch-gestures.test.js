import test from 'node:test';
import assert from 'node:assert/strict';
import { installGameZoomGuard, shouldBlockPageZoom } from '../src/touch-gestures.js';

function fakeDocument() {
  const listeners = new Map();
  return {
    listeners,
    addEventListener(type, fn, opts) { listeners.set(type, { fn, opts }); },
    removeEventListener(type, fn) { if (listeners.get(type)?.fn === fn) listeners.delete(type); },
    dispatch(type, event) { listeners.get(type).fn(event); },
  };
}
function fakeEvent(touches=[]) {
  return { target: { closest: () => null }, touches, cancelable: true,
    canceled: false, preventDefault() { this.canceled = true; } };
}

test('prevents iOS Safari pinch and gesture zoom using non-passive listeners', () => {
  const doc=fakeDocument(); const cleanup=installGameZoomGuard(doc);
  for (const type of ['gesturestart','gesturechange','gestureend','dblclick']) {
    const e=fakeEvent(); doc.dispatch(type,e); assert.equal(e.canceled,true,type);
    assert.equal(doc.listeners.get(type).opts.passive,false);
  }
  cleanup(); assert.equal(doc.listeners.size,0);
});
test('two simultaneous thumbs cannot scroll or scale the page', () => {
  const doc=fakeDocument(); installGameZoomGuard(doc);
  const single=fakeEvent([{}]); doc.dispatch('touchmove',single); assert.equal(single.canceled,false);
  const multi=fakeEvent([{},{}]); doc.dispatch('touchmove',multi); assert.equal(multi.canceled,true);
});
test('does not intercept camera sensitivity controls or non-cancelable events', () => {
  const doc=fakeDocument(); installGameZoomGuard(doc);
  const slider=fakeEvent([{},{}]); slider.target.closest=selector => selector==='#controls-panel'?{}:null;
  doc.dispatch('touchmove',slider); assert.equal(slider.canceled,false);
  const nonCancelable=fakeEvent();nonCancelable.cancelable=false;
  doc.dispatch('gesturestart',nonCancelable);assert.equal(nonCancelable.canceled,false);
  assert.equal(shouldBlockPageZoom(slider.target),false);
});
