import { cssPath, isTabbable, tabOrder } from './dom'

const html = (s: string) => {
  document.body.innerHTML = s
  return document.body
}

describe('tab order', () => {
  it('follows the HTML sequential navigation order', () => {
    html(`
      <a href="#" id="a">A</a>
      <button id="b">B</button>
      <span tabindex="2" id="c">C</span>
      <input id="d">
      <span tabindex="1" id="e">E</span>
      <div tabindex="-1" id="f">F</div>
      <a id="g">no href</a>
    `)
    expect(tabOrder(document).map((e) => e.id)).toEqual(['e', 'c', 'a', 'b', 'd'])
  })

  it('skips disabled, hidden, inert and our own overlay', () => {
    html(`
      <button disabled id="a">x</button>
      <fieldset disabled><input id="b"></fieldset>
      <div hidden><button id="c">x</button></div>
      <div style="display:none"><button id="d">x</button></div>
      <div inert><button id="e">x</button></div>
      <div data-focus-lens><button id="f">x</button></div>
      <input type="hidden" id="g">
      <button id="ok">ok</button>
    `)
    expect(tabOrder(document).map((e) => e.id)).toEqual(['ok'])
    expect(isTabbable(document.getElementById('a')!)).toBe(false)
  })

  it('only counts the first summary of a details', () => {
    html(`<details><summary id="s1">One</summary><summary id="s2">Two</summary></details>`)
    expect(tabOrder(document).map((e) => e.id)).toEqual(['s1'])
  })
})

describe('cssPath', () => {
  it('uses a unique id, else classes and position', () => {
    html(`<div id="x"><ul class="list"><li class="item">a</li><li class="item">b</li></ul></div>`)
    expect(cssPath(document.getElementById('x')!)).toBe('#x')
    const li = document.querySelectorAll('li')[1]!
    expect(cssPath(li)).toBe('#x > ul.list > li.item:nth-of-type(2)')
    expect(document.querySelector(cssPath(li))).toBe(li)
  })
})
