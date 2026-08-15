export { toAttributes } from './attributes.js'

/**
 * Check if the given tag name has been registered.
 *
 * @see {@link https://stackoverflow.com/a/28210364 stackoverflow}
 * @param {string} elName The custom element tag name.
 * @returns {boolean} True if the given name has been registered already.
 */
export function isRegistered (elName:string):boolean {
    return document.createElement(elName).constructor !== window.HTMLElement
}

export function define (name:string, element:CustomElementConstructor) {
    if (typeof window === 'undefined') return
    if (!('customElements' in window)) return
    if (!isRegistered(name)) {
        window.customElements.define(name, element)
    }
}

/**
 * Get the closes parent element matching the given selector.
 * @param el Element to start from
 * @param s Selector for an element
 * @returns {HTMLElement|null} The closes parent element that matches.
 */
export function match (el:HTMLElement, s:string):HTMLElement|null {
    if (!el.matches) el = el.parentElement!
    return el.matches(s) ? el : el.closest(s)
}

export * from './qs.js'
export * from './qsa.js'
