import React, { useState, useEffect } from 'react';
import { Profile, Config, ImportConfig, WeekStats, Record } from '../types';
import { RULES_KEY, DEFAULT_PROFILES, formatRuleRange, TIME_SLOTS } from '../utils';
import { X, ChevronLeft, ChevronRight, List, RefreshCw, Download, Info } from 'lucide-react';

export const CalculationDetailModal: React.FC<{ isOpen: boolean, onClose: () => void, details: any }> = ({ isOpen, onClose, details }) => {
    if (!isOpen || !details) return null;
    const { rawPoints, aggregatedValue, weightUsed, formulaDescription, weightDescription } = details;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm">
                <div className="bg-slate-50 p-4 rounded-t-xl border-b flex justify-between items-center">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2"><Info className="w-5 h-5 text-blue-600" /> جزئیات محاسبه</h3>
                    <button onClick={onClose}><X className="w-5 h-5 text-slate-400 hover:text-red-500" /></button>
                </div>
                <div className="p-5 space-y-4 text-sm">
                    
                    <div className="text-center mb-4">
                        <div className="text-xs text-slate-400 font-bold mb-1">مقدار نهایی (نمایش داده شده)</div>
                        <div className="text-3xl font-mono font-bold text-blue-700">{aggregatedValue}</div>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <div className="font-bold text-slate-700 mb-2 border-b pb-1">۱. نحوه محاسبه مقدار</div>
                        <div className="text-xs text-slate-500 mb-2">{formulaDescription}</div>
                        {rawPoints.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {rawPoints.map((p: any, i: number) => (
                                    <span key={i} className="bg-white px-2 py-1 rounded border text-xs font-mono text-slate-600">{p.time}: <b>{p.val}</b></span>
                                ))}
                            </div>
                        ) : <div className="text-red-500 text-xs">داده‌ای یافت نشد</div>}
                    </div>

                    <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                        <div className="font-bold text-indigo-800 mb-2 border-b border-indigo-200 pb-1">۲. ضریب وزنی (تاثیر در آمار)</div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-indigo-600">{weightDescription}</span>
                            <span className="font-bold font-mono text-lg text-indigo-700">{weightUsed}</span>
                        </div>
                        <div className="text-[10px] text-indigo-400 mt-1">* این ضریب در محاسبه درصد انطباق و سود/زیان استفاده می‌شود.</div>
                    </div>

                </div>
                <div className="p-3 border-t bg-slate-50 rounded-b-xl text-center">
                    <button onClick={onClose} className="text-blue-600 text-sm font-bold hover:underline">بستن</button>
                </div>
            </div>
        </div>
    );
}

