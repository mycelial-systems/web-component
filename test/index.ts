import { test } from '@substrate-system/tapzero'
import { waitFor, waitForText } from '@substrate-system/dom'
import { toAttributes } from '../src/util.js'
import { WebComponent } from '../src/index.js'

class TestComponent extends WebComponent {
    static TAG = 'test-component'
    TAG = 'test-component'

    static observedAttributes = []

    render () {
        this.innerHTML = `<div>
            hello
        </div>`
    }
}

customElements.define('test-component', TestComponent)

// use factory function
class AnotherElement extends WebComponent.create('another-element') {
    static observedAttributes = ['disabled']

    connectedCallback () {
        this.render()
    }

    handleChange_disabled (_oldValue, newValue) {
        this.qs('button')?.setAttribute('disabled', newValue)
    }

    render () {
        this.innerHTML = `<div>
            hello again

            <button>hello</button>
        </div>`
    }
}

AnotherElement.define()

// Element that uses reflected attribute declaration
class ReflectedElement extends WebComponent {
    static TAG = 'reflected-el'
    TAG = 'reflected-el'
    static reflectedBooleanAttributes = ['disabled', 'readonly']
    static reflectedStringAttributes = ['type', 'name']
    declare disabled:boolean
    declare readonly:boolean
    declare type:string|null
    declare name:string|null

    render () {
        this.innerHTML = '<slot></slot>'
    }
}

ReflectedElement.define()

// Element with a hand-written accessor — should not be overwritten.
// Note: no `declare disabled` here because the get/set accessors already
// provide the TypeScript type; `declare` + accessor on the same class is
// a TypeScript error.
class CustomAccessorElement extends WebComponent {
    static TAG = 'custom-accessor-el'
    TAG = 'custom-accessor-el'
    static reflectedBooleanAttributes = ['disabled']

    sideEffectCalled = false

    get disabled ():boolean {
        return this.hasAttribute('disabled')
    }

    set disabled (v:boolean) {
        this.toggleAttribute('disabled', v)
        this.sideEffectCalled = true
    }

    render () {}
}

CustomAccessorElement.define()

test('can emit namespaced events', t => {
    t.plan(3)
    document.body.innerHTML += '<test-component class="test"></test-component>'

    const el = document.querySelector('test-component')
    t.ok(el, 'should find an element')
    el?.addEventListener(TestComponent.event('test'), listener)
    el?.emit('test', { detail: 'hello' })
    el?.removeEventListener(TestComponent.event('test'), listener)

    function listener (ev) {
        t.ok(ev, 'should get the custom event')
        t.equal(ev.detail, 'hello', 'should emit the event detail')
    }
})

test('.on listens for namespaced events', t => {
    t.plan(2)
    document.body.innerHTML += '<test-component class="on-test"></test-component>'

    const el = document.querySelector<TestComponent>('.on-test')
    t.ok(el, 'should find an element')

    el?.on('hello', (ev:CustomEvent<string>) => {
        t.equal(ev.type, 'test-component:hello',
            'should listen to the namespaced event type')
    })

    el?.emit('hello', { detail: 'from on' })
})

test('.on("*") listens to namespaced wildcard events', t => {
    t.plan(2)
    document.body.innerHTML +=
        '<test-component class="on-wildcard"></test-component>'

    const el = document.querySelector<TestComponent>('.on-wildcard')
    const events:string[] = []

    el?.on('*', (ev:Event) => {
        events.push(ev.type)
    })

    el?.emit('first')
    el?.emit('second')
    el?.dispatch('plain')

    t.equal(events.length, 2, 'should only capture namespaced events')
    t.equal(events[0], 'test-component:first',
        'should capture namespaced event via .on("*")')
})

test('.on passes options to addEventListener', t => {
    t.plan(1)
    document.body.innerHTML +=
        '<test-component class="on-options"></test-component>'

    const el = document.querySelector<TestComponent>('.on-options')
    let called = 0

    el?.on('once-only', () => {
        called++
    }, { once: true })

    el?.emit('once-only')
    el?.emit('once-only')

    t.equal(called, 1, 'should pass through addEventListener options')
})

