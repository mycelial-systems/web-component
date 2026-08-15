export function qs<K extends keyof HTMLElementTagNameMap> (
    selectors:K
):HTMLElementTagNameMap[K]|null

export function qs<K extends keyof SVGElementTagNameMap> (
    selectors:K
):SVGElementTagNameMap[K]|null

export function qs<E extends Element = Element> (
    selectors:string
):E|null

export function qs (selectors:string):Element|null {
    return document.querySelector(selectors)
}
