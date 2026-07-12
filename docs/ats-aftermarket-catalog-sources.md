# ATS Aftermarket Catalog Sources

Accessed date for this sprint: 2026-07-13.

Seeded product metadata is normalized for ATS filtering and preview only. Suitability scores are descriptive ATS values, not manufacturer test scores. Sport springs and big brake kits are visible as product-family declarations; members must verify physical fitment outside ATS.

## Sport Springs

| Code | Official product name | Publisher | URL | Values used | Uncertainty note |
| --- | --- | --- | --- | --- | --- |
| `sport_springs_eibach_pro_kit` | Pro-Kit | Eibach | https://eibach.com/products/pro-kit | Product family name, road-focused lowering spring positioning. | Vehicle-specific lowering is not generalized. |
| `sport_springs_eibach_sportline` | Sportline | Eibach | https://eibach.com/products/sportline | Product family name, more aggressive lowering spring positioning. | Exact lowering remains null without size/platform fitment. |
| `sport_springs_hr_sport_springs` | Sport Springs | H&R Springs | https://www.hrsprings.com/products/springs/ | Product family name and spring category. | Vehicle-specific lowering is not generalized. |
| `sport_springs_hr_super_sport_springs` | Super Sport Springs | H&R Springs | https://www.hrsprings.com/products/springs/ | Official naming and more aggressive spring family. | No exact platform fitment claim. |
| `sport_springs_st_suspensions` | Sport Springs / Lowering Springs | ST Suspensions | https://www.st-suspensions.com/ | Product-family naming and road-sport use. | Public naming varies by region; seeded as provisional family metadata. |
| `sport_springs_vogtland` | Sport Springs | Vogtland | https://www.vogtland.com/ | Product-family naming and lowering spring category. | Public fitment details are not embedded. |

XT springs were omitted because an official manufacturer identity and stable product naming were not verified for this sprint.

## Big Brake Kits

| Code | Official product name | Publisher | URL | Values used | Uncertainty note |
| --- | --- | --- | --- | --- | --- |
| `bbk_ebc_apollo_4_pot` | Apollo 4 Pot | EBC Brakes | https://www.ebcbrakes.com/ | Apollo naming, fixed multi-piston BBK family. | No exact fitment claim; rotor dimensions left null. |
| `bbk_ebc_apollo_6_pot` | Apollo 6 Pot | EBC Brakes | https://www.ebcbrakes.com/ | Apollo naming, fixed multi-piston BBK family. | Six-piston label is descriptive only. |
| `bbk_alcon_4_pot` | 4 Pot Big Brake Kit | Alcon | https://alcon.co.uk/ | Alcon brake-kit/caliper family naming. | No exact fitment claim. |
| `bbk_alcon_6_pot` | 6 Pot Big Brake Kit | Alcon | https://alcon.co.uk/ | Alcon brake-kit/caliper family naming. | No exact fitment claim. |
| `bbk_ap_racing_4_pot` | 4 Pot Big Brake Kit | AP Racing | https://apracing.com/race-car/brake-calipers | AP Racing caliper/conversion family naming. | No exact fitment claim. |
| `bbk_ap_racing_6_pot` | 6 Pot Big Brake Kit | AP Racing | https://apracing.com/race-car/brake-calipers | AP Racing caliper/conversion family naming. | No exact fitment claim. |
| `bbk_brembo_gt_4_piston` | GT 4 Piston | Brembo | https://www.brembo.com/ | Brembo GT kit naming and fixed-caliper positioning. | No exact fitment claim. |
| `bbk_brembo_gt_6_piston` | GT 6 Piston | Brembo | https://www.brembo.com/ | Brembo GT kit naming and fixed-caliper positioning. | Piston count is not treated as a universal rating multiplier. |
| `bbk_wilwood_4_piston` | 4 Piston Big Brake Kit | Wilwood | https://www.wilwood.com/ | Wilwood kit and caliper family naming. | No exact fitment claim. |
| `bbk_wilwood_6_piston` | 6 Piston Big Brake Kit | Wilwood | https://www.wilwood.com/ | Wilwood kit and caliper family naming. | No exact fitment claim. |

## Tyres

| Code | Official product name | Publisher | URL | Values used | Uncertainty note |
| --- | --- | --- | --- | --- | --- |
| `tyre_nankang_ar_1` | Sportnex AR-1 | Nankang | https://nankangtyre.com/ | Product name and track-day/semi-slick positioning. | ATS values are normalized descriptors. |
| `tyre_nankang_cr_s` | CR-S | Nankang | https://nankangtyre.com/ | Product name and track-day positioning. | ATS values are normalized descriptors. |
| `tyre_michelin_pilot_sport_cup_2` | Pilot Sport Cup 2 | Michelin | https://www.michelin.co.uk/auto/tyres/michelin-pilot-sport-cup-2 | Official name and track-day positioning. | No cross-brand scientific ranking implied. |
| `tyre_michelin_pilot_sport_cup_2_connect` | Pilot Sport Cup 2 Connect | Michelin | https://www.michelin.co.uk/auto/tyres/michelin-pilot-sport-cup-2-connect | Official name and connected-track tyre positioning. | Current availability can vary by market/size. |
| `tyre_michelin_pilot_sport_4` | Pilot Sport 4 | Michelin | https://www.michelin.co.uk/auto/tyres/michelin-pilot-sport-4 | Official name and road performance class. | Road tyre impact remains below track-day tyres. |
| `tyre_michelin_pilot_sport_4_s` | Pilot Sport 4 S | Michelin | https://www.michelin.co.uk/auto/tyres/michelin-pilot-sport-4-s | Official name and max-performance road class. | No PS4S shorthand stored as product name. |
| `tyre_michelin_pilot_sport_5` | Pilot Sport 5 | Michelin | https://www.michelin.co.uk/auto/tyres/michelin-pilot-sport-5 | Official name and road performance class. | Road tyre impact remains conservative. |
| `tyre_michelin_pilot_sport_s_5` | Pilot Sport S 5 | Michelin | https://www.michelin.co.uk/auto/tyres/michelin-pilot-sport-s-5 | Official name and max-performance road class. | PS5S shorthand is not stored as official name. |
| `tyre_michelin_primacy_4_plus` | Primacy 4+ | Michelin | https://www.michelin.co.uk/auto/tyres/michelin-primacy-4-plus | Official name and touring/wet-road positioning. | Touring tyre values do not create track readiness. |
| `tyre_michelin_primacy_5` | Primacy 5 | Michelin | https://www.michelin.co.uk/auto/tyres/michelin-primacy-5 | Official name and touring/wet-road positioning. | Touring tyre values do not create track readiness. |
| `tyre_pirelli_p_zero_pz4` | P Zero PZ4 | Pirelli | https://www.pirelli.com/tyres/en-gb/car/catalogue/product/p-zero-pz4 | Official name and max-performance road class. | Availability varies by size and market. |
| `tyre_pirelli_p_zero_pz5` | P Zero PZ5 | Pirelli | https://www.pirelli.com/tyres/en-gb/car/catalogue/product/p-zero-pz5 | Official name and max-performance road class. | Newer product availability varies by market. |
| `tyre_pirelli_p_zero_trofeo_r` | P Zero Trofeo R | Pirelli | https://www.pirelli.com/tyres/en-gb/car/catalogue/product/pzero-trofeo-r | Official name and semi-slick/track positioning. | Wet/road suitability kept low. |
| `tyre_continental_premiumcontact_7` | PremiumContact 7 | Continental | https://www.continental-tires.com/products/b2c/car/tires/premiumcontact-7/ | Official name and touring/premium road positioning. | Touring tyre values do not create track readiness. |
| `tyre_continental_sportcontact_7` | SportContact 7 | Continental | https://www.continental-tires.com/products/b2c/car/tires/sportcontact-7/ | Official name and max-performance road positioning. | Road tyre impact remains below semi-slick. |
| `tyre_continental_sportcontact_6` | SportContact 6 | Continental | https://www.continental-tires.com/products/b2c/car/tires/sportcontact-6/ | Official name and relevant existing performance sizes. | Retained for relevant sizes; newer products may supersede in some markets. |

