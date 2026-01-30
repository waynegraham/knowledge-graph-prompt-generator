/* @vitest-environment jsdom */
import { describe, expect, it } from 'vitest'
import { byId, qs, qsa } from './dom'

describe('dom helpers', () => {
  it('byId returns the element when present', () => {
    document.body.innerHTML = '<div id="root"></div>'
    const el = byId<HTMLDivElement>('root')
    expect(el).not.toBeNull()
    expect(el.id).toBe('root')
  })

  it('byId throws when missing', () => {
    document.body.innerHTML = ''
    expect(() => byId('missing')).toThrow('Missing element with id \"missing\"')
  })

  it('qs returns the first match', () => {
    document.body.innerHTML = '<div class="card"></div><div class="card"></div>'
    const el = qs<HTMLDivElement>('.card')
    expect(el.classList.contains('card')).toBe(true)
  })

  it('qs throws when missing', () => {
    document.body.innerHTML = ''
    expect(() => qs('.nope')).toThrow('Missing element for selector \".nope\"')
  })

  it('qsa returns all matches', () => {
    document.body.innerHTML = '<span class="item"></span><span class="item"></span>'
    const items = qsa<HTMLSpanElement>('.item')
    expect(items).toHaveLength(2)
  })
})
