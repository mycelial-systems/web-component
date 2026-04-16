import { match as _match } from './util.js'

interface WildcardListenerEntry {
    listener:EventListenerOrEventListenerObject
    options?:boolean|AddEventListenerOptions
}

export abstract class WebComponent extends window.HTMLElement {
    static TAG:string = ''
    TAG:string = ''

    /**
     * Declare boolean attributes that should be reflected as properties.
     * The base class auto-generates getters/setters and includes these in
     * `observedAttributes`. Framework property assignment (e.g. Preact's
     * `el.disabled = true`) will then correctly set the attribute.
     */
    static reflectedBooleanAttributes:string[] = []

    /**
     * Declare string attributes that should be reflected as properties.
     * Getter returns `string|null` (null when attribute is absent).
     * Setting `null` or `undefined` removes the attribute.
     */
    static reflectedStringAttributes:string[] = []

    /**
     * Auto-derived from `reflectedBooleanAttributes` and
     * `reflectedStringAttributes`. Override with `super.observedAttributes`
     * to add non-reflected observed attributes:
     *
     * ```ts
     * static get observedAttributes () {
     *     return [...super.observedAttributes, 'aria-label']
     * }
     * ```
     */
    static get observedAttributes ():string[] {
        return [...new Set([
            ...this.reflectedBooleanAttributes,
            ...this.reflectedStringAttributes,
        ])]
    }

    static match (el:HTMLElement):HTMLElement|null {
        return _match(el, this.TAG)
    }

    /**
     * Store global wildcard listeners (listen to all events)
     * Triggered by ALL events dispatched through this element
     * @private
     */
    private _globalWildcardListeners:Set<WildcardListenerEntry> = new Set()

    /**
     * Store namespaced wildcard listeners (listen to 'component-name:*')
     * Triggered by events from emit() that match this component's namespace
     * @private
     */
    private _namespacedWildcardListeners:Set<WildcardListenerEntry> = new Set()

    static create (elementName:string):typeof WebComponent & {
        new (...args:any[]):WebComponent;
        TAG:string;
        define: typeof WebComponent.define;
        event: typeof WebComponent.event;
    } {
        const CreatedClass = class extends WebComponent {
            static TAG = elementName
            TAG = elementName
            render () {
                throw new Error('`render` should be implemented by children')
            }
        }

        // Copy static methods with proper binding
        CreatedClass.define = function () {
            return WebComponent.define.call(this)
        }
        CreatedClass.event = function (evType:string) {
            return WebComponent.event.call(this, evType)
        }

        return CreatedClass
    }

    static define<T extends {
        new (...args:any[]):WebComponent;
        TAG:string;
    }>(this:T) {
        define(this.TAG, this)
    }

    /**
     * Runs when the value of an attribute is changed.
     *
     * Depends on `static observedAttributes`.
     *
     * Should name methods like `handleChange_disabled`.
     *
     * @param  {string} name     The attribute name
     * @param  {string} oldValue The old attribute value
     * @param  {string} newValue The new attribute value
     */
    async attributeChangedCallback (
        name:string,
        oldValue:string,
        newValue:string
    ):Promise<void> {
        const handler = this[`handleChange_${name}`]
        if (handler) {
            await handler.call(this, oldValue, newValue)
        }
    }

    /**
     * Enhanced addEventListener that supports wildcards:
     * - Component.event('*') - Listen to all namespaced events for this
     *   component (e.g., 'my-component:*')
     * - '*' - Listen to ALL events (namespaced and non-namespaced, including
     *   normal DOM events)
     *
     * @param type - Event type, Component.event('*') for namespaced wildcard,
     *   or '*' for global wildcard
     * @param listener - Event listener function or object
     * @param options - Event listener options
     */
    addEventListener (
        type:string,
        listener:EventListenerOrEventListenerObject,
        options?:boolean|AddEventListenerOptions
    ): void {
        if (type === WebComponent.event.call(this, '*')) {
            // Handle namespaced wildcard listener (component-name:*)
            this._namespacedWildcardListeners.add({ listener, options })
        } else if (type === '*') {
            // Handle global wildcard listener (all events)
            if (listener) {
                this._globalWildcardListeners.add({ listener, options })
            }
        } else {
            // Normal event listener - delegate to native implementation
            super.addEventListener(type, listener, options)
        }
    }

