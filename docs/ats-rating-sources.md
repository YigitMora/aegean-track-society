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

## RSA300 Platform Tune

| Code | Source title | Publisher | URL | Values used | Uncertainty note |
| --- | --- | --- | --- | --- | --- |
| `engine_rsa300` | RSA300 BMW B48 platform tune documentation | RSA | https://rsa.com.tr/ | Platform-specific package naming and BMW 320i/420i B48 target family. | Public technical data is insufficient for a calibrated measured-power claim; seed impact is conservative and limited to exact Turkey-market BMW templates. |