test('to attributes', t => {
    const attrs = toAttributes({ hello: 'world', disabled: true })
    t.equal(attrs, 'hello="world" disabled')
})

test('emit an event without namespacing', t => {
    const el = document.querySelector('test-component')
    t.plan(2)
    el?.addEventListener('hello', ev => {
        t.equal(ev.type, 'hello', 'should hear the event')
        t.equal(ev.detail, 'example data', 'should get the event detail')
    })
    el?.dispatch('hello', { detail: 'example data' })
})

test('use factory function', async t => {
    t.plan(2)
    document.body.innerHTML += '<another-element></another-element>'

    // Wait for the element to be defined and rendered
    await waitFor('another-element')

    t.ok(await waitForText({
        text: 'hello again',
        timeout: 3000
    }), 'should find the element')

    t.equal(AnotherElement.TAG, 'another-element',
        'should have the expected TAG property')
})

test('TAG static property', async t => {
    t.plan(2)
    const el = await waitFor(AnotherElement.TAG)
    t.ok(el, 'should find the element')
    t.equal(el?.tagName.toLocaleLowerCase(), AnotherElement.TAG,
        'should have the TAG static property')
})

test('Attribute change events', async t => {
    t.plan(1)
    const el = await waitFor(AnotherElement.TAG)

    el?.setAttribute('disabled', '')
    const btn = el?.querySelector('button')
    t.equal(btn?.hasAttribute('disabled'), true,
        'should handle attribute change with a conventionally named method')
})

test('namespaced wildcard listener with MyComponent.event("*")', t => {
    t.plan(4)
    document.body.innerHTML += `
        <test-component class="wildcard-test"></test-component>
    `

    const el = document.querySelector<TestComponent>('.wildcard-test')
    t.ok(el, 'should find an element')

    const events:string[] = []
    const wildcardListener = (ev:Event) => {
        events.push(ev.type)
    }

    // Listen to all events in the test-component namespace
    el?.addEventListener(TestComponent.event('*'), wildcardListener)

    // Emit multiple events
    el?.emit('event-one', { detail: 'first' })
    el?.emit('event-two', { detail: 'second' })
    el?.emit('event-three', { detail: 'third' })

    t.equal(events.length, 3, 'should capture all namespaced events')
    t.equal(events[0], 'test-component:event-one', 'should capture first event')
    t.equal(events[1], 'test-component:event-two', 'should capture second event')
})

test('global wildcard listener with "*" catches all events', t => {
    t.plan(5)
    document.body.innerHTML +=
        '<test-component class="wildcard-test-2"></test-component>'

    const el = document.querySelector<TestComponent>('.wildcard-test-2')
    const events:string[] = []
    const wildcardListener = (ev:Event) => {
        events.push(ev.type)
    }

    // Listen to ALL events (both namespaced and non-namespaced) with '*'
    el?.addEventListener('*', wildcardListener)

    // Emit namespaced events
    el?.emit('foo', { detail: 'bar' })
    el?.emit('baz', { detail: 'qux' })

    // Emit a non-namespaced event
    el?.dispatch('regular-event')

    t.equal(events.length, 3,
        'should capture all events (namespaced and non-namespaced)')
    t.equal(events[0],
        'test-component:foo', 'should capture first namespaced event')
    t.equal(events[1],
        'test-component:baz', 'should capture second namespaced event')
    t.equal(events[2], 'regular-event', 'should capture regular DOM event')

    // Now test with a native DOM event
    const clickEvent = new Event('click')
    el?.dispatchEvent(clickEvent)

    t.equal(events[3], 'click', 'should capture native DOM events too')
})

