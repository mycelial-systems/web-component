import { test } from '@substrate-system/tapzero'
import { waitFor, waitForText } from '@substrate-system/dom'
import * as preact from 'preact'
import { toAttributes } from '../src/util.js'
import { WebComponent } from '../src/index.js'

// Wildcard event support is an opt-in mixin, tested in ./wildcard.ts. Import it
// so its tests are bundled (the test runner bundles this file as the entry).
import './wildcard.js'

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

test('.off removes a namespaced event listener', t => {
    t.plan(2)
    document.body.innerHTML +=
        '<test-component class="off-test"></test-component>'

    const el = document.querySelector<TestComponent>('.off-test')
    let called = 0

    const handler = () => {
        called++
    }

    el?.on('hello', handler)
    el?.emit('hello')
    el?.off('hello', handler)
    el?.emit('hello')

    t.equal(called, 1, 'should remove the event listener')
    t.ok(el, 'should find an element')
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

test('Preact: disabled={true} prop sets disabled attribute', t => {
    t.plan(2)

    const container = document.createElement('div')
    document.body.appendChild(container)

    preact.render(
        preact.h('reflected-el', {
            className: 'preact-disabled-test',
            disabled: true
        }),
        container
    )

    const el = container.querySelector<ReflectedElement>(
        '.preact-disabled-test'
    )
    t.ok(el, 'should find the rendered element')
    t.ok(
        el!.hasAttribute('disabled'),
        'setting disabled={true} via Preact should add the disabled attribute'
    )

    container.remove()
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
