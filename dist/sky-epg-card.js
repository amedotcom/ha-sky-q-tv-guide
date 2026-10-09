/*
 * Sky Q TV Guide card (sky-epg-card) for Home Assistant
 * https://github.com/amedeorutigliano/ha-sky-q-tv-guide
 *
 * Full TV guide of the channels that are on a Sky Q decoder (Sky Italia), with
 * the Sky schedule of the next 24 hours. Tap a channel or a programme to tune
 * the decoder, long-press a programme to record it (or the whole series), use
 * the rewind / play-pause / fast-forward buttons to control playback.
 *
 * Requires the backend of the repository (homeassistant/packages/*.yaml and
 * homeassistant/custom_templates/sky_epg.jinja) and the EPG Card
 * (yohaybn/lovelace-epg-card, from HACS), which draws the rows of the guide.
 *
 *   type: custom:sky-epg-card
 *   media_player: media_player.sky_q_living_room   # required: the Sky Q decoder
 *   title: Living room                             # optional, default = decoder name
 *   language: auto                                 # auto | it | en (alias: lingua)
 *   filter: all                                    # all | sky | dtt | sat | radio | guide (alias: filtro)
 *   controls: true                                 # rewind / play-pause / fast-forward (alias: comandi)
 *   logos: true                                    # channel logos from Sky (alias: loghi)
 *   height: "calc(100dvh - 250px)"                 # height of the guide area (alias: altezza)
 *   channels: sensor.sky_q_living_room_canali      # optional, found automatically (alias: canali)
 *   alias: { "5003": 103 }                         # use the guide of another channel
 *   row_height: 64
 *   hour_width: 180
 *
 * Performance: the guide is virtualized. Only the blocks of rows (20 channels
 * each, one EPG Card per block) near the visible area are in the DOM; the
 * others are created/removed while scrolling. A single scroll container with a
 * sticky time bar keeps scrolling smooth on phones too.
 */
const SKY_EPG_VERSION = "3.0.0";

const SKY_EPG_FILTRI = ["tutti", "sky", "dtt", "sat", "radio", "guida"];

// Option names also accepted in English (internal names are Italian)
const SKY_EPG_OPZIONI = {
  language: "lingua", filter: "filtro", height: "altezza", controls: "comandi", channels: "canali",
  guide: "guida", recordings: "registrazioni", logos: "loghi", tune_script: "script",
  recording_script: "script_registrazione", description_script: "script_descrizione",
};

// The guide sensors keep the first 100 characters of each description: a longer
// one is read in full (script.sky_epg_descrizione) when the programme menu opens.
const SKY_EPG_DESC_MAX = 100;
const SKY_EPG_FILTRI_EN = { all: "tutti", guide: "guida", terrestrial: "dtt", satellite: "sat" };

const SKY_EPG_I18N = {
  it: {
    f_tutti: "Tutti", f_sky: "Sky", f_dtt: "Digitale terrestre", f_sat: "Satellite free", f_radio: "Radio", f_guida: "Con guida",
    rew: "Indietro (riavvolgi)", rew_short: "Indietro", pause: "Pausa", resume: "Riprendi", normal_speed: "Riproduzione normale",
    ff: "Avanti veloce", ff_short: "Avanti", transport: "Comandi di riproduzione",
    goto: "Vai al canale in onda", refresh: "Rileggi lista canali e palinsesto", power: "Accendi / spegni decoder",
    search: "Cerca canale o numero", search_title: "Invio = sintonizza il canale trovato",
    hint_rec: "Tocca per sintonizzare · tieni premuto un programma per registrarlo",
    hint: "Tocca per sintonizzare · tieni premuto un programma per i dettagli",
    no_epgcard: "La risorsa EPG Card (epg-card.js) non è caricata. Installa \"EPG Card\" da HACS e verifica le risorse della plancia.",
    refreshing: "Aggiornamento di lista canali e palinsesto in corso (circa 30 secondi)…",
    refresh_error: "Errore aggiornamento lista: {e}",
    no_list: "Lista canali non ancora disponibile ({s}). Verifica che il decoder sia raggiungibile e premi il pulsante di aggiornamento.",
    no_match: "Nessun canale corrisponde al filtro o alla ricerca.",
    unreachable: "Decoder non raggiungibile", tuning: "Sintonizzazione:",
    off: "Spento · tocca un canale per accenderlo e sintonizzarlo", paused: "In pausa", on_air: "In onda",
    no_current: "Nessun canale in onda rilevato", tune_toast: "{dev}: sintonizzo {ch}",
    tune_error: "{dev}: sintonizzazione non riuscita ({e})", cmd_error: "{dev}: comando non riuscito ({e})",
    channels_all: "{n} canali sul decoder", channels_some: "{v} di {n} canali",
    list_read: "lista letta dal decoder {d}", list_old: "decoder non raggiungibile, lista precedente",
    guide_info: "palinsesto Sky delle prossime {h} ore, aggiornato alle {t}", guide_missing: "{s}_1 non trovato",
    rec_one: "1 registrazione programmata", rec_many: "{n} registrazioni programmate", disk: "disco pieno al {p}%",
    tune_ch: "Sintonizza {ch}", track_noguide_now: "Palinsesto non disponibile ora · tocca per sintonizzare",
    track_noguide: "Nessuna guida · tocca per sintonizzare",
    on_air_until: "In onda ora · fino alle {t}", today: "Oggi", tomorrow: "Domani",
    rec_series: "● ● Serie in registrazione", rec_now: "● Registrazione in corso", rec_sched: "● Registrazione programmata",
    stop_delete: "Interrompi e cancella la registrazione", cancel_rec: "Annulla la registrazione", cancel_series: "Annulla la serie",
    rec_pending: "Prenotazione inviata, in attesa di conferma dal decoder…",
    no_eid: "Questo programma non si può registrare dalla guida (palinsesto in aggiornamento?).",
    record: "Registra il programma", record_series: "Registra la serie",
    not_recordable: "Sky non consente di registrare questo programma.", close: "Chiudi",
    t_registra: "Registrazione programmata: {t}", t_registra_serie: "Serie in registrazione: {t}",
    t_annulla: "Registrazione annullata: {t}", t_annulla_serie: "Serie annullata: {t}", rec_error: "Registrazione non riuscita: {e}",
    channel: "Canale {n}",
    e_media_player: "Decoder Sky Q", e_title: "Titolo (facoltativo)", e_lingua: "Lingua", e_filtro: "Filtro iniziale",
    e_comandi: "Comandi indietro / play-pausa / avanti", e_loghi: "Loghi dei canali", e_altezza: "Altezza della guida (CSS)",
    e_canali: "Sensore lista canali (facoltativo, trovato in automatico)", lang_auto: "Automatica (lingua di Home Assistant)",
  },
  en: {
    f_tutti: "All", f_sky: "Sky", f_dtt: "Digital terrestrial", f_sat: "Free satellite", f_radio: "Radio", f_guida: "With guide",
    rew: "Rewind", rew_short: "Rewind", pause: "Pause", resume: "Resume", normal_speed: "Normal speed",
    ff: "Fast forward", ff_short: "Fast forward", transport: "Playback controls",
    goto: "Go to the current channel", refresh: "Reload channel list and guide", power: "Turn the decoder on / off",
    search: "Search channel or number", search_title: "Enter = tune the channel found",
    hint_rec: "Tap to tune · long-press a programme to record it",
    hint: "Tap to tune · long-press a programme for details",
    no_epgcard: "The EPG Card resource (epg-card.js) is not loaded. Install \"EPG Card\" from HACS and check the dashboard resources.",
    refreshing: "Reloading channel list and guide (about 30 seconds)…",
    refresh_error: "Channel list refresh failed: {e}",
    no_list: "Channel list not available yet ({s}). Check that the decoder is reachable and press the refresh button.",
    no_match: "No channel matches the filter or the search.",
    unreachable: "Decoder not reachable", tuning: "Tuning:",
    off: "Off · tap a channel to turn it on and tune it", paused: "Paused", on_air: "On air",
    no_current: "No current channel detected", tune_toast: "{dev}: tuning {ch}",
    tune_error: "{dev}: tuning failed ({e})", cmd_error: "{dev}: command failed ({e})",
    channels_all: "{n} channels on the decoder", channels_some: "{v} of {n} channels",
    list_read: "list read from the decoder {d}", list_old: "decoder not reachable, previous list",
    guide_info: "Sky guide for the next {h} hours, updated at {t}", guide_missing: "{s}_1 not found",
    rec_one: "1 scheduled recording", rec_many: "{n} scheduled recordings", disk: "disk {p}% full",
    tune_ch: "Tune {ch}", track_noguide_now: "Guide not available now · tap to tune",
    track_noguide: "No guide · tap to tune",
    on_air_until: "On air now · until {t}", today: "Today", tomorrow: "Tomorrow",
    rec_series: "● ● Series recording", rec_now: "● Recording now", rec_sched: "● Recording scheduled",
    stop_delete: "Stop and delete the recording", cancel_rec: "Cancel the recording", cancel_series: "Cancel the series",
    rec_pending: "Booking sent, waiting for the decoder to confirm…",
    no_eid: "This programme cannot be recorded from the guide (guide being updated?).",
    record: "Record the programme", record_series: "Record the series",
    not_recordable: "Sky does not allow recording this programme.", close: "Close",
    t_registra: "Recording scheduled: {t}", t_registra_serie: "Series recording: {t}",
    t_annulla: "Recording cancelled: {t}", t_annulla_serie: "Series cancelled: {t}", rec_error: "Recording failed: {e}",
    channel: "Channel {n}",
    e_media_player: "Sky Q decoder", e_title: "Title (optional)", e_lingua: "Language", e_filtro: "Initial filter",
    e_comandi: "Rewind / play-pause / fast-forward controls", e_loghi: "Channel logos", e_altezza: "Height of the guide (CSS)",
    e_canali: "Channel list sensor (optional, found automatically)", lang_auto: "Automatic (Home Assistant language)",
  },
};

