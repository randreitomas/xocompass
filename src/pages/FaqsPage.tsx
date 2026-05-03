import React, { useState } from "react";

interface FaqItem {
  question: string;
  answer: string;
}

const groups: Record<string, FaqItem[]> = {
  "Getting started": [
    {
      question: "What is XoCompass?",
      answer:
        "XoCompass is KJS International Travel and Tours’ analytics workspace for POS and travel demand. It turns booking and operational data into dashboards for booking trends, revenue-style aggregates where available, forecast views, and (for authorised roles) model diagnostics—all scoped to the dataset attached to your active save.",
    },
    {
      question: "How do I log in for the first time?",
      answer:
        "New colleagues receive an invitation from an administrator. Open the invite link, complete registration with your full name and password on the registration page, and you will be signed in automatically. Existing users sign in from the login page using their work email.",
    },
    {
      question: "What if I forgot my password?",
      answer:
        "On the login screen, use Forgot password and enter your email. For security, the message is the same whether or not an account exists. If your organisation uses admin-assisted resets, an Admin can also generate a one-time reset link from Admin Console → User & Access Management.",
    },
  ],
  "Data, saves & uploads": [
    {
      question: "What data powers the dashboards?",
      answer:
        "Charts and KPIs use the booking dataset linked to your currently selected model save (time ranges, aggregates, and forecasts are derived from that uploaded history). If no save is selected or data is missing, dashboards may prompt you to choose or upload data via Saves.",
    },
    {
      question: "Who can open Saves and upload CSV files?",
      answer:
        "Analyst and Admin roles can use View Saves in the top-right header to open the Saves page: browse model saves, upload a KJS booking CSV, rename or delete saves, and trigger retraining when the workflow allows it. Viewers do not have Saves or upload access.",
    },
    {
      question: "How do I refresh or replace my dataset?",
      answer:
        "Go to Saves (header → View Saves), pick or create the save you want to update, and upload a new CSV following the same expectations as your pipeline (columns and formats your administrator documents). After processing, switch back to Business Analytics or Forecast & Actions and ensure the correct save is active.",
    },
  ],
  "Dashboards": [
    {
      question: "What is the Business Analytics dashboard for?",
      answer:
        "It summarises historical demand and operational KPIs: record counts, revenue-style totals where configured, date coverage, lead-time views, and breakdowns such as bookings over time and airline mix. Use it for executive snapshots and operational monitoring.",
    },
    {
      question: "What is Forecast & Actions?",
      answer:
        "This area focuses on short-horizon demand outlook: forecasted volumes, comparison to recent actuals where shown, context such as holidays or weather-related flags when modeled, and lists that highlight higher-risk forecast weeks so teams can plan capacity or campaigns.",
    },
    {
      question: "What is Advanced Metrics and why don’t I see it?",
      answer:
        "Advanced Metrics surfaces model-evaluation detail: error metrics (e.g. WMAPE, MAE, RMSE), residual and diagnostic plots, and SARIMAX-oriented metadata (orders, exogenous variables). Only Analyst and Admin roles see it in the sidebar and can open the route; Viewers use Business Analytics and Forecast & Actions only.",
    },
  ],
  "Roles & access": [
    {
      question: "What is the difference between Viewer, Analyst, and Admin?",
      answer:
        "Viewer: read Business Analytics and Forecast & Actions, plus FAQs. Analyst: same dashboards plus Saves (uploads, model saves) and Advanced Metrics. Admin: everything Analyst has, plus Admin Console for users, invitations, password resets, audit logs, and platform configuration exposed there.",
    },
    {
      question: "I was promoted but menus didn’t change.",
      answer:
        "JWT and cached sessions can lag briefly. Sign out and sign back in, or wait up to several minutes as noted in the sidebar. If access still looks wrong, contact your administrator to confirm the role change in Admin Console.",
    },
  ],
  "Administration": [
    {
      question: "How does user management work?",
      answer:
        "Admins invite users by email and role from User & Access Management. Invites expose a one-time registration URL. Admins can activate or deactivate accounts, edit roles, initiate password-reset links, and soft-delete users when policy allows; deleted rows may appear as anonymised placeholders unless Show deleted users is enabled.",
    },
    {
      question: "Where can I review who did what?",
      answer:
        "Under Admin Console → Activity & Audit Logs, a platform snapshot (active users, last sync, pipeline status, pending invites) sits above the audit table of timestamped actions (who, action type, module, success or failure), with filters and CSV export for governance and troubleshooting.",
    },
  ],
  "Models & metrics glossary": [
    {
      question: "What do WMAPE, MAE, and RMSE mean?",
      answer:
        "WMAPE (weighted mean absolute percentage error) expresses typical percentage error; lower is better. MAE (mean absolute error) is average absolute mistake in the same units as bookings. RMSE penalises large misses more heavily than MAE. Together they summarise forecast fit on Advanced Metrics.",
    },
    {
      question: "What is SARIMAX in this product?",
      answer:
        "SARIMAX refers to seasonal models that capture trends and seasonality in booking series and can include exogenous inputs (e.g. holidays, long weekends, storm flags) when configured. Orders and tests shown on Advanced Metrics describe the fitted model your pipeline selected.",
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
                <span className="ml-4 shrink-0 text-sm text-slate-500">
                  {open ? "Hide" : "Show"}
                </span>
              </button>
              {open && (
                <div className="border-t border-slate-200 px-4 py-3 text-sm leading-relaxed text-slate-600">
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
    <div className="relative flex min-h-full justify-center bg-slate-100 -m-8 p-8">
      <div className="w-full max-w-3xl space-y-6 py-6">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold text-slate-900">
            FAQs &amp; product guidance
          </h1>
          <p className="text-sm text-slate-500">
            How XoCompass fits KJS workflows: dashboards, saves, roles, and
            administration.
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
          For access issues or data questions, contact your KJS administrator or
          internal IT.
        </p>
        <p className="mt-2 font-mono text-sm text-teal-700">
          support@xocompass.com
        </p>
      </div>
    </div>
  );
};
