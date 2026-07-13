# ATS Rating Sources

Accessed date for this sprint: 2026-07-13.

## Sprint 4G Tuning Evidence

Platform-specific tuning packages now store calibration confidence, source notes, and optional manufacturer-claimed power or torque deltas on `VehicleModificationImpact`. These fields are evidence metadata only. The ATS rating formula remains unchanged, and tuning impacts stay conservative until exact vehicle-template evidence is stronger. See `docs/ats-platform-tuning-sources.md` for product-family source rows and compatibility precedence.

## Sprint 4H Map-Stage and Catalog Evidence

Sprint 4H adds provider-authentic `mapStageLabel` metadata on `TuningPackageSpecification` and keeps it separate from rating impact. MHD N55/B58, bootmod3 FlexFuel, and xHP records use official provider terminology only; no ATS tier ladder is introduced. B58 higher-output maps receive larger Power impacts than B48/N55 baseline records, but Reliability and Thermal penalties plus unchanged no-brake/no-cooling guardrails prevent high-stage ECU maps from becoming all-round 100-score builds.

Eventuri intake and expanded wheel records add fitment/catalog metadata only. Their rating impact is intentionally small unless an exact vehicle-template override exists, and wheel construction never creates a large score gain without exact size and weight.

## Sprint 4J Catalog Rating Safeguards

Sprint 4J keeps the rating formula unchanged. RSA300 is still exact-template gated to Turkiye BMW B48 1.6 vehicle definitions, stores `RSA300` as package metadata only, and no longer stores an inferred claimed horsepower delta. The platform impact uses a strong but not dominant Power increase with Reliability and Thermal penalties, so Overall remains moderated unless the build also earns braking, cooling, tyre, and safety support from separate records.

Tyre taxonomy uses the normalized `TyreClass` enum: `TOURING`, `UHP_ROAD`, `MAX_PERFORMANCE_ROAD`, `EXTREME_PERFORMANCE`, `TRACKDAY`, `SEMI_SLICK`, `SLICK`, and `WET_RACING`. Touring tyres receive road/wet/wear/comfort emphasis and little or no track-readiness; UHP and max-performance road tyres are moderate; extreme/trackday/semi-slick tyres improve handling/braking more strongly with lower wet/road/comfort scores; slicks get the highest dry score but extremely low wet and road suitability; wet racing tyres prioritize wet grip and stay race-only. No tyre row increases Power.

Wheel rows remain conservative family metadata: construction affects the wheel detail summary, but no universal weight, diameter, offset, brake clearance, or fitment claim is converted into a large handling score. Aero rows do not store downforce claims and receive small handling/readiness values only. Safety rows represent build-preparation declarations, not certification or installation guarantees.

## Sprint 4K Dependency and Suspension Rating Safeguards

Sprint 4K keeps the rating formula unchanged. Advisory tuning dependencies, such as Stage 2 downpipe, flex-fuel calibration, and provider-recommended airflow/cooling support, are no longer active hard requirements. They remain represented in source notes, fitment notes, and tuning-package metadata instead of blocking selection.

Flex-fuel hardware is a hardware declaration under `flex_fuel_hardware`, not ECU software, and does not add Power by itself. Power changes remain attached to calibration/tune rows or platform impacts.

Damper records receive modest Handling/Track Readiness values and require an active sport-spring record. Coilovers conflict with sport springs and dampers through catalog rules, so the batch validator accepts spring + damper together, rejects damper alone, and rejects damper + coilover.

Turbo rows use the existing rating formula and platform-impact override behavior. Named turbo families receive engine-family gated impacts; generic Hybrid Turbo and Big Turbo rows are lower-confidence fallback declarations and are suppressed when a compatible named turbo exists. No turbo row creates hard requirements for ECU software, downpipe, intercooler, fuel, or drivetrain upgrades.

## Sprint 4L RacingLine Rating Safeguards

Sprint 4L keeps the rating formula unchanged. RacingLine OEM+ ECU and Dynamic TCU rows use the same platform-impact path as existing named provider tunes, with conservative Power/Track Readiness gains and Reliability/Thermal penalties where calibration load increases. RacingLine hardware rows are exact-template gated to MQB/MQB Evo vehicles; intake and inlet rows receive small Power/Readiness values, intercooler rows add Thermal support, and brake/suspension rows use the existing catalog category scoring.

The new VAG templates added in Sprint 4L remain `PROVISIONAL` unless they extend an already calibrated platform pattern. Their ratings are generated through `calculateVehicleCalibrationScores`; no separate formula or client-side recalculation was introduced.

## Sprint 4N Rating Safeguards

Sprint 4N keeps the global rating formula unchanged. The new ordinary-road-car layer uses modest Power, average Handling/Braking, reasonable Reliability, moderate Thermal, and low Track Readiness inputs. Low readiness reflects road intent, tyres, brakes, and cooling, not a blanket penalty. EV daily cars receive acceleration credit through Power but keep low sustained-track and thermal assumptions.

Mustang GTD uses Ford's official Mustang GTD naming only; no separate "Competition" row is seeded. Its rating is top-tier for Power, aero/chassis intent, braking, thermal support, and readiness, but Reliability is not perfect and mass keeps it from becoming an automatic 100. Porsche 911 GT3 RS generations are split: 991.2 and 992 are separate templates, with the 992 receiving stronger Handling, Braking, Thermal, and Track Readiness than the existing 992 GT3.

