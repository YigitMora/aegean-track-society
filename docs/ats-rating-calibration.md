# ATS Rating Calibration Methodology

ATS Performance Rating is a relative club build signal, not an official homologation figure, dyno result, lap-time predictor, or safety certification.

## Rating Scale Guidance

The 0-100 scale is intentionally relative and should leave meaningful room at the top:

- 0-39: very low performance or unsuitable for track use
- 40-59: ordinary road car
- 60-69: sporty road car
- 70-79: serious performance car
- 80-89: high-performance or strong track-capable road car
- 90-94: elite factory track car
- 95-97: reference-level road-legal track car
- 98-100: theoretical ceiling or race-car-adjacent exceptional reference

These bands are calibration guidance, not hardcoded buckets. A vehicle reaches the upper bands only when multiple components support the result; Power alone is not an elite trigger.

## Evidence Inputs

Seeded vehicle templates use a deterministic helper in `prisma/vehicle-rating-calibration.ts`. Inputs are normalized from maintainable evidence:

- `powerKw`, `torqueNm`, and `curbWeightKg`
- drivetrain
- published or measured 0-100 km/h where available
- sustained power confidence, 0-100
- chassis track intent, 0-100
- brake capacity and repeatability, 0-100
- reliability confidence, 0-100
- thermal capability, 0-100
- factory track readiness, 0-100

The normalized evidence fields are intentionally conservative. They describe suitability for repeated spirited or track use, not peak marketing output.

## Upper-Scale Recalibration

Sprint 4O found that the previous helper compressed factory track specials because Handling was overly tied to low mass, Braking could not fully express high-capacity repeatable hardware, Thermal was conservative even with strong cooling evidence, and Track Readiness had too little ceiling for factory GT/RS-style packages.

The formula weights remain unchanged:

- Power: 0.18
- Handling: 0.24
- Braking: 0.18
- Reliability: 0.12
- Thermal: 0.12
- Track Readiness: 0.16

The component normalizers now give more headroom to documented chassis intent, factory track readiness, braking repeatability, and thermal capability. This raises cars such as GT3 RS, GTD, GT4 RS, AMG GT Black Series, and similar road-legal track references without inflating ordinary road cars, SUVs, or heavy EVs.

## Component Definitions

Power considers power-to-weight, torque-to-weight, acceleration, drivetrain delivery, and sustained output confidence. Horsepower alone is not sufficient.

Handling considers mass, drivetrain layout, chassis intent, factory tyre/suspension intent, and track-use credibility.

Braking considers hardware capacity, vehicle mass, pad/fluid intent, repeatability, and fade resistance. It does not assume a single stop equals track braking suitability.

Reliability considers stock mechanical margin, sustained high-load confidence, and thermal support. Internet folklore is excluded.

Thermal management considers engine, motor, battery, transmission, and brake heat control where applicable.

Track readiness considers brakes, tyres, cooling, differential or torque management, seating/safety intent, and ability to sustain laps. A fast road car is not automatically track-ready.

## Elite Reference Adjustment

Elite adjustment is deterministic, capped, and evidence-based. It is applied only to `CALIBRATED` vehicles whose scored components already show elite track support:

- Handling at least 90
- Braking at least 90
- Thermal at least 88
- Track Readiness at least 92
- Reliability at least 74

The adjustment averages how far Handling, Braking, Thermal, and Track Readiness exceed their thresholds, then converts that excess into a small capped Overall uplift. It does not check brand or model names, does not use Power, and is currently capped at 5 Overall points.

## Weight Penalty Treatment

Weight remains important. Heavy EVs, SUVs, crossovers, and straight-line-focused cars still carry meaningful mass consequences. Sprint 4O only reduces double-counting when a heavy vehicle already demonstrates elite Handling, Braking, Thermal, and Track Readiness evidence before the weight penalty is applied. In that case, the penalty is partially softened rather than removed.

Reliability remains a factory robustness and sustained-use confidence score. It does not represent servicing cost, tyre wear, comfort, or ownership anxiety, and it is not inflated to 100 for specialist cars.

## Manual Review

The helper output is the baseline. Manual adjustment should be rare, small, and documented in `docs/ats-rating-sources.md`. When evidence is incomplete, rating status remains `PROVISIONAL`; `CALIBRATED` is reserved for templates with stronger source quality and consistent methodology confidence.

## Build Impacts

Catalog impacts are conservative. Brake pads primarily affect braking consistency, fade resistance, and track readiness. They do not increase tyre grip, rotor size, or caliper capacity. Large power increases remain constrained by existing balance penalties when braking, cooling, or safety preparation is missing.

## Audit Expectations

The audit checks that elite references are no longer compressed, that 90+ Overall requires more than Power, and that ordinary cars remain stable. It also records old-versus-new component movement for adjusted vehicles and reports any threshold-breaching review signals in `docs/ats-vehicle-rating-audit.md`.
