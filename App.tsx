
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { DataRow } from './types';
import { parseCSV, getGoogleSheetExportUrl } from './utils/csvParser';

import ChartRenderer from './components/ChartRenderer';
import PartImage from './components/PartImage';

const BEYBLADE_X_SHEET_URL = "https://docs.google.com/spreadsheets/d/1kQS3IMBy3Aow_7NLPyneukB7973NusO6nHsFc3TtjKU/edit?gid=0#gid=0";

type DashboardTab = 'Meta Environment' | 'Parts Usage Rate' | 'Raw Data';

const App: React.FC = () => {
  const [rawData, setRawData] = useState<DataRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DashboardTab>('summary');

  // Filters
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedBlade, setSelectedBlade] = useState('All');
  const [selectedRatchet, setSelectedRatchet] = useState('All');
  const [selectedBit, setSelectedBit] = useState('All');
  const [selectedAssistBlade, setSelectedAssistBlade] = useState('All');
  const [selectedLockChip, setSelectedLockChip] = useState('All');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const exportUrl = getGoogleSheetExportUrl(BEYBLADE_X_SHEET_URL);
      if (!exportUrl) throw new Error("Invalid Google Sheet URL format.");

      const response = await fetch(exportUrl);
      if (!response.ok) throw new Error("Could not reach the WBO Sheet. Ensure it is public.");
      const csvText = await response.text();
      const { data: parsedData, headers: parsedHeaders } = parseCSV(csvText);

      setRawData(parsedData);
      setHeaders(parsedHeaders);


    } catch (err: any) {
      setError(err.message || 'Failed to sync tournament data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getFuzzyValue = (row: DataRow, pattern: RegExp) => {
    const key = Object.keys(row).find(k => pattern.test(k.trim()));
    return key ? row[key] : undefined;
  };

  const KEY_PATTERNS = {
    rank: /^(rank|position|place|placing|rank\s*\/\s*position)/i,
    player: /^(player|name|blader|winning\s*player)/i,
    date: /^(date|tournament\s*date|day)/i,
    type: /^(type|archetype|combo\s*type)/i
  };

  const parseRank = (val: any): number => {
    if (val === undefined || val === null || val === "") return NaN;
    if (typeof val === 'number') return val;
    const str = String(val).toLowerCase().trim();
    if (str.includes("first")) return 1;
    if (str.includes("second")) return 2;
    if (str.includes("third")) return 3;
    const match = str.match(/(\d+)/);
    return match ? parseInt(match[1]) : NaN;
  };

  const getWikiUrl = (partName: string) => {
    const cleanName = partName.trim().replace(/\s+/g, '_');
    return `https://beyblade.fandom.com/wiki/${cleanName}`;
  };

  // Extract unique available dates and part options
  const filterOptions = useMemo(() => {
    const dates = new Set<string>();
    const blades = new Set<string>();
    const ratchets = new Set<string>();
    const bits = new Set<string>();
    const assistBlades = new Set<string>();
    const lockChips = new Set<string>();

    rawData.forEach(row => {
      const dateVal = getFuzzyValue(row, KEY_PATTERNS.date);
      if (dateVal) {
        const dStr = new Date(dateVal).toISOString().split('T')[0];
        if (dStr !== '1970-01-01' && !isNaN(new Date(dStr).getTime())) {
          dates.add(dStr);
        }
      }

      const b = getFuzzyValue(row, /^blade$/i) || getFuzzyValue(row, /^main\s*blade$/i);
      const r = getFuzzyValue(row, /^ratchet$/i);
      const bt = getFuzzyValue(row, /^bit$/i);
      const ab = getFuzzyValue(row, /^assist\s*blade$/i);
      const lc = getFuzzyValue(row, /^lock\s*chip$/i);

      if (b) blades.add(String(b).trim());
      if (r) ratchets.add(String(r).trim());
      if (bt) bits.add(String(bt).trim());
      if (ab) assistBlades.add(String(ab).trim());
      if (lc) lockChips.add(String(lc).trim());
    });

    return {
      dates: Array.from(dates).sort().reverse(),
      blades: Array.from(blades).sort(),
      ratchets: Array.from(ratchets).sort(),
      bits: Array.from(bits).sort(),
      assistBlades: Array.from(assistBlades).sort(),
      lockChips: Array.from(lockChips).sort()
    };
  }, [rawData]);

  const filteredData = useMemo(() => {
    return rawData.filter(row => {
      const d = getFuzzyValue(row, KEY_PATTERNS.date);
      if (d) {
        const rowDate = new Date(d);
        if (dateRange.start && rowDate < new Date(dateRange.start)) return false;
        if (dateRange.end && rowDate > new Date(dateRange.end)) return false;
      }

      const b = getFuzzyValue(row, /^blade$/i) || getFuzzyValue(row, /^main\s*blade$/i);
      const r = getFuzzyValue(row, /^ratchet$/i);
      const bt = getFuzzyValue(row, /^bit$/i);
      const ab = getFuzzyValue(row, /^assist\s*blade$/i);
      const lc = getFuzzyValue(row, /^lock\s*chip$/i);


      if (selectedBlade !== 'All' && String(b || '').trim() !== selectedBlade) return false;
      if (selectedRatchet !== 'All' && String(r || '').trim() !== selectedRatchet) return false;
      if (selectedBit !== 'All' && String(bt || '').trim() !== selectedBit) return false;
      if (selectedAssistBlade !== 'All' && String(ab || '').trim() !== selectedAssistBlade) return false;
      if (selectedLockChip !== 'All' && String(lc || '').trim() !== selectedLockChip) return false;

      return true;
    });
  }, [rawData, dateRange, selectedBlade, selectedRatchet, selectedBit, selectedAssistBlade, selectedLockChip]);

  const comboPoints = useMemo(() => {
    const scores: Record<string, { points: number, parts: { name: string, url: string, type: 'blade' | 'ratchet' | 'bit' | 'lock_chip' | 'assist_blade' }[] }> = {};
    filteredData.forEach(row => {
      const lock = String(getFuzzyValue(row, /^lock\s*chip$/i) || '').trim();
      const main = String(getFuzzyValue(row, /^main\s*blade$/i) || '').trim();
      const assist = String(getFuzzyValue(row, /^assist\s*blade$/i) || '').trim();
      const blade = String(getFuzzyValue(row, /^blade$/i) || '').trim();
      const ratchet = String(getFuzzyValue(row, /^(ratchet|disc)$/i) || '').trim();
      const bit = String(getFuzzyValue(row, /^(bit|driver)$/i) || '').trim();

      // Links from CSV
      const lockLink = String(getFuzzyValue(row, /^lock\s*chip\s*link$/i) || '').trim();
      const mainLink = String(getFuzzyValue(row, /^main\s*blade\s*link$/i) || getFuzzyValue(row, /^blade\s*link$/i) || '').trim();
      const assistLink = String(getFuzzyValue(row, /^assist\s*blade\s*link$/i) || '').trim();
      const bladeLink = String(getFuzzyValue(row, /^blade\s*link$/i) || '').trim();
      const ratchetLink = String(getFuzzyValue(row, /^ratchet\s*link$/i) || '').trim();
      const bitLink = String(getFuzzyValue(row, /^bit\s*link$/i) || '').trim();

      const rank = parseRank(getFuzzyValue(row, KEY_PATTERNS.rank));
      if (isNaN(rank)) return;

      if (blade === 'Blast' || main === 'Blast') {
        console.log('DEBUG BLAST ROW:', {
          blade, main, assist, lock,
          rowKeys: Object.keys(row)
        });
      }

      let partsList: { name: string, url: string, type: 'blade' | 'ratchet' | 'bit' | 'lock_chip' | 'assist_blade' }[] = [];

      // UX/CX logic: 
      // If `main`, `assist`, or `lock` exists (primarily `main`), it's a CX combo (5 parts).
      if (main || assist || lock) {
        partsList.push({ name: lock || 'Unknown Lock', url: lockLink, type: 'lock_chip' });
        partsList.push({ name: main || 'Unknown Main', url: mainLink, type: 'blade' });
        partsList.push({ name: assist || 'Unknown Assist', url: assistLink, type: 'assist_blade' });
      } else if (blade) {
        partsList.push({ name: blade, url: bladeLink, type: 'blade' });
      } else {
        // Fallback if absolutely nothing is found, but we have ratchet/bit?
        // This case is unlikely if getFuzzyValue logic works, but safe to ignore here as partsList length check handles it.
      }

      if (ratchet) partsList.push({ name: ratchet, url: ratchetLink, type: 'ratchet' });
      if (bit) partsList.push({ name: bit, url: bitLink, type: 'bit' });

      if (partsList.length < 3) return; // Minimum 3 parts even for standard

      // Create a unique key for the combo based on names
      const comboKey = partsList.map(p => p.name).join(' ');

      let p = 0;
      if (rank === 1) p = 5; else if (rank === 2) p = 3; else if (rank === 3) p = 1;

      if (p > 0) {
        if (!scores[comboKey]) scores[comboKey] = { points: 0, parts: partsList };
        scores[comboKey].points += p;
      }
    });
    return Object.entries(scores)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.points - a.points);
  }, [filteredData]);

  const bladeNormalizedScores = useMemo(() => {
    const bladeWPS: Record<string, number> = {};
    filteredData.forEach(row => {
      const bladeVal = getFuzzyValue(row, /^blade$/i) || getFuzzyValue(row, /^main\s*blade$/i);
      if (!bladeVal) return;
      const bladeName = String(bladeVal).trim();
      const rank = parseRank(getFuzzyValue(row, KEY_PATTERNS.rank));
      if (isNaN(rank)) return;
      let p = 0;
      if (rank === 1) p = 5; else if (rank === 2) p = 3; else if (rank === 3) p = 1;
      if (p > 0) bladeWPS[bladeName] = (bladeWPS[bladeName] || 0) + p;
    });

    const entries = Object.entries(bladeWPS).map(([name, score]) => ({ name, score }));
    if (entries.length === 0) return [];
    const maxScore = Math.max(...entries.map(e => e.score));
    return entries
      .map(e => ({
        name: e.name,
        relativeScore: (e.score / maxScore) * 100
      }))
      .sort((a, b) => b.relativeScore - a.relativeScore)
      .slice(0, 20);
  }, [filteredData]);

  const bladePodiumFrequency = useMemo(() => {
    const frequency: Record<string, { name: string, first: number, second: number, third: number, total: number }> = {};
    filteredData.forEach(row => {
      const bladeVal = getFuzzyValue(row, /^blade$/i) || getFuzzyValue(row, /^main\s*blade$/i);
      if (!bladeVal) return;
      const bladeName = String(bladeVal).trim();
      const rank = parseRank(getFuzzyValue(row, KEY_PATTERNS.rank));
      if (!frequency[bladeName]) frequency[bladeName] = { name: bladeName, first: 0, second: 0, third: 0, total: 0 };
      if (rank === 1) frequency[bladeName].first++;
      else if (rank === 2) frequency[bladeName].second++;
      else if (rank === 3) frequency[bladeName].third++;
      if (rank >= 1 && rank <= 3) frequency[bladeName].total++;
    });
    return Object.values(frequency).filter(b => b.total > 0).sort((a, b) => b.total - a.total).slice(0, 15);
  }, [filteredData]);

  const categorizedUsage = useMemo(() => {
    const storage: Record<string, Record<string, number>> = {
      'Lock Chips': {},
      'Main Blades': {},
      'Assist Blades': {},
      'Ratchets': {},
      'Bits': {}
    };

    filteredData.forEach(row => {
      const l = getFuzzyValue(row, /^lock\s*chip$/i);
      const m = getFuzzyValue(row, /^main\s*blade$/i);
      const a = getFuzzyValue(row, /^assist\s*blade$/i);
      const b = getFuzzyValue(row, /^blade$/i);
      const r = getFuzzyValue(row, /^(ratchet|disc)$/i);
      const bt = getFuzzyValue(row, /^(bit|driver)$/i);

      if (l) { const s = String(l).trim(); storage['Lock Chips'][s] = (storage['Lock Chips'][s] || 0) + 1; }
      if (m) { const s = String(m).trim(); storage['Main Blades'][s] = (storage['Main Blades'][s] || 0) + 1; }
      if (a) { const s = String(a).trim(); storage['Assist Blades'][s] = (storage['Assist Blades'][s] || 0) + 1; }
      if (b) { const s = String(b).trim(); storage['Main Blades'][s] = (storage['Main Blades'][s] || 0) + 1; }
      if (r) { const s = String(r).trim(); storage['Ratchets'][s] = (storage['Ratchets'][s] || 0) + 1; }
      if (bt) { const s = String(bt).trim(); storage['Bits'][s] = (storage['Bits'][s] || 0) + 1; }
    });

    return Object.entries(storage).map(([name, rec]) => {
      const sorted = Object.entries(rec)
        .map(([part, count]) => ({ part, count }))
        .sort((a, b) => b.count - a.count);

      // Smart grouping for Pie Chart to avoid overlap
      const totalCount = sorted.reduce((acc, curr) => acc + curr.count, 0);
      const pieData = sorted.length > 6
        ? [
          ...sorted.slice(0, 6),
          { part: 'Others', count: sorted.slice(6).reduce((acc, curr) => acc + curr.count, 0) }
        ]
        : sorted;

      return { name, listData: sorted.slice(0, 10), pieData };
    }).filter(cat => cat.listData.length > 0);
  }, [filteredData]);

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 selection:bg-blue-500/30">
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-cyan-400 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 rotate-3 transition-transform hover:rotate-12">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter text-white uppercase italic">Beyblade X</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">WBO Meta Intelligence Center</p>
          </div>
        </div>
        <button onClick={fetchData} disabled={loading} className="p-2 hover:bg-slate-800 rounded-full transition-all text-slate-400 hover:text-white">
          <svg className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </nav>

      <main className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Multi-Row Filter Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-8">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500 flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
              Meta Filter Grid
            </h3>
            <button onClick={() => { setDateRange({ start: '', end: '' }); setSelectedBlade('All'); setSelectedRatchet('All'); setSelectedBit('All'); setSelectedAssistBlade('All'); setSelectedLockChip('All'); }} className="text-[10px] font-bold text-slate-500 uppercase hover:text-white transition-colors underline decoration-slate-800 underline-offset-4">Reset Grid</button>
          </div>

          <div className="space-y-6">
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-widest border-l-2 border-blue-600 pl-3">Timeline Constraints</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em]">Start Date</label>
                  <select
                    className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs w-full text-slate-300 focus:ring-1 ring-blue-500 outline-none transition-all"
                    value={dateRange.start}
                    onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  >
                    <option value="">Beginning of Time</option>
                    {filterOptions.dates.map(d => <option key={`start-${d}`} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em]">End Date</label>
                  <select
                    className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs w-full text-slate-300 focus:ring-1 ring-blue-500 outline-none transition-all"
                    value={dateRange.end}
                    onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  >
                    <option value="">Until Now</option>
                    {filterOptions.dates.map(d => <option key={`end-${d}`} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-widest border-l-2 border-cyan-500 pl-3">Component Tuning</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                  { label: 'Lock Chip', value: selectedLockChip, setter: setSelectedLockChip, options: filterOptions.lockChips },
                  { label: 'Blade', value: selectedBlade, setter: setSelectedBlade, options: filterOptions.blades },
                  { label: 'Assist', value: selectedAssistBlade, setter: setSelectedAssistBlade, options: filterOptions.assistBlades },
                  { label: 'Ratchet', value: selectedRatchet, setter: setSelectedRatchet, options: filterOptions.ratchets },
                  { label: 'Bit', value: selectedBit, setter: setSelectedBit, options: filterOptions.bits }
                ].map((item) => (
                  <div key={item.label} className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em]">{item.label}</label>
                    <select
                      className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs w-full text-slate-300 focus:ring-1 ring-blue-500 outline-none transition-all"
                      value={item.value}
                      onChange={e => item.setter(e.target.value)}
                    >
                      <option value="All">All {item.label}s</option>
                      {item.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 p-1 bg-slate-950 border border-slate-800 rounded-2xl w-fit">
          {(['summary', 'parts', 'data'] as DashboardTab[]).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-10 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900'}`}>{tab}</button>
          ))}
        </div>

        {loading ? (
          <div className="h-96 flex flex-col items-center justify-center gap-6">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 animate-pulse">Synchronizing Meta Intel...</p>
          </div>
        ) : error ? (
          <div className="p-12 bg-red-900/10 border border-red-900/30 rounded-3xl text-center text-red-400 font-bold">{error}</div>
        ) : (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {activeTab === 'summary' && (
              <div className="space-y-10">
                <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-10 shadow-2xl overflow-hidden relative">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-12 gap-6 relative z-10">
                    <div>
                      <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">Blade Podium Frequency</h2>
                      <p className="text-xs text-slate-500 mt-2 uppercase tracking-[0.2em] font-bold">Absolute podium presence (1st, 2nd, 3rd)</p>
                    </div>
                    <div className="flex flex-wrap gap-4 bg-slate-950/50 p-3 rounded-2xl border border-slate-800">
                      <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#3b82f6] rounded-sm"></div><span className="text-[9px] font-black text-slate-400 uppercase">1st Place</span></div>
                      <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#ef4444] rounded-sm"></div><span className="text-[9px] font-black text-slate-400 uppercase">2nd Place</span></div>
                      <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#f59e0b] rounded-sm"></div><span className="text-[9px] font-black text-slate-400 uppercase">3rd Place</span></div>
                    </div>
                  </div>
                  <div className="overflow-x-auto pb-4">
                    <div className="h-[500px] min-w-[800px]">
                      {bladePodiumFrequency.length > 0 ? (
                        <ChartRenderer config={{ type: 'stackedBar', title: '', xAxis: 'name', yAxis: 'total', description: '' }} data={bladePodiumFrequency} />
                      ) : (
                        <div className="h-full flex items-center justify-center border border-dashed border-slate-800 rounded-2xl bg-slate-950/30 text-slate-600 font-black uppercase text-xs tracking-widest">No Podium Results Detected</div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-12 gap-6 relative z-10">
                    <div>
                      <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">Weight Podium Score (Relative 0~100)</h2>
                      <p className="text-xs text-slate-500 mt-2 uppercase tracking-[0.2em] font-bold">Relative Performance Coefficient (Normalized to Meta King)</p>
                    </div>
                    <div className="bg-blue-600/10 border border-blue-500/20 px-4 py-2 rounded-xl">
                      <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest italic">Normalized Ranking</span>
                    </div>
                  </div>
                  <div className="overflow-x-auto pb-4">
                    <div className="h-[500px] min-w-[800px]">
                      {bladeNormalizedScores.length > 0 ? (
                        <ChartRenderer config={{ type: 'bar', title: '', xAxis: 'name', yAxis: 'relativeScore', description: '', color: '#3b82f6' }} data={bladeNormalizedScores} />
                      ) : (
                        <div className="h-full flex items-center justify-center text-slate-600 font-black uppercase text-xs tracking-widest">Insufficient Data for Weighting</div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-gradient-to-tr from-blue-700 to-blue-600 p-10 rounded-[2.5rem] text-white shadow-2xl shadow-blue-900/40 relative overflow-hidden h-full">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] mb-10 opacity-80 italic">Top Dominant Combos.</h3>
                    <div className="space-y-8">
                      {comboPoints.slice(0, 10).map((combo, i) => (
                        <div key={combo.name} className="group border-b border-white/10 pb-8 last:border-0">
                          <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center font-black italic text-sm shadow-inner">#{i + 1}</div>
                              <span className="font-black text-2xl tabular-nums tracking-tight">{combo.points} <span className="text-[10px] opacity-60 font-bold uppercase">PTS</span></span>
                            </div>
                          </div>
                          <div className={`grid gap-3 ${combo.parts.length > 3 ? 'grid-cols-5' : 'grid-cols-3'}`}>
                            {combo.parts.map((part, pIdx) => (
                              <a
                                key={`${combo.name}-${pIdx}`}
                                href={part.url || getWikiUrl(part.name)} /* Fallback if URL missing */
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group/part block relative transition-transform hover:-translate-y-1"
                              >
                                <PartImage partName={part.name} type={part.type} wikiUrl={part.url} className="h-24 w-full" />
                                <div className="mt-2 text-center">
                                  <p className="text-[10px] font-black uppercase tracking-tight text-white/80 group-hover/part:text-white truncate">{part.name}</p>
                                </div>
                              </a>
                            ))}
                          </div>
                        </div>
                      ))}
                      {comboPoints.length === 0 && <p className="text-center opacity-40 py-10 font-black uppercase text-[10px] tracking-widest">No Combinations Detected</p>}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'parts' && (
              <div className="space-y-20">
                {categorizedUsage.map((category) => (
                  <div key={category.name} className="space-y-10 group">
                    <div className="flex items-center gap-6">
                      <div className="h-px bg-slate-800 flex-grow group-hover:bg-blue-500/30 transition-colors"></div>
                      <h2 className="text-3xl font-black uppercase italic tracking-tighter text-blue-500 flex items-center gap-3">
                        <span className="w-1.5 h-6 bg-blue-600 rounded-full"></span>
                        {category.name}
                      </h2>
                      <div className="h-px bg-slate-800 flex-grow group-hover:bg-blue-500/30 transition-colors"></div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                      {/* Donut Chart with grouping */}
                      <div className="lg:col-span-2 bg-slate-900/50 backdrop-blur border border-slate-800 rounded-[2.5rem] p-10 shadow-2xl relative">
                        <h3 className="text-xs font-black uppercase text-slate-500 mb-8 tracking-[0.2em]">{category.name} Market Distribution</h3>
                        <div className="overflow-x-auto pb-4">
                          <div className="h-[350px] min-w-[500px]">
                            <ChartRenderer config={{ type: 'pie', title: '', xAxis: 'part', yAxis: 'count', description: '' }} data={category.pieData} />
                          </div>
                        </div>
                      </div>

                      {/* Detail List */}
                      <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-[2.5rem] p-10 shadow-2xl overflow-hidden relative">
                        <h3 className="text-xs font-black uppercase text-slate-500 mb-8 tracking-[0.2em]">{category.name} Usage Index</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {category.listData.map((p, i) => (
                            <div key={p.part} className="flex items-center justify-between p-5 bg-slate-950/40 rounded-2xl border border-slate-800 hover:border-blue-500/30 transition-all group/item shadow-sm">
                              <div className="flex items-center gap-4">
                                <span className="text-slate-700 font-black italic text-xs">{i + 1}</span>
                                <a href={getWikiUrl(p.part)} target="_blank" rel="noopener noreferrer" className="font-bold text-slate-300 text-sm group-hover/item:text-cyan-400 transition-colors truncate max-w-[120px]">{p.part}</a>
                              </div>
                              <span className="px-3 py-1 bg-blue-600/10 text-blue-500 rounded-full text-[9px] font-black italic uppercase tracking-widest border border-blue-500/5">{p.count} UNITS</span>
                            </div>
                          ))}
                        </div>
                        {category.listData.length === 0 && <div className="py-20 text-center text-slate-600 font-black uppercase text-[10px] tracking-widest">No Meta Records Found</div>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'data' && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
                <div className="p-8 bg-slate-950/50 border-b border-slate-800 flex justify-between items-center">
                  <h3 className="font-black uppercase tracking-[0.3em] text-[10px] text-slate-500 italic">Historical Match History</h3>
                  <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-black rounded uppercase">WBO Source Synced</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-500 font-black uppercase tracking-[0.2em]">
                      <tr>{headers.slice(0, 10).map(h => <th key={h} className="px-8 py-6 border-b border-slate-800">{h}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {filteredData.slice(0, 100).map((row, i) => {
                        const r = parseRank(getFuzzyValue(row, KEY_PATTERNS.rank));
                        const isRank1 = r === 1;
                        return (
                          <tr key={i} className="hover:bg-blue-600/5 transition-colors group">
                            {headers.slice(0, 10).map(h => (
                              <td key={h} className={`px-8 py-5 truncate max-w-[200px] font-medium transition-colors ${isRank1 ? 'text-yellow-400 font-black italic' : 'text-slate-400 group-hover:text-slate-200'}`}>{row[h]}</td>
                            ))}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="border-t border-slate-800 py-20 px-6 mt-20 text-center bg-slate-950 relative overflow-hidden">
        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-blue-500 mb-4 animate-pulse italic">System Overload // WBO Global Intel</p>
        <p className="text-sm text-slate-600 font-medium leading-relaxed italic px-10 max-w-2xl mx-auto">
          Market Share grouping implemented for clarity: slices &lt; 8% merged into "Others".
        </p>
        <div className="mt-8 flex items-center justify-center gap-6 opacity-50 hover:opacity-100 transition-opacity">
          <span id="busuanzi_container_site_pv" className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
            Total Views: <span id="busuanzi_value_site_pv" className="text-white"></span>
          </span>
          <span id="busuanzi_container_site_uv" className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full"></span>
            Visitors: <span id="busuanzi_value_site_uv" className="text-white"></span>
          </span>
        </div>
      </footer>
    </div>
  );
};

export default App;