Mountune power packages affect modified build previews only; they do not alter stock Ford template ratings. RacingLine/Garrett turbo and ECU additions use the same conservative impact path as earlier named provider rows, and named products remain slot-exclusive alternatives.

| Seed area | Source trail | Values used | Rating rationale |
| --- | --- | --- | --- |
| Togg T10F | https://www.togg.com.tr/t10f | RWD and AWD EV output classes, acceleration, and mass estimates | RWD versions are road-focused; AWD gets stronger Power but no inflated Handling/Readiness. |
| Ford Mustang GTD | https://www.ford.com/performance/mustang-gtd/ | 815 hp, 664 lb-ft, rear transaxle, dry sump, carbon-ceramic brakes, Cup 2R tyre/aero package evidence | Near top-tier track baseline while retaining mass and reliability moderation. |
| Porsche 911 GT3 RS | https://www.porsche.com/international/models/911/911-gt3-rs/911-gt3-rs/ | GT3 RS model data and GT hardware positioning | GT3 RS sits above GT3 in Handling, Braking, and Readiness. |
| Daily Golf/Polo/Clio and peers | Manufacturer model pages/newsrooms | Road-trim output, drivetrain, mass, and acceleration classes | Kept materially below GTI/RS/ST/AMG/M/RS performance variants in Track Readiness. |
| Mountune, RacingLine, Garrett, Hondata, KTuner | `docs/ats-mountune-sources.md`, `docs/ats-racingline-sources.md`, `docs/ats-platform-tuning-sources.md` | Provider product naming, claimed package labels, and fitment basis | Exact or family compatibility only; no local formula changes. |

## Sprint 4P Daily Catalog Evidence

Sprint 4P adds a broad provisional daily-car layer and current-generation Ford Courier templates. The rating formula and elite recalibration are unchanged. Manual/automatic, ICE/hybrid/EV, commercial/passenger, and material powertrain splits are separate vehicle definitions; cosmetic package duplicates are not added. Courier diesel rows use Ford's current `EcoBlue` nomenclature, while older `TDCi` naming remains reserved for legacy vehicles.

Detailed family source rows are tracked in `docs/ats-daily-vehicle-sources.md`. The audit script now includes Sprint 4P rows and checks Courier commercial/passenger ordering, ordinary Golf/Polo/Clio hierarchy, Focus daily trims below ST/RS, daily EV moderation, and the no-daily-over-75 guardrail.

## Sprint 4O Elite Rating Recalibration Evidence

Sprint 4O recalibrates stock `VehicleDefinition` component evidence and the deterministic rating helper. It does not change modification impacts, user vehicle records, registration, garage behavior, catalog selection, or powertrain filtering. Official manufacturer pages and newsrooms are primary sources; non-official lap discussions and opinion rankings are excluded from seeded evidence.

