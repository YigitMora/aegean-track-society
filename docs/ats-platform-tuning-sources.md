# ATS Platform Tuning Sources

Sprint 4G adds platform and engine-family gated tuning packages. These rows are compatibility and preview metadata only: they are not dyno results, homologation claims, warranty guidance, or safety certification. Claimed deltas in seed data are conservative ATS descriptors used to rank preview impact, and every product remains gated by powertrain plus exact, engine-family, or platform-family compatibility.

Reviewed on 2026-07-13.

| Seed code | Product family | Source | Evidence used | ATS limitation |
| --- | --- | --- | --- | --- |
| `engine_rsa300` | RSA300 B48 Turkiye package | ATS internal placeholder | Retains existing exact-template BMW Turkiye 1.6 B48 gating. | Low confidence until supplier source and dyno evidence are attached. |
| `tune_mhd_b58_stage_1` | MHD B58 Stage 1 | https://mhdtuning.com/ | Official MHD product navigation lists F+G-Series B58 flasher support. | Output values are not stored as official dyno claims. |
| `tune_mhd_s55_stage_1` | MHD S55 Stage 1 | https://mhdtuning.com/ | Official MHD product navigation lists F-Series S55 flasher support. | Output values are not stored as official dyno claims. |
| `tune_mhd_s58_stage_1` | MHD S58 Stage 1 | https://mhdtuning.com/ | Official MHD product navigation lists F+G-Series S58 flasher support. | Output values are not stored as official dyno claims. |
| `tune_xhp_bmw_zf8_stage_2` | xHP BMW ZF8 Stage 2 | https://www.xautomotive.com/ | Official xHP/xAutomotive product navigation lists BMW/MINI/Toyota Supra 8-speed support. | ATS impact reflects shift behavior only; torque limits require vehicle verification. |
| `tune_apr_ea888_gen3_stage_1` | APR EA888 Gen 3 Stage 1 | https://www.goapr.com/products/software/ecu_upgrade/ | Official APR ECU Upgrade page lists EA888 Gen 3 MQB 2.0T applications. | Fuel program and local emissions legality are outside ATS. |
| `tune_apr_ea888_gen4_stage_1` | APR EA888 Gen 4 Stage 1 | https://www.goapr.com/products/software/ecu_upgrade/ | Official APR ECU Upgrade page lists EA888 Gen 4 Mk8 GTI/Golf R/S3 applications. | Fuel program and local emissions legality are outside ATS. |
| `tune_cobb_focus_rs_mk3_stage_1` | COBB Focus RS Accessport Stage 1 | https://www.cobbtuning.com/products/accessport/ford-focus-rs-accessport-v3 | Official COBB page lists 2016-2018 Focus RS support and OTS maps. | COBB percentage gains are not converted into guaranteed ATS output. |
| `tune_ktuner_fk8_stage_1` | KTuner Civic Type R FK8 Stage 1 | https://ktuner.com/ | Official KTuner application list includes 2017-2021 Civic Type-R. | Exact ECU part number and map selection remain owner responsibility. |
| `tune_hondata_fl5_flashpro_stage_1` | Hondata Civic Type R FL5 FlashPro Stage 1 | https://www.hondata.com/ | Seeded as a provisional FL5 calibration slot for ATS compatibility modelling. | Low confidence until refreshed official product-page review is attached. |

Family compatibility precedence is implemented in code as: powertrain, exact vehicle definition, engine family, platform family, legacy brand/model/year, then universal only when no active compatibility rows exist for that definition.
