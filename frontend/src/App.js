import React, { useState } from 'react';
import './App.css';

const DIRS = ['North', 'North-east', 'East', 'South-east', 'South', 'South-west', 'West', 'North-west'];
const PRESET = {
  calm: { t: 22, rh: 65, ws: 8, wd: 0, rain: 0, p: 1015, h: 10, hol: 0 },
  humid: { t: 26, rh: 90, ws: 6, wd: 3, rain: 2, p: 1010, h: 11, hol: 0 },
  windy: { t: 18, rh: 50, ws: 30, wd: 6, rain: 0, p: 1012, h: 11, hol: 0 },
  heat: { t: 38, rh: 25, ws: 5, wd: 7, rain: 0, p: 1008, h: 11, hol: 0 },
  haze: { t: 36, rh: 15, ws: 2, wd: 7, rain: 0, p: 1022, h: 11, hol: 0 }
};

const NAME = { safe: 'Safe', cau: 'Caution', uns: 'Unsafe' };
const VERD = { safe: 'Recess is a go.', cau: 'Asthmatic students stay in.', uns: 'Move recess indoors.' };
const ADV = { 
  safe: 'Air quality is good. Normal outdoor activities for all students.', 
  cau: 'Students with asthma stay indoors. Limit intense running for everyone during PE and recess.', 
  uns: 'Suspend outdoor activities and move PE and recess indoors until air quality improves.' 
};

// Math Logic
const estimate = (s) => {
  const rush = Math.exp(-Math.pow((s.h - 8) / 2.5, 2)) + 0.6 * Math.exp(-Math.pow((s.h - 19) / 2.5, 2));
  const v = 12 + 1.6 * Math.max(0, s.t - 20) - 0.25 * (s.rh - 50) - 0.3 * s.ws + 0.6 * (s.p - 1013) - 6 * s.rain + 5 * rush - (s.hol ? 2 : 0);
  return Math.max(1, Math.min(120, Math.round(v * 10) / 10));
};
const getLvl = (v) => v <= 25 ? 'safe' : v <= 50 ? 'cau' : 'uns';

// SVG Helpers
const arc = (cx, cy, r, a0, a1) => {
  const p = a => [cx + r * Math.cos(Math.PI * (1 - a)), cy - r * Math.sin(Math.PI * (1 - a))];
  const [x0, y0] = p(a0), [x1, y1] = p(a1);
  return `M${x0},${y0} A${r},${r} 0 0 1 ${x1},${y1}`;
};

