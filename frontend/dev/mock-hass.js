/**
 * Mock hass object for local development.
 *
 * Intercepts callWS and returns fixture data that mirrors the real
 * eon_next/version, eon_next/dashboard_summary, and
 * eon_next/consumption_history responses.
 */

// ---------------------------------------------------------------------------
// Fixture data — edit these to test different scenarios
// ---------------------------------------------------------------------------

const FIXTURES = {
  version: { version: '1.5.2' },

  summary: {
    meters: [
      {
        serial: '21L1234567',
        type: 'electricity',
        latest_reading: 34521.4,
        latest_reading_date: '2026-02-25',
        daily_consumption: 8.72,
        standing_charge: 0.61,
        previous_day_cost: 2.84,
        unit_rate: 0.2449,
        tariff_name: 'E.ON Next Flex'
      },
      {
        serial: 'G4E98765',
        type: 'gas',
        latest_reading: 12045.0,
        latest_reading_date: '2026-02-25',
        daily_consumption: 22.3,
        standing_charge: 0.31,
        previous_day_cost: 1.97,
        unit_rate: 0.0614,
        tariff_name: 'E.ON Next Flex'
      }
    ],
    ev_chargers: [
      {
        device_id: 'ev-001',
        serial: 'EVSN-2024-XYZ',
        schedule_slots: 2,
        next_charge_start: '2026-02-26T01:00:00Z',
        next_charge_end: '2026-02-26T05:00:00Z'
      }
    ]
  },

  consumptionHistory: {
    '21L1234567': {
      entries: [
        { date: '2026-02-21', consumption: 9.12 },
        { date: '2026-02-22', consumption: 7.84 },
        { date: '2026-02-23', consumption: 11.03 },
        { date: '2026-02-24', consumption: 8.45 },
        { date: '2026-02-25', consumption: 7.14 },
        { date: '2026-02-26', consumption: 9.67 },
        { date: '2026-02-27', consumption: 8.72 }
      ]
    },
    G4E98765: {
      entries: [
        { date: '2026-02-21', consumption: 24.1 },
        { date: '2026-02-22', consumption: 19.8 },
        { date: '2026-02-23', consumption: 28.5 },
        { date: '2026-02-24', consumption: 21.3 },
        { date: '2026-02-25', consumption: 18.7 },
        { date: '2026-02-26', consumption: 25.2 },
        { date: '2026-02-27', consumption: 22.3 }
      ]
    }
  },

  empty: {
    meters: [],
    ev_chargers: []
  }
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let simulateError = false
let simulateEmpty = false

// ---------------------------------------------------------------------------
// Mock hass construction
// ---------------------------------------------------------------------------

function createMockHass() {
  return {
    callWS: async (msg) => {
      // Simulate network latency
      await new Promise((r) => setTimeout(r, 300))

      if (simulateError) {
        throw new Error('Simulated API error: connection refused')
      }

      switch (msg.type) {
        case 'eon_next/version':
          return FIXTURES.version
        case 'eon_next/dashboard_summary':
          return simulateEmpty ? FIXTURES.empty : FIXTURES.summary
        case 'eon_next/consumption_history': {
          if (simulateEmpty) return { entries: [] }
          const serial = msg.meter_serial
          return FIXTURES.consumptionHistory[serial] || { entries: [] }
        }
        default:
          throw new Error(`Unknown WS command: ${msg.type}`)
      }
    },
    states: {},
    themes: { darkMode: false },
    language: 'en',
    locale: { language: 'en', number_format: 'language' }
  }
}

// ---------------------------------------------------------------------------
// Wire up to DOM elements
// ---------------------------------------------------------------------------

function inject() {
  const hass = createMockHass()

  const panel = document.getElementById('panel')
  const summaryCard = document.getElementById('summary-card')
  const consumptionCard = document.getElementById('consumption-card')
  const costCard = document.getElementById('cost-card')
  const readingCard = document.getElementById('reading-card')

  if (panel) {
    Object.assign(panel, {
      hass,
      narrow: false,
      route: { prefix: '/eon_next', path: '' },
      panel: { config: {}, url_path: 'eon_next', title: 'EON Next' }
    })
  }

  if (summaryCard) {
    summaryCard.setConfig({ type: 'custom:eon-next-summary-card' })
    summaryCard.hass = hass
  }

  if (consumptionCard) {
    consumptionCard.setConfig({
      type: 'custom:eon-next-consumption-card',
      meter_type: 'electricity'
    })
    consumptionCard.hass = hass
  }

  if (costCard) {
    costCard.setConfig({
      type: 'custom:eon-next-cost-card',
      meter_type: 'electricity'
    })
    costCard.hass = hass
  }

  if (readingCard) {
    readingCard.setConfig({
      type: 'custom:eon-next-reading-card',
      meter_type: 'electricity'
    })
    readingCard.hass = hass
  }
}

// Wait for custom elements to be defined, then inject
Promise.all([
  customElements.whenDefined('eon-next-panel'),
  customElements.whenDefined('eon-next-summary-card'),
  customElements.whenDefined('eon-next-consumption-card'),
  customElements.whenDefined('eon-next-cost-card'),
  customElements.whenDefined('eon-next-reading-card')
]).then(() => inject())

// ---------------------------------------------------------------------------
// Toolbar controls
// ---------------------------------------------------------------------------

document.getElementById('btn-dark')?.addEventListener('click', () => {
  document.body.classList.toggle('dark')
})

document.getElementById('btn-error')?.addEventListener('click', () => {
  simulateError = true
  simulateEmpty = false
  inject()
})

document.getElementById('btn-empty')?.addEventListener('click', () => {
  simulateError = false
  simulateEmpty = true
  inject()
})

document.getElementById('btn-reset')?.addEventListener('click', () => {
  simulateError = false
  simulateEmpty = false
  inject()
})