function skyEpgLingua(pref, hass) {
  const c = String(pref || "auto").toLowerCase();
  if (SKY_EPG_I18N[c]) return c;
  const h = String((hass && ((hass.locale && hass.locale.language) || hass.language)) || navigator.language || "en").toLowerCase();
  return h.startsWith("it") ? "it" : "en";
}

function skyEpgTesto(lang, key, vars) {
  let t = (SKY_EPG_I18N[lang] || SKY_EPG_I18N.en)[key];
  if (t === undefined) t = SKY_EPG_I18N.en[key] !== undefined ? SKY_EPG_I18N.en[key] : key;
  if (vars) t = t.replace(/\{(\w+)\}/g, (m, n) => (vars[n] !== undefined ? String(vars[n]) : m));
  return t;
}

// Digital terrestrial / free satellite channels named differently from their Sky twin (normalized keys)
const SKY_EPG_ALIAS = {
  "hgtvhomeandgarden": "hgtv",
  "rtvsanmarino": "sanmarinortv",
  "rai1provvisorio": "rai1",
  "rai2provvisorio": "rai2",
  "rai3provvisorio": "rai3",
};

const SKY_EPG_STOP = new Set(["hd", "fhd", "uhd", "sd", "hevc"]);
const SKY_EPG_GENERIC = new Set(["channel", "international", "intl", "tv", "italy"]);
const SKY_EPG_WORDS = { uno: "1", due: "2", tre: "3" };

function skyEpgTokens(name) {
  let s = String(name || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  s = s.replace(/\btgr\b.*$/, " "); // "Rai 3 TGR Veneto" -> "rai 3"
  s = s.replace(/\+/g, " plus ").replace(/&/g, " and ");
  s = s.replace(/[^a-z0-9]+/g, " ");
  return s
    .split(" ")
    .filter(Boolean)
    .map((t) => SKY_EPG_WORDS[t] || t)
    .filter((t) => !SKY_EPG_STOP.has(t));
}
function skyEpgKey1(name) {
  return skyEpgTokens(name).join("");
}
function skyEpgKey2(name) {
  const t = skyEpgTokens(name);
  while (t.length > 1 && SKY_EPG_GENERIC.has(t[t.length - 1])) t.pop();
  return t.join("");
}
function skyEpgInitials(name) {
  return (
    String(name || "?")
      .replace(/\b(hd|uhd|sd)\b/gi, "")
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}
function skyEpgEsc(v) {
  return String(v == null ? "" : v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Rows per virtual block and gap between rows (margin-top of the EPG Card)
const SKY_EPG_CHUNK = 20;
const SKY_EPG_GAP = 6;
const SKY_EPG_ANCORA = "sensor.sky_epg__ancora";
// Sky logos: the image of the Sky image service is very wide and the logo only
// fills the bottom-left corner. It is cropped to its content (the Sky image
// service allows CORS) and kept in memory as a blob URL.
// url -> blob URL (ready) | false (no logo) | Promise (in progress)
const SKY_EPG_LOGHI = new Map();
const SKY_EPG_BUS = new EventTarget();

function skyEpgRitaglia(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        const x = c.getContext("2d", { willReadFrequently: true });
        x.drawImage(img, 0, 0);
        const d = x.getImageData(0, 0, w, h).data;
        let x0 = w, y0 = h, x1 = -1, y1 = -1;
        for (let y = 0; y < h; y++) {
          const r = y * w * 4;
          for (let i = 0; i < w; i++) {
            if (d[r + i * 4 + 3] > 8) {
              if (i < x0) x0 = i;
              if (i > x1) x1 = i;
              if (y < y0) y0 = y;
              if (y > y1) y1 = y;
            }
          }
        }
        if (x1 < 0) return resolve(false); // empty image
        const cw = x1 - x0 + 1;
        const ch = y1 - y0 + 1;
        const o = document.createElement("canvas");
        o.width = cw;
        o.height = ch;
        o.getContext("2d").drawImage(c, x0, y0, cw, ch, 0, 0, cw, ch);
        o.toBlob((b) => resolve(b ? URL.createObjectURL(b) : url), "image/png");
      } catch (e) {
        resolve(url); // canvas not readable: original logo, not cropped
      }
    };
    img.onerror = () => resolve(false); // channel without logo: initials
    img.src = url;
  });
}

// Logo state: string = ready, false = missing, undefined = in progress (started if needed)
function skyEpgLogo(url) {
  const v = SKY_EPG_LOGHI.get(url);
  if (typeof v === "string" || v === false) return v;
  if (!v) {
    SKY_EPG_LOGHI.set(
      url,
      skyEpgRitaglia(url).then((res) => {
        SKY_EPG_LOGHI.set(url, res);
        SKY_EPG_BUS.dispatchEvent(new Event("logo"));
      })
    );
  }
  return undefined;
}

const SKY_EPG_ADOPT =
  typeof CSSStyleSheet !== "undefined" &&
  "replaceSync" in CSSStyleSheet.prototype &&
  "adoptedStyleSheets" in ShadowRoot.prototype;

class SkyEpgCard extends HTMLElement {
  static getStubConfig(hass) {
    const mp = Object.keys(hass.states).find(
      (e) => e.startsWith("media_player.") && hass.entities?.[e]?.platform === "skyq"
    );
    return { media_player: mp || "media_player.sky_q", comandi: true, loghi: true };
  }

  // Visual editor (Home Assistant 2024.10+): form generated from this schema
  static getConfigForm() {
    const ha = document.querySelector("home-assistant");
    const lang = skyEpgLingua("auto", ha && ha.hass);
    const t = (k) => skyEpgTesto(lang, k);
    return {
      schema: [
        { name: "media_player", required: true, selector: { entity: { filter: { domain: "media_player", integration: "skyq" } } } },
        { name: "title", selector: { text: {} } },
        {
          type: "grid",
          name: "",
          schema: [
            {
              name: "lingua",
              selector: {
                select: {
                  mode: "dropdown",
                  options: [
                    { value: "auto", label: t("lang_auto") },
                    { value: "it", label: "Italiano" },
                    { value: "en", label: "English" },
                  ],
                },
              },
            },
            {
              name: "filtro",
              selector: { select: { mode: "dropdown", options: SKY_EPG_FILTRI.map((f) => ({ value: f, label: t(`f_${f}`) })) } },
            },
            { name: "comandi", selector: { boolean: {} } },
            { name: "loghi", selector: { boolean: {} } },
          ],
        },
        { name: "altezza", selector: { text: {} } },
        { name: "canali", selector: { entity: { filter: { domain: "sensor" } } } },
      ],
      computeLabel: (s) => skyEpgTesto(lang, `e_${s.name}`),
    };
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._filtro = null;
    this._query = "";
    this._channels = [];
    this._visible = [];
    this._rawRef = null;
    this._guideRef = undefined;
    this._lastPushMinute = -1;
    this._lastVisibleSig = "";
    this._chunks = new Map();
    this._recMap = new Map(); // eid -> { pvrid, link, stato }: recordings on the decoder
    this._recPend = new Map(); // eid -> { booked, link, t }: bookings waiting for the decoder to confirm
    this._descCache = new Map(); // eid (or sid|start) -> full description read from Sky
    this._ready = false;
    this._built = false;
  }

  setConfig(config) {
    if (!config || !config.media_player) {
      throw new Error("sky-epg-card: 'media_player' is required");
    }
    // Options can be written in English or in Italian (internal names)
    const cfg = {};
    for (const [k, v] of Object.entries(config)) cfg[SKY_EPG_OPZIONI[k] || k] = v;
    if (cfg.filtro) cfg.filtro = SKY_EPG_FILTRI_EN[cfg.filtro] || cfg.filtro;
    if (!SKY_EPG_FILTRI.includes(cfg.filtro)) delete cfg.filtro;
    this._config = {
      guida: "sensor.sky_epg_guida_tv",
      script: "script.sky_q_sintonizza_canale",
      refresh_script: "script.sky_q_aggiorna_lista_canali",
      registrazioni: "sensor.sky_q_registrazioni",
      script_registrazione: "script.sky_q_registrazione",
      script_descrizione: "script.sky_epg_descrizione",
      filtro: "tutti",
      row_height: 64,
      hour_width: 180,
      altezza: "calc(100dvh - 250px)",
      alias: {},
      loghi: true,
      comandi: true,
      lingua: "auto",
      ...cfg,
    };
    this._canaliAuto = null;
    this._canaliScan = 0;
    if (this._filtro === null) this._filtro = this._config.filtro;
    this._rawRef = null;
    this._sensorRef = undefined;
    this._guideRef = undefined;
    this._guideMergedFrom = null;
    this._lastVisibleSig = "";
    this._sheet = null;
    this._css = null;
    this._clearChunks();
    if (this._built) this._applyHeight();
    if (this._hass) this._update(true);
  }

  getCardSize() {
    return 12;
  }

  getGridOptions() {
    return { columns: "full", rows: "auto" };
  }

