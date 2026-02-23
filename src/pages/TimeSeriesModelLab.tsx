import React, { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Legend,
  Label,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Area,
} from "recharts";

const ingestData = Array.from({ length: 30 }).map((_, i) => ({
  day: i + 1,
  bookings: 80 + Math.sin(i / 3) * 15 + (Math.random() - 0.5) * 10,
  revenue: 120 + Math.cos(i / 4) * 20 + (Math.random() - 0.5) * 15,
}));

const decompositionData = Array.from({ length: 24 }).map((_, i) => ({
  t: i + 1,
  trend: 100 + i * 2,
  seasonal: Math.sin((i / 12) * Math.PI * 2) * 10,
  residual: (Math.random() - 0.5) * 8,
}));

const evalData = Array.from({ length: 18 }).map((_, i) => ({
  period: i + 1,
  actual: 110 + Math.sin(i / 3) * 18,
  forecast: 108 + Math.sin(i / 3 + 0.1) * 17,
}));

const residualHistogram = [
  { bucket: "-3σ", count: 2 },
  { bucket: "-2σ", count: 6 },
  { bucket: "-1σ", count: 10 },
  { bucket: "0σ", count: 14 },
  { bucket: "+1σ", count: 9 },
  { bucket: "+2σ", count: 5 },
  { bucket: "+3σ", count: 2 },
];

const TOTAL_STEPS = 6;

