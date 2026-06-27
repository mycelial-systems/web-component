import { test } from '@substrate-system/tapzero'
import { WebComponent } from '../src/index.js'
import { WildcardComponent, withWildcards } from '../src/wildcard.js'

// `WildcardComponent` is the convenience class (`withWildcards(WebComponent)`).
class WildcardEl extends WildcardComponent {
    static TAG = 'wildcard-el'
    TAG = 'wildcard-el'
    render () {}
}

WildcardEl.define()

// `withWildcards` applied to a `create()`d base class, to cover the mixin
// over something other than `WebComponent` directly.
class FactoryWildcardEl extends withWildcards(
    WebComponent.create('factory-wildcard-el')
) {
    render () {
        this.innerHTML = '<div>factory wildcard</div>'
    }
}

FactoryWildcardEl.define()

test('.on("*") listens to namespaced wildcard events', t => {
    t.plan(2)
    document.body.innerHTML +=
        '<wildcard-el class="on-wildcard"></wildcard-el>'

    const el = document.querySelector<WildcardEl>('.on-wildcard')
    const events:string[] = []

    el?.on('*', (ev:Event) => {
        events.push(ev.type)
    })

    el?.emit('first')
    el?.emit('second')
    el?.dispatch('plain')

    t.equal(events.length, 2, 'should only capture namespaced events')
    t.equal(events[0], 'wildcard-el:first',
        'should capture namespaced event via .on("*")')
})

test('.off("*") removes a namespaced wildcard listener', t => {
    t.plan(1)
    document.body.innerHTML +=
        '<wildcard-el class="off-wildcard"></wildcard-el>'

    const el = document.querySelector<WildcardEl>('.off-wildcard')
    const events:string[] = []

    const handler = (ev:Event) => {
        events.push(ev.type)
    }

    el?.on('*', handler)
    el?.emit('first')
    el?.off('*', handler)
    el?.emit('second')

    t.equal(events.length, 1,
        'should remove the wildcard listener after off()')
})

test('namespaced wildcard listener with Component.event("*")', t => {
    t.plan(4)
    document.body.innerHTML += `
        <wildcard-el class="wildcard-test"></wildcard-el>
    `

    const el = document.querySelector<WildcardEl>('.wildcard-test')
    t.ok(el, 'should find an element')

    const events:string[] = []
    const wildcardListener = (ev:Event) => {
        events.push(ev.type)
    }

    // Listen to all events in the wildcard-el namespace
    el?.addEventListener(WildcardEl.event('*'), wildcardListener)

    el?.emit('event-one', { detail: 'first' })
    el?.emit('event-two', { detail: 'second' })
    el?.emit('event-three', { detail: 'third' })

    t.equal(events.length, 3, 'should capture all namespaced events')
    t.equal(events[0], 'wildcard-el:event-one', 'should capture first event')
    t.equal(events[1], 'wildcard-el:event-two', 'should capture second event')
})

test('global wildcard listener with "*" catches all events', t => {
    t.plan(5)
    document.body.innerHTML +=
        '<wildcard-el class="wildcard-test-2"></wildcard-el>'

    const el = document.querySelector<WildcardEl>('.wildcard-test-2')
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
        'wildcard-el:foo', 'should capture first namespaced event')
    t.equal(events[1],
        'wildcard-el:baz', 'should capture second namespaced event')
    t.equal(events[2], 'regular-event', 'should capture regular DOM event')

    // Now test with a native DOM event
    const clickEvent = new Event('click')
    el?.dispatchEvent(clickEvent)

    t.equal(events[3], 'click', 'should capture native DOM events too')
})

test('namespaced wildcard does not catch non-namespaced events', t => {
    t.plan(3)
    document.body.innerHTML +=
        '<wildcard-el class="namespace-only"></wildcard-el>'

    const el = document.querySelector<WildcardEl>('.namespace-only')
    const events:string[] = []
    const namespacedListener = (ev:Event) => {
        events.push(ev.type)
    }

    // Listen to namespaced events only with Component.event('*')
    el?.addEventListener(WildcardEl.event('*'), namespacedListener)

    // Emit namespaced events
    el?.emit('namespaced-one')
    el?.emit('namespaced-two')

    // Emit non-namespaced event - should NOT be caught by namespaced wildcard
    el?.dispatch('regular-event')

    t.equal(events.length, 2,
        'should only capture namespaced events, not regular events')
    t.equal(events[0],
        'wildcard-el:namespaced-one', 'should capture first namespaced event')
    t.equal(events[1],
        'wildcard-el:namespaced-two', 'should capture second namespaced event')
})

