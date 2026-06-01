/**
 * VendorComparison - side-by-side comparison table (IPVM / G2 pattern).
 *
 * Presentational + pure: give it 2-4 vendors and it renders the dimension
 * matrix with per-dimension leaders highlighted, weighted composites, A-F
 * grades, and the overall winner. All math lives in utils/compare.ts.
 */
import React, { useMemo } from 'react';
import { compareVendors, COMPARE_DIMENSIONS, type ComparableVendor } from '../utils/compare';
import { grade } from '../utils/grade';

interface VendorComparisonProps {
  vendors: ComparableVendor[];
  onRemove?: (id: string) => void;
}

function fmt(n: number | null): string {
  return n === null ? '\u2014' : n.toFixed(2);
}

export const VendorComparison: React.FC<VendorComparisonProps> = ({ vendors, onRemove }) => {
  const result = useMemo(() => compareVendors(vendors), [vendors]);

  if (vendors.length < 2) {
    return (
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-8 text-center text-slate-400">
        Select at least two vendors to compare.
      </div>
    );
  }
  // TABLE_BELOW
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-white/10">
            <th className="text-left p-3 text-[10px] uppercase tracking-widest text-slate-500">Dimension</th>
            {vendors.map((v) => {
              const rank = result.ranking.find((r) => r.id === v.id);
              const isWinner = result.winnerId === v.id;
              return (
                <th key={v.id} className="p-3 text-center min-w-[140px]">
                  <div className="flex flex-col items-center gap-1">
                    <span className="font-bold text-white text-sm">{v.company_name}</span>
                    {rank && (
                      <span
                        className="text-xs font-black px-2 py-0.5 rounded-md"
                        style={{ color: grade(rank.composite).colorHex, background: `${grade(rank.composite).colorHex}1a` }}
                        title={`Grade ${rank.grade}`}
                      >
                        {rank.grade} · {fmt(rank.composite)}
                      </span>
                    )}
                    {isWinner && <span className="text-[10px] font-bold text-green-400">▲ Best overall</span>}
                    {onRemove && (
                      <button
                        onClick={() => onRemove(v.id)}
                        className="text-[10px] text-slate-500 hover:text-red-400"
                        aria-label={`Remove ${v.company_name} from comparison`}
                      >remove</button>
                    )}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {result.rows.map((row) => (
            <tr key={row.dimension} className="border-b border-white/5">
              <td className="p-3 text-slate-300">
                {row.dimension}
                <span className="text-slate-600 text-[10px] ml-1">{Math.round(row.weight * 100)}%</span>
              </td>
              {vendors.map((v) => {
                const s = row.scores[v.id];
                const isLeader = row.leaderId === v.id;
                return (
                  <td
                    key={v.id}
                    className={`p-3 text-center font-semibold ${isLeader ? 'text-green-300' : 'text-slate-400'}`}
                    style={isLeader ? { background: 'rgba(42,135,3,0.12)' } : undefined}
                  >
                    {fmt(s)}{isLeader && <span className="ml-1 text-[10px]">★</span>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