export const TimeSeriesModelLab: React.FC = () => {
  const [activeStep, setActiveStep] = useState<number>(1);
  const [model, setModel] = useState<"ARIMA" | "SARIMA" | "SARIMAX">("SARIMAX");
  const [hasCompletedStory, setHasCompletedStory] = useState(false);

  const handleAnalyzeClick = () => {
    // If story is completed, restart from step 1
    if (hasCompletedStory && activeStep === TOTAL_STEPS) {
      setActiveStep(1);
      setHasCompletedStory(false);
      return;
    }

    // Otherwise, move forward one step at a time
    setActiveStep((prev) => {
      const next = Math.min(prev + 1, TOTAL_STEPS);
      if (next === TOTAL_STEPS) {
        setHasCompletedStory(true);
      }
      return next;
    });
  };

  return (
    <div className="space-y-4 bg-slate-100 p-6 -m-8 min-h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">
            Time Series Model Lab
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Experiment with forecasting pipelines across ingestion, diagnostics,
            training, and evaluation.
          </p>
        </div>
      </div>

      <div className="h-[calc(100vh-8rem)] overflow-hidden rounded-xl border border-slate-300 bg-white shadow-md">
        <div className="flex h-full">
          {/* Column 1: global nav */}
          <div className="flex w-16 flex-shrink-0 flex-col items-center justify-between border-r border-slate-700 bg-slate-900 py-4 text-slate-200">
            <div className="space-y-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500 text-sm font-semibold">
                XO
              </div>
            </div>
            <button
              className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-[10px] font-semibold hover:bg-slate-700"
              title="Settings"
            >
              ⚙
            </button>
          </div>

          {/* Column 2: control panel */}
          <div className="flex w-80 flex-col border-r border-slate-200 bg-slate-50 p-4">
            <div className="mb-4">
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Control Panel
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Configure horizon, targets, and exogenous drivers.
              </p>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700">
                  Time Period
                </label>
                <select className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm shadow-sm">
                  <option>Last 26 Weeks</option>
                  <option>Last 52 Weeks</option>
                  <option>Post-Pandemic Baseline (2022-Present)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700">
                  Target Variable
                </label>
                <select className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm shadow-sm">
                  <option>Booking Date</option>
                  <option>Travel Date</option>
                </select>
              </div>

              <div>
                <p className="text-[11px] font-semibold text-slate-700">
                  External Factors
                </p>
                <div className="mt-1 space-y-1.5">
                  {["Typhoon", "Rainfall Index", "Temperature", "Wind Speed", "Holiday"].map(
                    (factor) => (
                      <label key={factor} className="flex items-center gap-2 text-sm text-slate-700">
                        <input type="checkbox" className="h-3 w-3 rounded border-slate-300" defaultChecked />
                        {factor}
                      </label>
                    )
                  )}
                </div>
              </div>

              <div>
                <p className="text-[11px] font-semibold text-slate-700">
                  Model Selection
                </p>
                <div className="mt-1 inline-flex rounded-full bg-slate-100 p-1 text-sm">
                  {(["ARIMA", "SARIMA", "SARIMAX"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setModel(m)}
                      className={`rounded-full px-3 py-1 ${
                        model === m
                          ? "bg-slate-900 text-white"
                          : "text-slate-700 hover:bg-white"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={handleAnalyzeClick}
                className="mt-2 w-full rounded-xl bg-teal-600 px-3 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-teal-700 hover:shadow-lg"
              >
                {hasCompletedStory ? "Redo" : "Analyze"}
              </button>
            </div>
          </div>

          {/* Column 3: main canvas */}
          <div className="flex flex-1 flex-col bg-slate-50/80 p-6">
            {/* Stepper / Tabs */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2 text-sm">
                {[
                  "Ingest",
                  "Correlations",
                  "Stationarity",
                  "Decomposition",
                  "Training",
                  "Evaluation",
                ].map((label, idx) => {
                  const step = idx + 1;
                  const active = activeStep === step;
                  return (
                    <button
                      key={label}
                      onClick={() => {
                        setActiveStep(step);
                        setHasCompletedStory(step === TOTAL_STEPS);
                      }}
                      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 shadow-sm ${
                        active
                          ? "border-teal-600 bg-teal-600 text-white shadow-md"
                          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:shadow"
                      }`}
                    >
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-black/10 text-[10px]">
                        {step}
                      </span>
                      {label}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-500">
                Active model:{" "}
                <span className="font-semibold text-slate-800">{model}</span>
              </p>
            </div>

            <div className="flex-1 overflow-hidden rounded-xl border border-slate-700 bg-slate-900/95 p-5 text-slate-50 shadow-lg">
              {activeStep === 1 && <IngestView />}
              {activeStep === 2 && <CorrelationsView />}
              {activeStep === 3 && <StationarityView />}
              {activeStep === 4 && <DecompositionView />}
              {activeStep === 5 && <TrainingView />}
              {activeStep === 6 && <EvaluationView />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const IngestView: React.FC = () => {
  // Dynamically calculate statistics from your data
  const stats = useMemo(() => {
    if (!ingestData || ingestData.length === 0) {
      return { mean: 0, std: 0, min: 0, max: 0 };
    }

    const bookings = ingestData.map((d) => d.bookings);

    const min = Math.min(...bookings);
    const max = Math.max(...bookings);

    const sum = bookings.reduce((acc, val) => acc + val, 0);
    const mean = sum / bookings.length;

    // Calculate Standard Deviation
    const squaredDiffs = bookings.map((val) => Math.pow(val - mean, 2));
    const variance =
      squaredDiffs.reduce((acc, val) => acc + val, 0) / bookings.length;
    const std = Math.sqrt(variance);

    return {
      mean: mean.toFixed(1), // Rounds to 1 decimal place
      std: std.toFixed(1), // Rounds to 1 decimal place
      min,
      max,
    };
  }, []);

  return (
    /* Added h-full, overflow-y-auto, and custom-scrollbar to make it scrollable */
    <div className="h-full w-full overflow-y-auto pr-2 custom-scrollbar">
      <div className="flex flex-col gap-4 pb-6">
        
        {/* --- MAIN CHART CARD --- */}
        <div className="flex flex-col rounded-lg bg-[#0f172a] p-6 border border-slate-800 shadow-sm">
          <h2 className="mb-6 text-sm font-semibold text-slate-100">
            Bookings Over Time
          </h2>

          {/* Set a min-height for the chart so it doesn't collapse while scrolling */}
          <div className="h-[400px] min-h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={ingestData}
                margin={{ top: 10, right: 10, bottom: 60, left: 30 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#1e293b"
                />
                <XAxis
                  dataKey="day"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  angle={-45}
                  textAnchor="end"
                  dy={15}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: "#64748b" }}
                >
                  <Label
                    value="Bookings Volume"
                    angle={-90}
                    position="insideLeft"
                    offset={-20}
                    style={{
                      textAnchor: "middle",
                      fill: "#94a3b8",
                      fontSize: 12,
                      fontWeight: 500,
                    }}
                  />
                </YAxis>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#020617",
                    borderRadius: 8,
                    borderColor: "#1E293B",
                    fontSize: 12,
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  iconType="rect"
                  wrapperStyle={{
                    paddingTop: "40px",
                    fontSize: "12px",
                    color: "#94a3b8",
                  }}
                />

                <Bar
                  dataKey="bookings"
                  name="Bookings Volume"
                  fill="#1e3a8a"
                  opacity={0.4}
                  barSize={30}
                />

                <Line
                  type="monotone"
                  dataKey="bookings"
                  name="Trend Line"
                  stroke="#22d3ee"
                  strokeWidth={2}
                  dot={{
                    fill: "#22d3ee",
                    r: 4,
                    stroke: "#0f172a",
                    strokeWidth: 2,
                  }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* --- STATISTICS GRID --- */}
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          {/* Mean Bookings */}
          <div className="rounded-lg border border-teal-500/30 bg-slate-900/50 px-4 py-3">
            <p className="text-[10px] font-medium text-teal-400 uppercase tracking-wider">
              Mean Bookings
            </p>
            <p className="mt-1 text-sm font-bold text-slate-50">
              {stats.mean} / day
            </p>
          </div>

          {/* Standard Deviation */}
          <div className="rounded-lg border border-cyan-500/30 bg-slate-900/50 px-4 py-3">
            <p className="text-[10px] font-medium text-cyan-400 uppercase tracking-wider">
              Std Deviation
            </p>
            <p className="mt-1 text-sm font-bold text-slate-50">{stats.std}</p>
          </div>

          {/* Min Value */}
          <div className="rounded-lg border border-amber-500/30 bg-slate-900/50 px-4 py-3">
            <p className="text-[10px] font-medium text-amber-400 uppercase tracking-wider">
              Min Value
            </p>
            <p className="mt-1 text-sm font-bold text-slate-50">{stats.min}</p>
          </div>

          {/* Max Value */}
          <div className="rounded-lg border border-emerald-500/30 bg-slate-900/50 px-4 py-3">
            <p className="text-[10px] font-medium text-emerald-400 uppercase tracking-wider">
              Max Value
            </p>
            <p className="mt-1 text-sm font-bold text-slate-50">{stats.max}</p>
          </div>
        </div>

        {/* --- OPTIONAL: DATA INSIGHT BANNER --- */}
        <div className="flex items-center gap-4 rounded-lg border border-blue-800/40 bg-[#0c1e22] p-4 shadow-sm">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
          </div>
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-bold text-white">Data Ingestion Successful</p>
            <p className="text-sm text-slate-400">
              Time series data loaded. {ingestData.length} observation points detected with a variation (Std Dev) of {stats.std}.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const CorrelationsView: React.FC = () => {
  const grid = [
    [1.0, -0.65, 0.42],
    [-0.65, 1.0, -0.08],
    [0.42, -0.08, 1.0],
  ];

  const labels = ["Booking Date", "Rainfall", "Holiday"];

  const colorFor = (v: number) => {
    if (v >= 1.0) return "bg-cyan-600";
    if (v >= 0.5) return "bg-cyan-500";
    if (v > -0.5 && v < 0.5) return "bg-slate-700";
    if (v <= -0.5) return "bg-orange-600";
    return "bg-slate-800";
  };

  const legend = [
    { label: "Perfect (+1.0)", color: "bg-cyan-600" },
    { label: "Mod. Pos (+0.5)", color: "bg-cyan-500" },
    { label: "Weak (±0.5)", color: "bg-slate-700" },
    { label: "Strong Neg (-0.5)", color: "bg-orange-600" },
  ];

  return (
    <div className="h-full w-full overflow-y-auto pr-2 custom-scrollbar">
      <div className="flex flex-col gap-6 pb-8">
        
        {/* Main Heatmap Container */}
        <div className="flex flex-col rounded-lg bg-[#161b22] border border-slate-700/60 p-8 shadow-sm">
          <div className="mb-10">
            <p className="text-sm font-bold text-white tracking-tight">Correlation Matrix</p>
          </div>

          <div className="flex flex-col lg:flex-row items-center justify-center gap-16">
            {/* Heatmap Grid */}
            <div className="grid grid-cols-[auto_repeat(3,64px)] gap-3 items-center">
              <div /> {/* Corner spacer */}
              {labels.map((l) => (
                <div key={`t-${l}`} className="text-center text-sm font-bold text-white tracking-tight">
                  {l}
                </div>
              ))}
              
              {grid.map((row, i) => (
                <React.Fragment key={`r-${i}`}>
                  <div className="pr-4 text-right text-sm font-bold text-white tracking-tight">
                    {labels[i]}
                  </div>
                  {row.map((v, j) => (
                    <div
                      key={`${i}-${j}`}
                      className={`flex h-16 w-16 items-center justify-center rounded-lg border border-white/10 shadow-inner transition-transform hover:scale-105 ${colorFor(v)}`}
                    >
                      <span className="text-sm font-bold text-white drop-shadow-md">
                        {v.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </React.Fragment>
              ))}
            </div>

            {/* Scale Legend */}
            <div className="flex flex-col gap-4 border-l border-slate-800 pl-10">
              <p className="text-sm font-bold text-white tracking-tight">Scale</p>
              {legend.map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <div className={`h-4 w-4 rounded shadow-sm ${item.color}`} />
                  <span className="text-sm font-bold text-white">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* --- DYNAMIC INSIGHTS SECTION --- */}
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-bold text-white mb-1">Key Insights</h3>

          {/* Insight 1: Strong Signal */}
          <div className="flex items-start gap-4 rounded-lg border border-orange-900/40 bg-[#1c1412]/80 p-4 shadow-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-600">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 17 13.5 8.5 8.5 13.5 2 7"></polyline>
                <polyline points="16 17 22 17 22 11"></polyline>
              </svg>
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-bold text-white">Strong Signal Detected</p>
              <p className="text-[13px] text-slate-300">
                Rainfall shows strong negative correlation (-0.65) with sales. This indicates that higher rainfall typically results in lower sales volume.
              </p>
            </div>
          </div>

          {/* Insight 2: Model Impact */}
          <div className="flex items-start gap-4 rounded-lg border border-teal-900/40 bg-[#0f1b1a]/80 p-4 shadow-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-600">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <circle cx="12" cy="12" r="6"></circle>
                <circle cx="12" cy="12" r="2"></circle>
              </svg>
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-bold text-white">Model Impact</p>
              <p className="text-[13px] text-slate-300">
                Including rainfall as an exogenous variable improves forecast accuracy by 11.2% compared to baseline ARIMA model.
              </p>
            </div>
          </div>

          {/* Insight 3: Business Insight */}
          <div className="flex items-start gap-4 rounded-lg border border-indigo-900/40 bg-[#121526]/80 p-4 shadow-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-600">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.9 1.2 1.5 1.5 2.5"></path>
                <path d="M9 18h6"></path>
                <path d="M10 22h4"></path>
              </svg>
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-bold text-white">Business Insight</p>
              <p className="text-[13px] text-slate-300">
                High rainfall periods = Lower sales. Consider indoor promotions or weather-proof activities during rainy seasons to mitigate impact.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

const StationarityView: React.FC = () => {
  return (
    /* Changed to overflow-y-auto to allow scrolling if content is cut off */
    <div className="h-full w-full overflow-y-auto pr-2 custom-scrollbar">
      <div className="flex flex-col gap-4 pb-6">
        
        {/* --- CHARTS GRID --- */}
        <div className="grid gap-4 md:grid-cols-2">
          
          {/* --- ORIGINAL SERIES CARD --- */}
          <div className="flex flex-col rounded-lg border border-red-900/50 bg-[#161b22] p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <p className="text-sm font-bold text-white">Original Series</p>
            </div>
            
            <div className="min-h-[200px] w-full flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={decompositionData}
                  margin={{ top: 10, right: 16, bottom: 4, left: -20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                  <XAxis dataKey="t" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#9CA3AF" }} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 10, fill: "#9CA3AF" }}
                    domain={[(min: number) => Math.floor(min) - 10, (max: number) => Math.ceil(max) + 10]}
                  />
                  <Tooltip contentStyle={{ backgroundColor: "#020617", borderRadius: 12, borderColor: "#1E293B", fontSize: 11 }} />
                  <Line type="monotone" dataKey="trend" stroke="#ef4444" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-6 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="rounded bg-blue-700/80 px-1.5 py-0.5 text-[10px] font-semibold text-white uppercase tracking-wider">ADF Statistic</span>
                <span className="rounded bg-blue-700/80 px-1.5 py-0.5 text-sm font-bold text-white">-1.245</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="rounded bg-blue-700/80 px-1.5 py-0.5 text-[10px] font-semibold text-white uppercase tracking-wider">p-value</span>
                <span className="rounded bg-blue-700/80 px-1.5 py-0.5 text-sm font-bold text-white">0.850</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="rounded bg-blue-700/80 px-1.5 py-0.5 text-[10px] font-semibold text-white uppercase tracking-wider">Status</span>
                <span className="rounded border border-red-800 bg-red-950/80 px-2 py-0.5 text-sm font-medium text-red-400">Non-Stationary</span>
              </div>
              <div className="mt-4 flex items-center gap-2 border-t border-slate-800 pt-4 text-sm font-semibold text-yellow-500">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline>
                  <polyline points="16 7 22 7 22 13"></polyline>
                </svg>
                Differencing Required
              </div>
            </div>
          </div>

          {/* --- DIFFERENCED SERIES CARD --- */}
          <div className="flex flex-col rounded-lg border border-emerald-900/50 bg-[#161b22] p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              <p className="text-sm font-bold text-white">After Differencing (d=1)</p>
            </div>
            
            <div className="min-h-[200px] w-full flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={decompositionData}
                  margin={{ top: 10, right: 16, bottom: 4, left: -20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                  <XAxis dataKey="t" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#9CA3AF" }} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 10, fill: "#9CA3AF" }}
                    domain={[(min: number) => Math.floor(min) - 10, (max: number) => Math.ceil(max) + 10]}
                  />
                  <Tooltip contentStyle={{ backgroundColor: "#020617", borderRadius: 12, borderColor: "#1E293B", fontSize: 11 }} />
                  <Line type="monotone" dataKey="seasonal" stroke="#22C55E" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-6 flex flex-col gap-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-sm font-semibold text-slate-400 uppercase tracking-wider">ADF Statistic</span>
                <span className="text-sm font-bold text-white">-4.125</span>
              </div>
              <div className="flex items-center justify-between px-1">
                <span className="text-sm font-semibold text-slate-400 uppercase tracking-wider">p-value</span>
                <span className="text-sm font-bold text-emerald-400">0.030</span>
              </div>
              <div className="flex items-center justify-between px-1">
                <span className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Status</span>
                <span className="rounded border border-emerald-800 bg-emerald-950/80 px-2 py-0.5 text-sm font-medium text-emerald-400">
                  Stationary ✓
                </span>
              </div>
              <div className="mt-4 flex items-center gap-2 border-t border-slate-800 pt-4 text-sm font-semibold text-emerald-500">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                  <polyline points="9 12 11 14 15 10"></polyline>
                </svg>
                Confidence: 97%
              </div>
            </div>
          </div>
        </div>

        {/* --- INTEGRATION ORDER BANNER --- */}
        <div className="flex items-center gap-4 rounded-lg border border-teal-800/40 bg-[#0c1e22] p-4 shadow-sm">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-600/20 text-teal-500 border border-teal-500/30">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-bold text-white">Integration Order: d=1</p>
            <p className="text-sm text-slate-400">
              Trend successfully removed. Series is now stationary and ready for ARIMA modeling.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

type TabKey = "trend" | "seasonality" | "residuals";

const DecompositionView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>("trend");

  // Data for the analysis panel based on component findings
  const analysisData = {
    trend: {
      label: "Trend",
      metric1: { title: "Direction", value: "Upward", color: "text-[#F59E0B]" },
      metric2: { title: "Strength", value: "Strong", color: "text-white" },
      analysis:
        "The trend component shows consistent upward growth over the observed period, indicating increasing sales performance over time with approximately 50 units per month growth rate.",
    },
    seasonality: {
      label: "Seasonality",
      metric1: { title: "Period", value: "12 months", color: "text-[#A855F7]" },
      metric2: { title: "Amplitude", value: "Moderate", color: "text-white" },
      analysis:
        "Clear seasonal pattern repeating every 12 months. Peak sales occur during mid-year (June) with moderate amplitude variation of ±200 units from the mean.",
    },
    residuals: {
      label: "Residuals",
      metric1: { title: "Distribution", value: "Normal", color: "text-[#06B6D4]" },
      metric2: { title: "Variance", value: "Low", color: "text-white" },
      analysis:
        "Residuals appear random with no discernible pattern, suggesting the decomposition successfully captured the trend and seasonal components. Low variance indicates good model fit.",
    },
  };

  // Configuration for the three stacked charts
  const charts = [
    {
      id: "trend",
      label: "Trend Component",
      color: "#F59E0B",
      showDots: false,
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
    },
    {
      id: "seasonal",
      label: "Seasonal Component",
      color: "#A855F7",
      showDots: false,
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2 4 4 4-4 4 4 4-4" />
        </svg>
      ),
    },
    {
      id: "residual",
      label: "Residual Component",
      color: "#06B6D4",
      showDots: true,
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v8l9-11h-7z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="h-full w-full overflow-y-auto pr-2 custom-scrollbar rounded-lg bg-[#1a2234] p-6">
      <div className="flex flex-col gap-8 pb-6">
        <h2 className="text-lg font-bold text-white">Time Series Components</h2>

        {/* --- CHARTS STACK --- */}
        <div className="flex flex-col gap-8">
          {charts.map((chart) => (
            <div key={chart.id} className="flex flex-col h-[200px] min-h-[200px]">
              <div className="mb-2 flex items-center gap-2 text-sm text-slate-300">
                {chart.icon}
                <span>{chart.label}</span>
              </div>

              <div className="flex-1 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={decompositionData}
                    margin={{ top: 10, right: 16, bottom: 4, left: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#2A3441" />
                    <XAxis
                      dataKey="t"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 10, fill: "#9CA3AF" }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 10, fill: "#9CA3AF" }}
                      domain={["auto", "auto"]}
                      width={45} 
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#020617",
                        borderRadius: 12,
                        borderColor: "#1E293B",
                        fontSize: 11,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey={chart.id}
                      stroke={chart.color}
                      strokeWidth={2}
                      dot={
                        chart.showDots
                          ? { r: 3, fill: chart.color, strokeWidth: 0 }
                          : false
                      }
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </div>

        {/* --- ANALYSIS PANEL --- */}
        <div className="flex flex-col rounded-lg border border-slate-700/60 bg-[#161b22] shadow-sm">
          {/* Tabs Header */}
          <div className="flex grid-cols-3 divide-x divide-slate-800 border-b border-slate-700/60 bg-[#0d1117]/50 rounded-t-lg overflow-hidden">
            {(Object.keys(analysisData) as TabKey[]).map((key) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  activeTab === key
                    ? "bg-[#252f44] text-white border-b-2 border-b-[#F59E0B]"
                    : "text-slate-400 hover:bg-[#1a2234] hover:text-slate-200"
                }`}
              >
                {analysisData[key].label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex flex-col gap-5 p-5">
            <div className="grid grid-cols-2 gap-8 md:grid-cols-3">
              <div className="flex flex-col gap-1">
                <span className="text-sm text-slate-400">{analysisData[activeTab].metric1.title}</span>
                <div className={`flex items-center gap-1.5 text-base font-bold ${analysisData[activeTab].metric1.color}`}>
                  {activeTab === "trend" && analysisData[activeTab].metric1.value === "Upward" && (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  )}
                  {analysisData[activeTab].metric1.value}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-sm text-slate-400">{analysisData[activeTab].metric2.title}</span>
                <span className={`text-base font-bold ${analysisData[activeTab].metric2.color}`}>
                  {analysisData[activeTab].metric2.value}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-sm text-slate-400">Analysis</span>
              <p className="text-sm leading-relaxed text-slate-200">
                {analysisData[activeTab].analysis}
              </p>
            </div>
          </div>
        </div>

        {/* --- VALIDATION BANNER --- */}
        <div className="flex items-center gap-4 rounded-lg border border-teal-800/40 bg-[#0c1e22] p-4 shadow-sm">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-600/20 text-teal-500 border border-teal-500/30">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
            </svg>
          </div>
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-bold text-white">Decomposition Validates SARIMA Approach</p>
            <p className="text-sm text-slate-400">
              The clear seasonal pattern (12-month cycle) and strong upward trend confirm that a Seasonal ARIMA model is appropriate for this time series. The low-variance residuals indicate good decomposition quality.
            </p>
          </div>
        </div>
        
      </div>
    </div>
  );
};

const TrainingView: React.FC = () => {
  return (
    <div className="flex h-full w-full flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar text-sm bg-[#0d1117] p-6">
      
      {/* --- MODEL CARDS GRID --- */}
      <div className="grid gap-4 md:grid-cols-3">
        
        {/* ARIMA CARD (Baseline) */}
        <div className="flex flex-col rounded-xl border border-slate-700 bg-[#161b22] p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-base font-bold text-white">ARIMA (1,1,1)</h3>
              <p className="text-sm text-slate-400">Basic time series model</p>
            </div>
            <span className="rounded bg-slate-700/50 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
              Baseline
            </span>
          </div>

          <div className="mt-5 flex flex-col gap-3">
            <div className="rounded-lg bg-[#0d1117] p-3">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">AIC Score</p>
              <p className="text-lg font-bold text-white tracking-tight">1285.3</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-[#0d1117] p-3">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">WMAPE</p>
                <p className="text-base font-bold text-white">8.7%</p>
              </div>
              <div className="rounded-lg bg-[#0d1117] p-3">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">R²</p>
                <p className="text-base font-bold text-white">0.74</p>
              </div>
            </div>
          </div>

          <div className="mt-5">
            <p className="mb-2 text-[10px] text-slate-500 font-semibold">Model Performance</p>
            <div className="h-1.5 w-full rounded-full bg-slate-800">
              <div className="h-1.5 w-[74%] rounded-full bg-blue-500" />
            </div>
          </div>
        </div>

        {/* SARIMA CARD */}
        <div className="flex flex-col rounded-xl border border-purple-500/40 bg-[#161b22] p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">SARIMA</h3>
                <svg className="h-3 w-3 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <p className="text-sm text-slate-400">Seasonal model</p>
            </div>
            <span className="rounded bg-purple-500/20 px-2 py-0.5 text-[10px] font-semibold text-purple-400">
              +6.7%
            </span>
          </div>

          <div className="mt-5 flex flex-col gap-3">
            <div className="rounded-lg bg-[#0d1117] p-3">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">AIC Score</p>
              <p className="text-lg font-bold text-white tracking-tight">1198.7</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-[#0d1117] p-3">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">WMAPE</p>
                <p className="text-base font-bold text-purple-400">5.9%</p>
              </div>
              <div className="rounded-lg bg-[#0d1117] p-3">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">R²</p>
                <p className="text-base font-bold text-purple-400">0.83</p>
              </div>
            </div>
          </div>

          <div className="mt-5">
            <p className="mb-2 text-[10px] text-slate-500 font-semibold">Model Performance</p>
            <div className="h-1.5 w-full rounded-full bg-slate-800">
              <div className="h-1.5 w-[83%] rounded-full bg-purple-500" />
            </div>
          </div>
        </div>

        {/* SARIMAX CARD (Best Model) */}
        <div className="flex flex-col rounded-xl border border-teal-500/50 bg-[#161b22] p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-teal-400">SARIMAX</h3>
                <svg className="h-3 w-3 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <p className="text-sm text-slate-400">With exogenous variables</p>
            </div>
            <span className="flex items-center gap-1 rounded bg-teal-500/20 px-2 py-0.5 text-[10px] font-semibold text-teal-300">
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              Best Model
            </span>
          </div>

          <div className="mt-5 flex flex-col gap-3">
            <div className="rounded-lg border border-teal-500/20 bg-[#0d1117] p-3">
              <p className="text-[10px] text-teal-500/70 uppercase tracking-wider font-semibold">AIC Score</p>
              <p className="text-lg font-bold text-white tracking-tight">1142.1</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-teal-500/20 bg-[#0d1117] p-3">
                <p className="text-[10px] text-teal-500/70 uppercase tracking-wider font-semibold">WMAPE</p>
                <p className="text-base font-bold text-teal-400">4.2%</p>
              </div>
              <div className="rounded-lg border border-teal-500/20 bg-[#0d1117] p-3">
                <p className="text-[10px] text-teal-500/70 uppercase tracking-wider font-semibold">R²</p>
                <p className="text-base font-bold text-teal-400">0.89</p>
              </div>
            </div>
          </div>

          <div className="mt-5">
            <p className="mb-2 text-[10px] text-slate-500 font-semibold">Model Performance</p>
            <div className="h-1.5 w-full rounded-full bg-slate-800">
              <div className="h-1.5 w-[89%] rounded-full bg-teal-400" />
            </div>
          </div>

          <div className="mt-4 rounded border border-teal-500/30 bg-teal-950/20 p-2">
            <p className="text-[10px] text-teal-500 font-semibold uppercase tracking-wider">Improvement</p>
            <p className="text-sm font-bold text-teal-400">+11.2%</p>
            <p className="text-[10px] text-teal-500 opacity-70 font-medium">vs baseline ARIMA</p>
          </div>
        </div>
      </div>

      {/* --- DETAILED METRICS COMPARISON TABLE --- */}
      <div className="flex flex-col rounded-xl border border-slate-700/60 bg-[#161b22] shadow-lg">
        <div className="border-b border-slate-700/60 p-4">
          <h3 className="text-sm font-bold text-white">Detailed Metrics Comparison</h3>
        </div>
        <div className="w-full overflow-x-auto p-2">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                <th className="p-3">Model</th>
                <th className="p-3">AIC</th>
                <th className="p-3">MAPE</th>
                <th className="p-3">R²</th>
                <th className="p-3">RMSE</th>
                <th className="p-3">Training Time</th>
              </tr>
            </thead>
            <tbody>
              {/* ARIMA Row */}
              <tr className="border-b border-slate-800/50 hover:bg-slate-800/30 text-white transition-colors">
                <td className="p-3 font-semibold">ARIMA (1,1,1)</td>
                <td className="p-3">1285.3</td>
                <td className="p-3 font-medium">8.7%</td>
                <td className="p-3 font-medium">0.74</td>
                <td className="p-3">256.8</td>
                <td className="p-3 text-slate-400">1.2s</td>
              </tr>
              {/* SARIMA Row */}
              <tr className="border-b border-slate-800/50 hover:bg-slate-800/30 text-purple-400 transition-colors">
                <td className="p-3 font-semibold text-white">SARIMA</td>
                <td className="p-3 text-white opacity-90">1198.7</td>
                <td className="p-3 font-bold text-purple-400">5.9%</td>
                <td className="p-3 font-bold text-purple-400">0.83</td>
                <td className="p-3 text-purple-300">198.5</td>
                <td className="p-3 text-slate-400">2.8s</td>
              </tr>
              {/* SARIMAX Row */}
              <tr className="hover:bg-slate-800/30 text-teal-400 transition-colors">
                <td className="p-3 font-semibold text-teal-400">SARIMAX</td>
                <td className="p-3 text-white opacity-90">1142.1</td>
                <td className="p-3 font-bold text-teal-400">4.2%</td>
                <td className="p-3 font-bold text-teal-400">0.89</td>
                <td className="p-3 text-teal-300">142.5</td>
                <td className="p-3 text-slate-400">3.5s</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODEL SELECTION BANNER --- */}
      <div className="flex items-center gap-4 rounded-xl border border-teal-800/40 bg-[#0c1e22]/60 p-5 shadow-inner">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-600/20 text-teal-500 border border-teal-500/30 shadow-sm">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-bold text-white tracking-wide">SARIMAX Selected as Production Model</p>
          <p className="text-sm text-slate-400 leading-relaxed font-medium">
            Including exogenous variables (rainfall, holidays) improved accuracy by 11.2% over baseline ARIMA. 
            The model achieves 95.8% accuracy (4.2% MAPE) and explains 89% of variance in sales data.
          </p>
        </div>
      </div>
      
    </div>
  );
};

const EvaluationView: React.FC = () => {
  return (
    <div className="flex h-full w-full flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar bg-[#0d1117] p-6">
      
      {/* --- HEADER --- */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-bold text-white tracking-tight">Model Ready for Production</h2>
          <p className="text-sm font-medium text-teal-400">SARIMAX achieved 95.8% accuracy</p>
        </div>
        <button className="flex items-center gap-2 rounded-lg border border-green-500/50 bg-green-950/30 px-4 py-2 text-sm font-bold text-green-400 transition-colors hover:bg-green-900/40">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          Production Ready
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        
        {/* --- LEFT COLUMN: METRICS --- */}
        <div className="flex flex-col gap-4">
          {/* WMAPE Card */}
          <div className="flex flex-col justify-center rounded-xl border border-teal-500/40 bg-[#161b22] p-6 shadow-sm">
            <p className="text-sm font-semibold text-teal-500/80">WMAPE</p>
            <p className="mt-2 text-2xl font-bold text-white">4.2%</p>
            <p className="mt-1 text-sm text-slate-400">Weighted Mean Absolute Percentage Error</p>
          </div>

          {/* RMSE Card */}
          <div className="flex flex-col justify-center rounded-xl border border-indigo-500/40 bg-[#161b22] p-6 shadow-sm">
            <p className="text-sm font-semibold text-indigo-400/80">RMSE</p>
            <p className="mt-2 text-2xl font-bold text-white">142.5</p>
            <p className="mt-1 text-sm text-slate-400">Root Mean Squared Error</p>
          </div>

          {/* MAE Card */}
          <div className="flex flex-col justify-center rounded-xl border border-slate-500/40 bg-[#161b22] p-6 shadow-sm">
            <p className="text-sm font-semibold text-slate-400/80">MAE</p>
            <p className="mt-2 text-2xl font-bold text-white">118.3</p>
            <p className="mt-1 text-sm text-slate-400">Mean Absolute Error</p>
          </div>
        </div>

        {/* --- RIGHT COLUMN: CHARTS --- */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          
          {/* Forecast vs Actuals Chart */}
          <div className="flex flex-col rounded-xl border border-slate-700/60 bg-[#161b22] p-5 shadow-sm">
            <p className="mb-4 text-sm font-bold text-white">Forecast vs Actuals</p>
            <div className="min-h-[220px] w-full flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={evalData} margin={{ top: 10, right: 16, bottom: 4, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A3441" vertical={false} />
                  <XAxis dataKey="period" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#9CA3AF" }} dy={10} angle={-45} textAnchor="end" />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#9CA3AF" }} domain={[0, 6000]} ticks={[0, 1500, 3000, 4500, 6000]} />
                  <Tooltip contentStyle={{ backgroundColor: "#020617", borderRadius: 12, borderColor: "#1E293B", fontSize: 11 }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={6} wrapperStyle={{ fontSize: 12, color: '#9CA3AF', paddingTop: '20px' }} />
                  <Area type="monotone" dataKey="ciBounds" fill="#9ca3af" stroke="none" fillOpacity={0.4} name="Confidence Interval" />
                  <Line type="monotone" dataKey="upper" name="CI Upper" stroke="#38BDF8" strokeWidth={1.5} dot={{ r: 2, fill: "#38BDF8", strokeWidth: 0 }} />
                  <Line type="monotone" dataKey="lower" name="CI Lower" stroke="#38BDF8" strokeWidth={1.5} dot={{ r: 2, fill: "#38BDF8", strokeWidth: 0 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Residual Diagnostics Chart */}
          <div className="flex flex-col rounded-xl border border-slate-700/60 bg-[#161b22] p-5 shadow-sm">
            <p className="mb-4 text-sm font-bold text-white">Residual Diagnostics</p>
            <div className="min-h-[200px] w-full flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={residualHistogram} margin={{ top: 10, right: 16, bottom: 4, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A3441" vertical={false} />
                  <XAxis dataKey="bucket" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#9CA3AF" }} dy={10} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#9CA3AF" }} domain={[0, 12]} ticks={[0, 3, 6, 9, 12]} label={{ value: 'Frequency', angle: -90, position: 'insideLeft', fill: '#9CA3AF', fontSize: 11 }} />
                  <Tooltip cursor={{ fill: '#1E293B' }} contentStyle={{ backgroundColor: "#020617", borderRadius: 12, borderColor: "#1E293B", fontSize: 11 }} />
                  <Bar dataKey="count" fill="#8B5CF6" radius={[2, 2, 0, 0]} maxBarSize={60} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-6 text-center text-[11px] text-slate-400 italic">
              Bell curve distribution indicates normally distributed residuals
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};