| Code | Primary source | Values used | Rating rationale | Uncertainty note |
| --- | --- | --- | --- | --- |
| `ford_mustang_gtd_s650` | Ford Mustang GTD product page, https://www.ford.com/performance/mustang-gtd/ | 815 hp, supercharged 5.2 V8, rear transaxle, near 50/50 balance, semi-active suspension, dry-sump oiling, carbon-ceramic brakes, Cup 2 R tyre sizing, active aero/downforce and official Nurburgring reference | Enters reference-level road-legal track range through multi-component chassis/brake/thermal/readiness evidence, while mass still applies. | Weight varies by published trim/source; ATS keeps a mass penalty but partially avoids double-counting only because the track evidence is exceptional. |
| `ford_mustang_dark_horse_s650` | Ford Mustang Dark Horse product page, https://www.ford.com/cars/mustang/models/dark-horse/ | 500 hp, 418 lb-ft, Brembo brakes, Handling Package, MagneRide, track-capable production Mustang positioning | Remains clearly above Mustang GT in track dimensions but far below GTD. | Market equipment variance; no elite adjustment. |
| `porsche_911_gt3_rs_992` | Porsche 911 GT3 RS model page, https://www.porsche.com/international/models/911/911-gt3-rs/911-gt3-rs/ | 386 kW, 525 PS, 3.2 s 0-100 km/h, 1,450 kg, active aero/DRS, central radiator, track chassis, monobloc brakes, Clubsport/Weissach evidence | Moves into 95-97 reference range through Handling, Braking, Thermal, and Track Readiness rather than Power. | Current Porsche page is international; regional equipment can vary. |
| `porsche_911_gt3_992` | Porsche 911 GT3 model comparison on Porsche 911 GT3 RS page and Porsche newsroom, https://www.porsche.com/international/models/911/911-gt3-rs/911-gt3-rs/ and https://newsroom.porsche.com/ | 375 kW/510 PS class, GT3 chassis and braking package, track-developed naturally aspirated 4.0 | Enters 90+ but remains below GT3 RS in Handling, Braking, Thermal, and Track Readiness. | Current Porsche comparison page reflects latest 911 GT3 model range; seed remains 992 GT3 baseline. |
| `porsche_911_gt3_rs_9912` | Porsche newsroom/archive source trail, https://newsroom.porsche.com/ | 383 kW class, GT3 RS track/aero package, lighter GT chassis, PCCB/track package evidence | Sits near but below 992 GT3 RS in most elite components. | Older market weights and package availability vary. |
| `porsche_718_cayman_gt4_rs` | Porsche 718 Cayman GT4 RS model page, https://www.porsche.com/international/models/718/718-cayman-gt4-rs/718-cayman-gt4-rs/ | 368 kW/500 PS, 3.4 s 0-100 km/h, 1,415 kg, GT3-derived 4.0, aerodynamics, lightweight construction, adjustable track chassis, brake cooling/PCCB evidence | Now clearly exceeds GT4 and occupies elite factory track-car range. | Official page notes unavailable-for-order status but technical baseline remains valid. |
| `porsche_718_cayman_gt4` | Porsche newsroom/model source trail, https://newsroom.porsche.com/ | 309 kW class, GT4 chassis, track-capable brakes/aero, lower thermal/readiness evidence than GT4 RS | Remains a high-performance track-capable road car below the RS. | Regional equipment and tyre/brake package variance. |
| `porsche_911_st_992` | Porsche newsroom/model source trail, https://newsroom.porsche.com/ | GT3 RS engine class, lightweight S/T concept, road-biased manual/purist positioning | Kept below GT3/GT3 RS; no elite adjustment because thermal/readiness evidence is not as track-specialized. | Limited-run model with package-dependent mass data. |
| `porsche_911_turbo_s_992` | Porsche 911 Turbo S model page, https://www.porsche.com/international/models/911/911-turbo-models/911-turbo-s/ | High power and acceleration, AWD traction, strong road GT hardware | Power is high, but Handling/Readiness stay below elite factory track cars. | Current model-page data may reflect latest model-year details. |
| `porsche_911_gt2_rs_9912` | Porsche newsroom GT2 RS source trail, https://newsroom.porsche.com/ | 515 kW class, 750 Nm class, 991.2 GT2 RS track/aero/brake evidence | Added as a small official-source reference to validate high-Power track specials without making Power dominant. | Older source pages and Manthey-package records are kept separate from stock seed evidence. |
| `mercedes_amg_gt_black_series_c190` | Mercedes-Benz media source trail, https://media.mercedes-benz.com/ | 537 kW, 800 Nm, Black Series aero/chassis/thermal positioning and official track-special intent | Added as AMG reference above ordinary AMG GT, with elite adjustment from multi-component evidence. | Public pages vary by regional archive; seed uses conservative curb-weight and reliability confidence. |
| `bmw_m4_csl_g82` | BMW Group PressClub, https://www.press.bmwgroup.com/global/article/detail/T0394891EN/the-new-bmw-m4-csl | 405 kW, 650 Nm, 1,625 kg class, CSL lightweight and track package evidence | Added as a high 80s/low 90s reference above M4 Competition in Track Readiness. | Stays below reference-level GT/RS cars because mass and thermal/brake evidence are lower. |
| `chevrolet_corvette_z06_c8` | Chevrolet Corvette Z06 product page, https://www.chevrolet.com/performance/corvette/z06 | 670 hp flat-plane V8, 2.6 s available 0-60 mph, GT3.R co-development language, street-legal track positioning | Added as a high-performance reference with strong Power/Braking/Thermal but no elite uplift without full readiness evidence. | Z07, aero, tyre, and brake package differences remain package-dependent. |
| `mclaren_765lt` | McLaren 765LT official legacy page, https://www.mclaren.com/cars/gl_en/legacy/765lt | 765 PS/563 kW class, 800 Nm class, lightweight Longtail track/aero positioning | Added as a lightweight reference-level road-legal track car with multi-component elite support. | Public legacy page exposes limited machine-readable detail; conservative reliability confidence retained. |
| `lamborghini_huracan_sto` | Lamborghini Huracan STO official history page, https://www.lamborghini.com/en-en/history/huracan-sto | 640 CV/470 kW class, RWD STO track/aero/lightweight positioning | Added as a road-legal track-special reference with high Handling/Braking/Readiness and moderated Reliability. | Lamborghini source is a history page; package/market weights can vary. |

