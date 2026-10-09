# Changelog

All notable changes to this project. Versions refer to the card
(`dist/sky-epg-card.js`); the backend files are released together with it.

## Unreleased

### Card

- The programme menu shows the full description (#2). The guide sensors keep only
  the first 100 characters of each description, so that they stay small; when the
  menu of a programme with a longer description is opened, the card reads the whole
  text from Sky through the new `script.sky_epg_descrizione` and shows it as soon as
  it arrives (until then the short text ends with "…"). Sky itself sends at most about
  230 characters. New option `description_script` (`script_descrizione`).

### Backend

- New `script.sky_epg_descrizione` (`sky_epg.yaml`) and macro `sky_epg_descrizione`
  (`custom_templates/sky_epg.jinja`), used by the card for the full description.
  **Replace `sky_epg.yaml` and `sky_epg.jinja`**; without them the card keeps showing
  the first 100 characters.
- The guide download no longer stops with a template error when Sky answers with an
  empty schedule (`"schedule": []`) for a channel and day.

- Decoders in deep standby are no longer queried. Sky Q boxes sleep for a few hours
  every night and the Sky Q integration reports them as `unavailable`: the channel list
  sensors and the recordings sensor now skip their requests in that state, which
  removes dozens of `Cannot connect to host …:9006` / `Error executing script` errors
  per night. Waking up from deep standby no longer triggers a refresh (the decoder
  answers `503` for a while): the next 30-minute refresh reads the list.
  **Update `sky_epg_decoders.yaml` by hand**: in each block add the `conditions:`
  section of the new example and remove `"unavailable"` from the `from:` list of the
  state trigger. Replace `sky_epg_registrazioni.yaml`.
- Configurations that include packages with `packages: !include_dir_named packages`
  are supported: `homeassistant/packages_include_dir_named/` contains the same three
  packages in that format (package name = file name, no first line). The README
  explains which folder to use; there is no need to change the `packages:` line.
  The folder is generated from `homeassistant/packages/` by
  `tools/make_include_dir_named.py`, and a workflow checks that they stay in sync.

## 3.0.0 – 2026-10-01

First public release.

### Card

- English and Italian user interface, chosen automatically from the Home Assistant
  language (`language: auto | it | en`).
- Options can be written in English (`language`, `filter`, `controls`, `logos`,
  `height`, `channels`, `guide`, `recordings`, …) or in Italian.
- Visual editor (Home Assistant form editor) with entity pickers.
- The channel list sensor of the decoder is found automatically through its
  `media_player` attribute.
- Recording features are hidden when no decoder with a hard disk is configured.

### Backend

- Decoders are configured in a separate file, `packages/sky_epg_decoders.yaml`,
  with YAML anchors so that every additional decoder is a few lines.
- The decoder that records is chosen with `registrazioni: true` (no IP address in the
  recordings package).
- The Sky channel ids are collected from every channel list sensor (no naming
  convention required).
- The tune and refresh scripts are part of the core package.
- English comments and documentation.

## 2.6.0

- Rewind / play-pause / fast-forward buttons, "Paused" status in the header.

## 2.5.0

- Recordings: long-press menu to record a programme or a series and to cancel them,
  red dots on booked programmes, disk usage.

## 2.4.0

- The chosen channel is highlighted immediately; the tune script polls the decoder
  until it reports the new channel.

## 2.3.0

- 24 hours of schedule downloaded in 8 parallel slices.

## 2.2.0

- Sky logos cropped to their content, background adapted to light / dark themes.

## 2.1.0

- Virtualized rendering: smooth scrolling on phones with 1,100+ channels.

## 2.0.0

- Schedule from the Sky EPG service (no HomeAssistant-EPG / open-epg dependency).

## 1.0.0

- Channel lists read from the decoders, guide drawn with the EPG Card, tap to tune.