## Wheels

| Code | Official product name | Publisher | URL | Values used | Uncertainty note |
| --- | --- | --- | --- | --- | --- |
| `wheel_oz_ultraleggera` | Ultraleggera | OZ Racing | https://www.ozracing.com/ | Official model name and HLT/lightweight family positioning. | Weight remains null without exact size. |
| `wheel_oz_alleggerita_hlt` | Alleggerita HLT | OZ Racing | https://www.ozracing.com/ | Official model name and HLT family positioning. | Weight remains null without exact size. |
| `wheel_oz_leggera_hlt` | Leggera HLT | OZ Racing | https://www.ozracing.com/ | Official model name and HLT family positioning. | Weight remains null without exact size. |
| `wheel_oz_superturismo_lm` | Superturismo LM | OZ Racing | https://www.ozracing.com/ | Official model name. | Conservative impact because no size/weight selected. |
| `wheel_oz_hyper_gt_hlt` | Hyper GT HLT | OZ Racing | https://www.ozracing.com/ | Official model name and HLT family positioning. | Weight remains null without exact size. |
| `wheel_oz_estrema_gt_hlt` | Estrema GT HLT | OZ Racing | https://www.ozracing.com/ | Official naming verified from OZ current site/catalog references. | No "Estrema" shorthand stored; weight remains null. |
| `wheel_oz_formula_hlt` | Formula HLT | OZ Racing | https://www.ozracing.com/ | Official model name and HLT family positioning. | Weight remains null without exact size. |
| `wheel_rays_volk_te37` | Volk Racing TE37 | RAYS | https://www.rayswheels.co.jp/ | Official model family name and forged construction. | Forged construction alone does not create large rating gain. |
| `wheel_rays_volk_ce28` | Volk Racing CE28 | RAYS | https://www.rayswheels.co.jp/ | Official model family name and forged construction. | Weight remains null without exact size. |
| `wheel_rays_volk_te37_saga_s_plus` | Volk Racing TE37 SAGA S-plus | RAYS | https://www.rayswheels.co.jp/en/ | Official Volk Racing listing includes TE37 SAGA S-plus. | Forged construction only; no universal weight. |
| `wheel_rays_volk_ce28n_plus` | Volk Racing CE28N-plus | RAYS | https://www.rayswheels.co.jp/en/ | Official Volk Racing listing includes CE28N-plus. | No universal weight. |
| `wheel_rays_volk_ze40` | Volk Racing ZE40 | RAYS | https://www.rayswheels.co.jp/en/ | Official Volk Racing listing includes ZE40. | No universal weight. |
| `wheel_rays_volk_g025` | Volk Racing G025 | RAYS | https://www.rayswheels.co.jp/en/ | Official Volk Racing listing includes G025. | No universal weight. |
| `wheel_rays_gram_lights_57cr` | Gram Lights 57CR | RAYS | https://www.rayswheels.co.jp/ | Official model family name. | Conservative impact without exact size/weight. |
| `wheel_rays_gram_lights_57dr` | Gram Lights 57DR | RAYS | https://www.rayswheels.co.jp/ | Official model family name. | Conservative impact without exact size/weight. |
| `wheel_rays_gram_lights_57fxz` | Gram Lights 57FXZ | RAYS | https://www.rayswheels.co.jp/ | Official model family name. | Conservative impact without exact size/weight. |
| `wheel_rays_gram_lights_57nr` | Gram Lights 57NR | RAYS | https://www.rayswheels.co.jp/en/ | Official gramLIGHTS listing includes 57NR. | Conservative impact without exact size/weight. |
| `wheel_rays_gram_lights_57xr` | Gram Lights 57XR | RAYS | https://www.rayswheels.co.jp/en/ | Official gramLIGHTS listing includes 57XR. | Conservative impact without exact size/weight. |
| `wheel_rotiform_rse` | RSE | Rotiform | https://www.rotiform.com/ | Official model name. | Styling wheel impact remains conservative. |
| `wheel_rotiform_las_r` | LAS-R | Rotiform | https://www.rotiform.com/ | Official model name. | Styling wheel impact remains conservative. |
| `wheel_rotiform_kps` | KPS | Rotiform | https://www.rotiform.com/ | Official model name. | Styling wheel impact remains conservative. |
| `wheel_rotiform_dtm` | DTM | Rotiform | https://www.rotiform.com/ | Official model name. | Styling wheel impact remains conservative. |
| `wheel_msw_30` | MSW 30 | MSW Wheels | https://www.mswwheels.com/ | Official MSW model naming. | Weight remains null without exact size. |
| `wheel_msw_42` | MSW 42 | MSW Wheels | https://www.mswwheels.com/ | Official MSW model naming. | Weight remains null without exact size. |
| `wheel_msw_51` | MSW 51 | MSW Wheels | https://www.mswwheels.com/ | Official MSW current catalog naming. | Cast wheel; no weight stored. |
| `wheel_msw_54` | MSW 54 | MSW Wheels | https://www.mswwheels.com/ | Official MSW current catalog naming. | Cast wheel; no weight stored. |
| `wheel_msw_83` | MSW 83 | MSW Wheels | https://www.mswwheels.com/ | Official MSW current catalog naming. | Cast wheel; no weight stored. |
| `wheel_bbs_ci_r` | CI-R | BBS | https://www.bbs.com/en/home | Official Flow Form model listing. | No size-specific weight; conservative impact. |
| `wheel_bbs_cc_r` | CC-R | BBS | https://www.bbs.com/en/home | Official Flow Form model listing. | No size-specific weight; conservative impact. |
| `wheel_bbs_ch_r` | CH-R | BBS | https://www.bbs.com/en/home | Official Flow Form model listing. | No size-specific weight; conservative impact. |
| `wheel_bbs_ch_r_ii` | CH-R II | BBS | https://www.bbs.com/en/home | Official Flow Form model listing. | No size-specific weight; conservative impact. |
| `wheel_enkei_rpf1` | RPF1 | Enkei | https://enkei.com/ | Official Enkei model naming. | MAT/flow-formed family; no universal weight. |
| `wheel_enkei_nt03rr` | NT03RR | Enkei | https://enkei.com/ | Official Enkei model naming. | No universal weight. |
| `wheel_enkei_pf01` | PF01 | Enkei | https://enkei.com/ | Official Enkei model naming. | No universal weight. |
| `wheel_apex_vs_5rs` | VS-5RS | APEX | https://apexwheels.com/ | Official forged Sprint line listing. | No size-specific weight stored. |
| `wheel_apex_sm_10rs` | SM-10RS | APEX | https://apexwheels.com/ | Official forged Sprint line listing. | No size-specific weight stored. |
| `wheel_apex_arc_8` | ARC-8 | APEX | https://apexwheels.com/ | Official flow-formed Classic line listing. | No size-specific weight stored. |
| `wheel_apex_sm_10` | SM-10 | APEX | https://apexwheels.com/ | Official flow-formed Evolution line listing. | No size-specific weight stored. |
| `wheel_advan_racing_tc_4` | ADVAN Racing TC-4 | Yokohama Wheel | https://www.yokohamawheel.jp/ | Official ADVAN Racing model family. | Source access varies by locale; no weight stored. |
| `wheel_advan_racing_rsiii` | ADVAN Racing RSIII | Yokohama Wheel | https://www.yokohamawheel.jp/ | Official ADVAN Racing model family. | Source access varies by locale; no weight stored. |
| `wheel_advan_racing_rz_f2` | ADVAN Racing RZ-F2 | Yokohama Wheel | https://www.yokohamawheel.jp/ | Official ADVAN Racing forged model family. | No universal weight. |
| `wheel_titan7_t_m20` | T-M20 | Titan 7 | https://titan-7.com/ | Official Titan 7 forged model listing. | Fully forged claim recorded only as construction. |
| `wheel_titan7_t_p10` | T-P10 | Titan 7 | https://titan-7.com/ | Official Titan 7 forged model listing. | No size-specific weight stored. |
| `wheel_titan7_t_c5` | T-C5 | Titan 7 | https://titan-7.com/ | Official Titan 7 forged model listing. | No size-specific weight stored. |
| `wheel_team_dynamics_pro_race_1_2` | Pro Race 1.2 | Team Dynamics | https://teamdynamicsmotorsport.com/ | Official Team Dynamics wheel family. | Public wheel catalog access varies; conservative impact. |
| `wheel_motec_ultralight` | Ultralight | Motec | https://www.motec-wheels.de/en/ | Official Motec wheel program naming. | No size-specific weight stored. |
| `wheel_motec_nitro` | Nitro | Motec | https://www.motec-wheels.de/en/ | Official Motec wheel program naming. | Cast wheel; conservative impact. |
| `wheel_sparco_assetto_gara` | Assetto Gara | Sparco Wheels | https://www.sparcowheels.com/ | Official model naming, Sparco/OZ wheel family. | Construction kept conservative; weight remains null without exact size. |
| `wheel_sparco_terra` | Terra | Sparco Wheels | https://www.sparcowheels.com/ | Official model naming, Sparco/OZ wheel family. | Construction kept conservative; weight remains null without exact size. |
| `wheel_sparco_pista` | Pista | Sparco Wheels | https://www.sparcowheels.com/ | Official model naming, Sparco/OZ wheel family. | Construction kept conservative; weight remains null without exact size. |
| `wheel_sparco_podio` | Podio | Sparco Wheels | https://www.sparcowheels.com/ | Official model naming, Sparco/OZ wheel family. | Construction kept conservative; weight remains null without exact size. |