test('namespaced wildcard does not catch non-namespaced events', t => {
    t.plan(3)
    document.body.innerHTML +=
        '<test-component class="namespace-only"></test-component>'

    const el = document.querySelector<TestComponent>('.namespace-only')
    const events:string[] = []
    const namespacedListener = (ev:Event) => {
        events.push(ev.type)
    }

    // Listen to namespaced events only with Component.event('*')
    el?.addEventListener(TestComponent.event('*'), namespacedListener)

    // Emit namespaced events
    el?.emit('namespaced-one')
    el?.emit('namespaced-two')

    // Emit non-namespaced event - should NOT be caught by namespaced wildcard
    el?.dispatch('regular-event')

    t.equal(events.length, 2,
        'should only capture namespaced events, not regular events')
    t.equal(events[0],
        'test-component:namespaced-one', 'should capture first namespaced event')
    t.equal(events[1],
        'test-component:namespaced-two', 'should capture second namespaced event')
})

test('removeEventListener works with global wildcard "*"', t => {
    t.plan(2)
    document.body.innerHTML +=
        '<test-component class="remove-global-test"></test-component>'

    const el = document.querySelector<TestComponent>('.remove-global-test')
    const events:string[] = []
    const globalListener = (ev:Event) => {
        events.push(ev.type)
    }

    // Add and then remove the global wildcard listener
    el?.addEventListener('*', globalListener)
    el?.dispatch('before-removal')

    t.equal(events.length, 1, 'should capture event before removal')

    el?.removeEventListener('*', globalListener)
    el?.dispatch('after-removal')

    t.equal(events.length, 1, 'should not capture event after removal')
})

test('removeEventListener works with namespaced wildcard', t => {
    t.plan(2)
    document.body.innerHTML +=
        '<test-component class="remove-namespaced-test"></test-component>'

    const el = document.querySelector<TestComponent>('.remove-namespaced-test')
    const events:string[] = []
    const namespacedListener = (ev:Event) => {
        events.push(ev.type)
    }

    // Add and then remove the namespaced wildcard listener
    el?.addEventListener(TestComponent.event('*'), namespacedListener)
    el?.emit('before-removal')

    t.equal(events.length, 1, 'should capture event before removal')

    el?.removeEventListener(TestComponent.event('*'), namespacedListener)
    el?.emit('after-removal')

    t.equal(events.length, 1, 'should not capture event after removal')
})

test('namespaced wildcard does not catch events from other namespaces', t => {
    t.plan(2)
    document.body.innerHTML +=
        '<another-element class="namespace-test"></another-element>'

    const el = document.querySelector<AnotherElement>('.namespace-test')
    const events:string[] = []
    const wildcardListener = (ev:Event) => {
        events.push(ev.type)
    }

    // Listen to all events in the another-element namespace
    el?.addEventListener(AnotherElement.event('*'), wildcardListener)

    // Emit events from another-element
    el?.emit('my-event')

    t.equal(events.length, 1, 'should capture only namespaced events')
    t.equal(events[0], 'another-element:my-event',
        'should have correct namespace')
})

test('multiple global wildcard listeners work independently', t => {
    t.plan(4)
    document.body.innerHTML +=
        '<test-component class="multi-listener"></test-component>'

    const el = document.querySelector<TestComponent>('.multi-listener')
    const events1:string[] = []
    const events2:string[] = []

    const listener1 = (ev:Event) => events1.push(ev.type)
    const listener2 = (ev:Event) => events2.push(ev.type)

    // Add two different global wildcard listeners
    el?.addEventListener('*', listener1)
    el?.addEventListener('*', listener2)

    el?.emit('test-event')

    t.equal(events1.length, 1, 'first listener should capture event')
    t.equal(events2.length, 1, 'second listener should capture event')

    // Remove only one listener
    el?.removeEventListener('*', listener1)
    el?.emit('second-event')

    t.equal(events1.length, 1, 'first listener should not capture after removal')
    t.equal(events2.length, 2, 'second listener should still capture events')
})