    /**
     * Notify namespaced wildcard listeners of an event
     * Only fires for events that match this component's namespace
     *
     * @param event - The event to dispatch to namespaced wildcard listeners
     * @private
     */
    private _notifyNamespacedWildcardListeners (event: Event): void {
        if (this._namespacedWildcardListeners.size === 0) {
            return
        }

        const componentName = this.TAG

        // Only trigger for events in this component's namespace
        if (!componentName || !event.type.startsWith(`${componentName}:`)) {
            return
        }

        // Call each namespaced wildcard listener
        this._namespacedWildcardListeners.forEach(({ listener }) => {
            try {
                if (typeof listener === 'function') {
                    listener.call(this, event)
                } else if (listener && typeof listener.handleEvent === 'function') {
                    listener.handleEvent(event)
                }
            } catch (error) {
                // Log errors but don't let one listener break others
                console.error(
                    'Error in namespaced wildcard event listener:',
                    error
                )
            }
        })
    }

    /**
     * Notify global wildcard listeners of an event
     * Fires for ALL events dispatched through this element
     *
     * @param event - The event to dispatch to global wildcard listeners
     * @private
     */
    private _notifyGlobalWildcardListeners (event: Event): void {
        if (this._globalWildcardListeners.size === 0) {
            return
        }

        // Call each global wildcard listener
        this._globalWildcardListeners.forEach(({ listener }) => {
            try {
                if (typeof listener === 'function') {
                    listener.call(this, event)
                } else if (listener && typeof listener.handleEvent === 'function') {
                    listener.handleEvent(event)
                }
            } catch (error) {
            // Log errors but don't let one listener break others
                console.error('Error in global wildcard event listener:', error)
            }
        })
    }

    connectedCallback () {
        this.render()
    }

    abstract render ():any

    qs<K extends keyof HTMLElementTagNameMap>(
        selector:K
    ):HTMLElementTagNameMap[K]|null;

    qs<E extends Element = Element>(selector:string):E|null;
    qs (selector:string):Element|null {
        return this.querySelector(selector)
    }

    qsa<K extends keyof HTMLElementTagNameMap>(
        selector:K
    ):HTMLElementTagNameMap[K]|null;

    qsa<E extends Element = Element>(selector:string):E|null;
    qsa (selector:string):NodeListOf<Element> {
        return this.querySelectorAll(selector)
    }

    /**
     * Take a non-namepsaced event name, return namespace event name.
     *
     * @param {string} evType The non-namespace event name
     * @returns {string} Namespaced event name, eg, `my-component:click`
     */
    static event (evType:string):string {
        return eventName(this.TAG, evType)
    }

    /**
     * Emit a namespaced event.
     *
     * @param type (non-namespaced) event type string
     * @param opts `bubbles`, `detail`, and `cancelable`. Default is
     * `{ bubbles: true, cancelable: true }`
     * @returns {boolean}
     */
    emit<T = any> (type:string, opts:Partial<{
        bubbles:boolean,
        cancelable:boolean,
        detail:CustomEvent<T>['detail']
    }> = {}):boolean {
        if (type === '*') throw new Error('Do not emit the literal "*"')

        const { bubbles = true, cancelable = true, detail } = opts
        const namespacedType = `${this.TAG}:${type}`

        const event = new CustomEvent(namespacedType, {
            bubbles,
            cancelable,
            detail
        })

        // This will trigger both specific listeners and global wildcard
        // listeners (**)
        const result = this.dispatchEvent(event)

        // Notify namespaced wildcard listeners (*)
        this._notifyNamespacedWildcardListeners(event)

        return result
    }

    /**
     * Override dispatchEvent to notify global wildcard listeners
     * This ensures that '**' listeners catch ALL events
     *
     * @param event - The event to dispatch
     * @returns true if the event was not cancelled
     */
    dispatchEvent (event: Event): boolean {
        const result = super.dispatchEvent(event)

        // Notify global wildcard listeners for ALL events
        this._notifyGlobalWildcardListeners(event)

        return result
    }

    /**
     * Create and emit an event, no namespacing.
     */
    dispatch<T> (type:string, opts:Partial<{
        bubbles:boolean,
        cancelable:boolean,
        detail:CustomEvent<T>['detail']
    }> = {}):boolean {
        const event = new CustomEvent(type, {
            bubbles: (opts.bubbles === undefined) ? true : opts.bubbles,
            cancelable: (opts.cancelable === undefined) ? true : opts.cancelable,
            detail: opts.detail
        })

        return this.dispatchEvent(event)
    }

