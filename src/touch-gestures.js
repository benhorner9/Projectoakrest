// Safari can treat repeated combat taps or two simultaneous thumbs as page zoom.
// Guard only browser zoom gestures; do not cancel ordinary taps or single-finger drags.
export function shouldBlockPageZoom(target) {
  const element = target?.nodeType === 3 ? target.parentElement : target;
  return !element?.closest?.('#controls-panel');
}

export function installGameZoomGuard(doc = document) {
  const preventZoom = event => {
    if (event.cancelable !== false && shouldBlockPageZoom(event.target)) {
      event.preventDefault();
    }
  };
  const preventMultitouchZoom = event => {
    if (event.touches?.length > 1) preventZoom(event);
  };
  const zoomGestures = ['gesturestart', 'gesturechange', 'gestureend', 'dblclick'];
  for (const name of zoomGestures) doc.addEventListener(name, preventZoom, { passive: false });
  doc.addEventListener('touchmove', preventMultitouchZoom, { passive: false });
  return () => {
    for (const name of zoomGestures) doc.removeEventListener(name, preventZoom);
    doc.removeEventListener('touchmove', preventMultitouchZoom);
  };
}
