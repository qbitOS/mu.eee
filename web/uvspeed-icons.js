'use strict';
/**
 * Optional icon registry for μsearch / mueee static shells.
 * Stub avoids 404 when the richer uvspeed icon pack is not copied beside search.html.
 */
if (typeof window !== 'undefined' && window.__UVSPEED_ICONS__ == null) {
    window.__UVSPEED_ICONS__ = Object.freeze({});
}
