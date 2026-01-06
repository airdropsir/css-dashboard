import React, { useState } from 'react';
import { Record, Config, Profile, CalcMode } from '../types';
import { TIME_SLOTS, SHIFT_SLOTS, DAILY_SLOT, pad, isValid, checkRuleMatch, getAggregatedValues, calculateWeekStats, getCalculationDetails } from '../utils';
import { CalculationDetailModal } from './SettingsAndModals';

interface DataGridProps {
    data: Record[];
    config: Config;
    onUpdateTonnage: (dateStr: string, val: number) => void;
    profiles: Profile[];
    mode: CalcMode;
    isWeighted: boolean;
    showCustom: boolean; // Prop to control custom visibility
}

const getCellColorClass = (val: number | string | undefined, min: number, max: number) => {
    if (!isValid(val) || isNaN(Number(val))) return 'text-slate-300';
    const num = Number(val);
    if (num >= min && num <= max) return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    if (num > max) return 'bg-orange-50 text-orange-600 border-orange-100';
    if (num < min) return 'bg-red-50 text-red-600 border-red-100';
    return 'text-slate-700';
};

const DataGrid: React.FC<DataGridProps> = ({ data, config, onUpdateTonnage, profiles, mode, isWeighted, showCustom }) => {
    const [selectedCell, setSelectedCell] = useState<any>(null);

    const weekGroups = [
        { id: 1, name: 'هفته اول', days: [1, 2, 3, 4, 5, 6, 7] },
        { id: 2, name: 'هفته دوم', days: [8, 9, 10, 11, 12, 13, 14] },
        { id: 3, name: 'هفته سوم', days: [15, 16, 17, 18, 19, 20, 21, 22] },
        { id: 4, name: 'هفته چهارم', days: Array.from({ length: 10 }, (_, i) => i + 23) }
    ];

    const getDaysInMonth = (m: number) => {
        if (m <= 6) return 31;
        if (m <= 11) return 30;
        return 29;
    };
    const maxDays = getDaysInMonth(config.month);

    let monthTotalTonnage = 0;
    let monthFixedImpact = 0;
    let monthCustomImpact = 0;

    // Define columns based on mode
    const columns = mode === '2h' ? TIME_SLOTS : mode === 'shift' ? SHIFT_SLOTS : DAILY_SLOT;

    const handleCellClick = (record: Record, idx: number) => {
        const details = getCalculationDetails(record, mode, idx, isWeighted);
        setSelectedCell(details);
    };

    return (
        <div className="flex flex-col gap-4">
            <CalculationDetailModal isOpen={!!selectedCell} onClose={() => setSelectedCell(null)} details={selectedCell} />

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-center text-sm">
                        <thead className="bg-slate-100 text-slate-600 border-b">
                            <tr>
                                <th className="py-3 px-4 sticky right-0 bg-slate-100 z-10 border-l">تاریخ</th>
                                <th className="py-3 px-2 min-w-[80px] text-blue-700 border-l">تناژ</th>
                                {columns.map(slot => <th key={slot} className="py-3 px-1">{slot}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {weekGroups.map(week => {
                                const weekDays = week.days.filter(d => d <= maxDays);
                                if (weekDays.length === 0) return null;

                                let weekTon = 0;
                                // We calculate stats using the centralized utility to ensure consistency with weighted/mode logic
                                const weekRecords = weekDays.map(dayNum => {
                                    const dateStr = `${config.year}/${pad(config.month)}/${pad(dayNum)}`;
                                    return data.find(r => r.dateStr === dateStr) || { day: dayNum, dateStr, tonnage: 0, dataPoints: [] };
                                });

                                const stats = calculateWeekStats(weekRecords, config, profiles, mode, isWeighted);
                                
                                monthTotalTonnage += stats.totalTonnage;
                                monthFixedImpact += stats.impact.fixed;
                                monthCustomImpact += stats.impact.custom;
                                weekTon = stats.totalTonnage;

                                return (
                                    <React.Fragment key={week.id}>
                                        <tr className="bg-slate-50 border-y border-slate-200">
                                            <td colSpan={columns.length + 2} className="py-2 px-4 text-right font-bold text-slate-500 text-xs">
                                                {week.name}
                                            </td>
                                        </tr>
                                        {weekRecords.map((record) => {
                                            // Get display values based on mode
                                            const displayValues = getAggregatedValues(record, mode);
                                            
                                            const pointCells = Array.from({ length: columns.length }).map((_, idx) => {
                                                const val = displayValues[idx];
                                                const hasVal = !isNaN(val) && isValid(val);
                                                return (
                                                    <td key={idx} className="p-1" onClick={() => hasVal && handleCellClick(record, idx)}>
                                                        <div className={`w-full py-1 rounded text-xs font-bold border ${hasVal ? 'cursor-pointer hover:shadow-md transition' : ''} ${getCellColorClass(val, config.customMinRange, config.customMaxRange)}`}>
                                                            {hasVal ? Number(val).toFixed(1) : '-'}
                                                        </div>
                                                    </td>
                                                );
                                            });

                                            return (
                                                <tr key={record.dateStr} className="hover:bg-blue-50/30 border-b border-slate-50 last:border-none">
                                                    <td className="py-2 px-4 font-bold text-slate-700 bg-white sticky right-0 border-l shadow-[2px_0_5px_rgba(0,0,0,0.02)] z-10">{record.dateStr}</td>
                                                    <td className="p-1 border-l bg-blue-50/10">
                                                        <input
                                                            type="number"
                                                            readOnly
                                                            value={record.tonnage || ''}
                                                            className="w-full text-center bg-transparent border-none outline-none text-slate-600 font-bold font-mono text-xs cursor-default"
                                                            placeholder="-"
                                                        />
                                                    </td>
                                                    {pointCells}
                                                </tr>
                                            );
                                        })}
                                        <tr className="bg-slate-100 border-t-2 border-slate-300 font-bold text-xs text-slate-600">
                                            <td className="py-2 px-4 text-right sticky right-0 bg-slate-100 z-10 border-l">مجموع هفته {week.id}</td>
                                            <td className="py-2 px-2 text-blue-700 dir-ltr border-l">{weekTon.toLocaleString()} T</td>
                                            <td colSpan={columns.length} className="py-2 px-4">
                                                <div className="flex flex-col gap-3">
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="flex gap-2 items-center justify-end bg-blue-50 px-2 py-1 rounded border border-blue-100">
                                                            <span className="text-slate-400 text-[10px]">استاندارد</span>
                                                            <span className="text-emerald-600">نرمال: {stats.counts.fixed.inRange}</span>
                                                            <span className="text-orange-600">بالا: {stats.counts.fixed.high}</span>
                                                            <span className="text-red-600">پایین: {stats.counts.fixed.low}</span>
                                                        </div>
                                                        {showCustom && (
                                                            <div className="flex gap-2 items-center justify-start bg-purple-50 px-2 py-1 rounded border border-purple-100">
                                                                <span className="text-slate-400 text-[10px]">سفارشی</span>
                                                                <span className="text-emerald-600">نرمال: {stats.counts.custom.inRange}</span>
                                                                <span className="text-orange-600">بالا: {stats.counts.custom.high}</span>
                                                                <span className="text-red-600">پایین: {stats.counts.custom.low}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="text-center text-slate-400 text-[10px]">
                                                        {isWeighted ? 'مجموع وزن (تناژ موثر):' : 'کل نمونه‌ها:'} {stats.counts.total}
                                                    </div>
                                                    <div className="flex justify-center gap-6 border-t border-slate-300 pt-2 mt-1">
                                                        <span className="text-slate-500 font-bold">تاثیر مالی:</span>
                                                        <span className={`font-bold dir-ltr ${stats.impact.fixed > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                            استاندارد: {stats.impact.fixed > 0 ? '+' : ''}{Math.round(stats.impact.fixed).toLocaleString()} <span className="text-[10px] text-slate-500 font-normal">({stats.factor.fixed}%)</span>
                                                        </span>
                                                        {showCustom && (
                                                            <>
                                                                <span className="text-slate-300">|</span>
                                                                <span className={`font-bold dir-ltr ${stats.impact.custom > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                                    سفارشی: {stats.impact.custom > 0 ? '+' : ''}{Math.round(stats.impact.custom).toLocaleString()} <span className="text-[10px] text-slate-500 font-normal">({stats.factor.custom}%)</span>
                                                                </span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
            <div className="bg-slate-800 text-white p-6 rounded-xl shadow-lg border border-slate-700 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                <div>
                    <div className="text-slate-400 text-xs font-bold mb-1">تولید کل ماه</div>
                    <div className="text-2xl font-bold font-mono text-blue-400">{Math.round(monthTotalTonnage).toLocaleString()} <span className="text-sm">Ton</span></div>
                </div>
                <div>
                    <div className="text-slate-400 text-xs font-bold mb-1">مجموع تاثیر مالی (استاندارد)</div>
                    <div className={`text-2xl font-bold font-mono ${monthFixedImpact > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {monthFixedImpact > 0 ? '+' : ''}{Math.round(monthFixedImpact).toLocaleString()} <span className="text-sm">Ton</span>
                    </div>
                </div>
                {showCustom && (
                    <div>
                        <div className="text-slate-400 text-xs font-bold mb-1">مجموع تاثیر مالی (سفارشی)</div>
                        <div className={`text-2xl font-bold font-mono ${monthCustomImpact > 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {monthCustomImpact > 0 ? '+' : ''}{Math.round(monthCustomImpact).toLocaleString()} <span className="text-sm">Ton</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DataGrid;