## Sprint 4F Intake, Cooling, Exhaust, and Powertrain Applicability

Definitions below are product-family declarations, not physical fitment guarantees. Powertrain applicability is seeded explicitly. `ICE` means visible only when a matched vehicle template has ICE powertrain; unmatched manual vehicles do not see these definitions.

| Code | Official brand | Official product/family name | Category | Publisher | Official URL | Powertrain applicability | Uncertainty note |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `intercooler_airtec_motorsport_upgrade` | AIRTEC Motorsport | Intercooler Upgrade | Intercooler | AIRTEC Motorsport | https://www.airtecmotorsport.com/ | ICE | Platform-specific size and pipework not modeled. |
| `intercooler_forge_motorsport` | Forge Motorsport | Intercooler Kit | Intercooler | Forge Motorsport | https://www.forgemotorsport.co.uk/ | ICE | Product family varies by vehicle. |
| `intercooler_burger_motorsports_performance` | Burger Motorsports | Performance Intercooler | Intercooler | Burger Motorsports | https://burgertuning.com/ | ICE | Product family varies by vehicle. |
| `intercooler_hks_kit` | HKS | Intercooler Kit | Intercooler | HKS | https://www.hks-power.co.jp/en/ | ICE | Product family varies by vehicle. |
| `intercooler_wagner_tuning_competition` | Wagner Tuning | Competition Intercooler | Intercooler | Wagner Tuning | https://www.wagner-tuning.com/ | ICE | Product family varies by vehicle. |
| `oil_cooler_airtec_motorsport` | AIRTEC Motorsport | Oil Cooler Kit | Oil Cooler | AIRTEC Motorsport | https://www.airtecmotorsport.com/ | ICE | Engine-oil cooler declaration; not EV cooling. |
| `oil_cooler_hel_performance` | HEL Performance | Oil Cooler Kit | Oil Cooler | HEL Performance | https://helperformance.com/ | ICE | HEL official site access is inconsistent; retained as provisional official brand record. |
| `oil_cooler_forge_motorsport` | Forge Motorsport | Oil Cooler Kit | Oil Cooler | Forge Motorsport | https://www.forgemotorsport.co.uk/ | ICE | Engine-oil cooler declaration; not EV cooling. |
| `oil_cooler_hks_kit` | HKS | Oil Cooler Kit | Oil Cooler | HKS | https://www.hks-power.co.jp/en/ | ICE | Product family varies by vehicle. |
| `intake_airtec_motorsport_induction_kit` | AIRTEC Motorsport | Induction Kit | Intake | AIRTEC Motorsport | https://www.airtecmotorsport.com/ | ICE | Combustion-engine intake declaration. |
| `intake_forge_motorsport_induction_kit` | Forge Motorsport | Induction Kit | Intake | Forge Motorsport | https://www.forgemotorsport.co.uk/ | ICE | Combustion-engine intake declaration. |
| `intake_burger_motorsports_bms_elite` | Burger Motorsports | BMS Elite Intake | Intake | Burger Motorsports | https://burgertuning.com/ | ICE | Product family varies by platform. |
| `intake_hks_racing_suction` | HKS | Racing Suction | Intake | HKS | https://www.hks-power.co.jp/en/ | ICE | Product family varies by platform. |
| `intake_wagner_tuning_carbon_intake` | Wagner Tuning | Carbon Intake System | Intake | Wagner Tuning | https://www.wagner-tuning.com/ | ICE | Added only as a verified engine intake family. |
| `intake_eventuri_bmw_g20_b58` | Eventuri | BMW G20 B58 Carbon Intake System | Intake | Eventuri | https://www.eventuri.net/product/bmw-g20-b58/ | ICE | Exact-template only for verified G20/G22 B58 applications; no universal Eventuri row. |
| `intake_eventuri_toyota_gr_supra_a90` | Eventuri | Toyota GR Supra Carbon Intake System | Intake | Eventuri | https://www.eventuri.net/ | ICE | Exact Supra A90 3.0 templates only until product page details are refreshed. |
| `intake_eventuri_bmw_g8x_s58` | Eventuri | BMW G8X M3/M4 Black Carbon Intake | Intake | Eventuri | https://www.eventuri.net/product/bmw-g8x-m3-m4/ | ICE | Exact G80/G82 S58 templates only. |
| `intake_eventuri_honda_fk8_type_r` | Eventuri | Honda Civic FK8 Type R Carbon Intake System | Intake | Eventuri | https://www.eventuri.net/product/honda-civic-fk8-type-r/ | ICE | FK8 only; FL5 not inferred. |
| `intake_eventuri_audi_8v_s3` | Eventuri | Audi 8V S3 / VAG 2.0 TFSI Carbon Intake System | Intake | Eventuri | https://www.eventuri.net/product/audi-8v-s3/ | ICE | 8V S3/Golf 7 R exact rows only. |
| `intake_eventuri_toyota_gr_yaris` | Eventuri | Toyota GR Yaris Carbon Intake System | Intake | Eventuri | https://www.eventuri.net/product/toyota-gr-yaris/ | ICE | Gen 1 exact-template row only. |
| `exhaust_milltek_sport_cat_back` | Milltek Sport | Cat-back Exhaust | Exhaust | Milltek Sport | https://www.millteksport.com/ | ICE | Exhaust fitment and emissions legality vary by platform. |
| `exhaust_milltek_sport_axle_back` | Milltek Sport | Axle-back Exhaust | Exhaust | Milltek Sport | https://www.millteksport.com/ | ICE | Exhaust fitment and emissions legality vary by platform. |
| `downpipe_milltek_sport` | Milltek Sport | Downpipe | Exhaust | Milltek Sport | https://www.millteksport.com/ | ICE | Downpipe legality and tune requirements vary by platform. |
| `exhaust_hks_hi_power_spec_l_ii` | HKS | Hi-Power SPEC-L II | Exhaust | HKS | https://www.hks-power.co.jp/en/ | ICE | Product family varies by platform. |
| `exhaust_hks_super_turbo_muffler` | HKS | Super Turbo Muffler | Exhaust | HKS | https://www.hks-power.co.jp/en/ | ICE | Product family varies by platform. |
| `exhaust_hks_exhaust_manifold` | HKS | Exhaust Manifold | Exhaust | HKS | https://www.hks-power.co.jp/en/ | ICE | Exact manifold fitment not modeled. |
| `turbo_inlet_forge_motorsport` | Forge Motorsport | Turbo Inlet Adaptor | Turbo inlet | Forge Motorsport | https://www.forgemotorsport.co.uk/ | ICE | Turbo-specific pipework declaration. |
| `charge_pipe_burger_motorsports` | Burger Motorsports | Charge Pipe | Charge pipe | Burger Motorsports | https://burgertuning.com/ | ICE | Turbo-specific pipework declaration. |
| `charge_pipe_wagner_tuning` | Wagner Tuning | Charge Pipe Kit | Charge pipe | Wagner Tuning | https://www.wagner-tuning.com/ | ICE | Turbo-specific pipework declaration. |

