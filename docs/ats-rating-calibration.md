# ATS Rating Calibration Methodology

ATS Performance Rating is a relative club build signal, not an official homologation figure, dyno result, lap-time predictor, or safety certification.

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

## Component Definitions

Power considers power-to-weight, torque-to-weight, acceleration, drivetrain delivery, and sustained output confidence. Horsepower alone is not sufficient.

Handling considers mass, drivetrain layout, chassis intent, factory tyre/suspension intent, and track-use credibility.

Braking considers hardware capacity, vehicle mass, pad/fluid intent, repeatability, and fade resistance. It does not assume a single stop equals track braking suitability.

Reliability considers stock mechanical margin, sustained high-load confidence, and thermal support. Internet folklore is excluded.

Thermal management considers engine, motor, battery, transmission, and brake heat control where applicable.

Track readiness considers brakes, tyres, cooling, differential or torque management, seating/safety intent, and ability to sustain laps. A fast road car is not automatically track-ready.

## Manual Review

The helper output is the baseline. Manual adjustment should be rare, small, and documented in `docs/ats-rating-sources.md`. When evidence is incomplete, rating status remains `PROVISIONAL`; `CALIBRATED` is reserved for templates with stronger source quality and consistent methodology confidence.

## Build Impacts

Catalog impacts are conservative. Brake pads primarily affect braking consistency, fade resistance, and track readiness. They do not increase tyre grip, rotor size, or caliper capacity. Large power increases remain constrained by existing balance penalties when braking, cooling, or safety preparation is missing.
