type Tier = { min: number; max: number; pricePerSample: number };
type Service = {
  displayName: string;
  currency: string;
  tiers: Tier[];
  addons: { dnaIsolationPerSample: number; quickStartOneOff: number };
};
type RootCfg = {
  services: Record<string, Service>;
  fees: { replaceSampleFee: number };
};

export type CalcInput = {
  serviceKey: "cytoscan-750k-ruo" | "cytoscan-hd-ruo";
  samples: number;
  dnaIsolation: boolean;
  quickStart: boolean;
};

export function calcTotal(cfg: RootCfg, input: CalcInput) {
  const svc = cfg.services[input.serviceKey];
  if (!svc) throw new Error("Unknown service");
  const tier = svc.tiers.find(t => input.samples >= t.min && input.samples <= t.max);
  if (!tier) throw new Error("No price tier for sample count");

  const base = input.samples * tier.pricePerSample;
  const iso  = input.dnaIsolation ? input.samples * svc.addons.dnaIsolationPerSample : 0;
  const qs   = input.quickStart ? svc.addons.quickStartOneOff : 0;

  const total = base + iso + qs;
  return { serviceDisplay: svc.displayName, currency: svc.currency, base, iso, qs, total };
}
