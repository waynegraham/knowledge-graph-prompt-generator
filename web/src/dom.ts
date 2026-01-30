export const byId = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id)
  if (!el) {
    throw new Error(`Missing element with id "${id}"`)
  }
  return el as T
}

export const qs = <T extends Element>(selector: string, root: ParentNode = document): T => {
  const el = root.querySelector(selector)
  if (!el) {
    throw new Error(`Missing element for selector "${selector}"`)
  }
  return el as T
}

export const qsa = <T extends Element>(selector: string, root: ParentNode = document): T[] =>
  Array.from(root.querySelectorAll(selector)) as T[]
