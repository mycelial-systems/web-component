export function qsa<K extends keyof HTMLElementTagNameMap> (
    selectors:K
):NodeListOf<HTMLElementTagNameMap[K]>

export function qsa<K extends keyof SVGElementTagNameMap> (
    selectors:K
):NodeListOf<SVGElementTagNameMap[K]>

export function qsa<E extends Element = Element> (
    selectors:string
):NodeListOf<E>

export function qsa (selectors:string):NodeListOf<Element> {
    return document.querySelectorAll(selectors)
}