export const RulesPanel: React.FC<{ profiles: Profile[], isOpen: boolean, toggle: () => void }> = ({ profiles, isOpen, toggle }) => {
    const fixedRules = profiles.find(p => p.id === 'ccs_fixed')?.rules || [];
    const customRules = profiles.find(p => p.id === 'ccs_custom')?.rules || [];

    return (
        <div className={`fixed top-0 left-0 h-full bg-white shadow-2xl z-40 transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'} w-80 border-r border-slate-200 flex flex-col`}>
            <button onClick={toggle} className="absolute -right-10 top-20 bg-blue-600 text-white p-2 rounded-r-lg shadow-md hover:bg-blue-700 transition">
                {isOpen ? <ChevronLeft /> : <List />}
            </button>
            <div className="p-4 border-b bg-slate-50">
                <h3 className="font-bold text-slate-700 flex items-center gap-2"><List width="18" /> قوانین محاسباتی</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                <div>
                    <h4 className="font-bold text-sm text-blue-700 mb-2 border-b border-blue-100 pb-1">قوانین اولیه (استاندارد)</h4>
                    <div className="space-y-1">
                        {fixedRules.map((r, i) => (
                            <div key={i} className="text-xs flex justify-between p-1 bg-slate-50 rounded border border-slate-100">
                                <span className="font-mono" dir="ltr">{formatRuleRange(r)}%</span>
                                <span className={`font-bold ${r.factor > 0 ? 'text-green-600' : r.factor < 0 ? 'text-red-600' : 'text-slate-500'}`}>{r.factor}% {r.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div>
                    <h4 className="font-bold text-sm text-purple-700 mb-2 border-b border-purple-100 pb-1">قوانین جدید (سفارشی)</h4>
                    <div className="space-y-1">
                        {customRules.map((r, i) => (
                            <div key={i} className="text-xs flex justify-between p-1 bg-slate-50 rounded border border-slate-100">
                                <span className="font-mono" dir="ltr">{formatRuleRange(r)}%</span>
                                <span className={`font-bold ${r.factor > 0 ? 'text-green-600' : r.factor < 0 ? 'text-red-600' : 'text-slate-500'}`}>{r.factor}% {r.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export const ImportConfigModal: React.FC<{ config: ImportConfig, onSave: (c: ImportConfig) => void, isOpen: boolean, onClose: () => void }> = ({ config, onSave, isOpen, onClose }) => {
    const [localConfig, setLocalConfig] = useState(config);
    useEffect(() => { if (isOpen) setLocalConfig(config); }, [isOpen, config]);
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-md flex flex-col max-h-[90vh]">
                <div className="p-4 border-b flex justify-between"><h3 className="font-bold">تنظیمات وارد کردن فایل (Excel)</h3><button onClick={onClose}><X /></button></div>
                <div className="p-6 space-y-6 overflow-y-auto">
                    <div>
                        <h4 className="font-bold text-blue-600 mb-3 border-b pb-1">اطلاعات کیفی (CCS)</h4>
                        <div className="space-y-3">
                            <div><label className="block text-xs font-bold text-slate-500 mb-1">نام شیت (Sheet Name)</label><input value={localConfig.quality.sheetName} onChange={e => setLocalConfig({ ...localConfig, quality: { ...localConfig.quality, sheetName: e.target.value } })} className="w-full border rounded p-2 text-left dir-ltr" /></div>
                            <div><label className="block text-xs font-bold text-slate-500 mb-1">ستون تاریخ (مثال: A)</label><input value={localConfig.quality.dateCol} onChange={e => setLocalConfig({ ...localConfig, quality: { ...localConfig.quality, dateCol: e.target.value.toUpperCase() } })} className="w-full border rounded p-2 text-center font-bold dir-ltr" /></div>
                            <div><label className="block text-xs font-bold text-slate-500 mb-1">ستون ساعت (مثال: B)</label><input value={localConfig.quality.timeCol} onChange={e => setLocalConfig({ ...localConfig, quality: { ...localConfig.quality, timeCol: e.target.value.toUpperCase() } })} className="w-full border rounded p-2 text-center font-bold dir-ltr" /></div>
                            <div><label className="block text-xs font-bold text-slate-500 mb-1">ستون مقدار (مثال: P)</label><input value={localConfig.quality.valueCol} onChange={e => setLocalConfig({ ...localConfig, quality: { ...localConfig.quality, valueCol: e.target.value.toUpperCase() } })} className="w-full border rounded p-2 text-center font-bold dir-ltr" /></div>
                        </div>
                    </div>
                    <div>
                        <h4 className="font-bold text-purple-600 mb-3 border-b pb-1">اطلاعات تناژ</h4>
                        <div className="space-y-3">
                            <div><label className="block text-xs font-bold text-slate-500 mb-1">نام شیت</label><input value={localConfig.tonnage.sheetName} onChange={e => setLocalConfig({ ...localConfig, tonnage: { ...localConfig.tonnage, sheetName: e.target.value } })} className="w-full border rounded p-2 text-left dir-ltr" /></div>
                            <div className="grid grid-cols-3 gap-2">
                                <div><label className="block text-xs font-bold text-slate-500 mb-1">ستون تاریخ</label><input value={localConfig.tonnage.dateCol} onChange={e => setLocalConfig({ ...localConfig, tonnage: { ...localConfig.tonnage, dateCol: e.target.value.toUpperCase() } })} className="w-full border rounded p-2 text-center font-bold dir-ltr" /></div>
                                <div><label className="block text-xs font-bold text-slate-500 mb-1">ستون شیفت</label><input value={localConfig.tonnage.shiftCol || ''} placeholder="-" onChange={e => setLocalConfig({ ...localConfig, tonnage: { ...localConfig.tonnage, shiftCol: e.target.value.toUpperCase() } })} className="w-full border rounded p-2 text-center font-bold dir-ltr" /></div>
                                <div><label className="block text-xs font-bold text-slate-500 mb-1">ستون تناژ</label><input value={localConfig.tonnage.valueCol} onChange={e => setLocalConfig({ ...localConfig, tonnage: { ...localConfig.tonnage, valueCol: e.target.value.toUpperCase() } })} className="w-full border rounded p-2 text-center font-bold dir-ltr" /></div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="p-4 border-t flex justify-end gap-2 bg-slate-50 rounded-b-2xl">
                    <button onClick={onClose} className="px-4 py-2 text-slate-600">انصراف</button>
                    <button onClick={() => { onSave(localConfig); onClose(); }} className="px-6 py-2 bg-blue-600 text-white rounded-lg">ذخیره تنظیمات</button>
                </div>
            </div>
        </div>
    );
};

export const RuleConfigModal: React.FC<{ profiles: Profile[], setProfiles: (p: Profile[]) => void, isOpen: boolean, onClose: () => void }> = ({ profiles, setProfiles, isOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState<'fixed' | 'custom'>('fixed');
    if (!isOpen) return null;

    const fixedProfile = profiles.find(p => p.id === 'ccs_fixed');
    const customProfile = profiles.find(p => p.id === 'ccs_custom');

    const handleUpdateRule = (profileId: string, idx: number, field: string, value: any) => {
        const newP = [...profiles];
        const prof = newP.find(p => p.id === profileId);
        if (prof) {
            (prof.rules[idx] as any)[field] = value;
            setProfiles(newP);
            localStorage.setItem(RULES_KEY, JSON.stringify(newP));
        }
    };

    const handleReset = () => {
        const isFixed = activeTab === 'fixed';
        const profileId = isFixed ? 'ccs_fixed' : 'ccs_custom';
        if (confirm(`آیا مطمئن هستید که می‌خواهید ${isFixed ? 'قوانین استاندارد' : 'قوانین سفارشی'} را به حالت اولیه بازگردانید؟`)) {
            const newP = [...profiles];
            const def = DEFAULT_PROFILES.find(p => p.id === profileId);
            const idx = newP.findIndex(p => p.id === profileId);
            if (def && idx !== -1) {
                newP[idx].rules = JSON.parse(JSON.stringify(def.rules));
                setProfiles(newP);
                localStorage.setItem(RULES_KEY, JSON.stringify(newP));
            }
        }
    }

    const renderRuleRow = (rule: any, idx: number, profileId: string) => (
        <div key={idx} className="grid grid-cols-12 gap-2 items-center p-2 rounded-lg border bg-white">
            <div className="col-span-5 flex items-center justify-center gap-1 text-sm font-mono" dir="ltr">
                <input type="number" value={rule.min} onChange={e => handleUpdateRule(profileId, idx, 'min', Number(e.target.value))} className="w-10 text-center outline-none border-b border-dashed" />
                <select value={rule.minOp} onChange={e => handleUpdateRule(profileId, idx, 'minOp', e.target.value)} className="bg-transparent text-blue-600 font-bold"><option value="lt">&lt;</option><option value="le">≤</option><option value="gt">&gt;</option></select>
                <span>x</span>
                <select value={rule.maxOp} onChange={e => handleUpdateRule(profileId, idx, 'maxOp', e.target.value)} className="bg-transparent text-blue-600 font-bold"><option value="lt">&lt;</option><option value="le">≤</option></select>
                <input type="number" value={rule.max} onChange={e => handleUpdateRule(profileId, idx, 'max', Number(e.target.value))} className="w-10 text-center outline-none border-b border-dashed" />
            </div>
            <div className="col-span-3"><input value={rule.label} onChange={e => handleUpdateRule(profileId, idx, 'label', e.target.value)} className="w-full text-right outline-none font-bold text-xs" /></div>
            <div className="col-span-2 text-center font-bold font-mono text-sm" dir="ltr"><input type="number" value={rule.factor} step="0.1" onChange={e => handleUpdateRule(profileId, idx, 'factor', Number(e.target.value))} className="w-12 text-center outline-none bg-transparent" /></div>
            <div className="col-span-2 text-xs text-slate-400">{profileId === 'ccs_fixed' ? (rule.factor <= -100 ? 'REj' : 'Std') : 'Cust'}</div>
        </div>
    );

    const rulesToRender = activeTab === 'fixed' ? fixedProfile?.rules : customProfile?.rules;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="p-4 border-b flex justify-between"><h3 className="font-bold">تنظیمات قوانین و ضرایب</h3><button onClick={onClose}><X /></button></div>
                <div className="flex border-b"><button onClick={() => setActiveTab('fixed')} className={`flex-1 py-3 ${activeTab === 'fixed' ? 'border-b-2 border-blue-600 text-blue-600' : ''}`}>قوانین اولیه (استاندارد)</button><button onClick={() => setActiveTab('custom')} className={`flex-1 py-3 ${activeTab === 'custom' ? 'border-b-2 border-purple-600 text-purple-600' : ''}`}>قوانین سفارشی</button></div>
                <div className="p-4 overflow-y-auto flex-1 space-y-2">{rulesToRender?.map((r, i) => renderRuleRow(r, i, activeTab === 'fixed' ? 'ccs_fixed' : 'ccs_custom'))}</div>
                <div className="p-4 border-t flex justify-between items-center bg-slate-50 rounded-b-2xl">
                    <div className="flex gap-2 items-center">
                        <div className="text-xs text-slate-500">نکته: تغییرات بلافاصله اعمال می‌شوند.</div>
                        <button onClick={handleReset} className="flex items-center gap-1 text-xs text-red-600 hover:bg-red-50 px-2 py-1 rounded"><RefreshCw width="14" /> بازنشانی {activeTab === 'fixed' ? 'استاندارد' : 'سفارشی'}</button>
                    </div>
                    <button onClick={onClose} className="px-6 py-2 bg-blue-600 text-white rounded-lg">بستن</button>
                </div>
            </div>
        </div>
    );
};

interface WeekDetailsModalProps {
    week: WeekStats & { name?: string; label?: string; records?: Record[] } | null;
    isOpen: boolean;
    onClose: () => void;
    config: Config;
    onPrev: () => void;
    onNext: () => void;
    hasPrev: boolean;
    hasNext: boolean;
}

export const WeekDetailsModal: React.FC<WeekDetailsModalProps> = ({ week, isOpen, onClose, config, onPrev, onNext, hasPrev, hasNext }) => {
    const [showFullDetails, setShowFullDetails] = useState(false);
    if (!isOpen || !week) return null;

    const stats = [
        { label: 'تولید کل (تن)', val: Math.round(week.totalTonnage).toLocaleString(), isVal: true },
        { label: 'ضریب جریمه/پاداش', valFixed: `${week.factor.fixed}%`, valCustom: `${week.factor.custom}%` },
        { label: 'مبلغ جریمه/پاداش', valFixed: Math.round(week.impact.fixed).toLocaleString(), valCustom: Math.round(week.impact.custom).toLocaleString(), isCurrency: true },
        { label: 'درصد انطباق', valFixed: `${week.pct.fixed.toFixed(1)}%`, valCustom: `${week.pct.custom.toFixed(1)}%` },
        { label: 'تعداد کل نمونه‌ها', valFixed: week.counts.total, valCustom: week.counts.total },
        { label: 'نمونه‌های در بازه', valFixed: week.counts.fixed.inRange, valCustom: week.counts.custom.inRange, color: 'text-emerald-600' },
        { label: 'نمونه‌های پایین‌تر', valFixed: week.counts.fixed.low, valCustom: week.counts.custom.low, color: 'text-red-600' },
        { label: 'نمونه‌های بالاتر', valFixed: week.counts.fixed.high, valCustom: week.counts.custom.high, color: 'text-orange-600' },
    ];

    const getCellColorClass = (val: number | string | undefined, min: number, max: number) => {
        if (!val || val === '') return 'text-slate-300';
        const num = Number(val);
        if (num >= min && num <= max) return 'bg-emerald-50 text-emerald-700';
        if (num > max) return 'bg-orange-50 text-orange-600';
        if (num < min) return 'bg-red-50 text-red-600';
        return '';
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className={`bg-white rounded-2xl w-full ${showFullDetails ? 'max-w-6xl h-[90vh]' : 'max-w-2xl'} flex flex-col transition-all shadow-2xl`}>
                <div className="p-4 border-b flex justify-between items-center bg-slate-50 rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <h3 className="font-bold text-lg text-slate-800">جزئیات {week.name}</h3>
                        {week.label && <span className="text-xs text-slate-400 bg-white px-2 py-1 rounded border">ماه/سال: {week.label.split(' - ')[0]}</span>}
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full"><X /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 relative">
                    {!showFullDetails && (
                        <>
                            <button onClick={onPrev} disabled={!hasPrev} className={`absolute left-4 top-1/2 transform -translate-y-1/2 p-2 rounded-full border ${hasPrev ? 'hover:bg-blue-50 text-blue-600 border-blue-200' : 'text-slate-300 border-slate-100 cursor-not-allowed'}`}><ChevronRight /></button>
                            <button onClick={onNext} disabled={!hasNext} className={`absolute right-4 top-1/2 transform -translate-y-1/2 p-2 rounded-full border ${hasNext ? 'hover:bg-blue-50 text-blue-600 border-blue-200' : 'text-slate-300 border-slate-100 cursor-not-allowed'}`}><ChevronLeft /></button>
                        </>
                    )}

                    {!showFullDetails ? (
                        <div className="space-y-6 px-12">
                            <div className="grid grid-cols-3 gap-4 border-b pb-4 text-center font-bold text-sm">
                                <div className="text-right text-slate-500">شاخص</div>
                                <div className="text-blue-700 bg-blue-50 py-1 rounded">استاندارد</div>
                                <div className="text-purple-700 bg-purple-50 py-1 rounded">سفارشی</div>
                            </div>
                            <div className="space-y-3">
                                {stats.map((s, i) => (
                                    <div key={i} className="grid grid-cols-3 gap-4 text-sm items-center border-b border-slate-100 pb-2 last:border-none">
                                        <div className="text-right font-bold text-slate-600">{s.label}</div>
                                        {s.isVal ? (
                                            <div className="col-span-2 text-center font-bold text-slate-800 bg-slate-100 py-1 rounded">{s.val as string}</div>
                                        ) : (
                                            <>
                                                <div className={`text-center font-bold ${(s as any).color || 'text-slate-700'} dir-ltr`}>{s.valFixed}</div>
                                                <div className={`text-center font-bold ${(s as any).color || 'text-slate-700'} dir-ltr`}>{s.valCustom}</div>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <button onClick={() => setShowFullDetails(true)} className="w-full py-3 mt-4 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 transition flex items-center justify-center gap-2">
                                <List /> مشاهده جزئیات کامل داده‌ها
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center mb-2">
                                <button onClick={() => setShowFullDetails(false)} className="flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-slate-800"><ChevronRight /> بازگشت به خلاصه</button>
                                <div className="flex gap-2">
                                    <button onClick={onPrev} disabled={!hasPrev} className={`p-1 rounded border ${hasPrev ? 'hover:bg-slate-100 text-slate-600' : 'text-slate-300'}`}><ChevronRight /></button>
                                    <button onClick={onNext} disabled={!hasNext} className={`p-1 rounded border ${hasNext ? 'hover:bg-slate-100 text-slate-600' : 'text-slate-300'}`}><ChevronLeft /></button>
                                </div>
                            </div>
                            <div className="overflow-x-auto border rounded-xl">
                                <table className="w-full text-center text-xs">
                                    <thead className="bg-slate-100 font-bold text-slate-600">
                                        <tr>
                                            <th className="p-3 border-l">تاریخ</th>
                                            <th className="p-3 border-l">تناژ کل</th>
                                            <th className="p-3 border-l text-slate-400">تناژ شیفت‌ها (A/B/C)</th>
                                            {TIME_SLOTS.map(t => <th key={t} className="p-3 border-l min-w-[50px]">{t}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {week.records?.map((rec, idx) => (
                                            <tr key={idx} className="border-b hover:bg-slate-50">
                                                <td className="p-2 border-l font-bold">{rec.dateStr}</td>
                                                <td className="p-2 border-l font-mono text-blue-700">{rec.tonnage}</td>
                                                <td className="p-2 border-l font-mono text-slate-500 text-[10px]">
                                                    {rec.shiftTonnages ? rec.shiftTonnages.join(' / ') : '-'}
                                                </td>
                                                {Array.from({ length: 12 }).map((_, i) => {
                                                    const p = rec.dataPoints[i] || {} as any;
                                                    return <td key={i} className={`p-2 border-l font-bold ${getCellColorClass(p.value, config.customMinRange, config.customMaxRange)}`}>{p.value}</td>
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export const ManualDownloadModal: React.FC<{ isOpen: boolean, onClose: () => void, urls: { pellet: string, ton: string } }> = ({ isOpen, onClose, urls }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl text-center">
                <div className="mx-auto w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4"><Download /></div>
                <h3 className="font-bold text-lg mb-2 text-red-600">خطا در ارتباط خودکار</h3>
                <p className="text-sm text-slate-600 mb-6 leading-relaxed">مرورگر به دلایل امنیتی اجازه دانلود خودکار فایل از سرور لوکال را نمی‌دهد. لطفاً فایل‌ها را دستی دانلود و سپس آپلود کنید.</p>
                <div className="space-y-3">
                    <a href={urls.pellet} className="block w-full py-3 bg-blue-50 text-blue-700 rounded-lg font-bold hover:bg-blue-100 transition">دانلود فایل کیفی (Pellet4)</a>
                    <a href={urls.ton} className="block w-full py-3 bg-purple-50 text-purple-700 rounded-lg font-bold hover:bg-purple-100 transition">دانلود فایل تناژ (Ton)</a>
                </div>
                <button onClick={onClose} className="mt-6 text-sm text-slate-400 underline">بستن پنجره</button>
            </div>
        </div>
    )
}