  connectedCallback() {
    // Logos ready: redraw the visible blocks (grouping logos that arrive together)
    if (!this._onLogo) {
      this._onLogo = () => {
        clearTimeout(this._logoTimer);
        this._logoTimer = setTimeout(() => {
          if (this._chunks.size) this._syncChunks(true);
        }, 150);
      };
    }
    SKY_EPG_BUS.addEventListener("logo", this._onLogo);
    // Refresh aligned to the start of every minute (same time scale for all the blocks)
    const next = () => 60500 - (Date.now() % 60000);
    const tick = () => {
      this._update(true);
      this._timer = setTimeout(tick, next());
    };
    clearTimeout(this._timer);
    this._timer = setTimeout(tick, next());
    if (this._hass) this._update(true);
  }

  disconnectedCallback() {
    clearTimeout(this._timer);
    clearTimeout(this._logoTimer);
    clearTimeout(this._ppTimer);
    if (this._onLogo) SKY_EPG_BUS.removeEventListener("logo", this._onLogo);
  }

  set hass(hass) {
    this._hass = hass;
    // Sky logos are light: no background with a dark theme, dark background with a light theme
    const dark = !!(hass.themes && hass.themes.darkMode);
    if (dark !== this._dark) {
      this._dark = dark;
      this.style.setProperty("--sky-epg-logo-bg", dark ? "transparent" : "#262626");
      this.style.setProperty("--sky-epg-logo-pad", dark ? "0" : "3px 6px");
      this.style.setProperty("--sky-epg-logo-radius", dark ? "0" : "5px");
    }
    this._update(false);
  }

  /* ------------------------------------------------------------ helpers */

  _lang() {
    return skyEpgLingua(this._config && this._config.lingua, this._hass);
  }

  _t(key, vars) {
    return skyEpgTesto(this._lang(), key, vars);
  }

  // Channel list sensor of the decoder: from the configuration, otherwise the sensor
  // whose "media_player" attribute is this decoder (packages/sky_epg_decoders.yaml),
  // otherwise sensor.<media player object id>_canali
  _canaliId() {
    if (this._config.canali) return this._config.canali;
    const st = this._hass.states;
    const mp = this._config.media_player;
    const ok = (id) => {
      const s = st[id];
      return !!(s && s.attributes && s.attributes.media_player === mp && Array.isArray(s.attributes.canali));
    };
    if (this._canaliAuto && ok(this._canaliAuto)) return this._canaliAuto;
    const def = `sensor.${mp.split(".")[1]}_canali`;
    if (ok(def)) return (this._canaliAuto = def);
    const now = Date.now();
    if (now - (this._canaliScan || 0) > 10000) {
      this._canaliScan = now;
      for (const id in st) {
        if (id.startsWith("sensor.") && ok(id)) return (this._canaliAuto = id);
      }
    }
    return this._canaliAuto && st[this._canaliAuto] ? this._canaliAuto : def;
  }

  // Recordings available: sensor.sky_q_registrazioni exists and knows the decoder with the disk
  _recAttivo() {
    const r = this._hass && this._hass.states[this._config.registrazioni];
    return !!(r && r.attributes && r.attributes.host);
  }

  /* ------------------------------------------------------------ build */

