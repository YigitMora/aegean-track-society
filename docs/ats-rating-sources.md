# ATS Rating Sources

Accessed date for this sprint: 2026-07-12.

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
| `engine_rsa300` | RSA300 BMW B48 platform tune documentation | RSA | https://rsa.com.tr/ | Platform-specific package naming and BMW 320i/420i B48 target family. | Public technical data is insufficient for a calibrated measured-power claim; seed impact is conservative and limited to exact Turkey-market BMW templates. |
