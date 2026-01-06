import React, { useState, useMemo } from 'react';
import { Record, Config, Profile, CalcMode } from '../types';
import { parseDateString, getAggregatedValues, calculateWeekStats, pad } from '../utils';
import { WeekDetailsModal } from './SettingsAndModals';
import { PieChart, Pie, Cell, Legend, ResponsiveContainer, Tooltip as RechartsTooltip, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, ReferenceLine } from 'recharts';
import { Eye } from 'lucide-react';

// --- Distribution Tab ---
export const DistributionTab: React.FC<{ allData: Record[], config: Config, availableYears: number[], mode: CalcMode, isWeighted: boolean, profiles: Profile[] }> = ({ allData, config, availableYears, mode, isWeighted, profiles }) => {
    const [period, setPeriod] = useState({ startYear: availableYears[0] || 1404, startMonth: 1, endYear: availableYears[availableYears.length - 1] || 1404, endMonth: 12 });

    const stats = useMemo(() => {
        const isDateInRange = (dStr: string) => {
            const p = parseDateString(dStr);
            if (!p) return false;
            const dVal = p.year * 100 + p.month;
            const startVal = period.startYear * 100 + period.startMonth;
            const endVal = period.endYear * 100 + period.endMonth;
            return dVal >= startVal && dVal <= endVal;
        };

        const filteredData = allData.filter(d => isDateInRange(d.dateStr));
        
        // Use calculateWeekStats for the whole filtered set (treat as one giant week) to reuse weighted logic
        // This is a bit of a hack, calculateWeekStats sums up everything.
        const res = calculateWeekStats(filteredData, config, profiles, mode, isWeighted);
        return { 
            std: res.counts.fixed, 
            cust: res.counts.custom, 
            total: res.counts.total 
        };
    }, [allData, period, config, mode, isWeighted, profiles]);

    const pieDataStd = [{ name: 'پایین‌تر از بازه', value: stats.std.low, color: '#ef4444' }, { name: 'در محدوده نرمال', value: stats.std.inRange, color: '#10b981' }, { name: 'بالاتر از بازه', value: stats.std.high, color: '#f97316' }];
    const pieDataCust = [{ name: 'پایین‌تر از بازه', value: stats.cust.low, color: '#ef4444' }, { name: 'در محدوده نرمال', value: stats.cust.inRange, color: '#10b981' }, { name: 'بالاتر از بازه', value: stats.cust.high, color: '#f97316' }];

    const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
        const RADIAN = Math.PI / 180;
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);
        if (percent < 0.05) return null;
        return <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-[10px] font-bold">{`${(percent * 100).toFixed(0)}%`}</text>;
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-6 items-end">
                <div>
                    <label className="text-xs font-bold text-slate-500 block mb-2">از تاریخ</label>
                    <div className="flex gap-2">
                        <select value={period.startYear} onChange={e => setPeriod({ ...period, startYear: Number(e.target.value) })} className="bg-slate-50 border rounded-lg p-2 font-bold">{availableYears.map(y => <option key={y} value={y}>{y}</option>)}</select>
                        <select value={period.startMonth} onChange={e => setPeriod({ ...period, startMonth: Number(e.target.value) })} className="bg-slate-50 border rounded-lg p-2">{Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}</option>)}</select>
                    </div>
                </div>
                <div className="pb-3 text-slate-400">تا</div>
                <div>
                    <label className="text-xs font-bold text-slate-500 block mb-2">تا تاریخ</label>
                    <div className="flex gap-2">
                        <select value={period.endYear} onChange={e => setPeriod({ ...period, endYear: Number(e.target.value) })} className="bg-slate-50 border rounded-lg p-2 font-bold">{availableYears.map(y => <option key={y} value={y}>{y}</option>)}</select>
                        <select value={period.endMonth} onChange={e => setPeriod({ ...period, endMonth: Number(e.target.value) })} className="bg-slate-50 border rounded-lg p-2">{Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}</option>)}</select>
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <h4 className="font-bold text-blue-700 mb-4 border-b pb-2 flex justify-between"><span>خلاصه وضعیت (استاندارد)</span><span className="text-xs font-normal text-slate-500">{isWeighted ? 'وزن کل (تن):' : 'تعداد کل:'} {stats.total}</span></h4>
                    <div className="h-[250px] w-full" dir="ltr"><ResponsiveContainer><PieChart><Pie data={pieDataStd} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value" label={renderCustomLabel} labelLine={false}>{pieDataStd.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}</Pie><RechartsTooltip /><Legend verticalAlign="bottom" height={36} formatter={(val, entry: any) => <span className="text-slate-600 text-xs font-bold ml-1">{val} ({Math.round(entry.payload.value)})</span>} /></PieChart></ResponsiveContainer></div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <h4 className="font-bold text-purple-700 mb-4 border-b pb-2 flex justify-between"><span>خلاصه وضعیت (سفارشی)</span><span className="text-xs font-normal text-slate-500">{isWeighted ? 'وزن کل (تن):' : 'تعداد کل:'} {stats.total}</span></h4>
                    <div className="h-[250px] w-full" dir="ltr"><ResponsiveContainer><PieChart><Pie data={pieDataCust} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value" label={renderCustomLabel} labelLine={false}>{pieDataCust.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}</Pie><RechartsTooltip /><Legend verticalAlign="bottom" height={36} formatter={(val, entry: any) => <span className="text-slate-600 text-xs font-bold ml-1">{val} ({Math.round(entry.payload.value)})</span>} /></PieChart></ResponsiveContainer></div>
                </div>
            </div>
        </div>
    );
};

