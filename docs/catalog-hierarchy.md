# Vehicle catalog hierarchy

The Garage and read-only mobile catalog derive their hierarchy from existing
`VehicleDefinition` metadata. The adapter does not write catalog data, rename stable
codes, or introduce model-family database rows.

Hierarchy semantics:

1. `brand`: the existing manufacturer brand.
2. `modelFamily`: the commercial model line derived from `model`.
3. `generation`: the existing generation/chassis label. Fiat Egea uses body style at
   this level because the catalog and product flow distinguish Sedan, Hatchback,
   Cross, and Station Wagon before engine choice.
4. `variant`: the final active `VehicleDefinition` leaf. Labels retain any model trim
   that was grouped into a broader family.

The fallback rule preserves the existing `model` exactly. Grouping is applied only by
documented brand rules in `src/lib/vehicle-catalog-hierarchy.ts`:

- BMW numeric models and M Performance derivatives group under numbered series;
  full M cars remain M2/M3/M4/M5/M6/M8 families.
- Volkswagen GTI, Clubsport, R, and R32 derivatives group under Golf or Polo.
- Audi A/Q families group by their commercial line; S, RS, and SQ lines remain
  explicit performance families such as RS6.
- Mercedes-Benz saloons group under A/B/C/E/G/S series while CLA, GLC, EQE, AMG GT,
  and similar named lines remain separate families.
- Fiat Egea body styles group under Egea, with body style used as the generation step.
- Common performance/body suffixes for Honda, Hyundai, Porsche, Alfa Romeo, Renault,
  Peugeot, Ford, and Nissan group under their established commercial line.

Natural sorting uses Turkish locale collation with numeric comparison, keeping chassis
sequences such as E30, E36, E46, E90, F30, and G20 in a predictable order.
