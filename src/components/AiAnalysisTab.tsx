import React, { useState } from 'react';
import { Record, Config, Profile } from '../types';
import { parseDateString, getAggregatedValues } from '../utils';
import { GoogleGenAI } from "@google/genai";
import { Sparkles } from 'lucide-react';

interface AiAnalysisTabProps {
    data: Record[];
    config: Config;
    profiles: Profile[];
}

const AiAnalysisTab: React.FC<AiAnalysisTabProps> = ({ data, config, profiles }) => {
    const [analysis, setAnalysis] = useState("");
    const [loading, setLoading] = useState(false);

    const handleAnalyze = async () => {
        setLoading(true);
        setAnalysis("");
        try {
            const monthData = data.filter(d => {
                const p = parseDateString(d.dateStr);
                return p && p.year === config.year && p.month === config.month;
            });

            if (monthData.length === 0) {
                setAnalysis("داده‌ای برای این ماه موجود نیست.");
                setLoading(false);
                return;
            }

            const promptText = `
             Analyze the following CCS (Cold Crushing Strength) quality data for month ${config.month} of year ${config.year}.
             
             Configuration:
             - Standard Range: ${config.minRange} - ${config.maxRange}
             - Custom Range: ${config.customMinRange} - ${config.customMaxRange}

             Data Summary:
             ${monthData.map(d => {
                const vals = getAggregatedValues(d, 'daily');
                return `Day ${d.day}: ${vals[0] ? vals[0] : 'No Data'}`;
            }).join('\n')}

             Please provide:
             1. A summary of the quality trends.
             2. Identification of any problematic days or shifts (Low/High CCS).
             3. Recommendations for process improvement based on the data.
             `;

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: promptText,
            });
            setAnalysis(response.text || "No text returned.");

        } catch (error: any) {
            setAnalysis("خطا در تحلیل هوشمند: " + (error.message || String(error)));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-slate-700 flex items-center gap-2"><Sparkles className="w-5 h-5 text-indigo-500" /> تحلیل هوشمند (AI)</h3>
                <button onClick={handleAnalyze} disabled={loading} className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50 hover:bg-indigo-700 transition">
                    {loading ? 'در حال تحلیل...' : 'شروع تحلیل'}
                    <Sparkles className="w-4 h-4" />
                </button>
            </div>
            <div className="prose max-w-none text-sm leading-8 text-slate-700 bg-slate-50 p-6 rounded-lg border border-slate-100 min-h-[200px] whitespace-pre-wrap" dir="auto">
                {analysis ? analysis : <span className="text-slate-400">برای دریافت تحلیل هوشمند از وضعیت کیفی و تناژ، دکمه شروع تحلیل را بزنید.</span>}
            </div>
        </div>
    )
}

export default AiAnalysisTab;