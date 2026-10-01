# Changelog

All notable changes to this project. Versions refer to the card
(`dist/sky-epg-card.js`); the backend files are released together with it.

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
