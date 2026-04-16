# web component
[![tests](https://img.shields.io/github/actions/workflow/status/substrate-system/web-component/nodejs.yml?style=flat-square)](https://github.com/substrate-system/web-component/actions/workflows/nodejs.yml)
[![types](https://img.shields.io/npm/types/@substrate-system/web-component?style=flat-square)](README.md)
[![module](https://img.shields.io/badge/module-ESM%2FCJS-blue?style=flat-square)](README.md)
[![semantic versioning](https://img.shields.io/badge/semver-2.0.0-blue?logo=semver&style=flat-square)](https://semver.org/)
[![dependencies](https://img.shields.io/badge/dependencies-zero-brightgreen.svg?style=flat-square)](package.json#L33)
[![install size](https://flat.badgen.net/packagephobia/install/@substrate-system/web-component?cache-control=no-cache)](https://packagephobia.com/result?p=@substrate-system/web-component)
[![gzip size](https://img.shields.io/bundlephobia/minzip/@substrate-system/web-component?style=flat-square)](https://bundlephobia.com/package/@substrate-system/web-component)
[![Common Changelog](https://nichoth.github.io/badge/common-changelog.svg)](https://common-changelog.org)
[![license](https://img.shields.io/badge/license-Big_Time-blue?style=flat-square)](LICENSE)


A minimal parent class for [web components](https://developer.mozilla.org/en-US/docs/Web/API/Web_components).

This extends the native `HTMLElement`, and adds
[some methods to help with events](#emitnamestring-opts-bubbles-cancelable-detail-boolean).

[See a live demonstration](https://substrate-system.github.io/web-component/)

<details><summary><h2>Contents</h2></summary>

<!-- toc -->

- [Install](#install)
- [tl;dr](#tldr)
- [Hide Undefined Elements](#hide-undefined-elements)
  * [FOUCE](#fouce)
    + [HTML](#html)
    + [JS](#js)
    + [CSS](#css)
    + [`noscript`](#noscript)
- [Examples](#examples)
  * [Create a component](#create-a-component)
  * [Add the component to the DOM](#add-the-component-to-the-dom)
  * [Listen for events](#listen-for-events)
  * [Wildcard Event Listeners](#wildcard-event-listeners)
    + [Namespaced wildcard: `Component.event('*')`](#namespaced-wildcard-componentevent)
    + [Global wildcard: `'*'`](#global-wildcard-)
  * [Emit a namespaced event from the instance](#emit-a-namespaced-event-from-the-instance)
  * [Listen for a namespaced event](#listen-for-a-namespaced-event)
  * [Emit a plain string (not namespaced) event](#emit-a-plain-string-not-namespaced-event)
  * [Listen for all namespaced events from a component](#listen-for-all-namespaced-events-from-a-component)
  * [Listen for all events (global wildcard)](#listen-for-all-events-global-wildcard)
- [Reflected Attributes](#reflected-attributes)
  * [Attribute reactivity](#attribute-reactivity)
  * [Observing non-reflected attributes](#observing-non-reflected-attributes)
  * [TypeScript types](#typescript-types)
  * [Migration from manual `observedAttributes`](#migration-from-manual-observedattributes)
- [Modules](#modules)
  * [ESM](#esm)
  * [Common JS](#common-js)
- [methods](#methods)
  * [`emit(name:string, opts:{ bubbles?, cancelable?, detail? }):boolean`](#emitnamestring-opts-bubbles-cancelable-detail-boolean)
  * [`dispatch (type, opts)`](#dispatch-type-opts)
    + [`dispatch` example](#dispatch-example)
  * [`on (name:string, handler:(ev:Event)=>any, options?:boolean|AddEventListenerOptions)`](#on-namestring-handlereveventany-optionsbooleanaddeventlisteneroptions)
  * [`off (name:string, handler:(ev:Event)=>any, options?:boolean|EventListenerOptions)`](#off-namestring-handlereveventany-optionsbooleanaddeventlisteneroptions)
  * [`event (name:string):string`](#event-namestringstring)
    + [`event` example](#event-example)
  * [`qs`](#qs)
  * [`qsa`](#qsa)
  * [element.qs & element.qsa](#elementqs--elementqsa)
    + [example](#example)
- [Misc](#misc)
  * [Some Notes](#some-notes)
  * [`/util`](#util)
    + [`qs`](#qs-1)
    + [`qsa`](#qsa-1)
    + [`isRegistered(name:string)`](#isregisterednamestring)
    + [`define(name:string, element:CustomElementConstructor)`](#definenamestring-elementcustomelementconstructor)
  * [`/attributes`](#attributes)
    + [`Attrs`](#attrs)
    + [`toAttributes(attrs:Attrs):string`](#toattributesattrsattrsstring)
- [Develop](#develop)
- [Test](#test)
- [See also](#see-also)

<!-- tocstop -->

</details>

## Install

```bash
npm i -S @substrate-system/web-component
```

## tl;dr

* [use `.emit` to emit a namepsaced event](#emit-a-namespaced-event-from-the-instance)
* [use `.on(name, handler)` to listen for namespaced events](#listen-for-events)
* [use `.dispatch` to emit a non-namespaced event](#emit-a-plain-string-not-namespaced-event)
* [use `.event(name)` to get the namespaced event type](#listen-for-events)
* [extend the factory function to create a web component](#create-a-component)
* [Listen for all event with the `'*'` event name](#wildcard-event-listeners).
* [Hide your component's content until it is ready](#hide-undefined-elements)

## Hide Undefined Elements

>
> [!TIP]
> Use the CSS [`:defined`](https://developer.mozilla.org/en-US/docs/Web/CSS/:defined)
> pseudo-class to hide elements until they have been defined in JS, to prevent
> a [FOUCE](https://www.abeautifulsite.net/posts/flash-of-undefined-custom-elements/#awaiting-customelements.whendefined).
>

```css
my-element:not(:defined) {
  visibility: hidden;
}
```

>
> [!CAUTION]
> JS must exist on the device for the custom elements to be defined.
> A better option might be to [set a single class when everything is defined](https://www.abeautifulsite.net/posts/revisiting-fouce).
>

### FOUCE

My favorite way to deal with FOUCE is to add a class to the body tag, then
remove it in JS, and hide things with CSS, as
[seen here](https://www.abeautifulsite.net/posts/revisiting-fouce).

#### HTML

Write the static HTML like this:

```html
<html class="reduce-fouce">
  ...
</html>
```

#### JS

```html
<script type="module">
  await Promise.race([
    // Load all custom elements
    Promise.allSettled([
      customElements.whenDefined('my-button'),
      customElements.whenDefined('my-card'),
      customElements.whenDefined('my-rating')
      // ...
    ]),
    // Resolve after two seconds
    new Promise(resolve => setTimeout(resolve, 2000))
  ]);

  // Remove the class, showing the page content
  document.documentElement.classList.remove('reduce-fouce');
</script>
```

#### CSS

```css
html.reduce-fouce {
  opacity: 0;
}
```

#### `noscript`

Include a `noscript` tag for when Javascript does not exist:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <link rel="stylesheet" href="/style.css">

    <noscript>
      <style>
        html.reduce-fouce {
          opacity: 1!important;
        }
      </style>
    </noscript>
  </head>
```


## Examples

### Create a component
Use the factory function to create a new web component.

```js
import { WebComponent } from '@substrate-system/web-component'

class AnotherElement extends WebComponent.create('another-element') {
    connectedCallback () {
        this.innerHTML = `<div>
            hello again
        </div>`
    }
}

// call custom customElements.define with the right tag name
AnotherElement.define()
```

The new component will have a property `NAME` on the class that is equal to
[the name you passed in](https://developer.mozilla.org/en-US/docs/Web/API/CustomElementRegistry/define#valid_custom_element_names).
The [component name should be kebab case](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements#name).


### Add the component to the DOM
```js
document.body.innerHTML += '<another-element></another-element>'
```


### Listen for events

Use a helper method, `WebComponent.event(name:string)`, to get a
namespaced event name.

```js
// find the instance
const el = document.querySelector('my-element')

// listen for namespaced events
el?.addEventListener(MyElement.event('hello'), ev => {
    console.log(ev.detail)  // => 'some data'
})

// shorthand for namespaced listeners
el?.on('hello', ev => {
    console.log(ev.type)  // => 'my-element:hello'
})

// listen for non-namespaced events
el?.addEventListener('hello', ev => {
    console.log(ev.detail)  // => 'some data again'
})
```

### Wildcard Event Listeners

The component supports two types of wildcard event listeners.

#### Namespaced wildcard: `Component.event('*')`

Listen to all events emitted through the component's `.emit()` method
(events in the component's namespace):

```js
const el = document.querySelector('my-element')

const listener = (ev) => {
    console.log('Namespaced event:', ev.type)
}

// Add listener for all 'my-element:*' events
el.addEventListener(MyElement.event('*'), listener)

// These will trigger the listener
el.emit('click')    // Fires with type 'my-element:click'
el.emit('change')   // Fires with type 'my-element:change'

// This will NOT trigger the listener (not namespaced)
el.dispatch('hello')

// Remove the wildcard listener
el.removeEventListener(MyElement.event('*'), listener)
```

#### Global wildcard: `'*'`

Listen to **all** events dispatched through the element:

```js
const el = document.querySelector('my-element')

const listener = (ev) => {
    console.log('Any event:', ev.type)
}

// Add listener for ALL events
el.addEventListener('*', listener)

// ALL of these trigger the listener
el.emit('custom')                      // my-element:custom
el.dispatch('hello')                   // hello
el.dispatchEvent(new Event('click'))   // click

// Remove the global wildcard listener
el.removeEventListener('*', listener)
```


### Emit a namespaced event from the instance

```js
// find the instance
const el = document.querySelector('my-element')

// dispatch an event
el?.emit('hello', { detail: 'some data' })  // => `my-element:hello`
```

### Listen for a namespaced event

Use the static method `.event` to get a namespaced event name.

```js
class ExampleComponent extends WebComponent {
    tag = 'example-component'
    // ...
}

const ev = ExampleComponent.event('click')
// => 'example-component:click'
```

### Emit a plain string (not namespaced) event
The `dispatch` method wont namespace the event name. It just emits the
literal string.

```js
const el = document.querySelector('my-element')

// dispatch an event as plain string, not namespaced
el?.dispatch('hello', { detail: 'some data again' })  // => `hello`
```

### Listen for all namespaced events from a component

Use the pattern `Component.event('*')` to listen to all events emitted by a
specific component with its namespace.

```js
const el = document.querySelector('my-element')

// Listen to all namespaced events from this component
el?.addEventListener(MyElement.event('*'), ev => {
    console.log('Caught namespaced event:', ev.type)
    // Will catch 'my-element:click', 'my-element:change', etc.
})

// This will trigger the wildcard listener
el?.emit('click', { detail: 'clicked' })
el?.emit('change', { detail: 'changed' })
```

### Listen for all events (global wildcard)

Use the literal string `'*'` to listen to **all** events dispatched through
the element, including both namespaced and non-namespaced events, as well as
native DOM events.

```js
const el = document.querySelector('my-element')

// Listen to ALL events on this element
el?.addEventListener('*', ev => {
    console.log('Caught any event:', ev.type)
    // Will catch everything: 'my-element:click', 'hello', 'click', etc.
})

// All of these trigger the global wildcard listener
el?.emit('custom')           // Triggers with type 'my-element:custom'
el?.dispatch('hello')        // Triggers with type 'hello'
el?.dispatchEvent(new Event('click'))  // Triggers with type 'click'
```

## Reflected Attributes

> [!NOTE]
> Frameworks like Preact and React set non-string props on custom elements via
> **property assignment** (`el.disabled = true`) rather than
> `setAttribute('disabled', '')`. Native elements handle this automatically
> because the browser has built-in IDL reflection. Web components need to
> opt in.

Declare which attributes should be reflected as properties using two static
arrays:

```ts
class SubstrateButton extends WebComponent {
    static TAG = 'substrate-button'

    // Boolean attributes: property is true when attribute is present
    static reflectedBooleanAttributes = ['disabled', 'readonly']

    // String attributes: property mirrors the attribute value (null if absent)
    static reflectedStringAttributes  = ['type', 'name', 'value']

    // Optional: TypeScript types for reflected properties
    declare disabled:boolean
    declare readonly:boolean
    declare type:string|null
    declare name:string|null
    declare value:string|null

    render () { /* ... */ }
}

SubstrateButton.define()
```

The base class generates getters and setters for each declared attribute.
`observedAttributes` is auto-derived — no need to declare it separately.

### Attribute reactivity

When a reflected attribute changes (via property assignment OR
`setAttribute`), the browser fires `attributeChangedCallback`, which routes
to your `handleChange_${name}` method as usual:

```ts
class SubstrateButton extends WebComponent {
    static reflectedBooleanAttributes = ['disabled']
    declare disabled:boolean

    handleChange_disabled (_oldValue:string|null, newValue:string|null) {
        this.qs('button')?.toggleAttribute('disabled', newValue !== null)
    }

    render () {
        this.innerHTML = `<button>click me</button>`
    }
}
```

### Observing non-reflected attributes

To observe additional attributes that don't need property reflection, extend
`observedAttributes` using `super`:

```ts
class MyElement extends WebComponent {
    static reflectedBooleanAttributes = ['disabled']

    static get observedAttributes () {
        return [...super.observedAttributes, 'role']
    }

    handleChange_role (_old:string|null, next:string|null) {
        if (next) this.qs('button')?.setAttribute('role', next)
    }
}
```

### TypeScript types

Reflected properties are installed at runtime and are invisible to TypeScript.
Use `declare` to add types without emitting runtime code:

```ts
class MyButton extends WebComponent {
    static reflectedBooleanAttributes = ['disabled']
    static reflectedStringAttributes  = ['type']
    declare disabled:boolean       // boolean: true = present, false = absent
    declare type:string|null       // string|null: null when attribute is absent
}
```

### Migration from manual `observedAttributes`

If you previously declared `static observedAttributes` and wrote manual
getters/setters, migrate like this:

**Before:**
```ts
static observedAttributes = ['disabled']

get disabled ():boolean { return this.hasAttribute('disabled') }
set disabled (v:boolean) { this.toggleAttribute('disabled', v) }
```

**After:**
```ts
static reflectedBooleanAttributes = ['disabled']
declare disabled:boolean   // TypeScript type only, no runtime code
```

If your setter has custom side-effect logic beyond `toggleAttribute`, keep the
hand-written setter. The base class detects it and leaves it untouched.

## Modules

### ESM

This exposes ESM and common JS via [package.json `exports` field](https://nodejs.org/api/packages.html#exports).

```js
const { WebComponent } = import '@substrate-system/web-component'
```

### Common JS
```js
const { WebCompponent } = require('@substrate-system/web-component')
```

## methods

### `emit(name:string, opts:{ bubbles?, cancelable?, detail? }):boolean`

This will emit a [CustomEvent](https://developer.mozilla.org/en-US/docs/Web/Events/Creating_and_triggering_events),
namespaced according to a convention.

The return value is
[the same as the native `.dispatchEvent` method](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/dispatchEvent),

> returns `true` if either event's `cancelable` attribute value is false or its `preventDefault()` method was not invoked, and `false` otherwise.

Because the event is namespaced, we can use event bubbling while minimizing
event name collisions.

The naming convention is to take the `NAME` property of the class, and append a
string `:event-name`.

So `emit('test')` dispatches an event like `my-element:test`.

```js
class MyElement {
    NAME = 'my-element'  // <-- for event namespace
    // ...
}

// ... then use the element in markup ...

const el = document.querySelector('my-element')

// 'my-element:test' event
el.addEventListener(MyElement.event('test'), ev => {
    console.log(ev.detail)  // => 'some data'
})

// ... in the future ...

el.emit('test', 'some data')  // dispatch `my-element:test` event
```

See also, [Custom events in Web Components](https://gomakethings.com/custom-events-in-web-components/)

-------------------------------------------------------------------

### `dispatch (type, opts)`
Create and emit an event, no namespacing. The return value is the same as the
native `.dispatchEvent` method,

> returns `true` if either event's `cancelable` attribute value is false or
its `preventDefault()` method was not invoked, and `false` otherwise.

That is, it returns true if it was not `preventDetault`ed.

```ts
dispatch (type:string, opts:Partial<{
    bubbles,
    cancelable,
    detail
}>):boolean
```

#### `dispatch` example
```js
const el = document.querySelector('my-element')
el.dispatch('change')  // => 'change' event
```

-------------------------------------------------------------------

### `on (name:string, handler:(ev:Event)=>any, options?:boolean|AddEventListenerOptions)`

Listen for namespaced events with shorthand syntax.
Internally this maps `name` to `Component.event(name)` and calls
`addEventListener`.

```js
const el = document.querySelector('my-element')

el?.on('ready', ev => {
    console.log(ev.type) // => 'my-element:ready'
})

// pass native addEventListener options
el?.on('ready', ev => {
    console.log('fires once')
}, { once: true })

// namespaced wildcard
el?.on('*', ev => {
    console.log(ev.type) // => any 'my-element:*' event from .emit()
})
```

`on('*', handler)` only listens to namespaced events for that component.
It does not listen to non-namespaced events such as `el.dispatch('click')`.

-------------------------------------------------------------------

### `off (name:string, handler:(ev:Event)=>any, options?:boolean|EventListenerOptions)`

Remove a namespaced event listener. Internally this maps `name` to
`Component.event(name)` and calls `removeEventListener`.

```js
const el = document.querySelector('my-element')

const handler = (ev) => {
    console.log(ev.type) // => 'my-element:ready'
}

// Add the listener
el?.on('ready', handler)

// Remove the listener
el?.off('ready', handler)

// Also works with namespaced wildcard
el?.on('*', handler)
el?.off('*', handler)
```

The handler reference must be the same function object that was passed to
`on()`, just like with native `removeEventListener`.

-------------------------------------------------------------------

### `event (name:string):string`
Return the namespaced event name.

#### `event` example

```js
MyElement.event('change')  // => 'my-element:change'
```

You can also use `'*'` as the event name to create a wildcard listener pattern:

```js
MyElement.event('*')  // => 'my-element:*'
```

This is used with `addEventListener` to listen to all namespaced events from
a component.


-------------------------------------------------------------------


### `qs`
A convenient shortcut to `element.querySelector`.

```ts
qs (selector:string):HTMLElement|null
```



### `qsa`
Shortcut to `document.querySelectorAll`

```ts
qsa (selector:string):ReturnType<typeof document.querySelectorAll>
```

### element.qs & element.qsa

A shortcut to `element.querySelector` & `element.querySelectorAll`.

#### example

```js
const myElement = document.querySelector('my-element')
debug('the namespaced event...', MyElement.event('aaa'))

// query inside the element 
const buttons = myElement?.qsa('button')
```

---------------------------------------------------------------------

## Misc

### Some Notes

> Attributes (strings, numbers, booleans) tend to reflect, properties don’t.

That means,

* Attributes typically reflect to properties &mdash; when you set
  `count="5"` in HTML, the element's `.count` property mirrors that value
  (often converting the string to a number).
* Properties typically DON'T reflect back to attributes &mdash; when you set
  element.count = 10 in JavaScript, it usually doesn't update the HTML
  attribute to count="10"


See [The killer feature of Web Components](https://daverupert.com/2025/10/custom-elements-manifest-killer-feature/).



-------


### `/util`

Various functions.

#### `qs`
A convenient shortcut to `document.querySelector`.

```js
import { qs } from 'substrate-system/web-component/qs'
```

#### `qsa`
A shortcut to `document.querySelectorAll`.

```js
import { qsa } from 'substrate-system/web-component/qsa'
```

#### `isRegistered(name:string)`
Check if an element name has been used already.

```ts
function isRegistered (elName:string):boolean
```

```js
import { isRegistered } from '@substrate-system/web-component/util'
```

##### example
```js
import { isRegistered } from '@substrate-system/web-component/util'

if (!isRegistered('example-component')) {
    customElements.define('example-component', ExampleComponent)
}
```

#### `define(name:string, element:CustomElementConstructor)`

Add a component to the [custom element registry](https://developer.mozilla.org/en-US/docs/Web/API/CustomElementRegistry).

This uses `isRegistered`, so it will not throw if the name has been
taken already.

```js
import { define } from '@substrate-system/web-component/util'
```

```ts
function define (name:string, element:CustomElementConstructor) {
```


### `/attributes`

Utilities for working with HTML attributes.

```js
import { toAttributes } from '@substrate-system/web-component/attributes'
```

#### `Attrs`

A type alias for attribute objects.

```ts
type Attrs = Record<string,
    undefined|null|string|number|boolean|(string|number)[]>
```

#### `toAttributes(attrs:Attrs):string`

Transform an object into an HTML attributes string. Keys with falsy values
(`undefined`, `null`, `false`, `0`, `''`) are omitted. Boolean `true`
produces a bare attribute name. Arrays are joined with spaces.

```ts
function toAttributes (attrs:Attrs):string
```

##### example

```js
import { toAttributes } from '@substrate-system/web-component/attributes'

toAttributes({ class: 'foo bar', disabled: true })
// => 'class="foo bar" disabled'

toAttributes({ class: ['foo', 'bar'], hidden: false })
// => 'class="foo bar"'

toAttributes({ id: 'my-el', tabindex: 1 })
// => 'id="my-el" tabindex="1"'
```

---------------------------------------------------------------------

## Develop
Start a localhost server:

```bash
npm start
```

------------------------------------------------------------------------

## Test

```bash
npm test
```

-------------------------------------------------


## See also

* [Custom events in Web Components](https://gomakethings.com/custom-events-in-web-components/)
* [Web Component lifecycle methods](https://gomakethings.com/the-web-component-lifecycle-methods/)
* [How to detect when attributes change on a Web Component](https://gomakethings.com/how-to-detect-when-attributes-change-on-a-web-component/)
* [Handling asychronous rendering in Web Components](https://gomakethings.com/handling-asychronous-rendering-in-web-components/)
* [Accessible Icon Buttons](https://www.sarasoueidan.com/blog/accessible-icon-buttons/)
* [Inclusively Hidden](https://www.scottohara.me/blog/2017/04/14/inclusively-hidden.html)
