# Sky Q local API and Sky EPG service

This page documents the HTTP interfaces used by this project, as observed on Sky
Italia decoders (Sky Q "Titan" ES340 main box and Sky Q Mini EM150, firmware Q360).
They are **not officially documented by Sky** and may change with a firmware update.
Much of this knowledge comes from the [pyskyqremote](https://github.com/RogerSelwyn/skyq_remote)
library used by the Sky Q integration.

- [Decoder REST API (port 9006)](#decoder-rest-api-port-9006)
  - [Channel list](#channel-list)
  - [Recordings](#recordings)
  - [Disk usage](#disk-usage)
  - [Recording actions](#recording-actions)
- [Sky EPG service](#sky-epg-service)
- [Remote control keys](#remote-control-keys)
- [Logos](#logos)

## Decoder REST API (port 9006)

Base URL: `http://<decoder ip>:9006/as/`. No authentication. Answers are JSON.

### Channel list

`GET /as/services` — channels stored on the decoder (main box or Mini).

```json
{
  "services": [
    { "c": "101", "t": "Rai 1 HD", "sid": "899", "servicetype": "DSAT", "sf": "hd", "...": "..." },
    { "c": "5001", "t": "Rai 1 HD", "sid": "M217c-a3-547-ffff", "servicetype": "DTT", "sf": "hd" }
  ]
}
```

| Field | Meaning |
| --- | --- |
| `c` | Channel number on the remote. |
| `t` | Channel name. |
| `sid` | Service id. Numeric for Sky channels (used by the EPG service and for logos); digital terrestrial and free satellite channels have ids like `M217c-a3-547-ffff`, unknown to the EPG service. |
| `servicetype` | `DSAT` (Sky satellite), `DTT-SWAPPED` (channels with a Sky number and id received from digital terrestrial, e.g. 227 Rai Sport), `DTT` (digital terrestrial, 5000+), `OFTA` (free satellite, 9000+). |
| `sf` | Format: `sd`, `hd`, `uhd`, `au` (audio / radio). |

The package stores each channel as `"c|t|servicetype|sf|sid"`.

### Recordings

`GET /as/pvr/?limit=<n>&offset=<n>` — recordings of the main box (Sky Q Mini boxes
read them from the main box and do not have this list).

```json
{
  "pvrItems": [
    {
      "pvrid": "P29038072",
      "oeid": "E383-116",
      "st": 1790942700,
      "schd": 6900,
      "t": "La volta buona",
      "c": "101",
      "cn": "Rai 1 HD",
      "status": "SCHEDULED",
      "link": true,
      "seriesuuid": "90337483-f5f5-475d-85cd-0cc105f1562c",
      "...": "..."
    }
  ]
}
```

| Field | Meaning |
| --- | --- |
| `pvrid` | Recording id (used to cancel / delete). |
| `oeid` | Original event id, the same `eid` of the EPG service. |
| `st`, `schd` | Scheduled start (epoch s) and duration (s). |
| `t`, `c`, `cn` | Title, channel number, channel name. |
| `status` | `SCHEDULED`, `RECORDING`, `RECORDED`, `FAILED`, … |
| `link` | `true` when the recording belongs to a series link. |
| `seriesuuid` | Series id (episodes of the same series share it). |

### Disk usage

`GET /as/pvr/storage`

```json
{ "userQuotaMax": 555673, "userQuotaUsed": 553554, "...": "..." }
```

The package computes `100 × userQuotaUsed / userQuotaMax`.

### Recording actions

All actions are `POST` requests without a body. HTTP `200` means the decoder accepted
the action.

| Request | Effect |
| --- | --- |
| `POST /as/pvr/action/bookrecording?eid=<eid>` | Record one programme. |
| `POST /as/pvr/action/bookseriesrecording?eid=<eid>` | Record the whole series (series link). |
| `POST /as/pvr/action/seriesunlink?pvrid=<pvrid>` | Remove the series link; the episodes already scheduled stay scheduled. |
| `POST /as/pvr/action/delete?pvrid=<pvrid>` | Cancel a scheduled recording, stop and delete one in progress, or delete a recorded one. |

To cancel a whole series, `script.sky_q_registrazione` unlinks the series and then
deletes every `SCHEDULED` item with the same `seriesuuid`.

## Sky EPG service

`GET http://atlantis.epgsky.com/as/schedule/<YYYYMMDD>/<sid>`

Headers sent by the package: `x-skyott-territory: IT`, `x-skyott-provider: SKY`,
`x-skyott-proposition: SKYQ`.

- One channel per request: a list of several sids is rejected with HTTP 400.
- The file of one day covers the programmes from the early morning of that day until
  about 04:00 of the next day.

```json
{
  "schedule": [
    {
      "sid": "899",
      "events": [
        {
          "st": 1790942700,
          "d": 6900,
          "eid": "E383-116",
          "t": "La volta buona",
          "sy": "St1 Ep116 Puntata del 02/10/2026 - Talk show ...",
          "canb": true,
          "canl": true,
          "seriesuuid": "...",
          "programmeuuid": "...",
          "...": "..."
        }
      ]
    }
  ]
}
```

| Field | Meaning |
| --- | --- |
| `st`, `d` | Start (epoch s) and duration (s). |
| `eid` | Event id: used to book a recording (`bookrecording?eid=`). |
| `t`, `sy` | Title and synopsis. Sky sends at most about 230 characters of synopsis (longer ones end with "..."). The package strips a leading "St.. Ep.. Puntata del .. - "; the guide keeps 100 characters and `script.sky_epg_descrizione` returns the whole synopsis of one programme. |
| `canb` | The programme can be recorded. |
| `canl` | The programme can be recorded as a series. |

## Remote control keys

Tuning and playback go through the Sky Q integration (which talks to the decoder on
port 49160). `media_player.play_media` with `media_content_type: skyq` accepts a
comma-separated list of key names; this project uses `backup` (exit menus) followed by
the digits of the channel, for example `backup,1,0,1`. Playback uses the standard
`media_player` services, mapped by the integration to `play`, `pause`, `rewind` and
`fastforward`.

## Logos

`https://it.imageservice.sky.com/logo/skychb_<sid><name>/800/800?territory=IT&provider=SKY&proposition=SKYQ`

where `<name>` is the lower-case channel name with only letters and digits (e.g.
`skychb_899rai1hd`). The service allows cross-origin requests, which lets the card
crop the transparent margins of the image on a canvas.