HF Series was omitted because an official manufacturer/brand identity and stable product-category source were not verified for this sprint.

## Conceptual Cleanup Definitions

| Code | Name | Source basis | Values used | Uncertainty note |
| --- | --- | --- | --- | --- |
| `brakes_brake_disc` | Brake Disc | Generic build-profile declaration | Disc replacement category. | No brand or vehicle fitment claim. |
| `brakes_two_piece_brake_disc` | Two-piece Brake Disc | Generic build-profile declaration | Conservative braking/thermal readiness signal. | No universal rotor size/weight claim. |
| `brakes_cooling_ducts` | Brake Cooling | Generic build-profile declaration | Brake thermal support. | No platform routing or duct fitment claim. |
| `suspension_performance_damper` | Damper | Generic build-profile declaration | Conservative chassis support. | No damper curve or fitment claim. |
| `suspension_front_anti_roll_bar` | Front Anti-roll Bar | Generic build-profile declaration | Conservative handling signal. | No bar stiffness claim. |
| `suspension_rear_anti_roll_bar` | Rear Anti-roll Bar | Existing generic declaration | Conservative handling signal. | No bar stiffness claim. |
| `suspension_camber_plate` | Camber Plate | Generic build-profile declaration | Track alignment support. | Exact fitment not modeled. |
| `suspension_adjustable_ball_joint` | Adjustable Ball Joint | Generic build-profile declaration | Track alignment support. | Exact fitment not modeled. |
| `suspension_adjustable_control_arm` | Adjustable Control Arm | Generic build-profile declaration | Track alignment support. | Exact fitment not modeled. |
| `suspension_strut_brace` | Strut Brace | Generic build-profile declaration | Small chassis support. | No universal stiffness claim. |
| `drivetrain_aftermarket_lsd` | Mechanical LSD | Platform-gated build-profile declaration | Exact-template compatibility only. | No universal drivetrain fitment. |
| `drivetrain_performance_clutch` | Clutch | Generic build-profile declaration | Conservative reliability support. | No torque rating claim. |
| `drivetrain_lightweight_flywheel` | Lightweight Flywheel | Generic build-profile declaration | Small response/track-readiness signal. | No mass claim. |
| `safety_fixed_back_seat` | Fixed-back Seat | Generic safety build-profile declaration | Track-readiness signal. | Not a safety certification. |
| `safety_harness` | Harness | Existing safety declaration | Track-readiness signal. | Requires proper installation outside catalog scope. |
| `safety_roll_bar` | Roll Bar | Generic safety declaration | Track-readiness signal. | Not a safety certification. |
| `safety_full_roll_cage` | Full Roll Cage | Existing safety declaration | Race-readiness signal. | Not a safety certification. |
| `safety_fire_extinguisher` | Fire Extinguisher | Generic safety declaration | Track-readiness signal. | Not a safety certification. |