// --- Advanced Tab ---
export const AdvancedTab: React.FC<{ data: Record[], config: Config, setConfig: (c: Config) => void, profiles: Profile[], mode: CalcMode, isWeighted: boolean }> = ({ data, config, setConfig, profiles, mode, isWeighted }) => {
    const [selectedWeekIdx, setSelectedWeekIdx] = useState<number | null>(null);

    const processedWeeks = useMemo(() => {
        const weeks = [{ id: 1, name: 'هفته اول (۱-۷)', days: [1, 2, 3, 4, 5, 6, 7], records: [] as Record[] }, { id: 2, name: 'هفته دوم (۸-۱۴)', days: [8, 9, 10, 11, 12, 13, 14], records: [] as Record[] }, { id: 3, name: 'هفته سوم (۱۵-۲۲)', days: [15, 16, 17, 18, 19, 20, 21, 22], records: [] as Record[] }, { id: 4, name: 'هفته چهارم (۲۳-)', days: Array.from({ length: 10 }, (_, i) => i + 23), records: [] as Record[] }];
        data.forEach(rec => { const p = parseDateString(rec.dateStr); if (p) weeks.find(w => w.days.includes(p.day))?.records.push(rec); });
        return weeks.map(week => {
            const stats = calculateWeekStats(week.records, config, profiles, mode, isWeighted);
            return { ...week, ...stats, label: `${config.year}/${pad(config.month)} - ${week.name}` };
        });
    }, [data, config, profiles, mode, isWeighted]);

    const monthFixedTotal = processedWeeks.reduce((acc, w) => acc + w.impact.fixed, 0);
    const monthCustomTotal = processedWeeks.reduce((acc, w) => acc + w.impact.custom, 0);
    const selectedWeek = selectedWeekIdx !== null ? processedWeeks[selectedWeekIdx] : null;

    return (
        <div className="space-y-6">
            <div className="bg-slate-100 p-2 rounded-lg text-center text-sm text-slate-500 font-bold border border-slate-200">
                مبنای محاسبه: {mode === '2h' ? '۲ ساعته' : mode === 'shift' ? 'شیفتی' : 'روزانه'} | {isWeighted ? 'میانگین وزنی (تناژ)' : 'تعداد نمونه'}
            </div>
            {processedWeeks.map((w, idx) => (
                <div key={w.id} onClick={() => setSelectedWeekIdx(idx)} className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200 cursor-pointer hover:shadow-md transition group relative">
                    <div className="absolute left-4 top-4 text-slate-300 group-hover:text-blue-500 transition"><Eye /></div>
                    <div className="bg-slate-50 p-4 flex justify-between items-center border-b"><span className="font-bold text-lg text-slate-800">{w.name}</span><span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg border border-blue-100 text-sm font-bold">تولید کل: {w.totalTonnage.toLocaleString()} تن</span></div>
                    <div className="grid grid-cols-2 text-sm">
                        <div className={`p-6 border-l ${w.isRej.fixed ? 'bg-slate-900 text-white' : ''}`}>
                            <div className={`flex justify-between mb-4 border-b pb-2 ${w.isRej.fixed ? 'border-slate-700' : ''}`}><span className={`${w.isRej.fixed ? 'text-slate-300' : 'text-slate-500'} font-bold`}>روش استاندارد (اولیه)</span><span className={`font-bold ${w.isRej.fixed ? 'text-red-400' : w.style.fixed}`}>{w.ruleLabels.fixed}</span></div>
                            <div className="flex justify-between items-center"><div className="text-center"><div className={`text-xs ${w.isRej.fixed ? 'text-slate-500' : 'text-slate-400'}`}>انطباق</div><div className="font-bold text-xl">{w.pct.fixed.toFixed(1)}%</div></div><div className="text-center"><div className={`text-xs ${w.isRej.fixed ? 'text-slate-500' : 'text-slate-400'}`}>سود/زیان</div><div className={`font-bold text-xl dir-ltr ${w.isRej.fixed ? 'text-red-400' : (w.impact.fixed > 0 ? 'text-green-600' : 'text-red-600')}`}>{w.impact.fixed > 0 ? '+' : ''}{Math.round(w.impact.fixed).toLocaleString()} T</div></div></div>
                        </div>
                        <div className="p-6 bg-purple-50/30">
                            <div className="flex justify-between mb-4 border-b border-purple-100 pb-2"><span className="text-purple-600 font-bold">روش سفارشی (جدید)</span><span className={`font-bold ${w.style.custom}`}>{w.ruleLabels.custom}</span></div>
                            <div className="flex justify-between items-center"><div className="text-center"><div className="text-xs text-slate-400">انطباق</div><div className="font-bold text-xl">{w.pct.custom.toFixed(1)}%</div></div><div className="text-center"><div className="text-xs text-slate-400">سود/زیان</div><div className={`font-bold text-xl dir-ltr ${w.impact.custom > 0 ? 'text-green-600' : 'text-red-600'}`}>{w.impact.custom > 0 ? '+' : ''}{Math.round(w.impact.custom).toLocaleString()} T</div></div></div>
                        </div>
                    </div>
                </div>
            ))}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div className={`p-6 rounded-xl shadow-md border flex items-center justify-between ${monthFixedTotal > 0 ? 'bg-green-100 border-green-200 text-green-900' : 'bg-red-100 border-red-200 text-red-900'}`}><span className="font-bold">مجموع سود/زیان (استاندارد):</span><span className="font-bold text-2xl dir-ltr">{monthFixedTotal > 0 ? '+' : ''}{Math.round(monthFixedTotal).toLocaleString()} T</span></div>
                <div className={`p-6 rounded-xl shadow-md border flex items-center justify-between ${monthCustomTotal > 0 ? 'bg-green-100 border-green-200 text-green-900' : 'bg-red-100 border-red-200 text-red-900'}`}><span className="font-bold">مجموع سود/زیان (سفارشی):</span><span className="font-bold text-2xl dir-ltr">{monthCustomTotal > 0 ? '+' : ''}{Math.round(monthCustomTotal).toLocaleString()} T</span></div>
            </div>
            <WeekDetailsModal week={selectedWeek} isOpen={selectedWeekIdx !== null} onClose={() => setSelectedWeekIdx(null)} config={config} onPrev={() => selectedWeekIdx !== null && setSelectedWeekIdx(selectedWeekIdx - 1)} onNext={() => selectedWeekIdx !== null && setSelectedWeekIdx(selectedWeekIdx + 1)} hasPrev={selectedWeekIdx !== null && selectedWeekIdx > 0} hasNext={selectedWeekIdx !== null && selectedWeekIdx < processedWeeks.length - 1} />
        </div>
    );
};

