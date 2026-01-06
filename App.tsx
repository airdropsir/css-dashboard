import React, { useState, useEffect, useMemo } from 'react';
import { Record, Config, Profile, ImportConfig, CalcMode } from './types';
import { SERVER_URLS, STORAGE_KEY, RULES_KEY, DEFAULT_PROFILES, parseDateString, normalizeDate, getAggregatedValues, checkRuleMatch, calculateWeekStats } from './utils';
import * as XLSX from 'xlsx';
import { LayoutDashboard, Server, FilePlus, Edit, Settings, Database, ChartPie, Calculator, Receipt, BrainCircuit, CloudDownload, CalendarRange, SlidersHorizontal, Scale, ChevronDown, ChevronUp } from 'lucide-react';

import DataGrid from './components/DataGrid';
import ChartsTab from './components/ChartsTab';
import AiAnalysisTab from './components/AiAnalysisTab';
import { ImportConfigModal, RuleConfigModal, RulesPanel, ManualDownloadModal } from './components/SettingsAndModals';
import { AdvancedTab, FinancialReportTab, DistributionTab } from './components/AnalysisAndReports';

const App: React.FC = () => {
    const DEFAULT_IMPORT_CONFIG: ImportConfig = {
        quality: { sheetName: "Pellet", dateCol: "A", timeCol: "B", valueCol: "P" },
        tonnage: { sheetName: "CCR", dateCol: "A", valueCol: "C", shiftCol: "B" }
    };

    const [config, setConfig] = useState<Config>(() => JSON.parse(localStorage.getItem(STORAGE_KEY + "_cfg") || "null") || { year: 1404, month: 8, minRange: 260, maxRange: 310, customMinRange: 260, customMaxRange: 320 });
    const [data, setData] = useState<Record[]>([]);
    const [profiles, setProfiles] = useState<Profile[]>(() => JSON.parse(localStorage.getItem(RULES_KEY) || "null") || DEFAULT_PROFILES);
    const [importConfig, setImportConfig] = useState<ImportConfig>(() => JSON.parse(localStorage.getItem(STORAGE_KEY + "_import_cfg") || "null") || DEFAULT_IMPORT_CONFIG);
    const [showManualModal, setShowManualModal] = useState(false);
    const [activeTab, setActiveTab] = useState('data');
    const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isRulesSidebarOpen, setIsRulesSidebarOpen] = useState(false);
    const [financialPeriod, setFinancialPeriod] = useState({ startYear: 1404, startMonth: 2, endYear: 1404, endMonth: 12 });

    // New States for Calculation Mode & Custom Toggle
    const [calcMode, setCalcMode] = useState<CalcMode>('2h');
    const [isWeighted, setIsWeighted] = useState(false);
    const [showCustom, setShowCustom] = useState(false);

    useEffect(() => { const saved = localStorage.getItem(STORAGE_KEY); if (saved) setData(JSON.parse(saved)); }, []);
    useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }, [data]);
    useEffect(() => { localStorage.setItem(STORAGE_KEY + "_cfg", JSON.stringify(config)); }, [config]);
    useEffect(() => { localStorage.setItem(STORAGE_KEY + "_import_cfg", JSON.stringify(importConfig)); }, [importConfig]);

    const availableYears = useMemo(() => {
        const years = new Set(data.map(d => parseDateString(d.dateStr)?.year).filter(y => y));
        if (years.size === 0) return [1399, 1400, 1401, 1402, 1403, 1404];
        return Array.from(years).sort((a, b) => (a as number) - (b as number)) as number[];
    }, [data]);

    // Sidebar Stats Logic
    const calculatePeriodStats = (targetData: Record[], periodCfg: any, type: 'single' | 'multi') => {
        let tTon = 0, fImp = 0, cImp = 0;
        const months = [];
        if (type === 'single') {
            months.push({ year: config.year, month: config.month });
        } else {
            let cY = periodCfg.startYear, cM = periodCfg.startMonth;
            while (cY < periodCfg.endYear || (cY === periodCfg.endYear && cM <= periodCfg.endMonth)) {
                months.push({ year: cY, month: cM });
                cM++; if (cM > 12) { cM = 1; cY++ }
            }
        }

        months.forEach(m => {
            const mData = targetData.filter(d => { const p = parseDateString(d.dateStr); return p && p.year === m.year && p.month === m.month; });
            [1, 2, 3, 4].forEach(wId => {
                const days = wId === 1 ? [1, 2, 3, 4, 5, 6, 7] : wId === 2 ? [8, 9, 10, 11, 12, 13, 14] : wId === 3 ? [15, 16, 17, 18, 19, 20, 21, 22] : Array.from({ length: 10 }, (_, i) => i + 23);
                const weekRecords = mData.filter(d => days.includes(parseDateString(d.dateStr)?.day || -1));
                if (weekRecords.length === 0) return;

                const stats = calculateWeekStats(weekRecords, config, profiles, calcMode, isWeighted);
                
                tTon += stats.totalTonnage;
                fImp += stats.impact.fixed;
                cImp += stats.impact.custom;
            });
        });
        return { tTon, fImp, cImp };
    };

    const sidebarStats = useMemo(() => {
        if (activeTab === 'financial') {
            return calculatePeriodStats(data, financialPeriod, 'multi');
        } else {
            return calculatePeriodStats(data, null, 'single');
        }
    }, [data, config, financialPeriod, activeTab, profiles, calcMode, isWeighted]);

    const parseExcel = async (file: File) => {
        try {
            const ab = await file.arrayBuffer();
            const wb = XLSX.read(ab, { type: 'array' });
            
            const qData: {[key: string]: {timeSlot: string, value: number}[]} = {};
            const tData: {[key: string]: { total: number, shifts: number[] }} = {};
            const allDates = new Set<string>();

            const findSheet = (name: string) => wb.SheetNames.find(n => n.toLowerCase() === name.trim().toLowerCase());

            const qConfig = importConfig.quality;
            const tConfig = importConfig.tonnage;

            const qSheetName = findSheet(qConfig.sheetName);
            const tSheetName = findSheet(tConfig.sheetName);

            if (!qSheetName && !tSheetName) {
                throw new Error("هیچ یک از شیت‌های مورد نظر یافت نشد. لطفاً نام شیت‌ها در تنظیمات را بررسی کنید.");
            }

            if (qSheetName) {
                const ws = wb.Sheets[qSheetName];
                const rows = XLSX.utils.sheet_to_json<any>(ws, { header: "A", defval: "" });
                rows.forEach(row => {
                    const dateKey = qConfig.dateCol;
                    const timeKey = qConfig.timeCol;
                    const valKey = qConfig.valueCol;
                    if (row[dateKey] && row[timeKey] && row[valKey]) {
                        const date = normalizeDate(row[dateKey]);
                        const val = Number(row[valKey]);
                        if (date && !isNaN(val)) {
                            if (!qData[date]) qData[date] = [];
                            qData[date].push({ timeSlot: String(row[timeKey]), value: val });
                            allDates.add(date);
                        }
                    }
                });
            }

            if (tSheetName) {
                const ws = wb.Sheets[tSheetName];
                const rows = XLSX.utils.sheet_to_json<any>(ws, { header: "A", defval: "" });
                rows.forEach(row => {
                    const dateKey = tConfig.dateCol;
                    const valKey = tConfig.valueCol;
                    const shiftKey = tConfig.shiftCol;
                    
                    if (row[dateKey] && row[valKey]) {
                        const date = normalizeDate(row[dateKey]);
                        const val = Number(row[valKey]);
                        const shiftRaw = shiftKey ? String(row[shiftKey]).trim().toUpperCase() : '';

                        if (date && !isNaN(val)) {
                            if (!tData[date]) tData[date] = { total: 0, shifts: [0, 0, 0] };
                            
                            tData[date].total += val;
                            
                            // Map shift string to index 0, 1, 2
                            let sIdx = -1;
                            if (shiftRaw.includes('A') || shiftRaw === '1') sIdx = 0;
                            else if (shiftRaw.includes('B') || shiftRaw === '2') sIdx = 1;
                            else if (shiftRaw.includes('C') || shiftRaw === '3') sIdx = 2;
                            
                            if (sIdx !== -1) {
                                tData[date].shifts[sIdx] = val;
                            }

                            allDates.add(date);
                        }
                    }
                });
            }

            if (allDates.size === 0) {
                throw new Error("داده‌ای یافت نشد. لطفاً تنظیمات ستون‌ها را بررسی کنید.");
            }

            const newRecords = Array.from(allDates).map(date => {
                const tonnageInfo = tData[date] || { total: 0, shifts: [0,0,0] };
                return {
                    day: parseDateString(date)?.day || 0,
                    dateStr: date,
                    dataPoints: qData[date] || [],
                    tonnage: Number(tonnageInfo.total.toFixed(1)),
                    shiftTonnages: tonnageInfo.shifts.map(s => Number(s.toFixed(1)))
                };
            });

            newRecords.sort((a, b) => {
                const pa = parseDateString(a.dateStr);
                const pb = parseDateString(b.dateStr);
                if (!pa || !pb) return 0;
                return (pa.year * 10000 + pa.month * 100 + pa.day) - (pb.year * 10000 + pb.month * 100 + pb.day);
            });

            setData(newRecords);
            const firstYear = parseDateString(newRecords[0].dateStr)?.year;
            if (firstYear) setConfig(c => ({ ...c, year: firstYear }));

        } catch (e: any) {
            alert("خطا در پردازش فایل: " + e.message);
        }
    };

    const handleFetch = async () => {
        try {
            const [resP, resT] = await Promise.all([fetch(SERVER_URLS.pellet), fetch(SERVER_URLS.ton)]);
            if (!resP.ok || !resT.ok) throw new Error("خطا در دانلود فایل‌ها");
            const blobP = await resP.blob();
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const blobT = await resT.blob();
            await parseExcel(new File([blobP], "pellet.xlsx")); 
        } catch (e) {
            setShowManualModal(true);
        }
    };

    const filteredData = useMemo(() => data.filter(r => { const p = parseDateString(r.dateStr); return p && p.year === config.year && p.month === config.month; }), [data, config]);
    const showRulesSidebar = ['data', 'advanced', 'financial'].includes(activeTab);

    return (
        <div className="min-h-screen p-4 bg-slate-100 text-slate-800 font-sans" dir="rtl">
            <header className="w-full max-w-[98%] mx-auto mb-6 flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><LayoutDashboard className="text-blue-600" /> سیستم جامع CCS</h1>
                <div className="flex gap-2">
                    <button onClick={handleFetch} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex gap-2 items-center hover:bg-blue-700 transition shadow-sm shadow-blue-200"><Server width={18} /> دریافت از سرور</button>
                    <div className="flex bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
                        <label className="text-slate-700 px-4 py-2 cursor-pointer flex gap-2 items-center hover:bg-slate-100 border-l border-slate-200">
                            <input type="file" hidden accept=".xlsx" onChange={e => e.target.files?.[0] && parseExcel(e.target.files[0])} />
                            <FilePlus width={18} /> آپلود
                        </label>
                        <button onClick={() => setIsImportModalOpen(true)} className="px-3 py-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition" title="تنظیمات فایل"><Edit width={18} /></button>
                    </div>
                </div>
            </header>

            <ManualDownloadModal isOpen={showManualModal} onClose={()=>setShowManualModal(false)} urls={SERVER_URLS} />

            <div className="w-full max-w-[98%] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* --- RIGHT SIDEBAR: Calculation & Summary --- */}
                <div className="lg:col-span-3 xl:col-span-2 space-y-4 lg:sticky lg:top-4 h-fit">
                    
                    {/* Calculation Mode */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                        <h3 className="font-bold text-slate-700 mb-4 text-sm flex items-center gap-2 border-b pb-2"><Calculator className="w-4 h-4 text-blue-600" /> نحوه محاسبه</h3>
                        <div className="flex flex-col gap-2">
                            <button onClick={() => setCalcMode('2h')} className={`px-4 py-2 text-sm rounded-lg transition font-bold border ${calcMode === '2h' ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm' : 'bg-white border-slate-100 text-slate-500 hover:bg-slate-50'}`}>۲ ساعته</button>
                            <button onClick={() => setCalcMode('shift')} className={`px-4 py-2 text-sm rounded-lg transition font-bold border ${calcMode === 'shift' ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm' : 'bg-white border-slate-100 text-slate-500 hover:bg-slate-50'}`}>شیفتی</button>
                            <button onClick={() => setCalcMode('daily')} className={`px-4 py-2 text-sm rounded-lg transition font-bold border ${calcMode === 'daily' ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm' : 'bg-white border-slate-100 text-slate-500 hover:bg-slate-50'}`}>روزانه</button>
                        </div>
                        <div className="mt-4 pt-3 border-t border-slate-100">
                            <label className="flex items-center gap-2 cursor-pointer select-none group">
                                <div className={`w-10 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out ${isWeighted ? 'bg-blue-600' : 'bg-slate-200'}`}>
                                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${isWeighted ? 'translate-x-[-16px]' : 'translate-x-0'}`}></div>
                                </div>
                                <input type="checkbox" checked={isWeighted} onChange={e => setIsWeighted(e.target.checked)} className="hidden" />
                                <span className="text-xs font-bold text-slate-600 group-hover:text-blue-600 transition">میانگین وزنی (تاثیر تناژ)</span>
                            </label>
                        </div>
                    </div>

                    {/* Summary Stats */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                        <h3 className="font-bold text-slate-700 mb-4 text-sm flex items-center gap-2 border-b pb-2"><Scale className="w-4 h-4 text-emerald-600" /> {activeTab === 'financial' ? 'خلاصه دوره' : 'خلاصه ماه'}</h3>
                        <div className="space-y-3">
                            <div>
                                <div className="text-[10px] text-slate-400 font-bold mb-1">تولید کل</div>
                                <div className="font-bold font-mono text-lg text-slate-800 dir-ltr text-left">{Math.round(sidebarStats.tTon).toLocaleString()} <span className="text-xs text-slate-400">Ton</span></div>
                            </div>
                            <div>
                                <div className="text-[10px] text-slate-400 font-bold mb-1">سود/زیان (استاندارد)</div>
                                <div className={`font-bold font-mono text-lg dir-ltr text-left ${sidebarStats.fImp > 0 ? 'text-green-600' : 'text-red-500'}`}>{sidebarStats.fImp > 0 ? '+' : ''}{Math.round(sidebarStats.fImp).toLocaleString()} <span className="text-xs text-slate-400">T</span></div>
                            </div>
                            {showCustom && (
                                <div>
                                    <div className="text-[10px] text-slate-400 font-bold mb-1">سود/زیان (سفارشی)</div>
                                    <div className={`font-bold font-mono text-lg dir-ltr text-left ${sidebarStats.cImp > 0 ? 'text-green-600' : 'text-red-500'}`}>{sidebarStats.cImp > 0 ? '+' : ''}{Math.round(sidebarStats.cImp).toLocaleString()} <span className="text-xs text-slate-400">T</span></div>
                                </div>
                            )}
                        </div>
                    </div>

                    <button onClick={() => setIsRuleModalOpen(true)} className="w-full bg-slate-800 text-white px-4 py-3 rounded-xl hover:bg-slate-700 transition flex items-center justify-center gap-2 text-sm font-bold shadow-lg shadow-slate-300/50">
                        <Settings width="16" height="16" /> تنظیمات قوانین
                    </button>
                </div>


                {/* --- CENTER CONTENT: Tabs & Data --- */}
                <div className="lg:col-span-6 xl:col-span-8 flex flex-col gap-6">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-1 flex overflow-x-auto no-scrollbar">
                        <button onClick={() => setActiveTab('data')} className={`flex-1 min-w-[100px] px-4 py-3 text-sm font-bold rounded-lg transition flex items-center justify-center gap-2 ${activeTab === 'data' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}><Database className="w-4 h-4" /> داده‌ها</button>
                        <button onClick={() => setActiveTab('charts')} className={`flex-1 min-w-[100px] px-4 py-3 text-sm font-bold rounded-lg transition flex items-center justify-center gap-2 ${activeTab === 'charts' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}><LayoutDashboard className="w-4 h-4" /> نمودار</button>
                        <button onClick={() => setActiveTab('distribution')} className={`flex-1 min-w-[100px] px-4 py-3 text-sm font-bold rounded-lg transition flex items-center justify-center gap-2 ${activeTab === 'distribution' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}><ChartPie className="w-4 h-4" /> پراکندگی</button>
                        <button onClick={() => setActiveTab('advanced')} className={`flex-1 min-w-[100px] px-4 py-3 text-sm font-bold rounded-lg transition flex items-center justify-center gap-2 ${activeTab === 'advanced' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}><Calculator className="w-4 h-4" /> پیشرفته</button>
                        <button onClick={() => setActiveTab('financial')} className={`flex-1 min-w-[100px] px-4 py-3 text-sm font-bold rounded-lg transition flex items-center justify-center gap-2 ${activeTab === 'financial' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}><Receipt className="w-4 h-4" /> مالی</button>
                        <button onClick={() => setActiveTab('ai')} className={`flex-1 min-w-[100px] px-4 py-3 text-sm font-bold rounded-lg transition flex items-center justify-center gap-2 ${activeTab === 'ai' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-indigo-400 hover:bg-indigo-50'}`}><BrainCircuit className="w-4 h-4" /> هوشمند</button>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 min-h-[500px]">
                        <div className="p-1">
                            {activeTab === 'data' && <DataGrid data={filteredData} config={config} profiles={profiles} onUpdateTonnage={(d, v) => { const nd = [...data]; const rec = nd.find(r => r.dateStr === d); if (rec) { rec.tonnage = v; setData(nd); } }} mode={calcMode} isWeighted={isWeighted} showCustom={showCustom} />}
                            {activeTab === 'charts' && <ChartsTab data={filteredData} config={config} mode={calcMode} />}
                            {activeTab === 'distribution' && <DistributionTab allData={data} config={config} availableYears={availableYears} mode={calcMode} isWeighted={isWeighted} profiles={profiles} />}
                            {activeTab === 'advanced' && <AdvancedTab data={filteredData} config={config} setConfig={setConfig} profiles={profiles} mode={calcMode} isWeighted={isWeighted} />}
                            {activeTab === 'financial' && <FinancialReportTab allData={data} profiles={profiles} config={config} availableYears={availableYears} period={financialPeriod} setPeriod={setFinancialPeriod} mode={calcMode} isWeighted={isWeighted} />}
                            {activeTab === 'ai' && <AiAnalysisTab data={data} config={config} profiles={profiles} />}
                        </div>
                    </div>
                </div>

                {/* --- LEFT SIDEBAR: Date & Range --- */}
                <div className="lg:col-span-3 xl:col-span-2 space-y-4 lg:sticky lg:top-4 h-fit">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                        <h3 className="font-bold text-slate-700 mb-4 text-sm flex items-center gap-2 border-b pb-2"><CalendarRange className="w-4 h-4 text-orange-500" /> فیلتر زمانی</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs text-slate-500 font-bold mb-1 block">سال</label>
                                <select value={config.year} onChange={e => setConfig({ ...config, year: Number(e.target.value) })} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-bold text-center text-sm focus:border-blue-500 outline-none">
                                    {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 font-bold mb-1 block">ماه</label>
                                <select value={config.month} onChange={e => setConfig({ ...config, month: Number(e.target.value) })} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-bold text-center text-sm focus:border-blue-500 outline-none">
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'][m - 1]}</option>)}
                                </select>
                            </div>
                        </div>

                        <h3 className="font-bold text-slate-700 mt-6 mb-4 text-sm flex items-center gap-2 border-b pb-2"><SlidersHorizontal className="w-4 h-4 text-blue-500" /> بازه استاندارد</h3>
                        <div className="grid grid-cols-2 gap-2">
                            <div><label className="text-[10px] block text-center mb-1 text-slate-400">حداقل</label><input type="number" value={config.minRange} onChange={e => setConfig({ ...config, minRange: Number(e.target.value) })} className="w-full bg-slate-50 text-blue-600 border border-blue-100 rounded p-2 text-center font-bold text-sm outline-none focus:border-blue-400" /></div>
                            <div><label className="text-[10px] block text-center mb-1 text-slate-400">حداکثر</label><input type="number" value={config.maxRange} onChange={e => setConfig({ ...config, maxRange: Number(e.target.value) })} className="w-full bg-slate-50 text-blue-600 border border-blue-100 rounded p-2 text-center font-bold text-sm outline-none focus:border-blue-400" /></div>
                        </div>

                        <button onClick={() => setShowCustom(!showCustom)} className={`w-full mt-4 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition ${showCustom ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100' : 'bg-green-600 text-white hover:bg-green-700 shadow-md shadow-green-200'}`}>
                            {showCustom ? (
                                <><span>غیرفعال کردن سفارشی</span><ChevronUp className="w-4 h-4" /></>
                            ) : (
                                <><span>محاسبه با قوانین سفارشی</span><ChevronDown className="w-4 h-4" /></>
                            )}
                        </button>

                        {showCustom && (
                            <div className="mt-4 pt-4 border-t border-slate-100 animate-in fade-in slide-in-from-top-4 duration-300">
                                <h3 className="font-bold text-slate-700 mb-4 text-sm flex items-center gap-2"><SlidersHorizontal className="w-4 h-4 text-purple-500" /> بازه سفارشی</h3>
                                <div className="grid grid-cols-2 gap-2">
                                    <div><label className="text-[10px] block text-center mb-1 text-red-400">حداقل</label><input type="number" value={config.customMinRange} onChange={e => setConfig({ ...config, customMinRange: Number(e.target.value) })} className="w-full bg-red-50 text-red-600 border border-red-100 rounded p-2 text-center font-bold text-sm outline-none focus:border-red-400" /></div>
                                    <div><label className="text-[10px] block text-center mb-1 text-green-400">حداکثر</label><input type="number" value={config.customMaxRange} onChange={e => setConfig({ ...config, customMaxRange: Number(e.target.value) })} className="w-full bg-green-50 text-green-600 border border-green-100 rounded p-2 text-center font-bold text-sm outline-none focus:border-green-400" /></div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

            </div>
            <RuleConfigModal profiles={profiles} setProfiles={setProfiles} isOpen={isRuleModalOpen} onClose={() => setIsRuleModalOpen(false)} />
            <ImportConfigModal config={importConfig} onSave={setImportConfig} isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} />
            {showRulesSidebar && <RulesPanel profiles={profiles} isOpen={isRulesSidebarOpen} toggle={() => setIsRulesSidebarOpen(!isRulesSidebarOpen)} />}
        </div>
    );
};

export default App;