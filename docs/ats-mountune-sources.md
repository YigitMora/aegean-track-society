# ATS Mountune Sources

Reviewed on 2026-07-13.

Sprint 4N Mountune rows are seeded as provider product-family metadata for exact Ford templates only. They are not universal Ford rows, warranty advice, emissions guidance, or dyno certification. Power-package rows occupy the `platform_tune_package` slot so they cannot coexist with another ECU package.

| Seed code | Official product/model name | Source | Supported platform | Claimed values stored | Uncertainty / ATS behavior |
| --- | --- | --- | --- | --- | --- |
| `mountune_fiesta_st_mk7_mp215` | MP215 Performance Upgrade | https://www.mountunestore.com/collections/all | Fiesta ST Mk7 | 215 hp package label | Medium confidence; fuel and full kit contents remain owner-verified. |
| `mountune_fiesta_st_mk8_m225` | m225 Performance Upgrade | https://www.mountunestore.com/collections/all | Fiesta ST Mk8 / ST Edition | 225 hp package label | Medium confidence; track-readiness gain stays small without brakes/cooling. |
| `mountune_focus_st_mk3_mp260` | MP260-style Focus ST package | https://www.mountunestore.com/collections/all | Focus ST Mk3 | 260 hp package label | Low confidence; exact regional kit page should be attached before raising confidence. |
| `mountune_focus_st_mk4_m330` | m330 Performance Upgrade | https://www.mountunestore.com/collections/all | Focus ST Mk4 / ST Edition | 330 hp package label | Medium confidence; supporting hardware/fuel remain advisory metadata. |
| `mountune_focus_rs_mk3_m365` | m365 Performance Upgrade | https://www.mountunestore.com/collections/all | Focus RS Mk3 | 365 hp package label | Medium confidence; conservative thermal/readiness impact. |
| `mountune_focus_rs_mk3_m380` | m380 Performance Upgrade | https://www.mountunestore.com/collections/all | Focus RS Mk3 | 380 hp package label | Medium confidence; reliability/thermal penalties prevent power-only overall inflation. |
| `mountune_ford_induction_kit` | Induction / cold-air intake product families | https://www.mountunestore.com/collections/all | Fiesta ST, Focus ST/RS, Mustang EcoBoost exact templates | No output claim | Small power metadata only; exact hose/intake fitment remains owner-verified. |
| `mountune_ford_intercooler` | Alloy Intercooler Upgrade product families | https://www.mountunestore.com/collections/all | Fiesta ST, Focus ST/RS, Mustang EcoBoost exact templates | No output claim | Adds thermal/readiness support, not a power claim. |
| `mountune_ford_charge_pipe` | Boost hose / charge pipe product families | https://www.mountunestore.com/collections/all | Fiesta ST, Focus ST/RS, Mustang EcoBoost exact templates | No output claim | Support-hardware metadata only. |
| `mountune_ford_turbo_upgrade` | Turbocharger upgrade product families | https://www.mountunestore.com/collections/all | Supported Ford turbo templates only | No output claim | Shares turbo slot with Garrett/generic turbo rows; tune/fuel/cooling remain advisory. |
| `mountune_ford_quick_shift` | Billet Quick Shift / Short Shift Arm | https://www.mountunestore.com/collections/all | Supported manual Ford ST/RS templates | No output claim | Driver-control metadata only. |
| `mountune_ford_sport_springs` / `mountune_ford_clubsport_coilovers` | Sport springs / Clubsport suspension | https://www.mountunestore.com/collections/all | Supported Ford ST/RS templates | No output claim | Existing spring/damper/coilover exclusivity remains in force. |
| `mountune_ford_brake_pads` / `mountune_ford_braided_brake_lines` | Brake pad and braided line families | https://www.mountunestore.com/collections/all | Supported Ford ST/RS templates | No output claim | Braking/readiness metadata only; pad shape and axle fitment remain owner-verified. |

Catalog searches also surfaced Mountune product handles for Focus RS/ST alloy intercoolers, Fiesta ST cold-air intake, billet quick-shift arms, boost-hose kits, and braided brake lines. ATS keeps those as exact-template product-family rows rather than universal brand rows.