## Sprint 4J Catalog Expansion Supplement

Reviewed on 2026-07-13. New Sprint 4J rows are product-family declarations unless exact fitment is explicitly stated. No tyre row increases Power. Racing slick and wet tyres are marked race-only where the family is a competition tyre; road suitability is deliberately near-zero.

### RSA and Wheel Audit Omissions

| Requested item | Result | Source checked | Reason |
| --- | --- | --- | --- |
| RSA280 | Omitted | Public search plus https://rsa.com.tr/ | No direct provider evidence found for supported BMW B48 1.6 vehicles, output, torque, fuel, hardware, measurement basis, or package content. |
| RSA320 | Omitted | Public search plus https://rsa.com.tr/ | No direct provider evidence found; numeric suffix was not inferred as horsepower. |
| MSW 85 | Omitted | https://www.mswwheels.com/ | Current official MSW pages reviewed did not expose a stable MSW 85 product row. |
| MSW P1 | Omitted | https://www.mswwheels.com/ | Current official MSW pages reviewed did not expose a stable MSW P1 product row. |
| Sparco DR1 | Omitted | https://www.sparcowheels.com/wheels | Current official Sparco Wheels listing exposes FF4, FF1, FF2, FF3, Sterrato, Gravel, DAKAR, Terra, Super Sprint, JP-R, Assetto Gara, Podio, Trofeo 4, DRS, and ProCorsa; DR1 was not found. |

### Sprint 4J Tyres

