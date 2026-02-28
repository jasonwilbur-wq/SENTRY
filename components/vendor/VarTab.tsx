/**
 * VarTab — VAR report cards with radar charts + download buttons.
 * Rendered inside VendorDetailModal when the "VAR Reports" tab is active.
 */
import React from 'react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  ResponsiveContainer, Tooltip,
} from 'recharts';
import { Vendor, VarReport, getDownloadUrl } from '../../services/api';
import { bandStyle, VAR_DIMENSIONS, RatingBar } from './shared';

// ── Single VAR report card ────────────────────────────────────────────────

function VarCard({ report }: { report: VarReport }) {
  const hasScores = VAR_DIMENSIONS.some(d => report[d.key] !== null);
  const radarData = VAR_DIMENSIONS.map(d => ({
    subject: d.label,
    value: (report[d.key] as number | null) ?? 0,
  }));

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-bold text-white">{report.filename}</h4>
          <p className="text-xs text-slate-400 mt-0.5">
            {report.report_date} \u00b7 {report.report_type} \u00b7 {report.report_version}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {report.overall_score !== null && (
            <span className={`text-sm font-bold px-3 py-1 rounded-full ${bandStyle(report.decision_band)}`}>
              {report.overall_score.toFixed(2)} \u2014 {report.decision_band}
            </span>
          )}
          {/* Download via backend proxy (Graph API → .docx) */}
          <a
            href={getDownloadUrl(report.id)}
            download
            className="inline-flex items-center gap-1.5 bg-green-700 text-white text-xs font-bold
                       px-4 py-2 rounded-xl hover:bg-green-600 transition"
            title={`Download ${report.filename}`}
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download
          </a>
          {report.sharepoint_url && (
            <a
              href={report.sharepoint_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 bg-wmt-blue text-white text-xs font-bold
                         px-4 py-2 rounded-xl hover:bg-wmt-blue/80 transition"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Open in SharePoint
            </a>
          )}
        </div>
      </div>

      {/* Radar + score bars */}
      {hasScores && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fill: '#94A3B8', fontSize: 10 }}
                />
                <Radar
                  name="Score"
                  dataKey="value"
                  stroke="#0053E2"
                  fill="#0053E2"
                  fillOpacity={0.3}
                />
                <Tooltip
                  contentStyle={{
                    background: '#1E293B',
                    border: '1px solid #334155',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => [v.toFixed(2), 'Score']}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2.5">
            {VAR_DIMENSIONS.map(d => (
              <div key={d.key}>
                <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                  <span>{d.label}</span>
                  <span>{d.weight}</span>
                </div>
                {report[d.key] !== null
                  ? <RatingBar score={report[d.key] as number} />
                  : <div className="h-1.5 bg-slate-700 rounded-full" />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab container ────────────────────────────────────────────────────────────

interface TabProps {
  vendor: Vendor;
  varReports: VarReport[];
  loading: boolean;
}

export function VarTab({ vendor, varReports, loading }: TabProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-40 bg-slate-800/50 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (!varReports.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-500 text-center">
        <div className="w-16 h-16 bg-wmt-yellow/10 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-wmt-yellow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586
                     a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="font-semibold text-slate-300 text-lg">No VAR reports linked yet</p>
        <p className="text-sm mt-2 max-w-sm">
          <strong className="text-white">{vendor.company_name}</strong> has not been matched
          to a VAR report in the SharePoint Vault. Once matched, the full scored report
          will appear here with a direct download link.
        </p>
        <div className="mt-4 bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-slate-400 text-left max-w-sm">
          <p className="font-semibold text-slate-300 mb-1">SharePoint Vault Location:</p>
          <p className="font-mono break-all">
            Emerging Security Technology \u203a Vault \u203a Solution and Report Data \u203a Reports
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {varReports.map(r => <VarCard key={r.id} report={r} />)}
    </div>
  );
}
