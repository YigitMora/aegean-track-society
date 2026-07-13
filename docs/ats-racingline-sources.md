# ATS RacingLine and Garrett Sources

Reviewed on 2026-07-13.

Sprint 4N expands RacingLine VAG rows and restores Garrett VAG turbo visibility without removing any existing RacingLine, Garrett, APR, generic, or fallback rows. New rows remain exact-template or engine-family gated; named turbo products share the turbo slot, and named ECU packages share the ECU/software package slot.

| Seed code | Official product/model name | Source | Compatibility basis | ATS limitation / advisory behavior |
| --- | --- | --- | --- | --- |
| `racingline_ea888_gen3_oem_plus_stage_2` | RacingLine OEM+ Performance Software Stage 2 | https://www.racingline.com/ | `vag_ea888_gen3` | Stores provider stage label only; fuel, ECU version, and hardware support remain owner-verified. |
| `racingline_ea888_gen4_oem_plus_stage_2` | RacingLine OEM+ Performance Software Stage 2 | https://www.racingline.com/ | `vag_ea888_gen4` | Same conservative rating policy as Gen 3, with MQB Evo thermal logging note. |
| `racingline_dsg_dq250_dynamic_tcu` | Dynamic TCU Software DQ250 | https://www.racingline.com/ | Exact DQ250-style MQB templates | Gearbox controller, software version, and torque limit are not inferred globally. |
| `racingline_dsg_dq500_dynamic_tcu` | Dynamic TCU Software DQ500 | https://www.racingline.com/ | RS3/TTRS/Formentor VZ5 exact templates | Kept separate from ECU software and DQ381. |
| `racingline_mqb_intake_hose` | Intake hose family | https://www.racingline.com/ | Exact MQB/MQB Evo templates | Fitment metadata only; no large power claim. |
| `racingline_mqb_turbo_muffler_delete` | Turbo muffler delete family | https://www.racingline.com/ | Exact MQB/MQB Evo templates | Small airflow metadata only. |
| `racingline_mqb_charge_pipe` | Charge pipe family | https://www.racingline.com/ | Exact MQB/MQB Evo templates | Support-hardware metadata only. |
| `racingline_mqb_oil_management` | Oil management family | https://www.racingline.com/ | Exact MQB/MQB Evo templates | Thermal/readiness support without power claim. |
| `racingline_stage_2_big_brake_kit` | Stage 2 Big Brake Kit | https://www.racingline.com/ | Exact MQB/MQB Evo templates | Wheel clearance, caliper, disc, and axle fitment remain owner-verified. |
| `racingline_grooved_rear_discs` | Grooved rear discs / rotors | https://www.racingline.com/ | Exact MQB/MQB Evo templates | Rear disc family row only. |
| `racingline_performance_brake_fluid` / `racingline_braided_brake_hoses` | Brake fluid / brake hose families | https://www.racingline.com/ | Exact MQB/MQB Evo templates | Maintenance and fitment metadata only. |
| `racingline_mqb_anti_roll_bars` / `racingline_mqb_chassis_brace` | Chassis hardware families | https://www.racingline.com/ | Exact MQB/MQB Evo templates | Chassis metadata; no automatic track-car rating. |
| `racingline_higher_output_ignition_coils` | Higher Output Ignition Coils | https://www.racingline.com/ | Exact MQB/MQB Evo petrol templates | Reliability metadata only; not a tune. |
| `turbo_racingline_oem_plus_ea888_gen3` | RacingLine OEM+ turbo family | https://www.racingline.com/ | `vag_ea888_gen3` | Alternative named turbo row; shares the turbo slot. |
| `turbo_garrett_powermax_ea888_gen4` | Garrett PowerMax EA888 Gen 4 family | https://www.garrettmotion.com/racing-and-performance/performance-catalog/turbo/ | `vag_ea888_gen4` | Restores Garrett visibility alongside RacingLine; exact part number and tune remain advisory. |

Existing rows retained: `turbo_garrett_powermax_ea888_gen3`, `turbo_racingline_oem_plus_ea888_gen4`, RacingLine Stage 1 ECU rows, RacingLine DQ381 Dynamic TCU, R600 intake, MQB/MQB Evo hardware, Stage 3 brake kit, and RP700 pad rows.
