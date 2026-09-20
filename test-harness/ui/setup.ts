// test-harness/ui/setup.ts
import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import { afterEach, vi } from "vitest"

afterEach(() => { cleanup(); vi.clearAllMocks() })

// jsdom gaps that Base UI / framer-motion touch
class RO { observe() {} unobserve() {} disconnect() {} }
;(globalThis as any).ResizeObserver ??= RO
window.matchMedia ??= ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as any
Element.prototype.scrollIntoView ??= vi.fn()
;(Element.prototype as any).hasPointerCapture ??= () => false
;(Element.prototype as any).setPointerCapture ??= () => {}
;(Element.prototype as any).releasePointerCapture ??= () => {}
;(globalThis as any).IntersectionObserver ??= class { observe() {} unobserve() {} disconnect() {} takeRecords() { return [] } }

// Response/Blob.text() — older jsdom builds don't have it
if (!Blob.prototype.text) {
  Blob.prototype.text = function (this: Blob) {
    return new Promise<string>((resolve) => { const fr = new FileReader(); fr.onload = () => resolve(String(fr.result)); fr.readAsText(this) })
  }
}
