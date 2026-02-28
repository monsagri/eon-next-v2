/**
 * Card registration entry point.
 *
 * Imports all card web components and registers them in the
 * Home Assistant Lovelace card picker (window.customCards).
 */

import './summary-card'
import './consumption-card'
import './cost-card'
import './reading-card'
import './ev-card'

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

window.customCards.push(
  {
    type: 'eon-next-summary-card',
    name: 'EON Next Summary',
    description:
      'Compact overview of your EON Next energy data including consumption, costs, and EV charging status.',
    preview: true
  },
  {
    type: 'eon-next-consumption-card',
    name: 'EON Next Consumption',
    description:
      'Consumption chart and daily usage for a single meter with 7-day history.',
    preview: true
  },
  {
    type: 'eon-next-cost-card',
    name: 'EON Next Costs',
    description:
      'Cost summary for a single meter showing today, yesterday, standing charge, and unit rate.',
    preview: true
  },
  {
    type: 'eon-next-reading-card',
    name: 'EON Next Meter Reading',
    description: 'Latest meter reading, date, and tariff information for a single meter.',
    preview: true
  },
  {
    type: 'eon-next-ev-card',
    name: 'EON Next EV Charging',
    description:
      'Smart charging schedule timeline showing upcoming charge slots for your EV.',
    preview: true
  }
)
