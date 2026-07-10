/**
 * Mock hass object for local development.
 *
 * Intercepts callWS and returns fixture data that mirrors the real
 * eon_next/version, eon_next/dashboard_summary, eon_next/consumption_history,
 * eon_next/ev_schedule and eon_next/backfill_status responses, and provides a
 * handful of HA entity states for the tariff page + account balance (Path B).
 */

const ELEC_SERIAL = '19L3981595'
const GAS_SERIAL = 'E6S27183321961'
const ELEC_RATE = 0.2117
const GAS_RATE = 0.0495
const ELEC_STANDING = 0.35
const GAS_STANDING = 0.31

// --- Generated daily consumption history (last ~120 days) ------------------

function isoDaysAgo(n) {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

function buildHistory(n, fn) {
  const entries = []
  for (let i = n; i >= 1; i--) {
    entries.push({ date: isoDaysAgo(i), consumption: Math.max(0, +fn(i).toFixed(3)) })
  }
  return entries
}

const ELEC_HISTORY = buildHistory(
  120,
  (i) => 2 + 8 * Math.abs(Math.sin(i * 0.5)) + (i % 7 < 2 ? 3 : 0)
)
const GAS_HISTORY = buildHistory(120, (i) =>
  Math.max(0.002, 0.03 * Math.abs(Math.sin(i * 0.9)) + (i > 90 ? 1.5 : 0))
)

// --- Today's flat-rate schedule for the tariff strip ------------------------

function buildFlatDayRates(rate) {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  return [
    { start: start.toISOString(), end: end.toISOString(), rate, is_off_peak: false }
  ]
}

// --- EV schedule (tonight) --------------------------------------------------

function buildEvSlots() {
  const start = new Date()
  start.setHours(0, 30, 0, 0)
  if (start.getTime() < Date.now()) start.setDate(start.getDate() + 1)
  const end = new Date(start)
  end.setHours(5, 30, 0, 0)
  const start2 = new Date(start)
  start2.setDate(start2.getDate() + 1)
  start2.setHours(1, 0, 0, 0)
  const end2 = new Date(start2)
  end2.setHours(4, 30, 0, 0)
  return [
    { start: start.toISOString(), end: end.toISOString() },
    { start: start2.toISOString(), end: end2.toISOString() }
  ]
}

const FIXTURES = {
  version: { version: '2.0.0' },

  summary: {
    account_balance: 42.17,
    meters: [
      {
        serial: ELEC_SERIAL,
        type: 'electricity',
        latest_reading: 3243.222,
        latest_reading_date: isoDaysAgo(3),
        daily_consumption: 4.44,
        standing_charge: ELEC_STANDING,
        previous_day_cost: 0.94,
        unit_rate: ELEC_RATE,
        tariff_name: 'Next Fixed 12m v106',
        tariff_type: 'Fixed dual-fuel',
        tariff_valid_from: '2025-07-07',
        tariff_valid_to: '2027-07-06',
        unit_rate_valid_from: null,
        unit_rate_valid_to: null,
        previous_unit_rate: 0.2034,
        previous_unit_rate_valid_from: null,
        previous_unit_rate_valid_to: isoDaysAgo(3),
        next_unit_rate: 0.2117,
        next_unit_rate_valid_from: null,
        next_unit_rate_valid_to: null,
        is_time_of_use: false,
        day_rates: buildFlatDayRates(ELEC_RATE)
      },
      {
        serial: GAS_SERIAL,
        type: 'gas',
        latest_reading: 11318.4,
        latest_reading_date: isoDaysAgo(3),
        daily_consumption: 0.6,
        standing_charge: GAS_STANDING,
        previous_day_cost: 0.34,
        unit_rate: GAS_RATE,
        tariff_name: 'Next Fixed 12m v106',
        tariff_type: 'Fixed dual-fuel',
        tariff_valid_from: '2025-07-07',
        tariff_valid_to: '2027-07-06',
        unit_rate_valid_from: null,
        unit_rate_valid_to: null,
        previous_unit_rate: 0.0471,
        previous_unit_rate_valid_from: null,
        previous_unit_rate_valid_to: isoDaysAgo(3),
        next_unit_rate: 0.0495,
        next_unit_rate_valid_from: null,
        next_unit_rate_valid_to: null,
        is_time_of_use: false,
        day_rates: buildFlatDayRates(GAS_RATE)
      }
    ],
    ev_chargers: [
      {
        device_id: 'ev-001',
        serial: 'EVSN-2024-XYZ',
        schedule_slots: 2,
        next_charge_start: null,
        next_charge_end: null
      }
    ]
  },

  backfill: {
    state: 'complete',
    enabled: true,
    total_meters: 2,
    completed_meters: 2,
    pending_meters: 0,
    lookback_days: 365,
    next_start_date: null,
    meters: [
      {
        serial: ELEC_SERIAL,
        done: true,
        next_start: null,
        days_completed: 365,
        days_remaining: 0
      },
      {
        serial: GAS_SERIAL,
        done: true,
        next_start: null,
        days_completed: 365,
        days_remaining: 0
      }
    ]
  },

  empty: { account_balance: null, meters: [], ev_chargers: [] }
}

let simulateError = false
let simulateEmpty = false

function historyFor(serial, days) {
  const base = serial === GAS_SERIAL ? GAS_HISTORY : ELEC_HISTORY
  return { entries: base.slice(-days) }
}

// --- HA entity states (Path B) ----------------------------------------------

function buildStates() {
  return {
    'sensor.19l3981595_account_balance': {
      entity_id: 'sensor.19l3981595_account_balance',
      state: '42.17',
      attributes: { account_number: 'A-123', unit_of_measurement: 'GBP' },
      last_changed: '',
      last_updated: ''
    },
    'sensor.19l3981595_current_tariff': {
      entity_id: 'sensor.19l3981595_current_tariff',
      state: 'Next Fixed 12m v106',
      attributes: {
        tariff_code: 'E-1R-NEXT-FIXED-12M-V106-A',
        tariff_type: 'Fixed dual-fuel',
        tariff_valid_from: '2025-07-07',
        tariff_valid_to: '2027-07-06'
      },
      last_changed: '',
      last_updated: ''
    },
    'sensor.19l3981595_previous_unit_rate': {
      entity_id: 'sensor.19l3981595_previous_unit_rate',
      state: '0.2034',
      attributes: { valid_to: isoDaysAgo(3) },
      last_changed: '',
      last_updated: ''
    },
    'sensor.19l3981595_next_unit_rate': {
      entity_id: 'sensor.19l3981595_next_unit_rate',
      state: '0.2117',
      attributes: {},
      last_changed: '',
      last_updated: ''
    },
    'event.19l3981595_current_day_rates': {
      entity_id: 'event.19l3981595_current_day_rates',
      state: '2026-07-09T00:00:00+00:00',
      attributes: { rates: buildFlatDayRates(ELEC_RATE) },
      last_changed: '',
      last_updated: ''
    },
    'sensor.e6s27183321961_previous_unit_rate': {
      entity_id: 'sensor.e6s27183321961_previous_unit_rate',
      state: '0.0471',
      attributes: { valid_to: isoDaysAgo(3) },
      last_changed: '',
      last_updated: ''
    },
    'sensor.e6s27183321961_next_unit_rate': {
      entity_id: 'sensor.e6s27183321961_next_unit_rate',
      state: '0.0495',
      attributes: {},
      last_changed: '',
      last_updated: ''
    }
  }
}

function createMockHass() {
  return {
    callWS: async (msg) => {
      await new Promise((r) => setTimeout(r, 200))
      if (simulateError) {
        throw new Error('Simulated API error: connection refused')
      }
      switch (msg.type) {
        case 'eon_next/version':
          return FIXTURES.version
        case 'eon_next/dashboard_summary':
          return simulateEmpty ? FIXTURES.empty : FIXTURES.summary
        case 'eon_next/consumption_history':
          return simulateEmpty
            ? { entries: [] }
            : historyFor(msg.meter_serial, msg.days ?? 7)
        case 'eon_next/backfill_status':
          return FIXTURES.backfill
        case 'eon_next/ev_schedule':
          return {
            device_id: msg.device_id,
            serial: 'EVSN-2024-XYZ',
            status: 'scheduled',
            slots: buildEvSlots()
          }
        default:
          throw new Error(`Unknown WS command: ${msg.type}`)
      }
    },
    states: buildStates(),
    themes: { darkMode: false },
    language: 'en',
    locale: { language: 'en', number_format: 'language' }
  }
}

function inject() {
  const hass = createMockHass()
  const panel = document.getElementById('panel')
  if (panel) {
    Object.assign(panel, {
      hass,
      narrow: false,
      route: { prefix: '/eon_next', path: '' },
      panel: { config: {}, url_path: 'eon_next', title: 'EON Next' }
    })
  }

  const summaryCard = document.getElementById('summary-card')
  const consumptionCard = document.getElementById('consumption-card')
  const costCard = document.getElementById('cost-card')
  const readingCard = document.getElementById('reading-card')

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
    costCard.setConfig({ type: 'custom:eon-next-cost-card', meter_type: 'electricity' })
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

Promise.all([
  customElements.whenDefined('eon-next-panel'),
  customElements.whenDefined('eon-next-summary-card'),
  customElements.whenDefined('eon-next-consumption-card'),
  customElements.whenDefined('eon-next-cost-card'),
  customElements.whenDefined('eon-next-reading-card')
]).then(() => inject())

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
