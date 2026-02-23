import React, { useState } from "react";

interface FaqItem {
  question: string;
  answer: string;
}

const groups: Record<string, FaqItem[]> = {
  "Getting Started": [
    {
      question: "What data does XoCompass use?",
      answer:
        "XoCompass uses KJS POS and travel data (e.g. CSV upload via the header). You can re-upload POS data anytime with the “Re-upload POS Data” button. Data is used to build unified time series for demand, revenue, and operations.",
    },
    {
      question: "How often is the data refreshed?",
      answer:
        "You can refresh data by re-uploading your CSV from the header. By default, data is refreshed nightly; high-velocity endpoints (POS, online bookings) can be configured for near real-time streaming.",
    },
  ],
  "Understanding Metrics": [
    {
      question: "How is Growth % calculated?",
      answer:
        "Growth is calculated as the blended year-over-year rate across bookings and revenue, adjusted for seasonality and calendar effects. It appears on the Business Analytics Dashboard (Simplified Metrics) in the Data Overview.",
    },
    {
      question: "What do WMAPE, RMSE, and MAE mean?",
      answer:
        "WMAPE (Weighted Mean Absolute Percentage Error) measures percentage accuracy; lower is better and a target under 5% is typical. RMSE (Root Mean Squared Error) and MAE (Mean Absolute Error) measure absolute error magnitude—lower is better. These evaluation metrics are shown on the Advanced Analytics dashboard and in the Time Series Model Lab evaluation step.",
    },
  ],
  "Advanced Analytics": [
    {
      question: "Which forecasting models are supported?",
      answer:
        "The Time Series Model Lab supports ARIMA, SARIMA, and SARIMAX families, with exogenous factors such as marketing spend and macro indicators. The lab compares them and recommends SARIMAX for production when it performs best.",
    },
    {
      question: "What does the Time Series Model Lab workflow cover?",
      answer:
        "The lab walks you through: (1) Data ingestion and summary stats, (2) Correlation analysis, (3) Stationarity testing (e.g. ADF), (4) Time series decomposition, (5) Model comparison (ARIMA vs SARIMA vs SARIMAX), and (6) Evaluation with WMAPE, RMSE, and MAE and a production-ready summary.",
    },
    {
      question: "Can I export technical diagnostics?",
      answer:
        "Yes. From the Advanced Analytics dashboard use “Export Technical Report” to get a full report including model parameters (ARIMA order, seasonal order, exogenous features), Residuals vs Fitted and ACF/PACF plots, and statistical tests (ADF, Ljung-Box, Jarque-Bera).",
    },
  ],
};

export const FaqsPage: React.FC = () => {
  const [openKey, setOpenKey] = useState<string | null>(null);

  const renderGroup = (groupTitle: string, items: FaqItem[]) => (
    <div key={groupTitle} className="space-y-2">
      <h2 className="text-sm font-semibold text-slate-900">{groupTitle}</h2>
      <div className="space-y-2">
        {items.map((item, idx) => {
          const key = `${groupTitle}-${idx}`;
          const open = openKey === key;
          return (
            <div key={key} className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-md">
              <button
                type="button"
                onClick={() => setOpenKey(open ? null : key)}
                className="flex w-full items-center justify-between px-4 py-3 text-left text-sm"
              >
                <span className="font-medium text-slate-800">
                  {item.question}
                </span>
                <span className="ml-4 text-sm text-slate-500">
                  {open ? "Hide" : "Show"}
                </span>
              </button>
              {open && (
                <div className="border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
                  {item.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="relative flex justify-center px-4 bg-slate-100 min-h-full -m-8 p-8">
      <div className="w-full max-w-3xl space-y-6 py-6">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold text-slate-900">
            FAQs &amp; Product Guidance
          </h1>
          <p className="text-sm text-slate-500">
            Learn how to interpret XoCompass metrics and get the most value from
            your KJS data.
          </p>
        </div>

        <div className="space-y-6">
          {Object.entries(groups).map(([title, items]) =>
            renderGroup(title, items)
          )}
        </div>
      </div>

      <div className="pointer-events-auto fixed bottom-6 right-6 w-64 rounded-2xl border border-slate-300 bg-white p-4 text-sm shadow-lg">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Support
        </p>
        <p className="mt-1 text-sm text-slate-700">
          Need help with an analysis or integration?
        </p>
        <p className="mt-2 font-mono text-sm text-teal-700">
          support@xocompass.com
        </p>
      </div>
    </div>
  );
};