test('removeEventListener works with global wildcard "*"', t => {
    t.plan(2)
    document.body.innerHTML +=
        '<wildcard-el class="remove-global-test"></wildcard-el>'

    const el = document.querySelector<WildcardEl>('.remove-global-test')
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
        '<wildcard-el class="remove-namespaced-test"></wildcard-el>'

    const el = document.querySelector<WildcardEl>('.remove-namespaced-test')
    const events:string[] = []
    const namespacedListener = (ev:Event) => {
        events.push(ev.type)
    }

    // Add and then remove the namespaced wildcard listener
    el?.addEventListener(WildcardEl.event('*'), namespacedListener)
    el?.emit('before-removal')

    t.equal(events.length, 1, 'should capture event before removal')

    el?.removeEventListener(WildcardEl.event('*'), namespacedListener)
    el?.emit('after-removal')

    t.equal(events.length, 1, 'should not capture event after removal')
})

test('namespaced wildcard works with a factory-created component', t => {
    t.plan(2)
    document.body.innerHTML +=
        '<factory-wildcard-el class="namespace-test"></factory-wildcard-el>'

    const el = document.querySelector<FactoryWildcardEl>('.namespace-test')
    const events:string[] = []
    const wildcardListener = (ev:Event) => {
        events.push(ev.type)
    }

    // Listen to all events in the factory-wildcard-el namespace
    el?.addEventListener(FactoryWildcardEl.event('*'), wildcardListener)

    el?.emit('my-event')

    t.equal(events.length, 1, 'should capture only namespaced events')
    t.equal(events[0], 'factory-wildcard-el:my-event',
        'should have correct namespace')
})

test('multiple global wildcard listeners work independently', t => {
    t.plan(4)
    document.body.innerHTML +=
        '<wildcard-el class="multi-listener"></wildcard-el>'

    const el = document.querySelector<WildcardEl>('.multi-listener')
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
        '<wildcard-el class="multi-ns-listener"></wildcard-el>'

    const el = document.querySelector<WildcardEl>('.multi-ns-listener')
    const events1:string[] = []
    const events2:string[] = []

    const listener1 = (ev:Event) => events1.push(ev.type)
    const listener2 = (ev:Event) => events2.push(ev.type)

    // Add two different namespaced wildcard listeners
    el?.addEventListener(WildcardEl.event('*'), listener1)
    el?.addEventListener(WildcardEl.event('*'), listener2)

    el?.emit('test-event')

    t.equal(events1.length, 1, 'first listener should capture event')
    t.equal(events2.length, 1, 'second listener should capture event')

    // Remove only one listener
    el?.removeEventListener(WildcardEl.event('*'), listener1)
    el?.emit('second-event')

    t.equal(events1.length, 1, 'first listener should not capture after removal')
    t.equal(events2.length, 2, 'second listener should still capture events')
})

test('global wildcard listener with EventListenerObject interface', t => {
    t.plan(2)
    document.body.innerHTML +=
        '<wildcard-el class="object-listener"></wildcard-el>'

    const el = document.querySelector<WildcardEl>('.object-listener')
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
        'wildcard-el:test-event-one', 'should have correct event type')
})

test('namespaced wildcard listener with EventListenerObject interface', t => {
    t.plan(2)
    document.body.innerHTML +=
        '<wildcard-el class="ns-object-listener"></wildcard-el>'

    const el = document.querySelector<WildcardEl>('.ns-object-listener')
    const events:string[] = []

    const listenerObject = {
        handleEvent: (ev:Event) => {
            events.push(ev.type)
        }
    }

    el?.addEventListener(WildcardEl.event('*'), listenerObject)
    el?.emit('test-event-one')
    el?.emit('test-event-two')

    t.equal(events.length, 2,
        'should capture namespaced events with EventListenerObject')
    t.equal(events[0],
        'wildcard-el:test-event-one', 'should have correct event type')
})