| Code | Source title | Publisher | URL | Values used | Uncertainty note |
| --- | --- | --- | --- | --- | --- |
| `vw_golf_gti_mk75_performance` | Golf GTI 7/7.5 model family and RacingLine selector | Volkswagen / RacingLine | https://www.volkswagen-newsroom.com/ and https://www.racingline.com/ | GTI Performance output class, FWD MQB platform, brakes/chassis relative to Mk7 GTI. | Provisional; market trim/DSG/manual curb weights vary. |
| `vw_golf_gti_clubsport_mk7` | Golf GTI Clubsport model family and RacingLine selector | Volkswagen / RacingLine | https://www.volkswagen-newsroom.com/ and https://www.racingline.com/ | Clubsport higher-output GTI class and stronger track intent. | Provisional; official regional weights vary. |
| `vw_golf_gti_tcr_mk75` | Golf GTI TCR model family and RacingLine selector | Volkswagen / RacingLine | https://www.volkswagen-newsroom.com/ and https://www.racingline.com/ | TCR 290 PS class, FWD MQB, stronger braking/chassis assumptions. | Provisional; production-market data varies. |
| `vw_golf_r_mk75` | Golf R 7/7.5 model family and RacingLine selector | Volkswagen / RacingLine | https://www.volkswagen-newsroom.com/ and https://www.racingline.com/ | Golf R 310 PS AWD class and MQB brake/chassis baseline. | Provisional; hatch/estate and market weights vary. |
| `vw_polo_gti_aw` | Polo GTI AW product family | Volkswagen / RacingLine | https://www.volkswagen-newsroom.com/ and https://www.racingline.com/ | 2.0 TSI FWD compact hot-hatch class and RacingLine Polo AW intercooler support. | Provisional; smaller-platform thermal/readiness values kept conservative. |
| `audi_s3_8v_facelift` | Audi S3 8V product family and RacingLine selector | Audi / RacingLine | https://www.audi-mediacenter.com/ and https://www.racingline.com/ | Facelift 310 PS quattro class and MQB S3 baseline. | Provisional; Sportback/sedan market weights vary. |
| `cupra_leon_5f_cupra` | CUPRA Leon 5F product family and RacingLine selector | CUPRA / RacingLine | https://www.cupraofficial.com/ and https://www.racingline.com/ | 290 PS FWD MQB hot-hatch class. | Provisional; trim and brake-package variance remains. |
| `skoda_octavia_vrs_mk4` | Octavia vRS product family and RacingLine selector | Skoda / RacingLine | https://www.skoda-storyboard.com/ and https://www.racingline.com/ | 2.0 TSI 245 PS FWD MQB Evo family with larger-car mass penalty. | Provisional; estate/sedan mass and brake data vary. |
| `cupra_formentor_vz_20` | Formentor VZ product family and RacingLine selector | CUPRA / RacingLine | https://www.cupraofficial.com/ and https://www.racingline.com/ | 2.0 TSI 310 PS AWD MQB Evo crossover class. | Provisional; high-mass crossover penalty applied. |

## Brake Pad Compounds

| Code | Source title | Publisher | URL | Values used | Uncertainty note |
| --- | --- | --- | --- | --- | --- |
| `brake_pad_ebc_redstuff` | EBC Redstuff Ceramic Brake Pads | EBC Brakes | https://www.ebcbrakes.com/products/ebc-redstuff-ceramic-brake-pads/ | Fast street, low dust, cold bite, no race use. | Metadata normalized conservatively from manufacturer descriptors. |
| `brake_pad_ebc_yellowstuff` | EBC Yellowstuff Fast Street Brake Pads | EBC Brakes | https://www.ebcbrakes.com/products/ebc-yellowstuff-fast-street-pads/ | Fast street use, stronger repeated-road braking. | Exact operating-temperature range not seeded. |
| `brake_pad_ebc_bluestuff_ndx` | EBC Bluestuff NDX Super-Street & Trackday Brake Pads | EBC Brakes | https://www.ebcbrakes.com/products/ebc-bluestuff-ndx-super-street-trackday-brake-pads/ | Super-street and trackday positioning. | Track metadata remains conservative. |
| `brake_pad_ebc_rp_x` | RP-X Racing Brake Pads | EBC Brakes | https://www.ebcbrakes.com/products/rp-x-racing-brake-pads/ | Trackday, HPDE, racing positioning. | Street suitability reduced; exact range not seeded. |
| `brake_pad_ebc_sr11` | EBC Sintered SR Series Full Race and Endurance Brake Pads | EBC Brakes | https://www.ebcbrakes.com/products/ebc-sintered-sr-series/ | SR11 medium friction, endurance, ambient to 900 C. | Limited fitment range; race-use classification. |
| `brake_pad_ebc_sr21` | EBC Sintered SR Series Full Race and Endurance Brake Pads | EBC Brakes | https://www.ebcbrakes.com/products/ebc-sintered-sr-series/ | SR21 ultra-high friction, race, ambient to 925 C. | Race-use classification; street suitability low. |
| `brake_pad_pagid_rsl_1` | PAGID Racing Brake Pads | PAGID Racing | https://www.pagidracing.com/en/products/racing-brake-pads.html | RSL endurance family, compound existence and usage class. | Detailed temperature metrics kept provisional. |
| `brake_pad_pagid_rsl_29` | PAGID Racing Brake Pads | PAGID Racing | https://www.pagidracing.com/en/products/racing-brake-pads.html | RSL endurance family, compound existence and usage class. | Detailed temperature metrics kept provisional. |
| `brake_pad_ferodo_ds_performance` | Ferodo Racing Brake Pads | Ferodo Racing | https://www.ferodoracing.com/products/car-racing/racing-brake-pads/ | DS Performance current range and road-performance positioning. | Metadata conservative because exact public range values vary by catalogue. |
| `brake_pad_ferodo_ds2500` | Ferodo Racing Brake Pads | Ferodo Racing | https://www.ferodoracing.com/products/car-racing/racing-brake-pads/ | DS2500 current range and road/track positioning. | Metadata conservative. |
| `brake_pad_ferodo_ds1_11` | Ferodo Racing Brake Pads | Ferodo Racing | https://www.ferodoracing.com/products/car-racing/racing-brake-pads/ | DS1.11 current range and endurance/race positioning. | Exact operating-temperature range not seeded. |
| `brake_pad_ferodo_ds3_12` | Ferodo Racing Brake Pads | Ferodo Racing | https://www.ferodoracing.com/products/car-racing/racing-brake-pads/ | DS3.12 current range and high-friction race positioning. | Exact operating-temperature range not seeded. |
| `brake_pad_ferodo_dsuno` | Ferodo Racing Brake Pads | Ferodo Racing | https://www.ferodoracing.com/products/car-racing/racing-brake-pads/ | DSUNO current range and race positioning. | Exact operating-temperature range not seeded. |
| `brake_pad_ferodo_ds4_12` | Ferodo Racing Brake Pads | Ferodo Racing | https://www.ferodoracing.com/products/car-racing/racing-brake-pads/ | DS4.12 current range and high-friction race positioning. | Exact operating-temperature range not seeded. |