test('multiple namespaced wildcard listeners work independently', t => {
    t.plan(4)
    document.body.innerHTML +=
        '<test-component class="multi-ns-listener"></test-component>'

    const el = document.querySelector<TestComponent>('.multi-ns-listener')
    const events1:string[] = []
    const events2:string[] = []

    const listener1 = (ev:Event) => events1.push(ev.type)
    const listener2 = (ev:Event) => events2.push(ev.type)

    // Add two different namespaced wildcard listeners
    el?.addEventListener(TestComponent.event('*'), listener1)
    el?.addEventListener(TestComponent.event('*'), listener2)

    el?.emit('test-event')

    t.equal(events1.length, 1, 'first listener should capture event')
    t.equal(events2.length, 1, 'second listener should capture event')

    // Remove only one listener
    el?.removeEventListener(TestComponent.event('*'), listener1)
    el?.emit('second-event')

    t.equal(events1.length, 1, 'first listener should not capture after removal')
    t.equal(events2.length, 2, 'second listener should still capture events')
})

test('global wildcard listener with EventListenerObject interface', t => {
    t.plan(2)
    document.body.innerHTML +=
        '<test-component class="object-listener"></test-component>'

    const el = document.querySelector<TestComponent>('.object-listener')
    const events:string[] = []

    const listenerObject = {
        handleEvent: (ev:Event) => {
            events.push(ev.type)
        }
    }

    el?.addEventListener('*', listenerObject)
    el?.emit('test-event-one')
    el?.emit('test-event-two')

    t.equal(events.length, 2, 'should capture events with EventListenerObject')
    t.equal(events[0],
        'test-component:test-event-one', 'should have correct event type')
})

test('namespaced wildcard listener with EventListenerObject interface', t => {
    t.plan(2)
    document.body.innerHTML +=
        '<test-component class="ns-object-listener"></test-component>'

    const el = document.querySelector<TestComponent>('.ns-object-listener')
    const events:string[] = []

    const listenerObject = {
        handleEvent: (ev:Event) => {
            events.push(ev.type)
        }
    }

    el?.addEventListener(TestComponent.event('*'), listenerObject)
    el?.emit('test-event-one')
    el?.emit('test-event-two')

    t.equal(events.length, 2,
        'should capture namespaced events with EventListenerObject')
    t.equal(events[0],
        'test-component:test-event-one', 'should have correct event type')
})

test('boolean reflection: property assignment sets attribute', t => {
    t.plan(2)
    document.body.innerHTML +=
        '<reflected-el class="bool-prop-test"></reflected-el>'
    const el = document.querySelector<ReflectedElement>('.bool-prop-test')
    t.ok(el, 'should find element')
    el!.disabled = true
    t.ok(el!.hasAttribute('disabled'),
        'setting disabled property should set the attribute')
})

test('boolean reflection: property reads attribute', t => {
    t.plan(2)
    document.body.innerHTML +=
        '<reflected-el class="bool-read-test" disabled></reflected-el>'
    const el = document.querySelector<ReflectedElement>('.bool-read-test')
    t.ok(el, 'should find element')
    t.equal(el!.disabled, true,
        'disabled property should return true when attribute is present')
})

test('boolean reflection: setting false removes attribute', t => {
    t.plan(2)
    document.body.innerHTML +=
        '<reflected-el class="bool-false-test" disabled></reflected-el>'
    const el = document.querySelector<ReflectedElement>('.bool-false-test')
    t.ok(el, 'should find element')
    el!.disabled = false
    t.equal(el!.hasAttribute('disabled'), false,
        'setting disabled=false should remove the attribute')
})

test('string reflection: property assignment sets attribute', t => {
    t.plan(2)
    document.body.innerHTML +=
        '<reflected-el class="str-prop-test"></reflected-el>'
    const el = document.querySelector<ReflectedElement>('.str-prop-test')
    t.ok(el, 'should find element')
    el!.type = 'submit'
    t.equal(el!.getAttribute('type'), 'submit',
        'setting type property should set the attribute')
})

