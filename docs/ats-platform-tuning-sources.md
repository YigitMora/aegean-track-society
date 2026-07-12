# ATS Platform Tuning Sources

Sprint 4G adds platform and engine-family gated tuning packages. These rows are compatibility and preview metadata only: they are not dyno results, homologation claims, warranty guidance, or safety certification. Claimed deltas in seed data are conservative ATS descriptors used to rank preview impact, and every product remains gated by powertrain plus exact, engine-family, or platform-family compatibility.

Reviewed on 2026-07-13.

| Seed code | Product family | Source | Evidence used | ATS limitation |
| --- | --- | --- | --- | --- |
| `engine_rsa300` | RSA300 B48 Turkiye package | ATS internal placeholder | Retains existing exact-template BMW Turkiye 1.6 B48 gating. | Low confidence until supplier source and dyno evidence are attached. |
| `tune_mhd_b58_stage_1` | MHD B58 Gen 1 Stage 1 | https://mhdtuning.com/products/mhd-super-license-for-b58 | Official MHD B58 page lists B58 Gen 1 Stage 1 OTS maps. | Map label stored separately from ATS impact; fuel program remains owner-selected. |
| `tune_mhd_b58_stage_2` | MHD B58 Gen 1 Stage 2 | https://mhdtuning.com/products/mhd-super-license-for-b58 | Official MHD B58 page lists B58 Gen 1 Stage 2 maps for Full Bolt Ons. | Higher power impact is offset by thermal/reliability penalties. |
| `tune_mhd_b58_stage_2_hpfp` | MHD B58 Gen 1 Stage 2 HPFP | https://mhdtuning.com/products/mhd-super-license-for-b58 | Official MHD B58 page lists Stage 2 HPFP with upgraded HPFP from B58 Gen 2 or better. | Hardware note only; ATS does not infer installed HPFP unless member adds supporting records. |
| `tune_mhd_b58_e30` | MHD B58 Gen 1 E30 | https://mhdtuning.com/products/mhd-super-license-for-b58 | Official MHD B58 page lists E30 map options. | Ethanol blend is not treated as guaranteed dyno output. |
| `tune_mhd_b58tu_stage_1` | MHD B58 Gen 2 Stage 1 | https://mhdtuning.com/products/mhd-super-license-for-b58 | Official MHD B58 page lists B58 Gen 2 Stage 1 maps. | Gated to B58TU/TU2 families, not N55 or early B58. |
| `tune_mhd_b58tu_stage_2` | MHD B58 Gen 2 Stage 2 | https://mhdtuning.com/products/mhd-super-license-for-b58 | Official MHD B58 page lists B58 Gen 2 Stage 2 maps. | Track-readiness gain remains small without brakes/cooling. |
| `tune_mhd_b58tu_e40` | MHD B58 Gen 2 E40 | https://mhdtuning.com/products/mhd-super-license-for-b58 | Official MHD B58 page lists E40 map options for B58 Gen 2. | Ethanol blend and logging are owner responsibility. |
| `tune_mhd_n55_stage_1` | MHD N55 Stage 1 | https://mhdtuning.com/products/mhd-super-license-for-n55 | Official MHD N55 page lists Stage 1 maps up to 360HP/540NM for stock cars. | Gated to N55 family only. |
| `tune_mhd_n55_stage_2` | MHD N55 Stage 2 | https://mhdtuning.com/products/mhd-super-license-for-n55 | Official MHD N55 page lists Stage 2 up to 390HP/580NM with upgraded intercooler or high-flow downpipe. | Requirement group accepts either airflow option. |
| `tune_mhd_n55_stage_2_plus` | MHD N55 Stage 2+ | https://mhdtuning.com/products/mhd-super-license-for-n55 | Official MHD N55 page lists Stage 2+ up to 430HP/630NM with upgraded intercooler and high-flow downpipe. | Requires both downpipe and intercooler groups. |
| `tune_mhd_n55_e25` | MHD N55 E25 | https://mhdtuning.com/products/mhd-super-license-for-n55 | Official MHD N55 page lists E25 ethanol-mix maps. | No extra claimed output stored beyond conservative ATS impact. |
| `tune_bootmod3_b58_flexfuel` | bootmod3 FlexFuel | https://www.bootmod3.com/flex-fuel | Official bootmod3 FlexFuel page documents FlexFuel hardware/maps for pump gas, E85, or blends. | Requires flex-fuel hardware record and remains B58-family gated. |
| `tune_mhd_s55_stage_1` | MHD S55 Stage 1 | https://mhdtuning.com/ | Official MHD product navigation lists F-Series S55 flasher support. | Output values are not stored as official dyno claims. |
| `tune_mhd_s58_stage_1` | MHD S58 Stage 1 | https://mhdtuning.com/ | Official MHD product navigation lists F+G-Series S58 flasher support. | Output values are not stored as official dyno claims. |
| `tune_xhp_bmw_zf8_stage_2` | xHP BMW ZF8 Stage 2 | https://www.xautomotive.com/ | Official xHP/xAutomotive product navigation lists BMW/MINI/Toyota Supra 8-speed support. | ATS impact reflects shift behavior only; torque limits require vehicle verification. |
| `tune_apr_ea888_gen3_stage_1` | APR EA888 Gen 3 Stage 1 | https://www.goapr.com/products/software/ecu_upgrade/ | Official APR ECU Upgrade page lists EA888 Gen 3 MQB 2.0T applications. | Fuel program and local emissions legality are outside ATS. |
| `tune_apr_ea888_gen4_stage_1` | APR EA888 Gen 4 Stage 1 | https://www.goapr.com/products/software/ecu_upgrade/ | Official APR ECU Upgrade page lists EA888 Gen 4 Mk8 GTI/Golf R/S3 applications. | Fuel program and local emissions legality are outside ATS. |
| `tune_cobb_focus_rs_mk3_stage_1` | COBB Focus RS Accessport Stage 1 | https://www.cobbtuning.com/products/accessport/ford-focus-rs-accessport-v3 | Official COBB page lists 2016-2018 Focus RS support and OTS maps. | COBB percentage gains are not converted into guaranteed ATS output. |
| `tune_ktuner_fk8_stage_1` | KTuner Civic Type R FK8 Stage 1 | https://ktuner.com/ | Official KTuner application list includes 2017-2021 Civic Type-R. | Exact ECU part number and map selection remain owner responsibility. |
| `tune_hondata_fl5_flashpro_stage_1` | Hondata Civic Type R FL5 FlashPro Stage 1 | https://www.hondata.com/ | Seeded as a provisional FL5 calibration slot for ATS compatibility modelling. | Low confidence until refreshed official product-page review is attached. |