| Code | Official product name | Publisher | URL | Values used | Uncertainty note / ATS rationale |
| --- | --- | --- | --- | --- | --- |
| `tyres_uhp_road` | UHP Road Tyre | ATS generic declaration | Internal build-profile row | `UHP_ROAD`, road legal, conservative dry/wet/road values. | Generic declaration so members can describe a build without naming a tyre. |
| `tyres_semi_slick` | Semi-slick | ATS generic declaration | Internal build-profile row | `SEMI_SLICK`, dry/heat biased, legal unknown. | Generic declaration; road legality varies by exact tyre. |
| `tyres_slick` | Slick | ATS generic declaration | Internal build-profile row | `SLICK`, high dry, low wet/road, road legal false. | Populates slick type while warning that slicks are race-only dry tyres. |
| `tyre_goodyear_efficientgrip_performance_2` | EfficientGrip Performance 2 | Goodyear | https://www.goodyear.eu/en_gb/consumer/tires/efficientgrip-performance-2.EGPERF2.html | `TOURING`, high wet/road/wear/comfort, low track. | Touring tyre; no track-readiness inflation. |
| `tyre_bridgestone_turanza_6` | Turanza 6 | Bridgestone | https://www.bridgestone.eu/car-tyres/summer-tyres/turanza-6/ | `TOURING`, high wet/road/wear/comfort, low track. | Touring tyre; no track-readiness inflation. |
| `tyre_pirelli_cinturato_p7_c2` | Cinturato P7 C2 | Pirelli | https://www.pirelli.com/tyres/en-gb/car/catalogue/product/cinturato-p7-c2 | `TOURING`, high road/wet, low track. | Regional naming can vary between P7 and P7 C2. |
| `tyre_yokohama_bluearth_gt_ae51` | BluEarth-GT AE51 | Yokohama | https://www.y-yokohama.com/global/product/tire/bluearth_gt_ae51/ | `TOURING`, high road/wet, low track. | Official global product family; exact sizes vary by market. |
| `tyre_hankook_ventus_prime_4` | Ventus Prime 4 | Hankook | https://www.hankooktire.com/global/en/tire/ventus/prime4-k135.html | `TOURING`, high road/wet/wear/comfort. | Touring tyre; conservative handling/braking impacts. |
| `tyre_goodyear_eagle_f1_asymmetric_6` | Eagle F1 Asymmetric 6 | Goodyear | https://www.goodyear.eu/en_gb/consumer/tires/eagle-f1-asymmetric-6.EF1AS6.html | `UHP_ROAD`, balanced dry/wet, road legal. | Road UHP impact below trackday tyres. |
| `tyre_goodyear_eagle_f1_supersport` | Eagle F1 SuperSport | Goodyear | https://www.goodyear.eu/en_gb/consumer/tires/eagle-f1-supersport.EF1SUPERSPORT.html | `MAX_PERFORMANCE_ROAD`, stronger dry/heat, road legal. | Kept below trackday/semi-slick values. |
| `tyre_bridgestone_potenza_sport` | Potenza Sport | Bridgestone | https://www.bridgestone.eu/car-tyres/summer-tyres/potenza-sport/ | `MAX_PERFORMANCE_ROAD`, dry/road performance. | No semi-slick or track-only assumption. |
| `tyre_yokohama_advan_sport_v107` | ADVAN Sport V107 | Yokohama | https://www.y-yokohama.com/global/product/tire/advan_sport_v107/ | `MAX_PERFORMANCE_ROAD`, dry/road performance. | Road performance tyre, not a trackday tyre. |
| `tyre_hankook_ventus_s1_evo3` | Ventus S1 evo3 | Hankook | https://www.hankooktire.com/global/en/tire/ventus/s1-evo3-k127.html | `UHP_ROAD`, balanced dry/wet/road. | Conservative UHP values. |
| `tyre_hankook_ventus_s1_evo_z` | Ventus S1 evo Z | Hankook | https://www.hankooktire.com/global/en/tire/ventus/s1-evo-z-k129.html | `MAX_PERFORMANCE_ROAD`, stronger dry/heat. | Kept below trackday/semi-slick values. |
| `tyre_michelin_pilot_sport_cup_2_r` | Pilot Sport Cup 2 R | Michelin | https://www.michelin.co.uk/auto/tyres/michelin-pilot-sport-cup-2-r | `TRACKDAY`, high dry/heat, lower wet/road. | Road legal where available, but track-biased. |
| `tyre_pirelli_p_zero_trofeo_rs` | P Zero Trofeo RS | Pirelli | https://www.pirelli.com/tyres/en-gb/car/catalogue/product/p-zero-trofeo-rs | `SEMI_SLICK`, high dry/heat, low wet/road. | No Power impact; road use remains limited. |
| `tyre_yokohama_advan_a052` | ADVAN A052 | Yokohama | https://www.yokohamatire.com/tires/advan-a052 | `EXTREME_PERFORMANCE`, strong dry, moderate wet/road. | Populates extreme-performance class without slick-level values. |
| `tyre_yokohama_advan_a050` | ADVAN A050 | Yokohama | https://www.y-yokohama.com/global/product/tire/advan_a050/ | `SEMI_SLICK`, race-biased dry/heat, road legal false. | Treated as competition-oriented with low road suitability. |
| `tyre_toyo_proxes_r888r` | Proxes R888R | Toyo Tires | https://www.toyotires.com/product/proxes-r888r/ | `SEMI_SLICK`, high dry/heat, low wet/road. | Track-biased road-legal family where available. |
| `tyre_toyo_proxes_r1r` | Proxes R1R | Toyo Tires | https://www.toyotires.com/product/proxes-r1r/ | `EXTREME_PERFORMANCE`, strong dry, usable wet/road. | Lower than semi-slick in dry/heat. |
| `tyre_federal_595_rs_rr` | 595 RS-RR | Federal | https://www.federaltire.com/en/products_detail.php?class=UHP&products_detail_sn=4 | `EXTREME_PERFORMANCE`, strong dry, moderate wet/road. | Source availability varies by locale. |
| `tyre_federal_fz_201` | FZ-201 | Federal | https://www.federaltire.com/ | `SEMI_SLICK`, dry/heat biased, road legality unknown. | Legal status varies by market/compound; no universal legal claim. |
| `tyre_bridgestone_potenza_re_71rs` | Potenza RE-71RS | Bridgestone | https://www.bridgestoneamericas.com/en/brands/potenza/re-71rs | `EXTREME_PERFORMANCE`, strong dry, moderate wet/road. | US product evidence; regional availability varies. |
| `tyre_bridgestone_potenza_race` | Potenza Race | Bridgestone | https://www.bridgestone.eu/car-tyres/summer-tyres/potenza-race/ | `TRACKDAY`, high dry/heat, lower wet/road. | Trackday values below slicks. |
| `tyre_goodyear_eagle_f1_supersport_r` | Eagle F1 SuperSport R | Goodyear | https://www.goodyear.eu/en_gb/consumer/tires/eagle-f1-supersport-r.EF1SUPERSPORTR.html | `TRACKDAY`, high dry/heat, road legal. | Trackday values below semi-slick/slick. |
| `tyre_goodyear_eagle_f1_supersport_rs` | Eagle F1 SuperSport RS | Goodyear | https://www.goodyear.eu/en_gb/consumer/tires/eagle-f1-supersport-rs.EF1SUPERSPORTRS.html | `SEMI_SLICK`, high dry/heat, low wet/road. | No Power impact; low road comfort/wear. |
| `tyre_michelin_motorsport_slick` | Pilot Sport GT Slick | Michelin Motorsport | https://motorsport.michelin.com/ | `SLICK`, highest dry/heat/consistency, very low wet/road, road legal false. | Race-only family, no road suitability assumption. |
| `tyre_pirelli_p_zero_slick` | P Zero Slick | Pirelli Motorsport | https://www.pirelli.com/tyres/en-ww/motorsport/ | `SLICK`, highest dry/heat/consistency, very low wet/road, road legal false. | Race-only family, not for public roads. |
| `tyre_yokohama_advan_a005` | ADVAN A005 | Yokohama Motorsport | https://www.y-yokohama.com/global/product/tire/advan_a005/ | `SLICK`, high dry/heat, very low wet/road, road legal false. | Race slick only. |
| `tyre_hankook_ventus_race_slick` | Ventus Race Slick | Hankook Motorsport | https://www.hankook-motorsports.com/ | `SLICK`, high dry/heat, very low wet/road, road legal false. | Family naming only; compound/size not modeled. |
| `tyre_hoosier_racing_slick` | Racing Slick | Hoosier | https://www.hoosiertire.com/ | `SLICK`, high dry/heat, very low wet/road, road legal false. | Race-only family. |
| `tyre_michelin_motorsport_rain` | Pilot Sport GT Rain | Michelin Motorsport | https://motorsport.michelin.com/ | `WET_RACING`, high wet, low dry/road, road legal false. | Race wet only; not a road rain tyre. |
| `tyre_pirelli_cinturato_rain` | Cinturato Rain | Pirelli Motorsport | https://www.pirelli.com/tyres/en-ww/motorsport/ | `WET_RACING`, high wet, low dry/road, road legal false. | Motorsport rain family, not public-road Cinturato road tyre. |
| `tyre_yokohama_advan_a006` | ADVAN A006 | Yokohama Motorsport | https://www.y-yokohama.com/global/product/tire/advan_a006/ | `WET_RACING`, high wet, low dry/road, road legal false. | Race wet only. |
| `tyre_hankook_ventus_race_rain` | Ventus Race Rain | Hankook Motorsport | https://www.hankook-motorsports.com/ | `WET_RACING`, high wet, low dry/road, road legal false. | Family naming only; compound/size not modeled. |
| `tyre_hoosier_wet` | WET | Hoosier | https://www.hoosiertire.com/ | `WET_RACING`, high wet, low dry/road, road legal false. | Race wet only. |