// --- Financial Report Tab ---
export const FinancialReportTab: React.FC<{ allData: Record[], profiles: Profile[], config: Config, availableYears: number[], period: any, setPeriod: any, mode: CalcMode, isWeighted: boolean }> = ({ allData, profiles, config, availableYears, period, setPeriod, mode, isWeighted }) => {
    const [selectedWeek, setSelectedWeek] = useState<any>(null);

    const weekList = useMemo(() => {
        const list = [];
        let currentY = period.startYear, currentM = period.startMonth;
        while (currentY < period.endYear || (currentY === period.endYear && currentM <= period.endMonth)) {
            [1, 2, 3, 4].forEach(wId => list.push({ year: currentY, month: currentM, weekId: wId, id: `${currentY}/${currentM}-W${wId}` }));
            currentM++; if (currentM > 12) { currentM = 1; currentY++; }
        }
        return list;
    }, [period]);

    const reportData = useMemo(() => {
        const months = [];
        let currentY = period.startYear, currentM = period.startMonth;
        while (currentY < period.endYear || (currentY === period.endYear && currentM <= period.endMonth)) {
            months.push({ year: currentY, month: currentM });
            currentM++; if (currentM > 12) { currentM = 1; currentY++; }
        }
        let totalInitialImpact = 0, totalCustomImpact = 0, initialStats = { reward: 0, penalty: 0 }, customStats = { reward: 0, penalty: 0 };
        const rows = months.map(m => {
            const monthData = allData.filter(d => { const p = parseDateString(d.dateStr); return p && p.year === m.year && p.month === m.month; });
            let monthInitialSum = 0, monthCustomSum = 0;
            const weeks = [1, 2, 3, 4].map(wId => {
                const days = wId === 1 ? [1, 2, 3, 4, 5, 6, 7] : wId === 2 ? [8, 9, 10, 11, 12, 13, 14] : wId === 3 ? [15, 16, 17, 18, 19, 20, 21, 22] : Array.from({ length: 10 }, (_, i) => i + 23);
                const weekRecords = monthData.filter(d => days.includes(parseDateString(d.dateStr)?.day || -1));
                const stats = calculateWeekStats(weekRecords, config, profiles, mode, isWeighted);
                if (weekRecords.length > 0) {
                    monthInitialSum += stats.impact.fixed; monthCustomSum += stats.impact.custom; totalInitialImpact += stats.impact.fixed; totalCustomImpact += stats.impact.custom;
                    if (stats.impact.fixed > 0) initialStats.reward++; else if (stats.impact.fixed < 0) initialStats.penalty++;
                    if (stats.impact.custom > 0) customStats.reward++; else if (stats.impact.custom < 0) customStats.penalty++;
                }
                return { impact_fixed: stats.impact.fixed, impact_custom: stats.impact.custom, hasData: weekRecords.length > 0, isRej: stats.isRej.fixed, year: m.year, month: m.month, weekId: wId };
            });
            return { label: `${m.year}/${pad(m.month)}`, weeks, monthInitialSum, monthCustomSum };
        });
        return { rows, totalInitialImpact, totalCustomImpact, initialStats, customStats };
    }, [allData, period, profiles, config, mode, isWeighted]);

    const openWeekModal = (idx: number) => {
        const target = weekList[idx];
        const days = target.weekId === 1 ? [1, 2, 3, 4, 5, 6, 7] : target.weekId === 2 ? [8, 9, 10, 11, 12, 13, 14] : target.weekId === 3 ? [15, 16, 17, 18, 19, 20, 21, 22] : Array.from({ length: 10 }, (_, i) => i + 23);
        const records = allData.filter(d => { const p = parseDateString(d.dateStr); return p && p.year === target.year && p.month === target.month && days.includes(p.day); });
        const stats = calculateWeekStats(records, config, profiles, mode, isWeighted);
        setSelectedWeek({ id: idx, name: `هفته ${target.weekId}`, label: `${target.year}/${pad(target.month)} - هفته ${target.weekId}`, records, ...stats });
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-6 items-end">
                <div><label className="text-xs font-bold text-slate-500 block mb-2">از تاریخ</label><div className="flex gap-2"><select value={period.startYear} onChange={e => setPeriod({ ...period, startYear: Number(e.target.value) })} className="bg-slate-50 border rounded-lg p-2 font-bold">{availableYears.map(y => <option key={y} value={y}>{y}</option>)}</select><select value={period.startMonth} onChange={e => setPeriod({ ...period, startMonth: Number(e.target.value) })} className="bg-slate-50 border rounded-lg p-2">{Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}</option>)}</select></div></div>
                <div><label className="text-xs font-bold text-slate-500 block mb-2">تا تاریخ</label><div className="flex gap-2"><select value={period.endYear} onChange={e => setPeriod({ ...period, endYear: Number(e.target.value) })} className="bg-slate-50 border rounded-lg p-2 font-bold">{availableYears.map(y => <option key={y} value={y}>{y}</option>)}</select><select value={period.endMonth} onChange={e => setPeriod({ ...period, endMonth: Number(e.target.value) })} className="bg-slate-50 border rounded-lg p-2">{Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}</option>)}</select></div></div>
            </div>
            <div className="bg-white rounded-xl shadow-sm overflow-x-auto border border-slate-200">
                <table className="w-full text-center text-sm">
                    <thead className="bg-slate-100 border-b"><tr><th className="p-4 border-l font-bold text-slate-600">ماه</th>{[1, 2, 3, 4].map(i => <th key={i} className="p-4 border-l font-bold text-slate-600">هفته {i}</th>)}<th className="p-4 font-bold text-slate-800 bg-slate-200">مجموع ماه</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                        {reportData.rows.map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                                <td className="p-4 font-bold border-l text-slate-800">{row.label}</td>
                                {row.weeks.map((w, wIdx) => (
                                    <td key={wIdx} className="p-3 border-l align-top min-w-[140px] cursor-pointer hover:bg-blue-50 transition" onClick={() => { const id = weekList.findIndex(wk => wk.year === w.year && wk.month === w.month && wk.weekId === w.weekId); if (id !== -1) openWeekModal(id); }}>
                                        {w.hasData ? (
                                            <div className="space-y-2 text-xs relative group">
                                                <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition text-blue-400"><Eye width="12" /></div>
                                                <div className={`p-2 rounded flex justify-between ${w.isRej ? 'bg-slate-900 text-white' : (w.impact_fixed > 0 ? 'bg-green-100 text-green-800' : w.impact_fixed < 0 ? 'bg-red-100 text-red-800' : 'bg-slate-50 text-slate-500')}`}><span>اولیه</span><span dir="ltr" className="font-bold">{w.impact_fixed > 0 ? '+' : ''}{Math.round(w.impact_fixed).toLocaleString()}</span></div>
                                                <div className={`p-2 rounded flex justify-between ${w.impact_custom > 0 ? 'bg-green-100 text-green-800' : w.impact_custom < 0 ? 'bg-red-100 text-red-800' : 'bg-purple-50 text-purple-700'}`}><span className={w.impact_custom === 0 ? 'text-purple-700' : ''}>جدید</span><span dir="ltr" className="font-bold">{w.impact_custom > 0 ? '+' : ''}{Math.round(w.impact_custom).toLocaleString()}</span></div>
                                            </div>
                                        ) : <div className="text-slate-300 text-xs">-</div>}
                                    </td>
                                ))}
                                <td className="p-3 bg-slate-50 min-w-[140px]"><div className="space-y-2 text-xs"><div className={`p-2 rounded flex justify-between font-bold border ${row.monthInitialSum > 0 ? 'bg-green-100 text-green-900 border-green-200' : 'bg-red-100 text-red-900 border-red-200'}`}><span>اولیه</span><span dir="ltr">{row.monthInitialSum > 0 ? '+' : ''}{Math.round(row.monthInitialSum).toLocaleString()}</span></div><div className={`p-2 rounded flex justify-between font-bold border ${row.monthCustomSum > 0 ? 'bg-green-100 text-green-900 border-green-200' : 'bg-red-100 text-red-900 border-red-200'}`}><span>جدید</span><span dir="ltr">{row.monthCustomSum > 0 ? '+' : ''}{Math.round(row.monthCustomSum).toLocaleString()}</span></div></div></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-l-4 border-l-slate-400"><h4 className="font-bold text-slate-700 mb-4 border-b pb-2">خلاصه روش اولیه</h4><div className="flex justify-between items-center mb-4"><span>مجموع تاثیر تناژ:</span><span className={`font-bold text-2xl dir-ltr ${reportData.totalInitialImpact > 0 ? 'text-emerald-600' : 'text-red-600'}`}>{reportData.totalInitialImpact > 0 ? '+' : ''}{Math.round(reportData.totalInitialImpact).toLocaleString()} T</span></div><div className="flex gap-4 text-sm font-bold"><span className="px-3 py-1 bg-green-100 text-green-700 rounded-lg">پاداش: {reportData.initialStats.reward} هفته</span><span className="px-3 py-1 bg-red-100 text-red-700 rounded-lg">جریمه: {reportData.initialStats.penalty} هفته</span></div></div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-l-4 border-l-purple-500"><h4 className="font-bold text-purple-700 mb-4 border-b pb-2">خلاصه روش جدید</h4><div className="flex justify-between items-center mb-4"><span>مجموع تاثیر تناژ:</span><span className={`font-bold text-2xl dir-ltr ${reportData.totalCustomImpact > 0 ? 'text-emerald-600' : 'text-red-600'}`}>{reportData.totalCustomImpact > 0 ? '+' : ''}{Math.round(reportData.totalCustomImpact).toLocaleString()} T</span></div><div className="flex gap-4 text-sm font-bold"><span className="px-3 py-1 bg-green-100 text-green-700 rounded-lg">پاداش: {reportData.customStats.reward} هفته</span><span className="px-3 py-1 bg-red-100 text-red-700 rounded-lg">جریمه: {reportData.customStats.penalty} هفته</span></div></div>
            </div>
            <WeekDetailsModal week={selectedWeek} isOpen={selectedWeek !== null} onClose={() => setSelectedWeek(null)} config={config} onPrev={() => selectedWeek && selectedWeek.id > 0 && openWeekModal(selectedWeek.id - 1)} onNext={() => selectedWeek && selectedWeek.id < weekList.length - 1 && openWeekModal(selectedWeek.id + 1)} hasPrev={selectedWeek && selectedWeek.id > 0} hasNext={selectedWeek && selectedWeek.id < weekList.length - 1} />
        </div>
    );
};