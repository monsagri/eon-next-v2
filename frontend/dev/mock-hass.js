/**
 * Mock hass object for local development.
 *
 * Intercepts callWS and returns fixture data that mirrors the real
 * eon_next/version and eon_next/dashboard_summary responses.
 */

// ---------------------------------------------------------------------------
// Fixture data — edit these to test different scenarios
// ---------------------------------------------------------------------------

const FIXTURES = {
  version: { version: "1.3.1" },

  summary: {
    meters: [
      {
        serial: "21L1234567",
        type: "electricity",
        latest_reading: 34521.4,
        latest_reading_date: "2026-02-25",
        daily_consumption: 8.72,
        standing_charge: 0.61,
        previous_day_cost: 2.84,
        unit_rate: 0.2449,
        tariff_name: "E.ON Next Flex",
      },
      {
        serial: "G4E98765",
        type: "gas",
        latest_reading: 12045.0,
        latest_reading_date: "2026-02-25",
        daily_consumption: 22.3,
        standing_charge: 0.31,
        previous_day_cost: 1.97,
        unit_rate: 0.0614,
        tariff_name: "E.ON Next Flex",
      },
    ],
    ev_chargers: [
      {
        device_id: "ev-001",
        serial: "EVSN-2024-XYZ",
        schedule_slots: 2,
        next_charge_start: "2026-02-26T01:00:00Z",
        next_charge_end: "2026-02-26T05:00:00Z",
      },
    ],
  },

  empty: {
    meters: [],
    ev_chargers: [],
  },
};

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let simulateError = false;
let simulateEmpty = false;

// ---------------------------------------------------------------------------
// Mock hass construction
// ---------------------------------------------------------------------------

function createMockHass() {
  return {
    callWS: async (msg) => {
      // Simulate network latency
      await new Promise((r) => setTimeout(r, 300));

      if (simulateError) {
        throw new Error("Simulated API error: connection refused");
      }

      switch (msg.type) {
        case "eon_next/version":
          return FIXTURES.version;
        case "eon_next/dashboard_summary":
          return simulateEmpty ? FIXTURES.empty : FIXTURES.summary;
        default:
          throw new Error(`Unknown WS command: ${msg.type}`);
      }
    },
    states: {},
    themes: { darkMode: false },
    language: "en",
    locale: { language: "en", number_format: "language" },
  };
}

// ---------------------------------------------------------------------------
// Wire up to DOM elements
// ---------------------------------------------------------------------------

function inject() {
  const hass = createMockHass();

  const panel = document.getElementById("panel");
  const card = document.getElementById("card");

  if (panel) {
    Object.assign(panel, {
      hass,
      narrow: false,
      route: { prefix: "/eon_next", path: "" },
      panel: { config: {}, url_path: "eon_next", title: "EON Next" },
    });
  }

  if (card) {
    // Cards expect setConfig before hass is set
    card.setConfig({ type: "custom:eon-next-summary-card" });
    card.hass = hass;
  }
}

// Wait for custom elements to be defined, then inject
Promise.all([
  customElements.whenDefined("eon-next-panel"),
  customElements.whenDefined("eon-next-summary-card"),
]).then(() => inject());

// ---------------------------------------------------------------------------
// Toolbar controls
// ---------------------------------------------------------------------------

document.getElementById("btn-dark")?.addEventListener("click", () => {
  document.body.classList.toggle("dark");
});

document.getElementById("btn-error")?.addEventListener("click", () => {
  simulateError = true;
  simulateEmpty = false;
  inject();
});

document.getElementById("btn-empty")?.addEventListener("click", () => {
  simulateError = false;
  simulateEmpty = true;
  inject();
});

document.getElementById("btn-reset")?.addEventListener("click", () => {
  simulateError = false;
  simulateEmpty = false;
  inject();
});