### Sprint 4J Wheels

| Code | Official product name | Publisher | URL | Values used | Uncertainty note / ATS rationale |
| --- | --- | --- | --- | --- | --- |
| `wheel_sparco_ff2` | FF2 | Sparco Wheels | https://www.sparcowheels.com/wheels/sparco/sparco-flow-formed-wheels/FF2 | Flow Formed listing, conservative road/track suitability. | No universal weight stored. |
| `wheel_sparco_ff3` | FF3 | Sparco Wheels | https://www.sparcowheels.com/wheels/sparco/FF3 | Flow Formed production process and performance positioning. | No universal weight stored. |
| `wheel_sparco_ff4` | FF4 | Sparco Wheels | https://www.sparcowheels.com/wheels | Official current Sparco Flow Formed listing. | No universal weight stored. |
| `wheel_sparco_jp_r` | JP-R | Sparco Wheels | https://www.sparcowheels.com/wheels/sparco/sparco-wheels/JP-R | Official monoblock listing, 17/18 inch family evidence. | Stored as cast/conservative because source does not require flow-formed metadata. |
| `wheel_sparco_super_sprint` | Super Sprint | Sparco Wheels | https://www.sparcowheels.com/wheels | Official current Sparco Wheels listing. | No universal weight stored. |
| `wheel_sparco_trofeo_4` | Trofeo 4 | Sparco Wheels | https://www.sparcowheels.com/wheels | Official current Sparco Wheels listing. | No universal weight stored. |
| `wheel_work_emotion_zr10` | Emotion ZR10 | WORK Wheels | https://www.work-wheels.co.jp/ | Official model-family name, lightweight-wheel declaration. | No size, PCD, offset, or weight stored. |
| `wheel_work_emotion_cr_kiwami` | Emotion CR Kiwami | WORK Wheels | https://www.work-wheels.co.jp/ | Official model-family name, lightweight-wheel declaration. | No size, PCD, offset, or weight stored. |
| `wheel_ssr_gtx01` | GTX01 | SSR Wheels | https://www.ssr-wheels.com/ | Official model-family name, lightweight-wheel declaration. | No size, PCD, offset, or weight stored. |
| `wheel_ssr_gtx03` | GTX03 | SSR Wheels | https://www.ssr-wheels.com/ | Official model-family name, lightweight-wheel declaration. | No size, PCD, offset, or weight stored. |
| `wheel_protrack_one` | ONE | ProTrack Wheels | https://www.protrackwheels.com/ | Official model-family name, lightweight-wheel declaration. | No size, PCD, offset, or weight stored. |
| `wheel_protrack_one_ff` | ONE FF | ProTrack Wheels | https://www.protrackwheels.com/ | Official model-family name, lightweight-wheel declaration. | No size, PCD, offset, or weight stored. |

### Sprint 4J Chassis, Brakes, Cooling, Intake, Aero, and Safety