  _build() {
    if (this._built) return;
    this._built = true;
    const T = (k) => skyEpgEsc(this._t(k));
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        ha-card { overflow: hidden; }
        .head { padding: 12px 16px 4px; display: flex; flex-direction: column; gap: 8px; }
        .top { display: flex; align-items: center; gap: 12px; row-gap: 8px; min-width: 0; flex-wrap: wrap; }
        .top ha-icon.dev { color: var(--state-icon-color, var(--primary-color)); flex: 0 0 auto; }
        .ttl { flex: 1 1 0; min-width: 0; }
        .name { font-size: var(--ha-font-size-l, 18px); font-weight: 500; color: var(--primary-text-color);
                white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .now { font-size: 13px; color: var(--secondary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .now b { color: var(--primary-text-color); font-weight: 500; }
        .btn { flex: 0 0 auto; border: none; background: none; color: var(--secondary-text-color); cursor: pointer;
               width: 40px; height: 40px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; }
        .btn:hover { background: var(--secondary-background-color); color: var(--primary-text-color); }
        .btn.on { color: var(--primary-color); }
        /* Playback controls: rewind / play-pause / fast forward */
        .transport { flex: 0 0 auto; display: inline-flex; align-items: center; gap: 2px; padding: 2px;
                     border-radius: 22px; background: var(--secondary-background-color); }
        .transport[hidden] { display: none; }
        .transport .btn { width: 44px; height: 36px; border-radius: 18px; color: var(--primary-text-color);
                          -webkit-tap-highlight-color: transparent; touch-action: manipulation;
                          transition: background-color .15s, color .15s; }
        .transport .btn.pp { width: 52px; }
        .transport .btn[hidden] { display: none; }
        .transport .btn:hover { background: none; color: var(--primary-text-color); }
        @media (hover: hover) {
          .transport .btn:hover:not(:disabled) { background: rgba(127, 127, 127, .18); }
        }
        .transport .btn:disabled { opacity: .35; cursor: default; }
        .transport .btn.flash:not(:disabled) { background: var(--primary-color); color: var(--text-primary-color, #fff); transition: none; }
        .tools { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
        .search { flex: 1 1 200px; min-width: 160px; display: flex; align-items: center; gap: 6px;
                  border: 1px solid var(--divider-color); border-radius: 20px; padding: 0 12px; height: 36px;
                  background: var(--secondary-background-color); }
        .search ha-icon { --mdc-icon-size: 18px; color: var(--secondary-text-color); }
        .search input { flex: 1; border: none; outline: none; background: transparent; color: var(--primary-text-color);
                        font: inherit; font-size: 16px; min-width: 0; }
        .chips { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; flex: 1 1 auto; }
        .chips::-webkit-scrollbar { display: none; }
        .chip { border: 1px solid var(--divider-color); border-radius: 16px; padding: 0 12px; height: 32px;
                background: transparent; color: var(--primary-text-color); font: inherit; font-size: 13px;
                cursor: pointer; white-space: nowrap; flex: 0 0 auto; }
        .chip span { opacity: .6; margin-inline-start: 4px; font-size: 12px; }
        .chip.on { background: var(--primary-color); color: var(--text-primary-color, #fff); border-color: transparent; }
        .chip.on span { opacity: .85; }
        .info { font-size: 12px; color: var(--secondary-text-color); display: flex; gap: 12px; flex-wrap: wrap; }
        .msg { padding: 24px 16px; text-align: center; color: var(--secondary-text-color); font-size: 14px; }
        .msg ha-icon { --mdc-icon-size: 36px; display: block; margin: 0 auto 8px; }
        .vscroll[hidden], .msg[hidden] { display: none; }

        /* A single scroll container (vertical + horizontal): only the visible rows are in the DOM */
        .vscroll { position: relative; overflow: auto; margin: 4px 8px 8px; max-height: 70vh;
                   overscroll-behavior: contain; overflow-anchor: none; scrollbar-width: none;
                   -webkit-overflow-scrolling: touch; }
        .vscroll::-webkit-scrollbar { display: none; }
        .timebar { position: sticky; top: 0; z-index: 7; width: max-content; min-width: 100%;
                   background: var(--ha-card-background, var(--card-background-color, #fff)); }
        .vspace { position: relative; width: max-content; min-width: 100%; }
        .vspace > epg-card { position: absolute; left: 0; right: 0; display: block; }
        .tb-inner .epg-row { display: flex; align-items: stretch; }
        .tb-inner .channel-cell { flex: 0 0 var(--epg-channel-width, 120px); position: sticky; left: 0; z-index: 8;
                                  background: var(--ha-card-background, var(--card-background-color, #fff)); }
        .tb-inner .track-wrap { position: relative; flex: 1 1 auto; min-width: 0; }
        .tb-inner .timeline-track { position: relative; height: 22px; margin: 6px 0 2px;
                                    border-bottom: 1px solid var(--divider-color, #e0e0e0); }
        .tb-inner .hour-tick { position: absolute; inset-inline-start: var(--pos); transform: translateX(-50%);
                               font-size: 11px; color: var(--secondary-text-color); white-space: nowrap; top: 0; }
        .tb-inner .hour-tick.edge-start { transform: none; }
        .tb-inner .hour-tick.edge-end { transform: translateX(-100%); }
        .tb-inner .hour-tick.half { opacity: .55; font-size: 10px; }
        .tb-inner .hour-tick::after { content: ""; position: absolute; top: 100%; inset-inline-start: 50%;
                                      width: 1px; height: 4px; background: var(--divider-color, #e0e0e0); }
        .info .rec:empty { display: none; }
        .info .rec { color: var(--error-color, #e53935); }
        .menu-bg { position: fixed; inset: 0; z-index: 1000; background: rgba(0, 0, 0, .5);
                   display: flex; align-items: flex-end; justify-content: center; }
        .menu-bg[hidden] { display: none; }
        .menu { box-sizing: border-box; width: min(460px, 100%); max-height: 85vh; overflow: auto;
                background: var(--ha-card-background, var(--card-background-color, #fff)); color: var(--primary-text-color);
                border-radius: 16px 16px 0 0; padding: 16px 16px calc(14px + env(safe-area-inset-bottom));
                box-shadow: 0 -6px 24px rgba(0, 0, 0, .35); }
        .m-ch { font-size: 12px; color: var(--secondary-text-color); }
        .m-t { font-size: 17px; font-weight: 600; margin: 2px 0 2px; line-height: 1.25; }
        .m-time { font-size: 13px; color: var(--secondary-text-color); }
        .m-desc { font-size: 13px; margin: 10px 0 0; line-height: 1.4; }
        .m-rec { font-size: 13px; font-weight: 500; margin: 10px 0 0; color: var(--error-color, #e53935); }
        .m-note { font-size: 12px; margin: 10px 0 0; color: var(--secondary-text-color); }
        .m-btns { display: flex; flex-direction: column; gap: 8px; margin-top: 14px; }
        .m-btns button { height: 44px; border-radius: 22px; border: 1px solid var(--divider-color);
                         background: var(--secondary-background-color); color: var(--primary-text-color);
                         font: inherit; font-size: 15px; display: flex; align-items: center; justify-content: center;
                         gap: 8px; cursor: pointer; }
        .m-btns button ha-icon { --mdc-icon-size: 20px; }
        .m-btns button.rec { background: #d32f2f; color: #fff; border-color: transparent; }
        .m-btns button.chiudi { background: transparent; border-color: transparent; color: var(--secondary-text-color); }
        @media (min-width: 601px) {
          .menu-bg { align-items: center; }
          .menu { border-radius: 16px; padding-bottom: 14px; }
        }
        @media (max-width: 600px) {
          .transport { order: 10; flex: 1 0 100%; }
          .transport .btn, .transport .btn.pp { flex: 1 1 0; height: 40px; border-radius: 20px; }
          .tb-inner .channel-cell { flex-basis: var(--epg-channel-width, 76px); }
          .vscroll { margin: 4px 4px 4px; }
        }
      </style>
      <ha-card>
        <div class="head">
          <div class="top">
            <ha-icon class="dev" icon="mdi:satellite-variant"></ha-icon>
            <div class="ttl"><div class="name"></div><div class="now"></div></div>
            <div class="transport" role="group" aria-label="${T("transport")}" hidden>
              <button class="btn rew" data-c="rew" title="${T("rew")}" aria-label="${T("rew_short")}"><ha-icon icon="mdi:rewind"></ha-icon></button>
              <button class="btn pp" data-c="pp" title="${T("pause")}" aria-label="${T("pause")}"><ha-icon icon="mdi:pause"></ha-icon></button>
              <button class="btn ff" data-c="ff" title="${T("ff")}" aria-label="${T("ff_short")}"><ha-icon icon="mdi:fast-forward"></ha-icon></button>
            </div>
            <button class="btn goto" title="${T("goto")}"><ha-icon icon="mdi:crosshairs-gps"></ha-icon></button>
            <button class="btn refresh" title="${T("refresh")}"><ha-icon icon="mdi:refresh"></ha-icon></button>
            <button class="btn power" title="${T("power")}"><ha-icon icon="mdi:power"></ha-icon></button>
          </div>
          <div class="tools">
            <label class="search"><ha-icon icon="mdi:magnify"></ha-icon>
              <input type="search" placeholder="${T("search")}" title="${T("search_title")}" enterkeyhint="go"></label>
            <div class="chips"></div>
          </div>
          <div class="info"><span class="count"></span><span class="upd"></span><span class="rec"></span><span class="hint"></span></div>
        </div>
        <div class="msg" hidden></div>
        <div class="menu-bg" hidden><div class="menu" role="dialog" aria-modal="true"></div></div>
        <div class="vscroll">
          <div class="timebar"><div class="tb-inner"></div></div>
          <div class="vspace"></div>
        </div>
      </ha-card>`;
    const $ = (s) => this.shadowRoot.querySelector(s);
    this._el = {
      name: $(".name"), now: $(".now"), chips: $(".chips"), input: $(".search input"),
      count: $(".count"), upd: $(".upd"), msg: $(".msg"),
      vscroll: $(".vscroll"), timebar: $(".timebar"), tbInner: $(".tb-inner"), vspace: $(".vspace"),
      power: $(".power"), refresh: $(".refresh"), goto: $(".goto"),
      rec: $(".info .rec"), hint: $(".info .hint"), menuBg: $(".menu-bg"), menu: $(".menu"),
      transport: $(".transport"), rew: $(".transport .rew"), pp: $(".transport .pp"), ff: $(".transport .ff"),
      ppIcon: $(".transport .pp ha-icon"),
    };
    this._applyHeight();
    this._el.chips.innerHTML = SKY_EPG_FILTRI.map(
      (f) => `<button class="chip" data-f="${f}">${T(`f_${f}`)}<span></span></button>`
    ).join("");
    this._el.chips.addEventListener("click", (ev) => {
      const b = ev.target.closest(".chip");
      if (!b) return;
      this._filtro = b.dataset.f;
      this._resetScroll = true;
      this._update(true);
    });
    let deb;
    this._el.input.addEventListener("input", () => {
      clearTimeout(deb);
      deb = setTimeout(() => {
        this._query = this._el.input.value.trim();
        this._resetScroll = true;
        this._update(true);
      }, 250);
    });
    this._el.input.addEventListener("keydown", (ev) => {
      if (ev.key !== "Enter") return;
      this._query = this._el.input.value.trim();
      this._update(true);
      const q = this._query;
      const exact = /^\d+$/.test(q) ? this._channels.find((c) => String(c.num) === q) : null;
      const ch = exact || (this._visible.length === 1 ? this._visible[0] : null);
      if (ch) this._tune(ch);
    });
    this._el.power.addEventListener("click", () => {
      this._hass.callService("media_player", "toggle", { entity_id: this._config.media_player });
    });
    this._el.refresh.addEventListener("click", () => {
      this._hass
        .callService("script", "turn_on", { entity_id: this._config.refresh_script })
        .then(() => this._toast(this._t("refreshing")))
        .catch((e) => this._toast(this._t("refresh_error", { e: e.message || e })));
    });
    this._el.goto.addEventListener("click", () => this._scrollToCurrent());
    this._el.transport.addEventListener("click", (ev) => {
      const b = ev.target.closest("button[data-c]");
      if (b && !b.disabled) this._comando(b.dataset.c, b);
    });
    // Programme menu: closed by tapping outside, actions on the buttons
    this._el.menuBg.addEventListener("pointerup", () => this._lpEnd(), { passive: true });
    this._el.menuBg.addEventListener("click", (ev) => {
      if (this._lpSwallow()) return;
      if (ev.target === this._el.menuBg) return this._closeMenu();
      const b = ev.target.closest("button[data-a]");
      if (b) this._menuAction(b.dataset.a);
    });
    this.shadowRoot.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape" && !this._el.menuBg.hidden) this._closeMenu();
    });
    // Scroll: add/remove the blocks of rows (at most once per frame)
    this._el.vscroll.addEventListener(
      "scroll",
      () => {
        if (this._raf) return;
        this._raf = requestAnimationFrame(() => {
          this._raf = 0;
          this._syncChunks(false);
        });
      },
      { passive: true }
    );

    customElements.whenDefined("epg-card").then(() => {
      this._ready = true;
      this._lastVisibleSig = "";
      this._update(true);
    });
    setTimeout(() => {
      if (!customElements.get("epg-card")) {
        this._showMsg("mdi:alert-circle-outline", this._t("no_epgcard"));
      }
    }, 10000);
  }

  _applyHeight() {
    // maximum height of the guide area (70vh if the configured value is not valid)
    this._el.vscroll.style.maxHeight = "70vh";
    this._el.vscroll.style.maxHeight = `max(360px, ${this._config.altezza})`;
  }

  _pitch() {
    return (Number(this._config.row_height) || 64) + SKY_EPG_GAP;
  }

  /* ------------------------------------------------------------ virtual blocks */

  _sheetFor() {
    if (this._sheet) return this._sheet;
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(this._chunkCss());
    this._sheet = sheet;
    return sheet;
  }

  // Browsers without adoptedStyleSheets (iOS < 16.4): <style> added again after every render
  _ensureStyle(el) {
    if (SKY_EPG_ADOPT) return;
    const root = el.shadowRoot;
    if (root.querySelector("style.sky-epg")) return;
    const s = document.createElement("style");
    s.className = "sky-epg";
    s.textContent = this._chunkCss();
    root.appendChild(s);
  }

  _chunkCss() {
    if (this._css) return this._css;
    const rh = Number(this._config.row_height) || 64;
    this._css = `
      :host { display: block; }
      ha-card { background: transparent !important; box-shadow: none !important; border: none !important;
                border-radius: 0 !important; overflow: visible !important; }
      .card-header, .banner { display: none !important; }
      .epg-scroll { overflow: visible !important; padding: 0 !important; }
      .timeline-row { display: none !important; }
      .epg-inner > .epg-row:nth-child(2) { display: none !important; }
      .epg-row:not(.timeline-row) { height: ${rh}px; cursor: pointer; }
      .channel-cell { background: var(--ha-card-background, var(--card-background-color, #fff)) !important;
                      box-sizing: border-box; overflow: hidden; }
      .program { cursor: pointer !important; }
      .epg-row.sky-now .channel-cell { box-shadow: inset 3px 0 0 var(--primary-color); }
      .epg-row.sky-now .channel-name { color: var(--primary-color); font-weight: 600; }
      .programs-track.empty { font-size: 11px !important; }
      .program { -webkit-touch-callout: none; -webkit-user-select: none; user-select: none; }
      /* Booked programmes: red dot (two for series) */
      .program.sky-rec { padding-inline-end: 20px !important; }
      .program.sky-rec::after { content: ""; position: absolute; top: 5px; inset-inline-end: 6px; width: 9px; height: 9px;
                                border-radius: 50%; background: #e53935;
                                box-shadow: 0 0 0 1.5px var(--ha-card-background, var(--card-background-color, #fff)); }
      .program.sky-rec.sky-serie { padding-inline-end: 30px !important; }
      .program.sky-rec.sky-serie::after { box-shadow: 0 0 0 1.5px var(--ha-card-background, var(--card-background-color, #fff)),
                                          -11px 0 0 0 #e53935; }
      /* Logos cropped to their content: fixed height, width up to the channel column */
      img.channel-icon { width: auto !important; max-width: 100% !important; height: 28px !important;
                         object-fit: contain !important; box-sizing: border-box; border-radius: var(--sky-epg-logo-radius, 0) !important;
                         padding: var(--sky-epg-logo-pad, 0); background: var(--sky-epg-logo-bg, transparent) !important; }
      .epg-row.sky-logo-wait .channel-fallback { visibility: hidden; }
      @media (max-width: 600px) {
        .channel-cell { padding-inline: 4px !important; }
        img.channel-icon { height: 22px !important; }
      }
    `;
    return this._css;
  }

  _createChunk() {
    const el = document.createElement("epg-card");
    const root = el.shadowRoot;
    if (SKY_EPG_ADOPT) root.adoptedStyleSheets = [...root.adoptedStyleSheets, this._sheetFor()];
    root.addEventListener("click", (ev) => {
      if (this._lpSwallow()) return; // click generated by the release of a long press
      const row = ev.composedPath().find((n) => n.classList && n.classList.contains("epg-row"));
      if (!row || row.classList.contains("timeline-row")) return;
      const ch = this._channels.find((c) => String(c.num) === row.dataset.num);
      if (ch) this._tune(ch);
    });
    // Long press (or right click) on a programme: programme / recording menu
    let lp = null;
    const stop = () => {
      if (lp) clearTimeout(lp.timer);
      lp = null;
    };
    root.addEventListener(
      "pointerdown",
      (ev) => {
        this._lpActive = false;
        if (ev.button > 0) return;
        const prog = ev.target.closest && ev.target.closest(".program");
        stop();
        if (!prog) return;
        lp = {
          x: ev.clientX,
          y: ev.clientY,
          timer: setTimeout(() => {
            lp = null;
            this._lpActive = true; // the finger is still down: the next click must be ignored
            this._openMenu(prog, el);
          }, 550),
        };
      },
      { passive: true }
    );
    root.addEventListener(
      "pointermove",
      (ev) => {
        if (lp && Math.hypot(ev.clientX - lp.x, ev.clientY - lp.y) > 10) stop();
      },
      { passive: true }
    );
    const up = () => {
      stop();
      this._lpEnd();
    };
    root.addEventListener("pointerup", up, { passive: true });
    root.addEventListener("pointercancel", up, { passive: true });
    root.addEventListener("contextmenu", (ev) => {
      const prog = ev.target.closest && ev.target.closest(".program");
      if (!prog) return;
      ev.preventDefault();
      stop();
      this._openMenu(prog, el);
    });
    // Logo not found: initials of the channel name
    root.addEventListener(
      "error",
      (ev) => {
        const img = ev.target;
        if (!img || img.tagName !== "IMG") return;
        const row = img.closest(".epg-row");
        const ch = row && this._channels.find((c) => String(c.num) === row.dataset.num);
        if (ch) img.dataset.fallback = `<div class="channel-fallback">${skyEpgEsc(skyEpgInitials(ch.name))}</div>`;
      },
      true
    );
    return el;
  }

  _clearChunks() {
    for (const el of this._chunks.values()) el.remove();
    this._chunks.clear();
  }

  // Create/remove the blocks for the scroll position; force = also redraw the existing ones
  _syncChunks(force) {
    if (!this._ready || !this._el) return;
    const sc = this._el.vscroll;
    const P = this._pitch();
    const CH = SKY_EPG_CHUNK * P;
    const n = this._visible.length;
    const nChunks = Math.ceil(n / SKY_EPG_CHUNK);
    const tbH = this._el.timebar.offsetHeight;
    const h = Math.min(sc.clientHeight || 600, 3000);
    const top = Math.max(0, sc.scrollTop - tbH);
    const first = Math.max(0, Math.floor(top / CH) - 1);
    const last = Math.min(nChunks - 1, Math.floor((top + h) / CH) + 1);
    for (const [c, el] of this._chunks) {
      if (c < first || c > last) {
        el.remove();
        this._chunks.delete(c);
      }
    }
    for (let c = first; c <= last; c++) {
      let el = this._chunks.get(c);
      const isNew = !el;
      if (isNew) {
        el = this._createChunk();
        el.style.top = `${c * CH}px`;
        this._el.vspace.appendChild(el);
        this._chunks.set(c, el);
      }
      if (isNew || force) this._renderChunk(el, c);
    }
  }

  _renderChunk(el, c) {
    const hass = this._hass;
    const from = c * SKY_EPG_CHUNK;
    const slice = this._visible.slice(from, from + SKY_EPG_CHUNK);
    const states = { [SKY_EPG_ANCORA]: this._ancora };
    const entities = [SKY_EPG_ANCORA];
    const eventi = [];
    for (const ch of slice) {
      const eid = `sensor.sky_epg_${ch.num}`;
      entities.push(eid);
      const prog = this._programmi(ch, this._guidaCorrente, this._now);
      eventi.push(prog.eventi);
      states[eid] = {
        entity_id: eid,
        state: ch.gsid ? "guida" : "nessuna_guida",
        attributes: {
          channel_display_name: `${ch.num} · ${ch.name}`,
          channel_icon: this._icon(ch),
          today: prog.today,
          tomorrow: prog.tomorrow,
        },
      };
    }
    const sig = entities.join(",");
    if (el._skySig !== sig) {
      el.setConfig({
        type: "custom:epg-card",
        entities,
        row_height: this._config.row_height,
        hour_width: this._config.hour_width,
      });
      el._skySig = sig;
    }
    el._skySlice = slice;
    el._skyEventi = eventi;
    el.hass = { states, locale: hass.locale, language: hass.language, themes: hass.themes };
    this._ensureStyle(el);
    this._decorateChunk(el);
    if (!this._tbDone) this._updateTimebar(el);
  }

  // Cropped logo if ready; otherwise no image (initials hidden while the logo is in progress)
  _icon(ch) {
    if (!ch.logo) return null;
    const v = skyEpgLogo(ch.logo);
    return typeof v === "string" ? v : null;
  }

  // Time bar (copied from the first rendered block, sticky at the top)
  _updateTimebar(el) {
    const root = el.shadowRoot;
    const tl = root.querySelector(".timeline-row");
    const inner = root.querySelector(".epg-inner");
    if (!tl || !inner) return;
    this._el.tbInner.innerHTML = tl.outerHTML;
    const mw = inner.style.minWidth || "";
    this._el.tbInner.style.minWidth = mw;
    this._el.vspace.style.minWidth = mw;
    this._tbDone = true;
  }

  _decorateChunk(el) {
    const root = el.shadowRoot;
    const slice = el._skySlice || [];
    const rows = root.querySelectorAll(".epg-inner > .epg-row:not(.timeline-row)");
    const cur = this._currentNum();
    rows.forEach((row, i) => {
      const ch = slice[i - 1]; // row 0 is the hidden anchor
      if (!ch) return;
      const n = String(ch.num);
      if (row.dataset.num !== n) row.dataset.num = n;
      row.classList.toggle("sky-now", n === cur);
      const cell = row.querySelector(".channel-cell");
      if (cell) cell.title = this._t("tune_ch", { ch: `${ch.num} · ${ch.name}` });
      const ini = skyEpgInitials(ch.name);
      const fb = row.querySelector(".channel-fallback");
      if (fb && fb.textContent !== ini) fb.textContent = ini;
      const img = row.querySelector("img.channel-icon");
      if (img) img.dataset.fallback = `<div class="channel-fallback">${skyEpgEsc(ini)}</div>`;
      const lg = ch.logo ? SKY_EPG_LOGHI.get(ch.logo) : false;
      row.classList.toggle("sky-logo-wait", !!ch.logo && typeof lg !== "string" && lg !== false);
      this._linkPrograms(row, (el._skyEventi || [])[i - 1] || []);
      const empty = row.querySelector(".programs-track.empty span");
      if (empty) {
        const txt = this._t(ch.gsid ? "track_noguide_now" : "track_noguide");
        if (empty.textContent !== txt) empty.textContent = txt;
      }
    });
  }

  /* ------------------------------------------------------------ data */

  _parseChannels(raw) {
    const out = [];
    const seen = new Set();
    for (const item of raw || []) {
      const [c, t, st, sf, sid] = String(item).split("|");
      const num = parseInt(c, 10);
      if (!num || seen.has(num)) continue;
      seen.add(num);
      const name = (t || "").trim() || this._t("channel", { n: num });
      const radio = sf === "au";
      let cat = "sat";
      if (radio) cat = "radio";
      else if (st === "DSAT" || st === "DTT-SWAPPED") cat = "sky";
      else if (st === "DTT") cat = "dtt";
      out.push({ num, name, st, sf, sid, radio, cat, k1: skyEpgKey1(name), k2: skyEpgKey2(name) });
    }
    out.sort((a, b) => a.num - b.num);
    // Sky channels (satellite + Rai "swapped"): guide and logo from the Sky services.
    // The others (DTT, free satellite) use those of the Sky channel with the same name.
    const sky1 = new Map();
    const sky2 = new Map();
    for (const ch of out) {
      if ((ch.st === "DSAT" || ch.st === "DTT-SWAPPED") && !ch.radio && ch.sid) {
        ch.gsid = ch.sid;
        if (this._config.loghi) {
          const chid = ch.name.toLowerCase().split("").filter((x) => /[\p{L}\p{N}]/u.test(x)).join("");
          ch.logo = `https://it.imageservice.sky.com/logo/skychb_${ch.sid}${encodeURIComponent(chid)}/800/800?territory=IT&provider=SKY&proposition=SKYQ`;
        }
        if (!sky1.has(ch.k1)) sky1.set(ch.k1, ch);
        if (!sky2.has(ch.k2)) sky2.set(ch.k2, ch);
      }
    }
    const byNum = new Map(out.map((c) => [String(c.num), c]));
    const userAlias = this._config.alias || {};
    for (const ch of out) {
      let twin = null;
      const manual = userAlias[String(ch.num)];
      if (manual !== undefined) twin = byNum.get(String(manual)) || null;
      else if (!ch.gsid && !ch.radio) {
        const a = SKY_EPG_ALIAS[ch.k1];
        twin = (a && (sky1.get(a) || sky2.get(a))) || sky1.get(ch.k1) || sky2.get(ch.k2) || null;
      }
      if (twin && twin.gsid) {
        ch.gsid = twin.gsid;
        if (!ch.logo) ch.logo = twin.logo;
      }
    }
    return out;
  }

  // Schedule of the channel (from the guide sensors) in the EPG Card format
  _programmi(ch, guida, now) {
    const events = (ch.gsid && guida && guida[ch.gsid]) || [];
    const today = {};
    const tomorrow = {};
    if (!events.length) return { today, tomorrow, eventi: [] };
    const midnight = new Date(now);
    midnight.setHours(0, 0, 0, 0);
    const t1 = new Date(midnight);
    t1.setDate(t1.getDate() + 1);
    const t2 = new Date(t1);
    t2.setDate(t2.getDate() + 1);
    const hhmm = (d) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    for (const ev of events) {
      const s = new Date(ev[0] * 1000);
      const e = new Date((ev[0] + ev[1]) * 1000);
      if (e <= now) continue;
      const p = { title: ev[2] || "", desc: ev[3] || "", sub_title: "", end: hhmm(e), _ev: ev };
      if (s < t1) {
        const start = s < midnight ? "00:00" : hhmm(s);
        today[start] = { ...p, start };
      } else if (s < t2) {
        const start = hhmm(s);
        tomorrow[start] = { ...p, start };
      }
    }
    // Same order in which the EPG Card draws the programmes (today, then tomorrow, by time)
    const eventi = [
      ...Object.keys(today).sort().map((k) => today[k]),
      ...Object.keys(tomorrow).sort().map((k) => tomorrow[k]),
    ];
    return { today, tomorrow, eventi };
  }

  // Hidden "anchor" row in every block: it fixes the end of the timeline, so that
  // all the blocks have the same horizontal scale.
  _calcAncora(guida, now) {
    const midnight = new Date(now);
    midnight.setHours(0, 0, 0, 0);
    let maxEnd = 0;
    if (guida) {
      const seen = new Set();
      for (const ch of this._visible) {
        if (!ch.gsid || seen.has(ch.gsid)) continue;
        seen.add(ch.gsid);
        for (const ev of guida[ch.gsid] || []) {
          const end = ev[0] + ev[1];
          if (end > maxEnd) maxEnd = end;
        }
      }
    }
    const endMin = maxEnd ? Math.floor((maxEnd * 1000 - midnight.getTime()) / 60000) : 0;
    const tomorrow = {};
    if (endMin > 1440) {
      const m = Math.min(endMin - 1440, 1439);
      const end = `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
      tomorrow["00:00"] = { title: "", desc: "", sub_title: "", start: "00:00", end };
    }
    return { entity_id: SKY_EPG_ANCORA, state: "ancora", attributes: { channel_display_name: "", today: {}, tomorrow } };
  }

  _hasGuide(ch) {
    const g = this._guida();
    return !!(ch.gsid && g && g[ch.gsid] && g[ch.gsid].length);
  }

  // Guide sensors: "guida" and/or "guida_1".."guida_N" (the guide is split over several sensors)
  _guideStates() {
    const st = (this._hass && this._hass.states) || {};
    const base = this._config.guida;
    const out = [];
    if (st[base]) out.push(st[base]);
    for (let i = 1; i <= 32; i++) {
      const s = st[`${base}_${i}`];
      if (s) out.push(s);
      else if (i > 8) break;
    }
    return out;
  }

  // Merged guide of all the sensors { sid: events } (computed again only when a sensor changes)
  _guida() {
    const states = this._guideStates();
    const prev = this._guideMergedFrom || [];
    if (states.length !== prev.length || states.some((s, i) => s !== prev[i])) {
      let merged = null;
      for (const s of states) {
        const g = s.attributes && s.attributes.guida;
        if (g && typeof g === "object") merged = Object.assign(merged || {}, g);
      }
      this._guideMerged = merged;
      this._guideMergedFrom = states;
    }
    return this._guideMerged;
  }

  _filterChannels() {
    const f = this._filtro;
    const q = this._query.toLowerCase();
    const qk = skyEpgKey1(q);
    const digits = /^\d+$/.test(q);
    return this._channels.filter((ch) => {
      if (f === "guida") {
        if (!this._hasGuide(ch)) return false;
      } else if (f !== "tutti" && ch.cat !== f) return false;
      if (!q) return true;
      if (digits) return String(ch.num).startsWith(q);
      return ch.name.toLowerCase().includes(q) || (qk && ch.k1.includes(qk));
    });
  }

  /* ------------------------------------------------------------ update */

  _update(force) {
    if (!this._config || !this._hass) return;
    this._build();
    const hass = this._hass;
    const mp = hass.states[this._config.media_player];
    const canaliId = this._canaliId();
    const sensor = hass.states[canaliId];

    // Header: only when the decoder state changes
    if (mp !== this._mpRef || force) {
      this._mpRef = mp;
      this._renderHeader(mp);
    }

    let changed = false;
    if (sensor !== this._sensorRef) {
      this._sensorRef = sensor;
      this._renderInfo(sensor);
      const raw = sensor && Array.isArray(sensor.attributes.canali) ? sensor.attributes.canali : null;
      if (raw !== this._rawRef) {
        this._rawRef = raw;
        this._channels = this._parseChannels(raw);
        changed = true;
      }
    }
    if (!this._channels.length) {
      this._visible = [];
      this._showMsg("mdi:playlist-remove", this._t("no_list", { s: canaliId }));
      return;
    }

    // Scheduled recordings (red dots): updated without redrawing the guide
    const rec = hass.states[this._config.registrazioni];
    if (rec !== this._recRef) {
      this._recRef = rec;
      this._buildRecMap(rec);
      this._markRec();
      this._renderInfo(sensor);
    }

    // Guide updated (sensor.sky_epg_guida_tv_N)
    const guides = this._guideStates();
    const gref = this._guideRef || [];
    if (guides.length !== gref.length || guides.some((s, i) => s !== gref[i])) {
      this._guideRef = guides;
      changed = true;
    }

    // The guide is redrawn at most once a minute (or on request)
    const minute = Math.floor(Date.now() / 60000);
    if (!(force || changed || minute !== this._lastPushMinute)) return;

    this._visible = this._filterChannels();
    const vSig = this._filtro + "|" + this._query + "|" + this._visible.map((c) => c.num).join(",");
    const visibleChanged = vSig !== this._lastVisibleSig;
    this._renderChips();
    this._renderInfo(sensor);

    if (!this._visible.length) {
      this._lastVisibleSig = vSig;
      this._lastPushMinute = minute;
      this._clearChunks();
      this._showMsg("mdi:television-off", this._t("no_match"));
      return;
    }
    this._showMsg(null);
    if (!this._ready) return;
    this._refresh(visibleChanged, vSig, minute);
  }

  _refresh(visibleChanged, vSig, minute) {
    this._now = new Date();
    this._guidaCorrente = this._guida();
    this._ancora = this._calcAncora(this._guidaCorrente, this._now);
    this._el.vspace.style.height = `${this._visible.length * this._pitch() + SKY_EPG_GAP + 8}px`;
    if (visibleChanged) {
      this._clearChunks();
      this._lastVisibleSig = vSig;
    }
    if (this._resetScroll) {
      this._el.vscroll.scrollTop = 0;
      this._resetScroll = false;
    }
    this._lastPushMinute = minute;
    this._tbDone = false;
    this._syncChunks(true);
  }

  /* ------------------------------------------------------------ ui */

  // Current channel according to Home Assistant (updated by the Sky Q integration)
  _realNum() {
    const mp = this._hass && this._hass.states[this._config.media_player];
    const n = mp && mp.attributes && mp.attributes.skyq_channelno;
    return n ? String(parseInt(n, 10)) : null;
  }

  // Channel to highlight: the one just chosen, immediately (until the decoder confirms
  // it), then the real one. Without confirmation within 30 s it goes back to the real one.
  _currentNum() {
    const a = this._attesa;
    if (a) {
      if (this._realNum() !== a.num && Date.now() - a.t < 30000) return a.num;
      this._fineAttesa();
    }
    return this._realNum();
  }

  _fineAttesa() {
    if (!this._attesa) return;
    clearTimeout(this._attesa.timer);
    this._attesa = null;
  }

  _renderHeader(mp) {
    const e = this._el;
    const name = this._config.title || (mp && mp.attributes.friendly_name) || this._config.media_player;
    e.name.textContent = name;
    if (!mp || mp.state === "unavailable") {
      e.now.textContent = this._t("unreachable");
    } else if (this._attesa && this._currentNum() === this._attesa?.num) {
      e.now.innerHTML = `${skyEpgEsc(this._t("tuning"))} <b>${skyEpgEsc(this._attesa.num)} ${skyEpgEsc(this._attesa.name)}</b>…`;
    } else if (["off", "standby"].includes(mp.state)) {
      e.now.textContent = this._t("off");
    } else {
      const a = mp.attributes;
      const num = a.skyq_channelno ? parseInt(a.skyq_channelno, 10) : "";
      const ch = a.media_channel || a.source || "";
      const prog = a.media_series_title || (a.media_title !== ch ? a.media_title : "") || "";
      const lbl = skyEpgEsc(this._t(mp.state === "paused" ? "paused" : "on_air"));
      e.now.innerHTML = `${lbl}: <b>${skyEpgEsc(num)} ${skyEpgEsc(ch)}</b>${prog ? " · " + skyEpgEsc(prog) : ""}`;
    }
    e.power.classList.toggle("on", this._acceso(mp));
    this._renderTransport(mp);
    this._markCurrent();
  }

  _acceso(mp) {
    return !!mp && !["off", "standby", "unavailable", "unknown"].includes(mp.state);
  }

  /* ------------------------------------------------- rewind / play-pause / fast forward */

  // What the middle button does: "play" (resume / back to normal speed) or "pause"
  _ppMode(mp) {
    const p = this._ppAttesa;
    if (p) {
      if (mp && mp.state !== p.stato && Date.now() - p.t < 4000) return p.stato === "paused" ? "play" : "pause";
      this._ppAttesa = null;
    }
    // After rewind / fast forward the decoder plays at high speed: play goes back to normal
    // speed. This ends with pause / power off (5 s given to the decoder to update) or after 3 minutes.
    const tr = this._trick;
    if (tr && (Date.now() - tr.t > 180000 || ((!mp || mp.state !== "playing") && Date.now() - tr.t > 5000))) {
      this._trick = null;
    }
    if (this._trick) return "play";
    return mp && mp.state === "paused" ? "play" : "pause";
  }

  _renderTransport(mp) {
    const e = this._el;
    const f = (mp && mp.attributes && mp.attributes.supported_features) || 0;
    const ha = (bit) => !f || (f & bit) !== 0;
    e.rew.hidden = !ha(16); // PREVIOUS_TRACK -> rewind
    e.ff.hidden = !ha(32); // NEXT_TRACK -> fastforward
    e.pp.hidden = !ha(1) && !ha(16384); // PAUSE / PLAY
    e.transport.hidden = this._config.comandi === false || (e.rew.hidden && e.ff.hidden && e.pp.hidden);
    const on = this._acceso(mp);
    for (const b of [e.rew, e.pp, e.ff]) b.disabled = !on;
    const play = this._ppMode(mp) === "play";
    const icon = play ? "mdi:play" : "mdi:pause";
    if (e.ppIcon.getAttribute("icon") !== icon) e.ppIcon.setAttribute("icon", icon);
    const t = this._t(play ? (this._trick ? "normal_speed" : "resume") : "pause");
    if (e.pp.title !== t) {
      e.pp.title = t;
      e.pp.setAttribute("aria-label", t);
    }
  }

  _comando(c, btn) {
    const mp = this._hass.states[this._config.media_player];
    if (!this._acceso(mp)) return;
    const dev = mp.attributes.friendly_name || this._config.media_player;
    let service;
    let nuovo = null;
    if (c === "pp") {
      if (this._ppMode(mp) === "play") {
        service = "media_play";
        nuovo = "playing";
      } else if (mp.state === "playing") {
        service = "media_pause";
        nuovo = "paused";
      } else service = "media_play_pause";
      this._trick = null;
    } else {
      service = c === "ff" ? "media_next_track" : "media_previous_track";
      this._trick = { t: Date.now(), dir: c };
    }
    // Immediate feedback: button flash and play/pause icon updated right away
    btn.classList.add("flash");
    clearTimeout(btn._flash);
    btn._flash = setTimeout(() => btn.classList.remove("flash"), 220);
    this._ppAttesa = nuovo ? { stato: nuovo, t: Date.now() } : null;
    clearTimeout(this._ppTimer);
    if (nuovo) this._ppTimer = setTimeout(() => this._renderTransport(this._hass.states[this._config.media_player]), 4100);
    this._renderTransport(mp);
    this._hass.callService("media_player", service, { entity_id: this._config.media_player }).catch((err) => {
      this._ppAttesa = null;
      this._trick = null;
      this._renderTransport(this._hass.states[this._config.media_player]);
      this._toast(this._t("cmd_error", { dev, e: err.message || err }));
    });
  }

  _markCurrent() {
    const cur = this._currentNum();
    for (const el of this._chunks.values()) {
      el.shadowRoot.querySelectorAll(".epg-row[data-num]").forEach((r) => {
        r.classList.toggle("sky-now", r.dataset.num === cur);
      });
    }
  }

  _renderChips() {
    const counts = { tutti: this._channels.length, sky: 0, dtt: 0, sat: 0, radio: 0, guida: 0 };
    for (const ch of this._channels) {
      counts[ch.cat]++;
      if (this._hasGuide(ch)) counts.guida++;
    }
    this._el.chips.querySelectorAll(".chip").forEach((b) => {
      const f = b.dataset.f;
      b.classList.toggle("on", f === this._filtro);
      const s = b.querySelector("span");
      const t = String(counts[f] ?? "");
      if (s.textContent !== t) s.textContent = t;
      b.hidden = f !== "tutti" && f !== this._filtro && !counts[f];
    });
  }

  _renderInfo(sensor) {
    const e = this._el;
    const tot = this._channels.length;
    const vis = this._visible.length;
    e.count.textContent = tot ? this._t(vis === tot ? "channels_all" : "channels_some", { n: tot, v: vis }) : "";
    const upd = sensor && sensor.attributes.aggiornato;
    let txt = "";
    if (upd) {
      const d = new Date(upd);
      if (!isNaN(d)) {
        txt = this._t("list_read", {
          d: d.toLocaleString(this._hass.locale?.language || this._lang(), {
            day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
          }),
        });
      }
    }
    if (sensor && sensor.attributes.raggiungibile === false) txt += (txt ? " · " : "") + this._t("list_old");
    const gs = this._guideStates();
    let gu = null;
    let ore = "";
    for (const g of gs) {
      const d = g.attributes.aggiornato ? new Date(g.attributes.aggiornato) : null;
      if (d && !isNaN(d) && (!gu || d < gu)) gu = d; // the oldest one
      if (!ore && g.attributes.ore) ore = g.attributes.ore;
    }
    if (gu) {
      const ora = gu.toLocaleTimeString(this._hass.locale?.language || this._lang(), { hour: "2-digit", minute: "2-digit" });
      txt += `${txt ? " · " : ""}${this._t("guide_info", { h: ore, t: ora })}`;
    } else if (!gs.length) {
      txt += `${txt ? " · " : ""}${this._t("guide_missing", { s: this._config.guida })}`;
    }
    e.upd.textContent = txt;
    const rec = this._hass.states[this._config.registrazioni];
    const attivo = this._recAttivo();
    let r = "";
    if (attivo) {
      const n = parseInt(rec.state, 10) || 0;
      r = n === 1 ? this._t("rec_one") : this._t("rec_many", { n });
      const d = rec.attributes.disco_occupato;
      if (d !== undefined && d !== null) {
        r += ` · ${this._t("disk", { p: this._lang() === "it" ? String(d).replace(".", ",") : String(d) })}`;
      }
    }
    if (e.rec.textContent !== r) e.rec.textContent = r;
    const h = this._t(attivo ? "hint_rec" : "hint");
    if (e.hint.textContent !== h) e.hint.textContent = h;
  }

  _showMsg(icon, text) {
    const e = this._el;
    if (!icon) {
      e.msg.hidden = true;
      e.vscroll.hidden = false;
      return;
    }
    e.msg.hidden = false;
    e.vscroll.hidden = true;
    e.msg.innerHTML = `<ha-icon icon="${icon}"></ha-icon>${skyEpgEsc(text)}`;
  }

  _scrollToCurrent() {
    const cur = this._currentNum();
    if (!cur) return this._toast(this._t("no_current"));
    let i = this._visible.findIndex((c) => String(c.num) === cur);
    if (i < 0) {
      this._filtro = "tutti";
      this._query = "";
      this._el.input.value = "";
      this._update(true);
      i = this._visible.findIndex((c) => String(c.num) === cur);
    }
    if (i >= 0) this._el.vscroll.scrollTop = Math.max(0, i * this._pitch() - this._pitch());
  }

  _tune(ch) {
    const mp = this._hass.states[this._config.media_player];
    const dev = (mp && mp.attributes.friendly_name) || this._config.media_player;
    this._toast(this._t("tune_toast", { dev, ch: `${ch.num} · ${ch.name}` }));
    // Highlight the chosen channel right away (without waiting for the decoder)
    this._fineAttesa();
    this._trick = null;
    const attesa = { num: String(ch.num), name: ch.name, t: Date.now() };
    attesa.timer = setTimeout(() => {
      if (this._attesa !== attesa) return;
      this._fineAttesa();
      this._renderHeader(this._hass.states[this._config.media_player]);
    }, 30500);
    this._attesa = attesa;
    this._renderHeader(mp);
    // Direct script call: if it fails the error is shown
    const [domain, service] = this._config.script.split(".");
    this._hass
      .callService(domain, service, { decoder: this._config.media_player, canale: String(ch.num) })
      .catch((e) => {
        if (this._attesa === attesa) {
          this._fineAttesa();
          this._renderHeader(this._hass.states[this._config.media_player]);
        }
        this._toast(this._t("tune_error", { dev, e: e.message || e }));
      });
  }

  /* ------------------------------------------------------------ recordings */

  // End of a long press (finger lifted): the click the browser generates right after
  // must neither tune the channel nor close the menu that was just opened.
  _lpEnd() {
    if (!this._lpActive) return;
    this._lpActive = false;
    this._lpUpAt = Date.now();
  }

  _lpSwallow() {
    return this._lpActive || Date.now() - (this._lpUpAt || 0) < 450;
  }

  _buildRecMap(rec) {
    const map = new Map();
    const items = (rec && Array.isArray(rec.attributes.programmate) && rec.attributes.programmate) || [];
    for (const it of items) {
      if (it && it[1]) map.set(String(it[1]), { pvrid: it[0], link: !!it[6], stato: it[7], titolo: it[4] });
    }
    this._recMap = map;
    // Bookings just made: confirmed when the decoder reports them (or after 90 s)
    for (const [eid, p] of this._recPend) {
      if (!!map.get(eid) === p.booked || Date.now() - p.t > 90000) this._recPend.delete(eid);
    }
  }

  // { booked, link, pvrid } for an event, taking the pending operations into account
  _recInfo(eid) {
    if (!eid) return { booked: false, link: false };
    const r = this._recMap.get(eid);
    const p = this._recPend.get(eid);
    if (p && Date.now() - p.t < 90000) return { booked: p.booked, link: p.booked && (p.link || !!(r && r.link)), pvrid: r && r.pvrid, pend: true };
    return { booked: !!r, link: !!(r && r.link), pvrid: r && r.pvrid, stato: r && r.stato };
  }

  // Link every programme drawn by the EPG Card to its event (title + time, in order)
  _linkPrograms(row, eventi) {
    const progs = row.querySelectorAll(".program");
    let j = 0;
    progs.forEach((pr) => {
      const t = pr.dataset.title;
      const tm = pr.dataset.time;
      let k = j;
      while (k < eventi.length && !(eventi[k].title === t && `${eventi[k].start} - ${eventi[k].end}` === tm)) k++;
      if (k < eventi.length) {
        pr._skyP = eventi[k];
        j = k + 1;
      } else pr._skyP = null;
      const ev = pr._skyP && pr._skyP._ev;
      const eid = (ev && ev[4]) || "";
      if (pr.dataset.eid !== eid) pr.dataset.eid = eid;
      this._markProgram(pr);
    });
  }

  _markProgram(pr) {
    const info = this._recInfo(pr.dataset.eid);
    pr.classList.toggle("sky-rec", info.booked);
    pr.classList.toggle("sky-serie", info.booked && info.link);
  }

  _markRec() {
    for (const el of this._chunks.values()) {
      el.shadowRoot.querySelectorAll(".program[data-eid]").forEach((pr) => this._markProgram(pr));
    }
  }

  _openMenu(prog, el) {
    const row = prog.closest(".epg-row");
    const ch = row && this._channels.find((c) => String(c.num) === row.dataset.num);
    const p = prog._skyP;
    if (!ch || !p) return;
    if (el && el._hideTooltip) el._hideTooltip();
    const ev = p._ev;
    this._menu = { ch, p, ev, desc: "" };
    this._renderMenu();
    this._el.menuBg.hidden = false;
    this._caricaDescrizione(this._menu);
  }

  // The guide keeps only the first SKY_EPG_DESC_MAX characters of a description:
  // when it may be longer, ask script.sky_epg_descrizione for the full text and
  // redraw the menu if it is still open. Without the script (backend not updated)
  // or on errors the short text stays.
  _caricaDescrizione(m) {
    const { ch, p, ev } = m;
    if (!p.desc || p.desc.length < SKY_EPG_DESC_MAX || !ch.gsid) return;
    const eid = ev[4] || "";
    const key = eid || `${ch.gsid}|${ev[0]}`;
    const mostra = (d) => {
      if (this._menu !== m || !d || d.length <= p.desc.length) return;
      m.desc = d;
      this._renderMenu();
    };
    if (this._descCache.has(key)) return mostra(this._descCache.get(key));
    const [domain, service] = String(this._config.script_descrizione || "").split(".");
    if (!domain || !service || !this._hass.services?.[domain]?.[service]) return;
    this._hass
      .callService(domain, service, { sid: String(ch.gsid), eid, inizio: ev[0] }, undefined, false, true)
      .then((r) => {
        const d = r && r.response && r.response.descrizione;
        if (typeof d !== "string" || !d.trim()) return;
        if (this._descCache.size >= 200) this._descCache.delete(this._descCache.keys().next().value);
        this._descCache.set(key, d.trim());
        mostra(d.trim());
      })
      .catch(() => {});
  }

  _renderMenu() {
    const m = this._menu;
    if (!m) return;
    const { ch, p, ev } = m;
    const lang = this._hass.locale?.language || this._lang();
    const s = new Date(ev[0] * 1000);
    const e = new Date((ev[0] + ev[1]) * 1000);
    const now = new Date();
    const hm = (d) => d.toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit" });
    const oggi = new Date(now);
    oggi.setHours(0, 0, 0, 0);
    const giorno = Math.round((new Date(s).setHours(0, 0, 0, 0) - oggi.getTime()) / 86400000);
    let quando;
    if (s <= now && now < e) quando = this._t("on_air_until", { t: hm(e) });
    else quando = `${giorno === 0 ? this._t("today") : giorno === 1 ? this._t("tomorrow") : s.toLocaleDateString(lang, { weekday: "long", day: "numeric" })} ${hm(s)} – ${hm(e)}`;
    const eid = ev[4] || "";
    const fl = ev.length > 5 ? Number(ev[5]) : 0;
    const info = this._recInfo(eid);
    const btn = (a, icon, label, cls = "") =>
      `<button data-a="${a}" class="${cls}"><ha-icon icon="${icon}"></ha-icon>${skyEpgEsc(label)}</button>`;
    let rec = "";
    let note = "";
    const b = [btn("sintonizza", "mdi:television-play", this._t("tune_ch", { ch: `${ch.num} · ${ch.name}` }))];
    if (!this._recAttivo()) {
      // recordings not configured (no decoder with registrazioni: true): details and tune only
    } else if (info.booked) {
      rec = this._t(info.link ? "rec_series" : info.stato === "RECORDING" ? "rec_now" : "rec_sched");
      if (info.pvrid) {
        b.push(btn("annulla", "mdi:close-circle-outline", this._t(info.stato === "RECORDING" ? "stop_delete" : "cancel_rec")));
        if (info.link) b.push(btn("annulla_serie", "mdi:playlist-remove", this._t("cancel_series")));
      } else note = this._t("rec_pending");
    } else if (!eid) {
      note = this._t("no_eid");
    } else {
      if (fl & 1 || ev.length <= 5) b.push(btn("registra", "mdi:record-rec", this._t("record"), "rec"));
      if (fl & 2) b.push(btn("registra_serie", "mdi:repeat", this._t("record_series"), "rec"));
      if (!(fl & 3) && ev.length > 5) note = this._t("not_recordable");
    }
    b.push(btn("chiudi", "mdi:close", this._t("close"), "chiudi"));
    // full text if already read from Sky; otherwise the guide text, with "…" when cut
    const desc = m.desc || (p.desc && p.desc.length >= SKY_EPG_DESC_MAX ? `${p.desc.trimEnd()}…` : p.desc);
    this._el.menu.innerHTML = `
      <div class="m-ch">${skyEpgEsc(`${ch.num} · ${ch.name}`)}</div>
      <div class="m-t">${skyEpgEsc(p.title)}</div>
      <div class="m-time">${skyEpgEsc(quando)}</div>
      ${desc ? `<div class="m-desc">${skyEpgEsc(desc)}</div>` : ""}
      ${rec ? `<div class="m-rec">${skyEpgEsc(rec)}</div>` : ""}
      ${note ? `<div class="m-note">${skyEpgEsc(note)}</div>` : ""}
      <div class="m-btns">${b.join("")}</div>`;
  }

  _closeMenu() {
    this._menu = null;
    this._el.menuBg.hidden = true;
    this._el.menu.innerHTML = "";
  }

  _menuAction(a) {
    const m = this._menu;
    if (!m) return;
    const { ch, p, ev } = m;
    this._closeMenu();
    if (a === "chiudi") return;
    if (a === "sintonizza") return this._tune(ch);
    const eid = ev[4] || "";
    const info = this._recInfo(eid);
    const data = { azione: a };
    if (a === "registra" || a === "registra_serie") data.eid = eid;
    else data.pvrid = info.pvrid;
    const msg = this._t(`t_${a}`, { t: p.title });
    const prima = this._recPend.get(eid);
    this._recPend.set(eid, { booked: a.startsWith("registra"), link: a === "registra_serie", t: Date.now() });
    this._markRec();
    const [domain, service] = this._config.script_registrazione.split(".");
    this._hass
      .callService(domain, service, data)
      .then(() => this._toast(msg))
      .catch((e) => {
        if (prima) this._recPend.set(eid, prima);
        else this._recPend.delete(eid);
        this._markRec();
        this._toast(this._t("rec_error", { e: e.message || e }));
      });
  }

  _toast(message) {
    this.dispatchEvent(new CustomEvent("hass-notification", { detail: { message }, bubbles: true, composed: true }));
  }
}

if (!customElements.get("sky-epg-card")) {
  customElements.define("sky-epg-card", SkyEpgCard);
  window.customCards = window.customCards || [];
  window.customCards.push({
    type: "sky-epg-card",
    name: "Sky Q TV Guide",
    description: "TV guide of the channels on a Sky Q decoder (Sky Italia): tap to tune, long-press to record, playback controls.",
    preview: false,
    documentationURL: "https://github.com/amedeorutigliano/ha-sky-q-tv-guide",
  });
  console.info(`%c SKY-EPG-CARD %c ${SKY_EPG_VERSION} `, "background:#0b5;color:#fff", "background:#333;color:#fff");
}