    /**
     * Listen for namespaced events.
     */
    on<T extends Event = Event> (
        evName:string,
        handler:(ev:T)=>any,
        options?:boolean|AddEventListenerOptions
    ):void;

    on (
        evName:string,
        handler:EventListenerObject,
        options?:boolean|AddEventListenerOptions
    ):void;

    on (
        evName:string,
        handler:((ev:Event)=>any)|EventListenerObject,
        options?:boolean|AddEventListenerOptions
    ):void {
        const fullEvName = WebComponent.event.call(this, evName)
        this.addEventListener(fullEvName, handler as EventListenerOrEventListenerObject, options)
    }

    /**
     * Remove a namespaced event listener.
     */
    off<T extends Event = Event> (
        evName:string,
        handler:(ev:T)=>any,
        options?:boolean|EventListenerOptions
    ):void;

    off (
        evName:string,
        handler:EventListenerObject,
        options?:boolean|EventListenerOptions
    ):void;

    off (
        evName:string,
        handler:((ev:Event)=>any)|EventListenerObject,
        options?:boolean|EventListenerOptions
    ):void {
        const fullEvName = WebComponent.event.call(this, evName)
        this.removeEventListener(fullEvName, handler as EventListenerOrEventListenerObject, options)
    }

    /**
     * Enhanced removeEventListener that supports wildcards:
     * - Component.event('*') - Remove namespaced wildcard listener
     * - '*' - Remove global wildcard listener
     *
     * @param type - Event type, Component.event('*') for namespaced, or '*'
     *   for global
     * @param listener - Event listener function or object to remove
     * @param options - Event listener options
     */
    removeEventListener (
        type:string,
        listener:EventListenerOrEventListenerObject,
        options?: boolean | EventListenerOptions
    ): void {
        if (type === WebComponent.event.call(this, '*')) {
            // Remove namespaced wildcard listener
            if (listener && this._namespacedWildcardListeners) {
                for (const entry of this._namespacedWildcardListeners) {
                    if (entry.listener === listener) {
                        this._namespacedWildcardListeners.delete(entry)
                        break
                    }
                }
            }
        } else if (type === '*') {
            // Remove global wildcard listener
            if (listener && this._globalWildcardListeners) {
                for (const entry of this._globalWildcardListeners) {
                    if (entry.listener === listener) {
                        this._globalWildcardListeners.delete(entry)
                        break
                    }
                }
            }
        } else {
            // Normal event listener - delegate to native implementation
            super.removeEventListener(type, listener, options)
        }
    }
}

function eventName (namespace:string, evType:string) {
    return `${namespace}:${evType}`
}

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
    if (isRegistered(name)) return

    const ctor = element as unknown as typeof WebComponent
    const boolAttrs:string[] = ctor.reflectedBooleanAttributes ?? []
    const strAttrs:string[] = ctor.reflectedStringAttributes ?? []
    const proto = (element as any).prototype

    for (const attr of boolAttrs) {
        // Skip built-in IDL attributes on HTMLElement and ancestors
        // (covers Element.prototype, Node.prototype, etc.)
        if (attr in HTMLElement.prototype) continue
        // Skip if the subclass already defines an own-property accessor
        if (Object.getOwnPropertyDescriptor(proto, attr)) continue
        Object.defineProperty(proto, attr, {
            get (this:HTMLElement):boolean {
                return this.hasAttribute(attr)
            },
            set (this:HTMLElement, v:unknown) {
                this.toggleAttribute(attr, Boolean(v))
            },
            configurable: true,
            enumerable: true,
        })
    }

    for (const attr of strAttrs) {
        if (boolAttrs.includes(attr)) {
            console.warn(
                `[web-component] "${attr}" appears in both ` +
                'reflectedBooleanAttributes and reflectedStringAttributes ' +
                `on <${name}>. Boolean wins.`
            )
            continue
        }
        if (attr in HTMLElement.prototype) continue
        if (Object.getOwnPropertyDescriptor(proto, attr)) continue
        Object.defineProperty(proto, attr, {
            get (this:HTMLElement):string|null {
                return this.getAttribute(attr)
            },
            set (this:HTMLElement, v:unknown) {
                // null and undefined both remove the attribute
                if (v == null) {
                    this.removeAttribute(attr)
                } else {
                    this.setAttribute(attr, String(v))
                }
            },
            configurable: true,
            enumerable: true,
        })
    }

    window.customElements.define(name, element)
}
