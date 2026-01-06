import React, { useMemo } from 'react';
import { Record, Config, CalcMode } from '../types';
import { parseDateString, getAggregatedValues } from '../utils';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceLine, ReferenceArea, Cell } from 'recharts';
import { LayoutDashboard } from 'lucide-react';

interface ChartsTabProps {
    data: Record[];
    config: Config;
    mode: CalcMode; // Received from App
}

const ChartsTab: React.FC<ChartsTabProps> = ({ data, config, mode }) => {
    // Mode state removed, using props

    const chartData = useMemo(() => {
        const points: any[] = [];
        const weeks = [
            { end: 7, count: 0, ok: 0, label: '' },
            { end: 14, count: 0, ok: 0, label: '' },
            { end: 22, count: 0, ok: 0, label: '' },
            { end: 32, count: 0, ok: 0, label: '' },
        ];

        data.forEach(d => {
            const parsed = parseDateString(d.dateStr);
            const day = parsed?.day || 1;
            const vals = getAggregatedValues(d, mode);
            
            // Filter NaNs for the chart
            vals.forEach((v, i) => {
                if (isNaN(v)) return;

                let statusColor = '#10b981';
                if (v > config.customMaxRange) statusColor = '#f97316';
                if (v < config.customMinRange) statusColor = '#ef4444';

                const wIdx = day <= 7 ? 0 : day <= 14 ? 1 : day <= 22 ? 2 : 3;
                weeks[wIdx].count++;
                if (v >= config.customMinRange && v <= config.customMaxRange) weeks[wIdx].ok++;

                points.push({
                    day: day,
                    date: d.dateStr.split('/').slice(1).join('/'),
                    val: Number(v.toFixed(1)),
                    color: statusColor,
                    // Offset index slightly for scatter view if multiple points per day
                    index: i + (day * 100) 
                });
            });
        });

        weeks.forEach(w => {
            w.label = w.count > 0 ? Math.round((w.ok / w.count) * 100) + '%' : '';
        });

        return { points, weeks };
    }, [data, mode, config]);

    if (!data || data.length === 0) {
        return <div className="p-10 text-center text-slate-400 font-bold bg-white rounded-xl">داده‌ای برای نمایش در این ماه وجود ندارد.</div>
    }

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-slate-700 flex items-center gap-2"><LayoutDashboard className="w-5 h-5" /> نمودار پراکندگی هفتگی</h3>
                <div className="text-sm bg-blue-50 text-blue-700 px-3 py-1 rounded-lg">
                    حالت نمایش: {mode === '2h' ? '۲ ساعته' : mode === 'shift' ? 'شیفتی' : 'روزانه'}
                </div>
            </div>

            <div className="h-[400px] w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis type="number" dataKey="day" name="روز" domain={[1, 31]} tickCount={31} allowDecimals={false} height={40} />
                        <YAxis type="number" dataKey="val" name="CCS" domain={[Math.max(0, config.customMinRange - 50), config.customMaxRange + 50]} />
                        <RechartsTooltip cursor={{ strokeDasharray: '3 3' }} content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                                return <div className="bg-white p-2 border shadow rounded text-xs z-50">
                                    <p>روز: {payload[0].payload.date}</p>
                                    <p>مقدار: {payload[0].value}</p>
                                </div>
                            }
                            return null;
                        }} />
                        <ReferenceLine y={config.customMaxRange} stroke="#f97316" strokeDasharray="3 3" />
                        <ReferenceLine y={config.customMinRange} stroke="#ef4444" strokeDasharray="3 3" />

                        <ReferenceLine x={7.5} stroke="#94a3b8" strokeDasharray="5 5" strokeWidth={2} />
                        <ReferenceLine x={14.5} stroke="#94a3b8" strokeDasharray="5 5" strokeWidth={2} />
                        <ReferenceLine x={22.5} stroke="#94a3b8" strokeDasharray="5 5" strokeWidth={2} />

                        {chartData.weeks[0].label && <ReferenceArea x1={1} x2={7} y1={config.customMaxRange + 40} y2={config.customMaxRange + 50} fill="transparent" label={{ value: chartData.weeks[0].label, fill: '#64748b', fontSize: 12, fontWeight: 'bold' }} />}
                        {chartData.weeks[1].label && <ReferenceArea x1={8} x2={14} y1={config.customMaxRange + 40} y2={config.customMaxRange + 50} fill="transparent" label={{ value: chartData.weeks[1].label, fill: '#64748b', fontSize: 12, fontWeight: 'bold' }} />}
                        {chartData.weeks[2].label && <ReferenceArea x1={15} x2={22} y1={config.customMaxRange + 40} y2={config.customMaxRange + 50} fill="transparent" label={{ value: chartData.weeks[2].label, fill: '#64748b', fontSize: 12, fontWeight: 'bold' }} />}
                        {chartData.weeks[3].label && <ReferenceArea x1={23} x2={31} y1={config.customMaxRange + 40} y2={config.customMaxRange + 50} fill="transparent" label={{ value: chartData.weeks[3].label, fill: '#64748b', fontSize: 12, fontWeight: 'bold' }} />}

                        <Scatter name="CCS Values" data={chartData.points} fill="#8884d8" shape="circle">
                            {chartData.points.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Scatter>
                    </ScatterChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default ChartsTab;