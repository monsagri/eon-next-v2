/**
 * Card registration entry point.
 *
 * Imports all card web components and registers them in the
 * Home Assistant Lovelace card picker (window.customCards).
 */

import './summary-card'

// Extend the global Window type for HA card registration
declare global {
  interface Window {
    customCards?: Array<{
      type: string
      name: string
      description: string
      preview?: boolean
    }>
  }
}

window.customCards = window.customCards || []

window.customCards.push({
  type: 'eon-next-summary-card',
  name: 'EON Next Summary',
  description:
    'Compact overview of your EON Next energy data including consumption, costs, and EV charging status.',
  preview: true
})
