import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/atkinson-hyperlegible/400.css'
import '@fontsource/atkinson-hyperlegible/700.css'
import '@fontsource-variable/fraunces'
import { EmbeddedSample } from './EmbeddedSample'

document.body.style.margin = '0'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <EmbeddedSample />
  </StrictMode>,
)
