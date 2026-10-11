import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/atkinson-hyperlegible/400.css'
import '@fontsource/atkinson-hyperlegible/700.css'
import '@fontsource-variable/fraunces'
import { Sample } from './Sample'

document.body.style.margin = '0'

// Every flaw left in: this page exists to be audited by the extension.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sample fixed={new Set()} standalone />
  </StrictMode>,
)
