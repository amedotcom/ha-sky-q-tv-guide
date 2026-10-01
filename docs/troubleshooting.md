# Troubleshooting

Step-by-step checks, from the decoder to the card. Most problems are found in the
first three steps.

## 1. The decoder answers

From a computer on the same network open `http://<decoder ip>:9006/as/services`
in a browser: you should see a long JSON text with `"services"`. If not:

- the IP is wrong or changed (give the decoders a DHCP reservation);
- the decoder is switched off at the mains (standby is fine);
- Home Assistant runs on another network / VLAN that cannot reach port 9006.

## 2. The channel list sensors

*Developer tools → States*, search `_canali`:

- the state is the number of channels (around 1,100 on Sky Italia);
- `raggiungibile: true` and a recent `aggiornato`;
- `media_player` and `host` are those of your decoder;
- `registrazioni: true` only on the box with the hard disk.

If the sensor does not exist, the package was not loaded: check that
`configuration.yaml` contains `packages: !include_dir_merge_named packages/`, run
*Developer tools → YAML → Check configuration* and look for `sky_epg` in
*Settings → System → Logs*. If the sensor exists but is `0` / `raggiungibile: false`,
see step 1, then press the refresh button of the card (or run
`script.sky_q_aggiorna_lista_canali`).

## 3. The guide sensors

`sensor.sky_epg_guida_tv_1` … `_8` should each show 20–30 channels and a recent
`aggiornato`. If they are `0`:

- the channel list sensors must be filled first (step 2), then run
  `script.sky_q_aggiorna_lista_canali`;
- Home Assistant must reach `http://atlantis.epgsky.com` (plain HTTP, port 80): check
  firewalls / DNS filters;
- look at the traces of `script.sky_epg_scarica_guida` (*Settings → Automations &
  scenes → Scripts → Sky EPG - scarica palinsesto → Traces*).

## 4. Custom templates

If the log shows *"template 'sky_epg.jinja' … does not export the requested name"* or
*"TemplateNotFound: sky_epg.jinja"*:

- the file must be `<config>/custom_templates/sky_epg.jinja`;
- after copying or updating it, run the action `homeassistant.reload_custom_templates`
  (or restart Home Assistant), then reload the template entities.

## 5. The card

- *"Custom element doesn't exist: sky-epg-card"*: the resource is missing (*Settings →
  Dashboards → ⋮ → Resources*) or the browser has an old cache. Reload the page; in
  the companion app close and reopen it (or *Settings → Companion app → Debugging →
  Reset frontend cache*).
- *"The EPG Card resource (epg-card.js) is not loaded"*: install the EPG Card from HACS
  (step 2 of the installation).
- *"Channel list not available yet"*: the card did not find the channel list sensor of
  that decoder. Check the `media_player` of the card and of the decoder block, or set
  the sensor explicitly with `channels: sensor.xxx_canali`.
- Wrong language: set `language: it` or `language: en`.
- No logos: the browser must reach `https://it.imageservice.sky.com`; logos can be
  disabled with `logos: false`.

## 6. Tuning

- Tapping a channel shows *"tuning failed"*: open the trace of
  `script.sky_q_sintonizza_canale`. The decoder must be available in the Sky Q
  integration (`media_player` not `unavailable`).
- The channel changes but the highlight comes back to the old one after 30 s: the Sky Q
  integration is not reporting `skyq_channelno` (check the attributes of the
  `media_player`).

## 7. Recordings

- No *Record* buttons: no decoder has `registrazioni: true`, or
  `sensor.sky_q_registrazioni` has no `host` attribute yet (it updates every 10
  minutes; run `script.sky_q_aggiorna_lista_canali` to force it).
- *"The Sky Q decoder did not accept the operation"*: the programme cannot be recorded
  (e.g. already ended, not recordable, a recording conflict) or the
  disk is full.
- Some programmes have no *Record* button: Sky does not allow recording them (the
  menu says so).

## 8. Log noise

- `Cannot connect to host <ip>:9006` every 30 minutes: a decoder is unreachable (often
  a Sky Q Mini switched off at the mains). The last valid channel list is kept.
- `State attributes for sensor.sky_epg_guida_tv_N exceed maximum size`: the recorder
  exclusions are applied after a restart of Home Assistant.

## Getting help

Open an [issue](https://github.com/amedeorutigliano/ha-sky-q-tv-guide/issues) with:
Home Assistant version, decoder models, the state and attributes of the sensors
(without the long `canali` / `guida` lists), the relevant log lines and the browser
console errors (F12 → Console) if the problem is in the card.