## Vehicle Templates

| Code | Source title | Publisher | URL | Values used | Uncertainty note |
| --- | --- | --- | --- | --- | --- |
| `mazda_mx5_nd_15` | MX-5 technical specifications | Mazda | https://www.mazda.co.uk/cars/mazda-mx-5/specs-and-compare/ | 1.5 engine output, weight class, RWD chassis intent. | Regional trim weights vary; rating is calibrated for broad ND roadster baseline. |
| `mazda_mx5_nd_20` | MX-5 technical specifications | Mazda | https://www.mazda.co.uk/cars/mazda-mx-5/specs-and-compare/ | 2.0 engine output, weight class, RWD chassis intent. | Regional trim weights vary; rating is calibrated for broad ND roadster baseline. |
| `hyundai_i20n` | i20 N product and technical information | Hyundai | https://www.hyundai.com/worldwide/en/brand-journal/mobility-solution/i20-n | 150 kW, 275 Nm, 1190 kg class, 0-100 km/h, LSD and N chassis intent. | Some market availability changed; technical baseline remains valid. |
| `hyundai_ioniq_5n` | IONIQ 5 N specifications | Hyundai | https://www.hyundai.com/worldwide/en/eco/ioniq5-n/highlights | 478 kW boost output, AWD EV, N thermal and track systems, high mass. | Track durability evidence is strong for an EV but still mass penalized. |
| `bmw_g20_320i_pre_lci` | 3 Series Sedan technical data | BMW | https://www.bmw.com/en/all-models/3-series/sedan/bmw-3-series-sedan.html | Global 320i 2.0 B48 class, 135 kW, 300 Nm. | Marked provisional; market output variants require explicit template selection. |
| `bmw_g20_320i_lci` | 3 Series Sedan technical data | BMW | https://www.bmw.com/en/all-models/3-series/sedan/bmw-3-series-sedan.html | Global 320i 2.0 B48 class, 135 kW, 300 Nm. | Marked provisional; market output variants require explicit template selection. |
| `bmw_g20_320i_tr_pre_lci` | 3 Series Turkey-market technical data | BMW Turkiye | https://www.bmw.com.tr/tr/all-models/3-series/sedan/2022/bmw-3-serisi-sedan-teknik-veriler.html | Turkey-market lower-output 320i class, 125 kW, 250 Nm. | Exact model-year pages vary; kept provisional. |
| `bmw_g20_320i_tr_lci` | 3 Series Turkey-market technical data | BMW Turkiye | https://www.bmw.com.tr/tr/all-models/3-series/sedan/2022/bmw-3-serisi-sedan-teknik-veriler.html | Turkey-market lower-output 320i class, 125 kW, 250 Nm. | Exact model-year pages vary; kept provisional. |
| `bmw_g22_420i_pre_lci` | 4 Series Coupe technical data | BMW | https://www.bmw.com/en/all-models/4-series/coupe/bmw-4-series-coupe.html | Global 420i 2.0 B48 class, 135 kW, 300 Nm. | Marked provisional; market output variants require explicit template selection. |
| `bmw_g22_420i_lci` | 4 Series Coupe technical data | BMW | https://www.bmw.com/en/all-models/4-series/coupe/bmw-4-series-coupe.html | Global 420i 2.0 B48 class, 135 kW, 300 Nm. | Marked provisional. |
| `bmw_g22_420i_tr_pre_lci` | 4 Series Turkey-market technical data | BMW Turkiye | https://www.bmw.com.tr/tr/all-models/4-series/coupe/2024/bmw-4-serisi-coupe-teknik-veriler.html | Turkey-market lower-output 420i class, 125 kW, 250 Nm. | Exact model-year pages vary; kept provisional. |
| `bmw_g22_420i_tr_lci` | 4 Series Turkey-market technical data | BMW Turkiye | https://www.bmw.com.tr/tr/all-models/4-series/coupe/2024/bmw-4-serisi-coupe-teknik-veriler.html | Turkey-market lower-output 420i class, 125 kW, 250 Nm. | Exact model-year pages vary; kept provisional. |
| `vw_golf_gti_mk85` | Golf GTI technical data | Volkswagen | https://www.volkswagen-newsroom.com/en/golf-gti-18544 | 195 kW, FWD, GTI chassis and braking class. | Provisional pending more repeatability evidence. |
| `vw_golf_gti_clubsport_mk85` | Golf GTI Clubsport technical data | Volkswagen | https://www.volkswagen-newsroom.com/en/golf-gti-clubsport-18545 | 221 kW, FWD, stronger track-oriented calibration. | Provisional. |
| `vw_golf_r_mk85` | Golf R technical data | Volkswagen | https://www.volkswagen-newsroom.com/en/golf-r-18546 | 245 kW, AWD, R chassis and braking class. | Provisional. |
| `honda_civic_type_r_fk2` | Civic Type R technical data | Honda | https://hondanews.eu/eu/en/cars/media/pressreleases/62869/2015-honda-civic-type-r | FK2 output, Brembo brake hardware, chassis intent. | Provisional due older-source variance. |
| `honda_civic_type_r_fk8` | Civic Type R technical data | Honda | https://hondanews.eu/eu/en/cars/media/pressreleases/116109/2017-honda-civic-type-r | FK8 output, chassis, cooling, braking and track positioning. | Calibrated. |
| `honda_civic_type_r_fl5` | Civic Type R technical data | Honda | https://hondanews.eu/eu/en/cars/media/pressreleases/424231/2023-honda-civic-type-r | FL5 output, chassis, braking and track positioning. | Calibrated. |
| `tesla_model_y_rwd` | Model Y specifications | Tesla | https://www.tesla.com/modely | EV output class, mass, acceleration and road-use intent. | Provisional because public output varies by battery and market. |
| `tesla_model_y_long_range_awd` | Model Y specifications | Tesla | https://www.tesla.com/modely | AWD acceleration, mass and road-use intent. | Provisional; track readiness conservative. |
| `tesla_model_y_performance` | Model Y specifications | Tesla | https://www.tesla.com/modely | Performance acceleration and AWD output class. | Provisional; track readiness conservative despite acceleration. |
| `togg_t10x_rwd` | T10X technical specifications | Togg | https://www.togg.com.tr/t10x | RWD output, mass class, SUV road-use intent. | Provisional; track evidence limited. |
| `togg_t10x_awd` | T10X technical specifications | Togg | https://www.togg.com.tr/t10x | AWD output, acceleration and mass class. | Provisional; track evidence limited. |

