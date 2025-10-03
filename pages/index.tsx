import { useEffect, useState } from "react";
import Head from "next/head";

type Cfg = {
  displayName: string;
  currency: string;
  tiers: { min: number; max: number; pricePerSample: number }[];
  addons: { dnaIsolationPerSample: number; quickStartOneOff: number };
  ackTexts: { ruo: string; tat: string };
};

export default function Home() {
  const [cfg, setCfg] = useState<Cfg | null>(null);
  const [samples, setSamples] = useState(5);
  const [dnaIsolation, setDNA] = useState(true);
  const [quickStart, setQS] = useState(false);

  // Contact/org
  const [name, setName] = useState("");
  const [institution, setInst] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState("");
  const [country, setCountry] = useState("DE");

  // Billing
  const [billingName, setBillingName] = useState("");
  const [billingEmail, setBillingEmail] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [vatId, setVatId] = useState("");
  const [poRef, setPoRef] = useState("");

  // Order meta
  const [useCase, setUseCase] = useState("");
  const [notes, setNotes] = useState("");

  // Sample type + details
  const [sampleType, setSampleType] = useState<"dna" | "pellet" | "other">("dna");
  const [dnaConc, setDnaConc] = useState("");
  const [dnaVol, setDnaVol] = useState("");
  const [dnaBuffer, setDnaBuffer] = useState("tris-edta-10-0.1");
  const [dnaPurity, setDnaPurity] = useState("");
  const [cellsPerSample, setCellsPerSample] = useState("");

  // QC + deliverables
  const [qcFallback, setQcFallback] = useState<"proceed" | "replace" | "contact">("proceed");
  const [dCel, setDCel] = useState(true);
  const [dArr, setDArr] = useState(true);
  const [dQc, setDQc] = useState(true);
  const [dCychp, setDCychp] = useState(true);
  const [dSeg, setDSeg] = useState(true);

  // Legal/commercial
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const [commercial, setCommercial] = useState<"have-quote" | "need-quote">("need-quote");
  const [comments, setComments] = useState("");

  // UI
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Load pricing config
  useEffect(() => {
    fetch("/service-config.karyo.json").then(r => r.json()).then(setCfg);
  }, []);

  // Prefill country from locale
  useEffect(() => {
    try {
      const loc = Intl.DateTimeFormat().resolvedOptions().locale; // e.g., de-DE
      const cc = loc.split("-")[1];
      if (cc) setCountry(cc.toUpperCase());
    } catch {}
  }, []);

  // Calculate breakdown for sticky box
  function breakdown() {
    if (!cfg) return null;
    const tier = cfg.tiers.find(t => samples >= t.min && samples <= t.max);
    if (!tier) return null;
    const base = samples * tier.pricePerSample;
    const iso = dnaIsolation ? samples * cfg.addons.dnaIsolationPerSample : 0;
    const qs = quickStart ? cfg.addons.quickStartOneOff : 0;
    const totalLocal = base + iso + qs;
    return {
      pricePerSample: tier.pricePerSample,
      base,
      iso,
      qs,
      totalLocal,
      currency: cfg.currency,
    };
  }

  async function requestQuote() {
    setSuccess(false);

    if (!name || !institution || !email || samples < 1) {
      alert("Please fill name, institution, email, and choose ≥1 sample.");
      return;
    }
    if (!billingName || !billingEmail || !billingAddress) {
      alert("Please fill billing contact, billing email, and billing address.");
      return;
    }
    const deliverables: ("CEL" | "ARR" | "QC" | "CYCHP" | "SEGMENT")[] = [];
    if (dCel) deliverables.push("CEL");
    if (dArr) deliverables.push("ARR");
    if (dQc) deliverables.push("QC");
    if (dCychp) deliverables.push("CYCHP");
    if (dSeg) deliverables.push("SEGMENT");
    if (deliverables.length === 0) {
      alert("Select at least one deliverable.");
      return;
    }
    if (!acceptedLegal) {
      alert("Please accept ToS and Privacy to proceed.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name,
        institution,
        email,
        country,
        vatId: vatId || null,
        samples,
        dnaIsolation,
        quickStart,
        phone,
        department,
        billingName,
        billingEmail,
        billingAddress,
        poRef: poRef || null,
        useCase,
        notes,
        sampleType,
        dna:
          sampleType === "dna"
            ? {
                concentrationNgPerUl: dnaConc || null,
                volumeUl: dnaVol || null,
                buffer: dnaBuffer || null,
                purityRatios: dnaPurity || null,
              }
            : null,
        pellet:
          sampleType === "pellet"
            ? {
                cellsPerSampleMillion: cellsPerSample || null,
              }
            : null,
        qcFallback,
        deliverables,
        acceptedLegal,
        commercialBasis: commercial,
        comments,
      };

      const res = await fetch("/api/request-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const js = await res.json();
      if (js.ok) setSuccess(true);
      else alert(`Error: ${js.error}`);
    } catch (err: any) {
      alert(`Network error: ${err?.message || err}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Head>
        <title>Atlas Biolabs -- CytoScan 750K (RUO)</title>
        <meta
          name="description"
          content="Karyotyping via CytoScan 750K (RUO). Configure & request a quote in minutes."
        />
      </Head>

      <main className="container">
        {/* Hero */}
        <section className="hero">
          <h1>High-Resolution Genomic Karyotyping</h1>
          <p className="sub">
            Genome-wide CNV/LOH detection with standardized QC and full raw-data delivery.
          </p>
          <p>
            <b>From €419 / sample</b>
          </p>
          <div className="actions">
            <a href="#config" className="btn btn-primary">
              Configure & Request Quote
            </a>
            <a href="mailto:customer-support@atlas-biolabs.com" className="btn">
              Talk to an expert
            </a>
          </div>
        </section>

        {/* Configurator + Sticky Price */}
        <section id="config" className="card section-gap">
          <h2>Configuration -- {cfg?.displayName ?? "CytoScan 750K"}</h2>

          <div className="config-wrap">
            {/* LEFT: form */}
            <div>
              {/* Contact + org */}
              <div className="grid">
                <div className="field">
                  <label>Contact name *</label>
                  <input className="input" value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div className="field">
                  <label>Work email *</label>
                  <input className="input" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <div className="field">
                  <label>Phone (intl.)</label>
                  <input
                    className="input"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+49 30 3198966-0"
                  />
                </div>
                <div className="field">
                  <label>Institution / Company *</label>
                  <input className="input" value={institution} onChange={e => setInst(e.target.value)} />
                </div>
                <div className="field">
                  <label>Department / Group</label>
                  <input
                    className="input"
                    value={department}
                    onChange={e => setDepartment(e.target.value)}
                    placeholder="e.g., Stem Cell Biology"
                  />
                </div>
                <div className="field">
                  <label>Country *</label>
                  <input
                    className="input"
                    value={country}
                    onChange={e => setCountry(e.target.value)}
                    placeholder="Germany"
                  />
                </div>
              </div>

              {/* Billing */}
              <div className="grid">
                <div className="field">
                  <label>Billing contact *</label>
                  <input
                    className="input"
                    value={billingName}
                    onChange={e => setBillingName(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Billing email *</label>
                  <input
                    className="input"
                    value={billingEmail}
                    onChange={e => setBillingEmail(e.target.value)}
                  />
                </div>
                <div className="field" style={{ gridColumn: "1 / span 2" }}>
                  <label>Billing address *</label>
                  <input
                    className="input"
                    value={billingAddress}
                    onChange={e => setBillingAddress(e.target.value)}
                    placeholder="Street, city, ZIP, country"
                  />
                </div>
                <div className="field">
                  <label>VAT ID</label>
                  <input
                    className="input"
                    value={vatId}
                    onChange={e => setVatId(e.target.value)}
                    placeholder="DE123456789"
                  />
                </div>
                <div className="field">
                  <label>PO / Cost center</label>
                  <input className="input" value={poRef} onChange={e => setPoRef(e.target.value)} />
                </div>
              </div>

              {/* Service options */}
              <div className="grid">
                <div className="field">
                  <label>Number of samples *</label>
                  <input
                    className="input"
                    type="number"
                    min={1}
                    value={samples}
                    onChange={e => setSamples(parseInt(e.target.value || "1"))}
                  />
                </div>
                <div className="field check">
                  <input
                    type="checkbox"
                    checked={dnaIsolation}
                    onChange={e => setDNA(e.target.checked)}
                  />
                  <label>DNA isolation by Atlas</label>
                </div>
                <div className="field check">
                  <input type="checkbox" checked={quickStart} onChange={e => setQS(e.target.checked)} />
                  <label>Quick Start (expedite)</label>
                </div>
                <div className="field" style={{ gridColumn: "1 / span 2" }}>
                  <label>Use case / study name</label>
                  <input
                    className="input"
                    value={useCase}
                    onChange={e => setUseCase(e.target.value)}
                    placeholder="e.g., iPSC karyotyping QC"
                  />
                </div>
                <div className="field" style={{ gridColumn: "1 / span 2" }}>
                  <label>Notes to Atlas</label>
                  <input
                    className="input"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Special instructions"
                  />
                </div>
              </div>

              {/* Sample type */}
              <div className="grid">
                <div className="field">
                  <label>Sample type *</label>
                  <select
                    className="input"
                    value={sampleType}
                    onChange={e => setSampleType(e.target.value as any)}
                  >
                    <option value="dna">Genomic DNA</option>
                    <option value="pellet">Frozen cell pellet</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {sampleType === "dna" && (
                  <>
                    <div className="field">
                      <label>DNA concentration (ng/µL)</label>
                      <input className="input" value={dnaConc} onChange={e => setDnaConc(e.target.value)} />
                    </div>
                    <div className="field">
                      <label>DNA volume (µL)</label>
                      <input className="input" value={dnaVol} onChange={e => setDnaVol(e.target.value)} />
                    </div>
                    <div className="field">
                      <label>Buffer / solvent</label>
                      <select
                        className="input"
                        value={dnaBuffer}
                        onChange={e => setDnaBuffer(e.target.value)}
                      >
                        <option value="tris-edta-10-0.1">Tris-HCl 10 mM + 0.1 mM EDTA (pH 8.0)</option>
                        <option value="te-other">TE (other)</option>
                        <option value="water">Water</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div className="field" style={{ gridColumn: "1 / span 2" }}>
                      <label>DNA purity ratios</label>
                      <input
                        className="input"
                        value={dnaPurity}
                        onChange={e => setDnaPurity(e.target.value)}
                        placeholder="OD260/280 ~1.8--2.0 ; OD260/230 ~2.0--2.2"
                      />
                    </div>
                  </>
                )}

                {sampleType === "pellet" && (
                  <div className="field">
                    <label>Cells per sample (×10^6)</label>
                    <input
                      className="input"
                      value={cellsPerSample}
                      onChange={e => setCellsPerSample(e.target.value)}
                      placeholder="2--5"
                    />
                  </div>
                )}
              </div>

              {/* QC + Deliverables */}
              <div className="grid">
                <div className="field">
                  <label>QC handling if below spec *</label>
                  <select
                    className="input"
                    value={qcFallback}
                    onChange={e => setQcFallback(e.target.value as any)}
                  >
                    <option value="proceed">Proceed at risk</option>
                    <option value="replace">Replace sample (+ fee)</option>
                    <option value="contact">Contact me first</option>
                  </select>
                </div>
                <div className="field" style={{ gridColumn: "1 / span 2" }}>
                  <label>Deliverables *</label>
                  <div className="check">
                    <input type="checkbox" checked={dCel} onChange={e => setDCel(e.target.checked)} />{" "}
                    <label>Raw CEL</label>
                  </div>
                  <div className="check">
                    <input type="checkbox" checked={dArr} onChange={e => setDArr(e.target.checked)} />{" "}
                    <label>ARR</label>
                  </div>
                  <div className="check">
                    <input type="checkbox" checked={dQc} onChange={e => setDQc(e.target.checked)} />{" "}
                    <label>QC report</label>
                  </div>
                  <div className="check">
                    <input type="checkbox" checked={dCychp} onChange={e => setDCychp(e.target.checked)} />{" "}
                    <label>CYCHP</label>
                  </div>
                  <div className="check">
                    <input type="checkbox" checked={dSeg} onChange={e => setDSeg(e.target.checked)} />{" "}
                    <label>Segment report (hg38)</label>
                  </div>
                </div>
              </div>

              {/* Legal/commercial */}
              <div className="grid">
                <div className="field check" style={{ gridColumn: "1 / span 2" }}>
                  <input
                    type="checkbox"
                    checked={acceptedLegal}
                    onChange={e => setAcceptedLegal(e.target.checked)}
                  />
                  <label>I accept Atlas ToS and Privacy</label>
                </div>
                <div className="field">
                  <label>Commercial basis *</label>
                  <select
                    className="input"
                    value={commercial}
                    onChange={e => setCommercial(e.target.value as any)}
                  >
                    <option value="have-quote">I have a valid quote/pricelist</option>
                    <option value="need-quote">I need a formal quote</option>
                  </select>
                </div>
                <div className="field" style={{ gridColumn: "1 / span 2" }}>
                  <label>General comments</label>
                  <input className="input" value={comments} onChange={e => setComments(e.target.value)} />
                </div>
              </div>

              {/* Actions + success */}
              <div className="actions" style={{ marginTop: 10 }}>
                <button onClick={requestQuote} disabled={submitting} className="btn btn-primary">
                  {submitting ? "Sending..." : "Request Quote by Email"}
                </button>
                <a href="mailto:customer-support@atlas-biolabs.com" className="btn">
                  Need help?
                </a>
              </div>
              {success && (
                <p style={{ marginTop: 8, color: "var(--btn)" }}>
                  Quote request sent -- please check your inbox.
                </p>
              )}
            </div>

            {/* RIGHT: sticky price box */}
            <aside className="price-box">
              <h3>Estimate</h3>
              {(() => {
                const br = breakdown();
                if (!br) return <p>Enter valid sample count.</p>;
                return (
                  <>
                    <div className="price-row">
                      <small>Price / sample</small>
                      <div>
                        {br.pricePerSample.toFixed(2)} {br.currency}
                      </div>
                    </div>
                    <div className="price-row">
                      <small>Samples × price</small>
                      <div>
                        {br.base.toFixed(2)} {br.currency}
                      </div>
                    </div>
                    {br.iso > 0 && (
                      <div className="price-row">
                        <small>DNA isolation</small>
                        <div>
                          {br.iso.toFixed(2)} {br.currency}
                        </div>
                      </div>
                    )}
                    {br.qs > 0 && (
                      <div className="price-row">
                        <small>Quick Start</small>
                        <div>
                          {br.qs.toFixed(2)} {br.currency}
                        </div>
                      </div>
                    )}
                    <div className="price-row price-total">
                      <div>Total</div>
                      <div>
                        {br.totalLocal.toFixed(2)} {br.currency}
                      </div>
                    </div>
                    <div className="price-hint">
                      {cfg?.ackTexts.ruo}
                      <br />
                      {cfg?.ackTexts.tat}
                    </div>
                  </>
                );
              })()}
            </aside>
          </div>
        </section>

        <section className="footer">
          <p>Secure portal delivery, RUO only.</p>
        </section>
      </main>
    </>
  );
}