Family compatibility precedence is implemented in code as: powertrain, exact vehicle definition, engine family, platform family, legacy brand/model/year, then universal only when no active compatibility rows exist for that definition.

## Sprint 4H BMW N55/B58 Vehicle and Engine-Family Corrections

BMW/Toyota vehicle codes below use official BMW Group press material, Toyota GR Supra newsroom material, and MHD supported-car lists as cross-checks. Ratings remain provisional unless an earlier seed row was already calibrated.

| Seed codes | Official source URL | Engine family | Platform scope | Uncertainty note |
| --- | --- | --- | --- | --- |
| `bmw_f30_335i`, `bmw_f31_335i`, `bmw_f34_335i_gt`, `bmw_f32_435i`, `bmw_f33_435i`, `bmw_f36_435i_gran_coupe` | https://www.press.bmwgroup.com/ | `bmw_n55` | BMW F3x 335i/435i | Market transmission and xDrive variants are not split yet. |
| `bmw_f10_535i`, `bmw_f11_535i_touring` | https://www.press.bmwgroup.com/ | `bmw_n55` | BMW F10/F11 535i | Larger chassis receives conservative track-readiness values. |
| `bmw_f22_m235i`, `bmw_f23_m235i_convertible` | https://www.press.bmwgroup.com/ | `bmw_n55` | BMW F22/F23 M235i | Convertible weight penalty is approximate. |
| `bmw_f25_x3_35i`, `bmw_f26_x4_35i` | https://mhdtuning.com/products/mhd-super-license-for-n55 | `bmw_n55` | BMW X3/X4 35i listed by MHD support | SUV track readiness intentionally low. |
| `bmw_m140i_f20`, `bmw_m140i_f21`, `bmw_f22_m240i`, `bmw_f23_m240i_convertible`, `bmw_f30_340i`, `bmw_f31_340i`, `bmw_f32_440i`, `bmw_f33_440i`, `bmw_f36_440i_gran_coupe`, `bmw_g30_540i_early`, `bmw_g31_540i_touring_early`, `bmw_g11_740i`, `bmw_g12_740li`, `toyota_supra_a90_30` | https://mhdtuning.com/products/mhd-super-license-for-b58 | `bmw_b58` | Early F/G/Toyota B58 Gen 1 applications | `440i` uses B58 Gen 1; no N55 leakage. |
| `bmw_g20_m340i`, `bmw_g21_m340i_touring`, `bmw_g22_m440i`, `bmw_g23_m440i_convertible`, `bmw_g26_m440i_gran_coupe`, `bmw_g29_z4_m40i`, `toyota_supra_a90_30_later`, `bmw_g30_540i_lci`, `bmw_g31_540i_touring_lci`, `bmw_g01_x3_m40i`, `bmw_g02_x4_m40i`, `bmw_g14_840i`, `bmw_g15_840i`, `bmw_g16_840i_gran_coupe` | https://mhdtuning.com/products/mhd-super-license-for-b58 | `bmw_b58tu` | Later B58TU applications | M340i/M440i do not use generic early B58. |
| `bmw_m240i_g42`, `bmw_g60_540i` | https://www.press.bmwgroup.com/ | `bmw_b58tu2` | G42/G60 later B58 revision | G60 is hybrid-gated and does not receive ICE-only tune visibility. |