| Code | Official product name | Publisher | URL | Values used | Uncertainty note / ATS rationale |
| --- | --- | --- | --- | --- | --- |
| `damper_bilstein_b6` | B6 | Bilstein | https://www.bilstein.com/ | Damper family, small handling/track signal. | No damper curve or fitment stored. |
| `damper_bilstein_b8` | B8 | Bilstein | https://www.bilstein.com/ | Short-stroke damper family, small handling/track signal. | No damper curve or fitment stored. |
| `suspension_coilover_bilstein_b14` | B14 | Bilstein | https://www.bilstein.com/ | Coilover family, street-track signal. | No ride height or spring rate stored. |
| `suspension_coilover_bilstein_b16` | B16 | Bilstein | https://www.bilstein.com/ | Adjustable coilover family, street-track signal. | No damper curve or fitment stored. |
| `damper_koni_sport` | Sport | Koni | https://www.koni.com/ | Sport damper family, small handling/track signal. | No platform-specific damping values. |
| `suspension_coilover_kw_v2` | V2 | KW Suspensions | https://www.kwsuspensions.net/ | Coilover family, medium street-track signal. | No fitment or setup stored. |
| `suspension_coilover_st_xta` | XTA | ST Suspensions | https://www.st-suspensions.com/ | Coilover family with track alignment intent. | No exact fitment or spring rate stored. |
| `suspension_anti_roll_bar_hr` | Anti-roll Bar | H&R Springs | https://www.hrsprings.com/ | Anti-roll bar family, conservative handling signal. | No bar stiffness stored. |
| `suspension_anti_roll_bar_eibach` | Anti-roll Bar | Eibach | https://eibach.com/ | Anti-roll bar family, conservative handling signal. | No bar stiffness stored. |
| `suspension_anti_roll_bar_whiteline` | Anti-roll Bar | Whiteline | https://whitelineperformance.com/ | Anti-roll bar family, conservative handling signal. | No bar stiffness stored. |
| `brake_fluid_castrol_react_srf_racing` | React SRF Racing | Castrol | https://www.castrol.com/ | High-temperature brake-fluid family, brake thermal readiness. | No fluid age or service interval tracked. |
| `brake_fluid_motul_rbf_600` | RBF 600 | Motul | https://www.motul.com/ | Racing brake-fluid family, brake thermal readiness. | No service interval tracked. |
| `brake_fluid_motul_rbf_660` | RBF 660 | Motul | https://www.motul.com/ | Racing brake-fluid family, brake thermal readiness. | No service interval tracked. |
| `brake_fluid_motul_rbf_700` | RBF 700 | Motul | https://www.motul.com/ | Racing brake-fluid family, brake thermal readiness. | No service interval tracked. |
| `brake_fluid_endless_rf_650` | RF-650 | Endless | https://www.endless-sport.global/ | Racing brake-fluid family, brake thermal readiness. | No service interval tracked. |
| `brake_lines_goodridge_braided` | Braided Brake Lines | Goodridge | https://www.goodridge.com/ | Braided line family, pedal consistency signal. | Exact hose fitment not stored. |
| `brake_lines_hel_performance_braided` | Braided Brake Lines | HEL Performance | https://helperformance.com/ | Braided line family, pedal consistency signal. | Exact hose fitment not stored. |
| `brake_disc_girodisc_two_piece` | Two-piece Brake Disc | GiroDisc | https://www.girodisc.com/ | Two-piece disc family, small thermal/readiness signal. | No rotor diameter/hat fitment stored. |
| `brake_disc_dba_4000_series` | 4000 Series | DBA | https://dba.com.au/ | Performance disc family, small braking/readiness signal. | No rotor diameter stored. |
| `brake_disc_dba_5000_series` | 5000 Series | DBA | https://dba.com.au/ | Two-piece/performance disc family, small thermal/readiness signal. | No rotor diameter stored. |
| `brake_disc_ap_racing_two_piece` | Two-piece Disc | AP Racing | https://apracing.com/ | Motorsport disc family, small thermal/readiness signal. | No vehicle fitment or rotor diameter stored. |
| `brake_disc_alcon_advantage_extreme` | Advantage Extreme | Alcon | https://alcon.co.uk/ | Performance disc family, small thermal/readiness signal. | No vehicle fitment stored. |
| `radiator_csf_performance` | Performance Radiator | CSF | https://csfrace.com/ | ICE radiator family, reliability/thermal readiness. | ICE-only; no EV cooling applicability. |
| `radiator_mishimoto_performance` | Performance Radiator | Mishimoto | https://www.mishimoto.com/ | ICE radiator family, reliability/thermal readiness. | ICE-only; no EV cooling applicability. |
| `radiator_pwr_performance` | Performance Radiator | PWR | https://pwr.com.au/ | ICE radiator family, reliability/thermal readiness. | ICE-only; no EV cooling applicability. |
| `oil_cooler_setrab_proline` | ProLine Oil Cooler | Setrab | https://www.setrab.com/ | ICE oil cooler family, thermal readiness. | ICE-only; exact plumbing not modeled. |
| `oil_cooler_mocal` | Oil Cooler | Mocal | https://www.mocal.co.uk/ | ICE oil cooler family, thermal readiness. | ICE-only; exact plumbing not modeled. |
| `air_filter_kn_replacement` | Replacement Air Filter | K&N | https://www.knfilters.com/ | ICE air filter family, no Power impact. | ICE-only; exact panel fitment not modeled. |
| `air_filter_pipercross_panel` | Panel Filter | Pipercross | https://www.pipercross.com/ | ICE air filter family, no Power impact. | ICE-only; exact panel fitment not modeled. |
| `air_filter_ramair_performance` | Performance Air Filter | Ramair | https://www.ramair-filters.co.uk/ | ICE air filter family, no Power impact. | ICE-only; exact panel fitment not modeled. |
| `intake_aem_cold_air` | Cold Air Intake System | AEM | https://www.aemintakes.com/ | ICE intake family, small Power signal. | Exact platform fitment not modeled. |
| `intake_gruppem_ram_air_system` | Ram Air System | GruppeM | https://www.gruppem.co.jp/ | ICE intake family, small Power signal. | Exact platform fitment not modeled. |
| `exhaust_akrapovic_slip_on` | Slip-On Line | Akrapovic | https://www.akrapovic.com/ | Exhaust family, small Power signal. | Exact platform and emissions legality not modeled. |
| `exhaust_remus_sport` | Sport Exhaust | REMUS | https://remus.eu/ | Exhaust family, small Power signal. | Exact platform and emissions legality not modeled. |
| `exhaust_armytrix_valvetronic` | Valvetronic Exhaust System | Armytrix | https://www.armytrix.com/ | Exhaust family, small Power signal. | Exact platform and emissions legality not modeled. |
| `exhaust_scorpion_cat_back` | Cat-back Exhaust | Scorpion | https://www.scorpion-exhausts.com/ | Exhaust family, small Power signal. | Exact platform and emissions legality not modeled. |
| `exhaust_borla_cat_back` | Cat-back Exhaust | Borla | https://www.borla.com/ | Exhaust family, small Power signal. | Exact platform and emissions legality not modeled. |
| `exhaust_magnaflow_xmod` | xMOD Series Exhaust | MagnaFlow | https://www.magnaflow.com/ | Exhaust family, small Power signal. | Exact platform and emissions legality not modeled. |
| `aero_maxton_front_splitter` | Front Splitter | Maxton Design | https://maxtondesign.com/ | Conservative aero handling/readiness signal. | No downforce number stored. |
| `aero_verus_front_splitter` | Front Splitter | Verus Engineering | https://www.verus-engineering.com/ | Conservative aero handling/readiness signal. | No downforce number stored. |
| `aero_verus_rear_diffuser` | Rear Diffuser | Verus Engineering | https://www.verus-engineering.com/ | Conservative aero handling/readiness signal. | No downforce number stored. |
| `aero_apr_performance_gt_wing` | GT Wing | APR Performance | https://aprperformance.com/ | Conservative aero handling/readiness signal. | No downforce number stored; road suitability not inferred. |
| `aero_varis_body_kit` | Body Kit | Varis | https://varis.co.jp/ | Conservative aero/style family signal. | No downforce number stored. |
| `aero_mugen_under_spoiler` | Under Spoiler | Mugen | https://www.mugen-power.com/ | Conservative aero handling/readiness signal. | No downforce number stored. |
| `aero_spoon_sports_wing` | Rear Wing | Spoon Sports | https://www.spoonsports.jp/ | Conservative aero handling/readiness signal. | No downforce number stored. |
| `safety_recaro_pole_position` | Pole Position | Recaro Automotive | https://www.recaro-automotive.com/ | Fixed-back seat family, track-readiness signal. | Not a certification or installation guarantee. |
| `safety_sparco_grid_q` | Grid Q | Sparco | https://www.sparco-official.com/ | Fixed-back seat family, track-readiness signal. | Not a certification or installation guarantee. |
| `safety_omp_hte_r` | HTE-R | OMP | https://www.ompracing.com/ | Fixed-back seat family, track-readiness signal. | Not a certification or installation guarantee. |
| `safety_sabelt_steel_series_harness` | Steel Series Harness | Sabelt | https://www.sabelt.com/ | Harness family, track-readiness signal. | Requires correct installation; no certification claim stored. |
| `safety_schroth_racing_harness` | Racing Harness | Schroth | https://www.schroth.com/ | Harness family, track-readiness signal. | Requires correct installation; no certification claim stored. |
| `safety_takata_racing_harness` | Racing Harness | Takata Racing | https://www.takataracing.com/ | Harness family, track-readiness signal. | Requires correct installation; no certification claim stored. |
| `safety_safety_devices_roll_bar` | Roll Bar | Safety Devices | https://www.safetydevices.com/ | Roll-bar family, track-readiness signal. | Not a certification or fitment guarantee. |
| `safety_cusco_safety21_roll_cage` | SAFETY21 Roll Cage | Cusco | https://www.cusco.co.jp/ | Roll-cage family, race-readiness signal. | Not a certification or fitment guarantee. |