## Sprint 4E Vehicle Template Expansion

| Code | Official model name | Publisher | URL | Values used | Uncertainty note |
| --- | --- | --- | --- | --- | --- |
| `ford_fiesta_st_mk7` | Fiesta ST Mk7 | Ford | https://media.ford.com/ | Official model existence, 1.6 EcoBoost class, output, FWD hot-hatch positioning. | Older model-year curb weights vary by market; provisional. |
| `ford_fiesta_st_mk8` | Fiesta ST Mk8 | Ford | https://media.ford.com/ | Official model existence, 1.5 EcoBoost class, output, FWD hot-hatch positioning. | Provisional. |
| `ford_focus_st_mk3` | Focus ST Mk3 | Ford | https://media.ford.com/ | Official model existence, 2.0 EcoBoost output, FWD platform. | Provisional. |
| `ford_focus_st_mk4` | Focus ST Mk4 | Ford | https://media.ford.com/ | Official model existence, 2.3 EcoBoost output, FWD platform. | Provisional. |
| `ford_focus_rs_mk2` | Focus RS Mk2 | Ford | https://media.ford.com/ | Official model existence, 2.5 turbo output, RS chassis intent. | Older-source weights vary; provisional. |
| `ford_focus_rs_mk3` | Focus RS Mk3 | Ford | https://media.ford.com/ | Official model existence, 2.3 EcoBoost, AWD and RS chassis intent. | Provisional. |
| `ford_mustang_ecoboost_s550` | Mustang EcoBoost | Ford | https://media.ford.com/ | Official S550 EcoBoost output, RWD, mass class. | Provisional. |
| `ford_mustang_gt_s550` | Mustang GT | Ford | https://media.ford.com/ | Official GT 5.0 V8 output, RWD, mass class. | Provisional. |
| `ford_mustang_dark_horse_s650` | Mustang Dark Horse | Ford | https://media.ford.com/ | Official Dark Horse output, RWD, track-oriented hardware. | Calibrated from current official launch data. |
| `mercedes_a200_w177` | A 200 W177 | Mercedes-Benz | https://media.mercedes-benz.com/ | Official model existence, 1.3 turbo class, FWD road baseline. | Provisional. |
| `mercedes_amg_a35_w177` | Mercedes-AMG A 35 4MATIC | Mercedes-AMG | https://media.mercedes-benz.com/ | Official output, AWD, AMG compact performance positioning. | Provisional. |
| `mercedes_amg_a45_s_w177` | Mercedes-AMG A 45 S 4MATIC+ | Mercedes-AMG | https://media.mercedes-benz.com/ | Official output, AWD, AMG S compact performance positioning. | Calibrated from strong official data. |
| `mercedes_amg_cla35_c118` | Mercedes-AMG CLA 35 4MATIC | Mercedes-AMG | https://media.mercedes-benz.com/ | Official output, AWD, compact AMG sedan/coupe class. | Provisional. |
| `mercedes_amg_cla45_s_c118` | Mercedes-AMG CLA 45 S 4MATIC+ | Mercedes-AMG | https://media.mercedes-benz.com/ | Official output, AWD, compact AMG S positioning. | Provisional. |
| `mercedes_c200_w206` | C 200 W206 | Mercedes-Benz | https://media.mercedes-benz.com/ | Official model existence, mild-hybrid road baseline. | Provisional; regional outputs vary. |
| `mercedes_amg_c43_w206` | Mercedes-AMG C 43 4MATIC | Mercedes-AMG | https://media.mercedes-benz.com/ | Official output, AWD, mild-hybrid AMG positioning. | Provisional. |
| `mercedes_amg_c63_s_w205` | Mercedes-AMG C 63 S W205 | Mercedes-AMG | https://media.mercedes-benz.com/ | Official V8 output, RWD, high-performance braking/chassis class. | Provisional. |
| `mercedes_amg_c63_s_e_performance_w206` | Mercedes-AMG C 63 S E Performance | Mercedes-AMG | https://media.mercedes-benz.com/ | Official hybrid output, AWD, high mass and AMG positioning. | Provisional; hybrid thermal evidence kept conservative. |
| `audi_a3_35_tfsi_8y` | Audi A3 35 TFSI 8Y | Audi | https://www.audi-mediacenter.com/ | Official model existence, 1.5 TFSI class, road baseline. | Provisional. |
| `audi_s3_8v` | Audi S3 8V | Audi | https://www.audi-mediacenter.com/ | Official output, quattro drivetrain, compact S model positioning. | Provisional. |
| `audi_s3_8y` | Audi S3 8Y | Audi | https://www.audi-mediacenter.com/ | Official output, quattro drivetrain, compact S model positioning. | Provisional. |
| `audi_rs3_8v` | Audi RS 3 8V | Audi Sport | https://www.audi-mediacenter.com/ | Official 2.5 TFSI output, quattro, RS chassis intent. | Provisional. |
| `audi_rs3_8y` | Audi RS 3 8Y | Audi Sport | https://www.audi-mediacenter.com/ | Official 2.5 TFSI output, quattro, RS Torque Splitter generation. | Provisional. |
| `audi_s4_b9` | Audi S4 B9 | Audi | https://www.audi-mediacenter.com/ | Official output, quattro, sport sedan mass class. | Provisional. |
| `audi_rs4_b9` | Audi RS 4 B9 | Audi Sport | https://www.audi-mediacenter.com/ | Official output, quattro, RS Avant/sedan performance class. | Provisional. |
| `audi_tts_8s` | Audi TTS 8S | Audi | https://www.audi-mediacenter.com/ | Official output, quattro, compact coupe chassis class. | Provisional. |
| `audi_tt_rs_8s` | Audi TT RS 8S | Audi Sport | https://www.audi-mediacenter.com/ | Official 2.5 TFSI output, quattro, RS coupe class. | Provisional. |
| `toyota_gr_yaris_gen1` | GR Yaris Gen 1 | Toyota Gazoo Racing | https://global.toyota/en/newsroom/toyota/ | Official output, AWD, rally-derived homologation intent. | Calibrated from official launch and technical data. |
| `toyota_gr_yaris_gen2` | GR Yaris Gen 2 | Toyota Gazoo Racing | https://global.toyota/en/newsroom/toyota/ | Official updated output, AWD, reinforced track/rally hardware. | Calibrated from current official data. |
| `toyota_gr86_zn8` | GR86 | Toyota Gazoo Racing | https://global.toyota/en/newsroom/toyota/ | Official output, RWD, lightweight coupe class. | Provisional. |
| `toyota_supra_a90_20` | GR Supra 2.0 | Toyota Gazoo Racing | https://global.toyota/en/newsroom/toyota/ | Official output, RWD, sports coupe class. | Provisional. |
| `toyota_supra_a90_30` | GR Supra 3.0 | Toyota Gazoo Racing | https://global.toyota/en/newsroom/toyota/ | Official output, RWD, B58 sports coupe class. | Provisional. |
| `renault_clio_rs_200` | Clio RS 200 | Renault Sport | https://www.renaultgroup.com/en/news-on-air/ | Official model existence, output, FWD hot-hatch positioning. | Provisional. |
| `renault_clio_rs_trophy` | Clio RS Trophy 220 | Renault Sport | https://www.renaultgroup.com/en/news-on-air/ | Official Trophy output and chassis positioning. | Provisional. |
| `renault_megane_rs_280` | Megane RS 280 | Renault Sport | https://www.renaultgroup.com/en/news-on-air/ | Official output, FWD, 4Control/chassis intent. | Provisional. |
| `renault_megane_rs_trophy` | Megane RS Trophy 300 | Renault Sport | https://www.renaultgroup.com/en/news-on-air/ | Official output, Trophy chassis/brake intent. | Calibrated. |
| `renault_megane_rs_trophy_r` | Megane RS Trophy-R | Renault Sport | https://www.renaultgroup.com/en/news-on-air/ | Official lightweight track variant, output, chassis intent. | Calibrated. |
| `alpine_a110` | Alpine A110 | Alpine | https://media.renaultgroup.com/alpine/ | Official output, RWD, lightweight mid-engine class. | Calibrated. |
| `alpine_a110_s` | Alpine A110 S | Alpine | https://media.renaultgroup.com/alpine/ | Official output and sport chassis positioning. | Calibrated. |
| `alpine_a110_r` | Alpine A110 R | Alpine | https://media.renaultgroup.com/alpine/ | Official lightweight track-focused positioning. | Calibrated. |
| `porsche_718_cayman_s` | 718 Cayman S | Porsche | https://newsroom.porsche.com/ | Official output, RWD mid-engine sports car class. | Calibrated from official data; regional trim weights vary. |
| `porsche_718_cayman_gts_40` | 718 Cayman GTS 4.0 | Porsche | https://newsroom.porsche.com/ | Official output, naturally aspirated 4.0, track-capable chassis. | Calibrated. |
| `porsche_718_cayman_gt4` | 718 Cayman GT4 | Porsche | https://newsroom.porsche.com/ | Official output, GT chassis/brake/aero intent. | Calibrated. |
| `porsche_911_carrera_992` | 911 Carrera 992 | Porsche | https://newsroom.porsche.com/ | Official output, RWD 911 baseline. | Provisional. |
| `porsche_911_carrera_s_992` | 911 Carrera S 992 | Porsche | https://newsroom.porsche.com/ | Official output, RWD 911 S baseline. | Provisional. |
| `porsche_911_gt3_992` | 911 GT3 992 | Porsche | https://newsroom.porsche.com/ | Official GT3 output, chassis/brake/track intent. | Calibrated. |
| `bmw_m135i_f40` | BMW M135i xDrive F40 | BMW | https://www.press.bmwgroup.com/ | Official output, AWD, compact M Performance positioning. | Provisional. |
| `bmw_m140i_f20` | BMW M140i F20 | BMW | https://www.press.bmwgroup.com/ | Official output, B58 RWD hatch class. | Provisional. |
| `bmw_m240i_g42` | BMW M240i xDrive G42 | BMW | https://www.press.bmwgroup.com/ | Official output, B58 AWD coupe class. | Provisional. |
| `bmw_m2_f87` | BMW M2 Competition F87 | BMW M | https://www.press.bmwgroup.com/ | Official output, M chassis/brake intent. | Calibrated. |
| `bmw_m2_g87` | BMW M2 G87 | BMW M | https://www.press.bmwgroup.com/ | Official output, S58, M chassis/brake intent. | Calibrated. |
| `bmw_m3_f80` | BMW M3 Competition F80 | BMW M | https://www.press.bmwgroup.com/ | Official output, M sedan chassis class. | Provisional. |
| `bmw_m3_g80` | BMW M3 Competition G80 | BMW M | https://www.press.bmwgroup.com/ | Official output, S58, M sedan chassis class. | Provisional. |
| `bmw_m4_f82` | BMW M4 Competition F82 | BMW M | https://www.press.bmwgroup.com/ | Official output, M coupe chassis class. | Provisional. |
| `bmw_m4_g82` | BMW M4 Competition G82 | BMW M | https://www.press.bmwgroup.com/ | Official output, S58, M coupe chassis class. | Provisional. |
| `hyundai_elantra_n` | Elantra N | Hyundai N | https://www.hyundai-n.com/ | Official output, FWD N chassis, brake and thermal intent. | Calibrated. |
| `hyundai_kona_n` | Kona N | Hyundai N | https://www.hyundai-n.com/ | Official output, FWD N crossover performance positioning. | Provisional; mass/ride-height penalty applied. |
| `honda_s2000_ap1` | Honda S2000 AP1 | Honda | https://hondanews.com/ | Official model existence, output, RWD roadster chassis class. | Older-source weights vary; provisional. |
| `honda_integra_type_r_dc2` | Integra Type R DC2 | Honda | https://hondanews.com/ | Official model existence, output, lightweight Type R chassis intent. | Provisional due older-source variance. |
| `honda_civic_type_r_ep3` | Civic Type R EP3 | Honda | https://hondanews.eu/ | Official model existence, output, Type R chassis intent. | Provisional due older-source variance. |
| `vw_golf_gti_mk7` | Golf GTI Mk7 Performance | Volkswagen | https://www.volkswagen-newsroom.com/ | Official output, FWD GTI chassis class. | Provisional. |
| `vw_golf_gti_mk8` | Golf GTI Mk8 | Volkswagen | https://www.volkswagen-newsroom.com/ | Official output, FWD GTI chassis class. | Provisional. |
| `vw_golf_r_mk7` | Golf R Mk7 | Volkswagen | https://www.volkswagen-newsroom.com/ | Official output, AWD R chassis class. | Provisional. |
| `vw_golf_r_mk8` | Golf R Mk8 | Volkswagen | https://www.volkswagen-newsroom.com/ | Official output, AWD R chassis class. | Provisional. |
| `cupra_leon_vz` | CUPRA Leon VZ | CUPRA | https://www.cupraofficial.com/ | Official output, FWD VZ performance hatch class. | Provisional. |
| `cupra_formentor_vz5` | CUPRA Formentor VZ5 | CUPRA | https://www.cupraofficial.com/ | Official 2.5 TSI output, AWD, high-mass performance crossover class. | Provisional. |
| `subaru_brz_zn8` | Subaru BRZ ZN8 | Subaru | https://media.subaru.com/ | Official output, RWD lightweight coupe class. | Provisional. |
| `toyota_gt86_zn6` | Toyota GT86 | Toyota | https://global.toyota/en/newsroom/toyota/ | Official output, RWD lightweight coupe class. | Provisional. |
| `mitsubishi_lancer_evo_ix` | Lancer Evolution IX | Mitsubishi Motors | https://www.mitsubishi-motors.com/en/newsrelease/ | Official model existence, AWD turbo rally-sedan class. | Older-source weights vary; provisional. |
| `nissan_gtr_r35` | Nissan GT-R R35 | Nissan | https://global.nissannews.com/ | Official output, AWD, GT-R chassis and brake class. | Calibrated from strong official and long-running platform data. |

## RSA300 Platform Tune

| Code | Source title | Publisher | URL | Values used | Uncertainty note |
| --- | --- | --- | --- | --- | --- |
| `engine_rsa300` | RSA300 BMW B48 platform tune placeholder | ATS internal / RSA public search | https://rsa.com.tr/ | Platform-specific package label and exact BMW 320i/420i Turkiye B48 target family. | Public technical data is insufficient for a calibrated measured-power claim; no claimed output is stored and impact is limited to exact Turkey-market BMW templates. |
