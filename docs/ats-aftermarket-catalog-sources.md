# ATS Aftermarket Catalog Sources

Accessed date for this sprint: 2026-07-12.

Seeded product metadata is normalized for ATS filtering and preview only. Suitability scores are descriptive ATS values, not manufacturer test scores. Sport springs and big brake kits are not universal; active selection requires exact `VehicleDefinition` compatibility rows.

## Sport Springs

| Code | Official product name | Publisher | URL | Values used | Uncertainty note |
| --- | --- | --- | --- | --- | --- |
| `sport_springs_eibach_pro_kit` | Pro-Kit | Eibach | https://eibach.com/products/pro-kit | Product family name, road-focused lowering spring positioning. | Vehicle-specific lowering is not generalized. |
| `sport_springs_eibach_sportline` | Sportline | Eibach | https://eibach.com/products/sportline | Product family name, more aggressive lowering spring positioning. | Exact lowering remains null without size/platform fitment. |
| `sport_springs_hr_sport_springs` | Sport Springs | H&R Springs | https://www.hrsprings.com/products/springs/ | Product family name and spring category. | Vehicle-specific lowering is not generalized. |
| `sport_springs_hr_super_sport_springs` | Super Sport Springs | H&R Springs | https://www.hrsprings.com/products/springs/ | Official naming and more aggressive spring family. | Fitment remains exact-template gated. |
| `sport_springs_st_suspensions` | Sport Springs / Lowering Springs | ST Suspensions | https://www.st-suspensions.com/ | Product-family naming and road-sport use. | Public naming varies by region; seeded as provisional family metadata. |
| `sport_springs_vogtland` | Sport Springs | Vogtland | https://www.vogtland.com/ | Product-family naming and lowering spring category. | Public fitment details are not embedded. |

XT springs were omitted because an official manufacturer identity and stable product naming were not verified for this sprint.

## Big Brake Kits

| Code | Official product name | Publisher | URL | Values used | Uncertainty note |
| --- | --- | --- | --- | --- | --- |
| `bbk_ebc_apollo_4_pot` | Apollo 4 Pot | EBC Brakes | https://www.ebcbrakes.com/ | Apollo naming, fixed multi-piston BBK family. | Exact fitment rows only; rotor dimensions left null. |
| `bbk_ebc_apollo_6_pot` | Apollo 6 Pot | EBC Brakes | https://www.ebcbrakes.com/ | Apollo naming, fixed multi-piston BBK family. | Six-piston label is descriptive only. |
| `bbk_alcon_4_pot` | 4 Pot Big Brake Kit | Alcon | https://alcon.co.uk/ | Alcon brake-kit/caliper family naming. | Exact fitment rows only. |
| `bbk_alcon_6_pot` | 6 Pot Big Brake Kit | Alcon | https://alcon.co.uk/ | Alcon brake-kit/caliper family naming. | Exact fitment rows only. |
| `bbk_ap_racing_4_pot` | 4 Pot Big Brake Kit | AP Racing | https://apracing.com/race-car/brake-calipers | AP Racing caliper/conversion family naming. | Exact fitment rows only. |
| `bbk_ap_racing_6_pot` | 6 Pot Big Brake Kit | AP Racing | https://apracing.com/race-car/brake-calipers | AP Racing caliper/conversion family naming. | Exact fitment rows only. |
| `bbk_brembo_gt_4_piston` | GT 4 Piston | Brembo | https://www.brembo.com/ | Brembo GT kit naming and fixed-caliper positioning. | Exact fitment rows only. |
| `bbk_brembo_gt_6_piston` | GT 6 Piston | Brembo | https://www.brembo.com/ | Brembo GT kit naming and fixed-caliper positioning. | Piston count is not treated as a universal rating multiplier. |
| `bbk_wilwood_4_piston` | 4 Piston Big Brake Kit | Wilwood | https://www.wilwood.com/ | Wilwood kit and caliper family naming. | Exact fitment rows only. |
| `bbk_wilwood_6_piston` | 6 Piston Big Brake Kit | Wilwood | https://www.wilwood.com/ | Wilwood kit and caliper family naming. | Exact fitment rows only. |

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
| `wheel_rays_volk_te37` | Volk Racing TE37 | RAYS | https://www.rayswheels.co.jp/ | Official model family name and forged construction. | Forged construction alone does not create large rating gain. |
| `wheel_rays_volk_ce28` | Volk Racing CE28 | RAYS | https://www.rayswheels.co.jp/ | Official model family name and forged construction. | Weight remains null without exact size. |
| `wheel_rays_gram_lights_57cr` | Gram Lights 57CR | RAYS | https://www.rayswheels.co.jp/ | Official model family name. | Conservative impact without exact size/weight. |
| `wheel_rays_gram_lights_57dr` | Gram Lights 57DR | RAYS | https://www.rayswheels.co.jp/ | Official model family name. | Conservative impact without exact size/weight. |
| `wheel_rays_gram_lights_57fxz` | Gram Lights 57FXZ | RAYS | https://www.rayswheels.co.jp/ | Official model family name. | Conservative impact without exact size/weight. |
| `wheel_rotiform_rse` | RSE | Rotiform | https://www.rotiform.com/ | Official model name. | Styling wheel impact remains conservative. |
| `wheel_rotiform_las_r` | LAS-R | Rotiform | https://www.rotiform.com/ | Official model name. | Styling wheel impact remains conservative. |
| `wheel_rotiform_kps` | KPS | Rotiform | https://www.rotiform.com/ | Official model name. | Styling wheel impact remains conservative. |
| `wheel_rotiform_dtm` | DTM | Rotiform | https://www.rotiform.com/ | Official model name. | Styling wheel impact remains conservative. |
| `wheel_msw_30` | MSW 30 | MSW Wheels | https://www.mswwheels.com/ | Official MSW model naming. | Weight remains null without exact size. |
| `wheel_msw_42` | MSW 42 | MSW Wheels | https://www.mswwheels.com/ | Official MSW model naming. | Weight remains null without exact size. |

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
