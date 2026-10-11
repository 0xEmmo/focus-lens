import { explain } from './explain'

describe('why an audit could not start', () => {
  it('names the pages Chrome protects', () => {
    expect(explain('chrome://settings', null)).toMatch(/doesn’t let extensions read its own pages/)
    expect(explain('https://chromewebstore.google.com/detail/x', null)).toMatch(/Web Store/)
  })

  it('points at the file-URL switch', () => {
    expect(explain('file:///home/me/index.html', new Error('Cannot access contents'))).toMatch(/Allow access to file URLs/)
  })

  it('asks for a click when activeTab has not been granted', () => {
    expect(explain('https://example.com', new Error('Cannot access contents of the page. Extension manifest must request permission'))).toMatch(
      /Click the Focus Lens icon/,
    )
  })

  it('handles an empty tab and unknown errors', () => {
    expect(explain(undefined, null)).toMatch(/no page/)
    expect(explain('https://example.com', new Error('Frame was removed'))).toBe('Frame was removed')
  })
})