export default function App() {
  const [view, setView] = useState('dash');
  const [formParams, setFormParams] = useState({ ...PRESET.calm });
  const [activeParams, setActiveParams] = useState({ ...PRESET.calm });
  const [error, setError] = useState('');

  const currentV = estimate(activeParams);
  const currentLvl = getLvl(currentV);

  const handleApply = () => {
    if (formParams.t < -5 || formParams.t > 48) return setError('Temperature must be between -5 and 48.');
    if (formParams.rh < 0 || formParams.rh > 100) return setError('Humidity must be between 0 and 100.');
    if (formParams.ws < 0 || formParams.ws > 100) return setError('Wind speed must be between 0 and 100.');
    if (formParams.rain < 0 || formParams.rain > 50) return setError('Rain must be between 0 and 50.');
    if (formParams.p < 980 || formParams.p > 1050) return setError('Pressure must be between 980 and 1050.');
    setError('');
    setActiveParams({ ...formParams });
  };

  const setPreset = (key) => {
    setFormParams({ ...PRESET[key] });
    setActiveParams({ ...PRESET[key] });
    setError('');
  };

  const navLink = (id, text) => (
    <button data-v={id} aria-current={view === id ? 'page' : undefined} onClick={() => { setView(id); window.scrollTo(0, 0); }}>
      {text}
    </button>
  );

  return (
    <>
      <header>
        <div className="brand">Recess Safety Advisor</div>
        <nav aria-label="Main">
          {navLink('dash', 'Today')}
          {navLink('pred', 'Check conditions')}
          {navLink('trend', 'Forecast & trends')}
          {navLink('about', 'Model & data')}
        </nav>
      </header>

      <main>
        {view === 'dash' && (
          <section className="view on">
            <div className="grid hero card">
              <div>
                <span className={`pill ${currentLvl}`}>{NAME[currentLvl]} · {currentV} µg/m³</span>
                <h1 className="verdict" style={{ margin: '10px 0 8px' }}>{VERD[currentLvl]}</h1>
                <p style={{ margin: '0 0 12px' }}>{ADV[currentLvl]}</p>
                <p className="muted" style={{ margin: 0, fontSize: '14px' }}>
                  Estimated from the conditions on the <a href="#pred" onClick={(e) => { e.preventDefault(); setView('pred'); }} style={{ color: 'var(--acc)' }}>Check conditions</a> page. Sydney, NSW · Luddenham station profile.
                </p>
              </div>
              <div>
                <svg viewBox="0 0 320 190" role="img" aria-label="PM2.5 gauge">
                  <path d={arc(160, 160, 120, 0, 0.25)} fill="none" stroke="var(--safe)" strokeWidth="22" />
                  <path d={arc(160, 160, 120, 0.25, 0.5)} fill="none" stroke="var(--cau)" strokeWidth="22" />
                  <path d={arc(160, 160, 120, 0.5, 1)} fill="none" stroke="var(--uns)" strokeWidth="22" />
                  {[0, 25, 50, 100].map(t => {
                    const a = Math.PI * (1 - t / 100);
                    return <text key={t} x={160 + 142 * Math.cos(a)} y={164 - 142 * Math.sin(a)} textAnchor="middle">{t}</text>;
                  })}
                  <g id="needle" style={{ transformOrigin: '160px 160px', transform: `rotate(${-90 + Math.min(currentV, 100) / 100 * 180}deg)` }}>
                    <line x1="160" y1="160" x2="160" y2="62" stroke="var(--ink)" strokeWidth="4" strokeLinecap="round" />
                  </g>
                  <circle cx="160" cy="160" r="9" fill="var(--ink)" />
                  <text x="160" y="186" textAnchor="middle" style={{ fontSize: '15px', fill: 'var(--ink)', fontWeight: 600 }}>{currentV} µg/m³ PM2.5</text>
                </svg>
              </div>
            </div>
            <div className="grid three" style={{ mt: '16px' }}>
              <div className="card"><h3>Safe</h3><p className="muted" style={{ margin: '4px 0' }}>PM2.5 up to 25 µg/m³</p><p style={{ margin: 0 }}>Normal recess, PE and outdoor sport for everyone.</p></div>
              <div className="card"><h3>Caution</h3><p className="muted" style={{ margin: '4px 0' }}>25 to 50 µg/m³</p><p style={{ margin: 0 }}>Students with asthma stay indoors. Keep intense running short for all.</p></div>
              <div className="card"><h3>Unsafe</h3><p className="muted" style={{ margin: '4px 0' }}>Above 50 µg/m³</p><p style={{ margin: 0 }}>Recess and PE move indoors until air quality improves.</p></div>
            </div>
          </section>
        )}

        {view === 'pred' && (
          <section className="view on">
            <h2 style={{ marginBottom: '6px' }}>Check recess conditions</h2>
            <p className="muted" style={{ marginTop: 0 }}>Enter the weather for the time you plan to go outside.</p>
            <div className="grid two">
              <div className="card">
                <div className="chips" role="group" aria-label="Quick fill">
                  <button className="chip" onClick={() => setPreset('calm')}>Calm day</button>
                  <button className="chip" onClick={() => setPreset('humid')}>Humid, rainy</button>
                  <button className="chip" onClick={() => setPreset('windy')}>Windy</button>
                  <button className="chip" onClick={() => setPreset('heat')}>Heatwave</button>
                  <button className="chip" onClick={() => setPreset('haze')}>Smoky haze</button>
                </div>
                <div className="form">
                  <div>
                    <label htmlFor="i-t">Temperature (°C)</label>
                    <input id="i-t" type="number" value={formParams.t} onChange={e => setFormParams({ ...formParams, t: +e.target.value })} />
                    <div className="hint">Typical range 5 to 40</div>
                  </div>
                  <div>
                    <label htmlFor="i-rh">Humidity (%)</label>
                    <input id="i-rh" type="number" value={formParams.rh} onChange={e => setFormParams({ ...formParams, rh: +e.target.value })} />
                    <div className="hint">0 to 100</div>
                  </div>
                  <div>
                    <label htmlFor="i-ws">Wind speed (km/h)</label>
                    <input id="i-ws" type="number" value={formParams.ws} onChange={e => setFormParams({ ...formParams, ws: +e.target.value })} />
                    <div className="hint">Calm under 5, breezy 5 to 30</div>
                  </div>
                  <div>
                    <label htmlFor="i-wd">Wind direction (from)</label>
                    <select id="i-wd" value={formParams.wd} onChange={e => setFormParams({ ...formParams, wd: +e.target.value })}>
                      {DIRS.map((d, i) => <option key={i} value={i}>{d} ({i * 45}°)</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="i-rain">Rain (mm)</label>
                    <input id="i-rain" type="number" value={formParams.rain} onChange={e => setFormParams({ ...formParams, rain: +e.target.value })} />
                  </div>
                  <div>
                    <label htmlFor="i-p">Pressure (hPa)</label>
                    <input id="i-p" type="number" value={formParams.p} onChange={e => setFormParams({ ...formParams, p: +e.target.value })} />
                  </div>
                  <div>
                    <label htmlFor="i-h">Hour of day</label>
                    <select id="i-h" value={formParams.h} onChange={e => setFormParams({ ...formParams, h: +e.target.value })}>
                      {[...Array(24)].map((_, h) => <option key={h} value={h}>{(h % 12 || 12)}:00 {h < 12 ? 'am' : 'pm'}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="i-hol">Public holiday?</label>
                    <select id="i-hol" value={formParams.hol} onChange={e => setFormParams({ ...formParams, hol: +e.target.value })}>
                      <option value={0}>No</option><option value={1}>Yes</option>
                    </select>
                  </div>
                </div>
                <p role="alert" style={{ color: 'var(--uns)', minHeight: '22px', margin: '10px 0 0' }}>{error}</p>
                <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                  <button className="btn primary" onClick={handleApply}>Check safety level</button>
                  <button className="btn" onClick={() => setPreset('calm')}>Reset</button>
                </div>
              </div>
              
              <div className="card">
                <h3>Result</h3>
                <div className={currentLvl} style={{ margin: '12px 0', padding: '16px', borderRadius: '10px', background: `var(--${currentLvl}-bg)`, color: `var(--${currentLvl})` }}>
                  <div style={{ font: "800 32px 'Bricolage Grotesque', sans-serif" }}>{NAME[currentLvl]}</div>
                  <div>Estimated PM2.5: {currentV} µg/m³</div>
                </div>
                <svg viewBox="0 0 320 44" role="img">
                  <rect x="10" y="14" width="75" height="10" fill="var(--safe)" rx="5" />
                  <rect x="85" y="14" width="75" height="10" fill="var(--cau)" />
                  <rect x="160" y="14" width="150" height="10" fill="var(--uns)" rx="5" />
                  <circle cx={Math.min(currentV, 100) / 100 * 300 + 10} cy="19" r="9" fill="var(--card)" stroke="var(--ink)" strokeWidth="3" />
                  <text x="10" y="42">0</text>
                  <text x="85" y="42" textAnchor="middle">25</text>
                  <text x="160" y="42" textAnchor="middle">50</text>
                  <text x="310" y="42" textAnchor="end">100</text>
                </svg>
                <p style={{ marginBottom: 0 }}>{ADV[currentLvl]}</p>
              </div>
            </div>
          </section>
        )}

        {view === 'trend' && (
          <section className="view on">
            <h2 style={{ marginBottom: '6px' }}>Forecast and trends</h2>
            <p className="muted" style={{ marginTop: 0 }}>Built from the conditions you entered. Dashed lines mark the Caution (25) and Unsafe (50) thresholds.</p>
            <div className="grid">
              <div className="card">
                <h3>Next 24 hours</h3>
                <p className="muted" style={{ margin: '2px 0 8px', fontSize: '14px' }}>Look for the afternoon: recess usually falls between 10:30 and 13:30.</p>
                <div className="scroll">
                  <svg viewBox="0 0 700 280" style={{ minWidth: '560px' }}>
                    {(() => {
                      const W = 700, H = 280, m = { l: 44, r: 16, t: 14, b: 34 }, pts = [];
                      for (let k = 0; k < 24; k++) {
                        const h = (activeParams.h + k) % 24;
                        pts.push({ h, v: estimate({ ...activeParams, h, t: activeParams.t + 4 * Math.sin((h - 9) / 24 * 2 * Math.PI) }) });
                      }
                      const mx = Math.max(60, Math.ceil(Math.max(...pts.map(p => p.v)) / 10) * 10);
                      const X = i => m.l + i / 23 * (W - m.l - m.r);
                      const Y = v => H - m.b - v / mx * (H - m.t - m.b);
                      return (
                        <>
                          {[0, 25, 50, ...(mx > 50 ? [mx] : [])].map(t => (
                            <React.Fragment key={t}>
                              <line x1={m.l} x2={W - m.r} y1={Y(t)} y2={Y(t)} stroke={t === 25 || t === 50 ? `var(--${t === 25 ? 'cau' : 'uns'})` : "var(--line)"} strokeDasharray={t === 25 || t === 50 ? "5 4" : ""} />
                              <text x={m.l - 6} y={Y(t) + 4} textAnchor="end">{t}</text>
                            </React.Fragment>
                          ))}
                          <polyline fill="none" stroke="var(--acc)" strokeWidth="2.5" points={pts.map((p, i) => `${X(i)},${Y(p.v)}`).join(' ')} />
                          {pts.map((p, i) => (
                            <React.Fragment key={i}>
                              <circle cx={X(i)} cy={Y(p.v)} r="4.5" fill={`var(--${getLvl(p.v)})`} stroke="var(--card)" strokeWidth="1.5">
                                <title>{`${p.h}:00 · ${p.v} µg/m³ (${NAME[getLvl(p.v)]})`}</title>
                              </circle>
                              {i % 3 === 0 && <text x={X(i)} y={H - 12} textAnchor="middle">{p.h}:00</text>}
                            </React.Fragment>
                          ))}
                        </>
                      );
                    })()}
                  </svg>
                </div>
              </div>
              <div className="card">
                <h3>Weekly comparison</h3>
                <p className="muted" style={{ margin: '2px 0 8px', fontSize: '14px' }}>Daily average PM2.5, Monday to Sunday (illustrative until live data is connected).</p>
                <div className="scroll">
                  <svg viewBox="0 0 700 260" style={{ minWidth: '520px' }}>
                    {(() => {
                      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], off = [0, 6, -3, 10, 2, -5, -2];
                      const W = 700, H = 260, m = { l: 44, r: 16, t: 14, b: 30 };
                      const vals = off.map(o => Math.max(2, Math.round(Math.min(currentV, 60) * 0.8 + o + 6)));
                      const mx = Math.max(40, Math.ceil(Math.max(...vals) / 10) * 10);
                      const Y = x => H - m.b - x / mx * (H - m.t - m.b);
                      const bw = (W - m.l - m.r) / 7;
                      return (
                        <>
                          <line x1={m.l} x2={W - m.r} y1={Y(0)} y2={Y(0)} stroke="var(--line)" />
                          <text x={m.l - 6} y={Y(0) + 4} textAnchor="end">0</text>
                          {vals.map((x, i) => (
                            <React.Fragment key={i}>
                              <rect x={m.l + i * bw + bw * .2} y={Y(x)} width={bw * .6} height={Y(0) - Y(x)} rx="4" fill={`var(--${getLvl(x)})`}>
                                <title>{days[i]} · {x} µg/m³</title>
                              </rect>
                              <text x={m.l + i * bw + bw / 2} y={H - 10} textAnchor="middle">{days[i]}</text>
                              <text x={m.l + i * bw + bw / 2} y={Y(x) - 5} textAnchor="middle">{x}</text>
                            </React.Fragment>
                          ))}
                          <line x1={m.l} x2={W - m.r} y1={Y(25)} y2={Y(25)} stroke="var(--cau)" strokeDasharray="5 4" strokeWidth="2" />
                          <text x={m.l - 6} y={Y(25) + 4} textAnchor="end">25</text>
                        </>
                      );
                    })()}
                  </svg>
                </div>
              </div>
            </div>
          </section>
        )}

        {view === 'about' && (
          <section className="view on">
            <h2 style={{ marginBottom: '12px' }}>Model and data</h2>
            <p className="warn"><strong>Not ready to make real decisions.</strong> Our Random Forest scored about 99% overall accuracy, but it missed most Caution and Unsafe readings because they are rare in the training data. Until that is fixed, use this site as a prototype and follow official NSW air quality alerts.</p>
            <div className="grid two">
              <div className="card"><h3>What it uses</h3><p>Weather and air readings every 20 minutes from the Luddenham (LUDD) station in the NSW Schools Weather and Air Quality dataset, plus NSW public holidays. Inputs: temperature, humidity, wind speed and direction, rain, pressure, hour, day of week and holiday flag.</p><p style={{ marginBottom: 0 }}>PM2.5 is converted to Safe (25 or below), Caution (above 25 to 50) or Unsafe (above 50), in µg/m³.</p></div>
              <div className="card"><h3>How it was built</h3><p>Missing values filled with k-nearest neighbours (k=5). Features standardised, 80/20 train-test split. The PM2.5 column is removed before classification to prevent data leakage.</p><p style={{ marginBottom: 0 }}>Planned stack: FastAPI backend serving the trained model, React and D3.js front end.</p></div>
              <div className="card scroll"><h3 style={{ marginBottom: '8px' }}>Results</h3><table><thead><tr><th>Model</th><th>Result</th></tr></thead><tbody><tr><td>Linear regression</td><td>R² 0.12 to 0.18, MAE about 2.4</td></tr><tr><td>Random Forest</td><td>Accuracy about 99%</td></tr><tr><td>K-Means (k=3)</td><td>Silhouette 0.27</td></tr></tbody></table></div>
              <div className="card scroll"><h3 style={{ marginBottom: '8px' }}>Random Forest by class</h3><table><thead><tr><th>Class</th><th>Precision</th><th>Recall</th></tr></thead><tbody><tr><td>Safe</td><td>0.99</td><td>1.00</td></tr><tr><td>Caution</td><td>0.66</td><td>0.32</td></tr><tr><td>Unsafe</td><td>0.80</td><td>0.20</td></tr></tbody></table><p className="muted" style={{ fontSize: '14px', marginBottom: 0 }}>Next step: rebalance with SMOTE or lower the decision threshold so hazards are caught.</p></div>
            </div>
            <div className="card" style={{ marginTop: '16px' }}><h3>About this demo</h3><p style={{ marginBottom: 0 }}>The numbers on the other pages come from a simple stand-in formula in your browser, shaped by the correlations in our report (warmer and drier air raises PM2.5; humidity, wind and rain lower it). It is not the trained model. To go live, replace <code>estimate()</code> in the page with a call to the FastAPI <code>/predict</code> endpoint.</p></div>
          </section>
        )}
      </main>
      
      <footer>COS30049 Group 6 · Gain Jin, Kwan Kian Ann, Lee Zhao Shean, Lee Chee Cung · Swinburne University of Technology</footer>
    </>
  );
}