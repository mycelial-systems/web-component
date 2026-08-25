import { WebComponent } from './index.js'

export interface WildcardEntry {
    listener:EventListenerOrEventListenerObject
    options?:boolean|AddEventListenerOptions
}

type WildcardCtor = abstract new (...args:any[])=>WebComponent

/**
 * Mixin that adds wildcard event support to a `WebComponent` (sub)class.
 *
 * Two kinds of wildcard listener become available through the standard
 * `addEventListener` / `removeEventListener` / `on` / `off` APIs:
 *
 * - `'*'` — a global listener, fired for every event dispatched through the
 *   element (namespaced or not, including native DOM events dispatched via
 *   `dispatchEvent`).
 * - `Component.event('*')` (i.e. `'<tag>:*'`) — a namespaced listener, fired
 *   for every event in this component's namespace.
 *
 * ```ts
 * import { WebComponent } from '@substrate-system/web-component'
 * import { withWildcards } from '@substrate-system/web-component/wildcard'
 *
 * class MyEl extends withWildcards(WebComponent) {
 *     render () {}
 * }
 * ```
 *
 * @param Base A `WebComponent` (sub)class to extend.
 * @returns A subclass of `Base` with wildcard event support.
 */
export function withWildcards<T extends WildcardCtor> (Base:T) {
    abstract class Wildcard extends Base {
        global?:Set<WildcardEntry>
        namespaced?:Set<WildcardEntry>

        addEventListener (
            type:string,
            listener:EventListenerOrEventListenerObject,
            options?:boolean|AddEventListenerOptions
        ):void {
            if (type === `${this.TAG}:*`) {
                // Namespaced wildcard listener (component-name:*)
                const set = (this.namespaced ??= new Set())
                set.add({ listener, options })
            } else if (type === '*') {
                // Global wildcard listener (all events)
                if (listener) {
                    const set = (this.global ??= new Set())
                    set.add({ listener, options })
                }
            } else {
                super.addEventListener(type, listener, options)
            }
        }

        removeEventListener (
            type:string,
            listener:EventListenerOrEventListenerObject,
            options?:boolean|EventListenerOptions
        ):void {
            if (type === `${this.TAG}:*`) {
                removeEntry(this.namespaced, listener)
            } else if (type === '*') {
                removeEntry(this.global, listener)
            } else {
                super.removeEventListener(type, listener, options)
            }
        }

        /**
         * Notify wildcard listeners. A single dispatch path feeds both the
         * global listeners (every event) and the namespaced listeners (events
         * whose type matches this component's namespace).
         */
        dispatchEvent (event:Event):boolean {
            const result = super.dispatchEvent(event)

            const global = this.global
            if (global) notify(global, event, this)

            const namespaced = this.namespaced
            if (
                namespaced &&
                this.TAG &&
                event.type.startsWith(`${this.TAG}:`)
            ) {
                notify(namespaced, event, this)
            }

            return result
        }
    }

    return Wildcard
}

/**
 * Ready-made base class: `WebComponent` with wildcard support.
 * Equivalent to `withWildcards(WebComponent)`.
 */
export const WildcardComponent = withWildcards(WebComponent)

function removeEntry (
    set:Set<WildcardEntry>|undefined,
    listener:EventListenerOrEventListenerObject
):void {
    if (!listener || !set) return
    for (const entry of set) {
        if (entry.listener === listener) {
            set.delete(entry)
            break
        }
    }
}

function notify (
    set:Set<WildcardEntry>,
    event:Event,
    host:EventTarget
):void {
    set.forEach(({ listener }) => {
        try {
            if (typeof listener === 'function') {
                listener.call(host, event)
            } else if (listener && typeof listener.handleEvent === 'function') {
                listener.handleEvent(event)
            }
        } catch (err) {
            // Log errors but don't let one listener break the others.
            console.error('Error in wildcard event listener:', err)
        }
    })
}