test('string reflection: absent attribute returns null', t => {
    t.plan(2)
    document.body.innerHTML +=
        '<reflected-el class="str-null-test"></reflected-el>'
    const el = document.querySelector<ReflectedElement>('.str-null-test')
    t.ok(el, 'should find element')
    t.equal(el!.type, null,
        'type property should return null when attribute is absent')
})

test('string reflection: setting null removes attribute', t => {
    t.plan(2)
    document.body.innerHTML +=
        '<reflected-el class="str-remove-test" type="button"></reflected-el>'
    const el = document.querySelector<ReflectedElement>('.str-remove-test')
    t.ok(el, 'should find element')
    el!.type = null
    t.equal(el!.hasAttribute('type'), false,
        'setting type=null should remove the attribute')
})

test('string reflection: setting undefined removes attribute', t => {
    t.plan(2)
    document.body.innerHTML +=
        '<reflected-el class="str-undef-test" type="button"></reflected-el>'
    const el = document.querySelector<ReflectedElement>('.str-undef-test')
    t.ok(el, 'should find element')
    ;(el as any).type = undefined
    t.equal(el!.hasAttribute('type'), false,
        'setting type=undefined should remove the attribute')
})

test('observedAttributes includes reflected boolean and string attrs', t => {
    t.plan(1)
    t.deepEqual(
        ReflectedElement.observedAttributes.slice().sort(),
        ['disabled', 'name', 'readonly', 'type'],
        'observedAttributes should include all reflected attributes'
    )
})

test('observedAttributes can be extended for non-reflected attrs', t => {
    t.plan(1)

    class ExtendedElement extends WebComponent {
        static TAG = 'extended-el'
        TAG = 'extended-el'
        static reflectedBooleanAttributes = ['disabled']

        static get observedAttributes () {
            return [...super.observedAttributes, 'aria-label']
        }

        render () {}
    }

    t.deepEqual(
        ExtendedElement.observedAttributes.slice().sort(),
        ['aria-label', 'disabled'],
        'observedAttributes should include both reflected and extra attrs'
    )
})

test('hand-written accessor takes precedence over auto-generated', t => {
    t.plan(3)
    document.body.innerHTML +=
        '<custom-accessor-el class="custom-acc-test"></custom-accessor-el>'
    const el = document.querySelector<CustomAccessorElement>(
        '.custom-acc-test'
    )
    t.ok(el, 'should find element')
    el!.disabled = true
    t.ok(el!.hasAttribute('disabled'),
        'should still set the attribute')
    t.ok(el!.sideEffectCalled,
        'hand-written setter side effect should have run')
})

test('built-in HTMLElement property names are not overwritten', t => {
    t.plan(2)
    // `id` lives on Element.prototype — the `in` guard walks the chain and
    // should catch it. SafeElement is registered once per test run; the
    // custom element registry does not support unregistration, so this test
    // must only run in a fresh environment (which `npm test` provides).
    class SafeElement extends WebComponent {
        static TAG = 'safe-el'
        TAG = 'safe-el'
        static reflectedStringAttributes = ['id']
        render () {}
    }

    const originalDescriptor = Object.getOwnPropertyDescriptor(
        Element.prototype, 'id'
    )
    SafeElement.define()

    // The descriptor on Element.prototype should be unchanged
    t.deepEqual(
        Object.getOwnPropertyDescriptor(Element.prototype, 'id'),
        originalDescriptor,
        'id descriptor on Element.prototype should be unchanged'
    )
    // The descriptor should NOT have been placed on SafeElement.prototype either
    t.equal(
        Object.getOwnPropertyDescriptor(
            (SafeElement as any).prototype, 'id'
        ),
        undefined,
        'id descriptor should not be installed on SafeElement.prototype'
    )
})

test('all done', () => {
    // @ts-expect-error explicitly end
    window.testsFinished = true
})

declare global {
    interface HTMLElementTagNameMap {
        'test-component': TestComponent;
        'another-element': AnotherElement;
        'reflected-el': ReflectedElement;
        'custom-accessor-el': CustomAccessorElement;
    }
}
