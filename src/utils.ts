import { Record, Config, Profile, WeekStats, Rule, CalcMode } from './types';

export const TIME_SLOTS = ["06:00", "08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "22:00", "00:00", "02:00", "04:00"];
export const SHIFT_SLOTS = ["شیفت A (0-8)", "شیفت B (8-16)", "شیفت C (16-24)"];
export const DAILY_SLOT = ["میانگین روزانه"];

export const STORAGE_KEY = "ccs_app_v18_db";
export const RULES_KEY = "ccs_app_v18_rules";
export const SERVER_URLS = { pellet: "https://172.23.59.20/ccs/pellet4.xlsx", ton: "https://172.23.59.20/ccs/ton.xlsx" };

export const pad = (num: number) => num.toString().padStart(2, '0');

export const normalizeDate = (dStr: string | number): string | null => {
    if (!dStr) return null;
    try {
        if (!isNaN(Number(dStr)) && Number(dStr) > 40000) {
            const d = new Date((Number(dStr) - 25569) * 86400 * 1000);
            if (isNaN(d.getTime())) return null;
            return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}`;
        }
        const parts = String(dStr).trim().split(/[\/\-]/);
        if (parts.length >= 3) {
            const y = parseInt(parts[0]);
            const m = parseInt(parts[1]);
            const d = parseInt(parts[2]);
            if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
            return `${y}/${pad(m)}/${pad(d)}`;
        }
        return String(dStr).trim();
    } catch (e) { return null; }
};

export const parseDateString = (dateStr: string) => {
    if (!dateStr) return null;
    const parts = String(dateStr).split(/[\/\-]/);
    if (parts.length >= 2) return { year: parseInt(parts[0]), month: parseInt(parts[1]), day: parseInt(parts[2]) };
    return null;
};

export const isValid = (val: any) => val !== null && val !== undefined && val !== 0 && !isNaN(val) && String(val).trim() !== '';

export const getAggregatedValues = (record: Record, mode: CalcMode): number[] => {
    if (!record || !record.dataPoints) return [];
    
    const validPoints = record.dataPoints.filter(p => isValid(p.value));

    if (mode === '2h') {
        return record.dataPoints.map(p => isValid(p.value) ? p.value : NaN);
    }
    
    const validValues = validPoints.map(p => p.value);

    if (mode === 'daily') {
        if (validValues.length === 0) return [NaN];
        const sum = validValues.reduce((a, b) => a + b, 0);
        return [Number((sum / validValues.length).toFixed(1))];
    }
    
    if (mode === 'shift') {
        const shiftsIndices = [[0, 4], [4, 8], [8, 12]];
        const shiftValues: number[] = [];
        
        shiftsIndices.forEach(([start, end]) => {
            const slice = record.dataPoints.slice(start, end).filter(p => isValid(p.value));
            if (slice.length > 0) {
                const s = slice.reduce((a, b) => a + b.value, 0);
                shiftValues.push(Number((s / slice.length).toFixed(1)));
            } else {
                shiftValues.push(NaN);
            }
        });
        return shiftValues;
    }
    return [];
};

export const getCalculationDetails = (record: Record, mode: CalcMode, colIndex: number, isWeighted: boolean) => {
    const rawPoints: { time: string, val: number }[] = [];
    let aggregatedValue = NaN;
    let weightUsed = 1;
    let formulaDescription = "";
    let weightDescription = "";

    let startIdx = 0; 
    let endIdx = 12;

    if (mode === '2h') {
        startIdx = colIndex;
        endIdx = colIndex + 1;
    } else if (mode === 'shift') {
        startIdx = colIndex * 4;
        endIdx = startIdx + 4;
    } else if (mode === 'daily') {
        startIdx = 0;
        endIdx = 12;
    }

    for (let i = startIdx; i < endIdx; i++) {
        if (record.dataPoints[i]) {
            const p = record.dataPoints[i];
            if (isValid(p.value)) {
                rawPoints.push({ time: TIME_SLOTS[i], val: p.value });
            }
        }
    }

    if (rawPoints.length > 0) {
        if (mode === '2h') {
            aggregatedValue = rawPoints[0].val;
            formulaDescription = "مقدار خام (بدون میانگین‌گیری)";
        } else {
            const sum = rawPoints.reduce((a, b) => a + b.val, 0);
            aggregatedValue = Number((sum / rawPoints.length).toFixed(1));
            formulaDescription = `میانگین گیری: ${sum} تقسیم بر ${rawPoints.length}`;
        }
    }

    if (isWeighted) {
        if (mode === 'daily') {
            weightUsed = record.tonnage;
            weightDescription = `تناژ کل روز: ${record.tonnage}`;
        } else if (mode === 'shift') {
            const shiftTon = record.shiftTonnages?.[colIndex];
            if (shiftTon && shiftTon > 0) {
                weightUsed = shiftTon;
                weightDescription = `تناژ شیفت ${['A','B','C'][colIndex]}: ${shiftTon}`;
            } else {
                weightUsed = Number((record.tonnage / 3).toFixed(1));
                weightDescription = `تخمین (تناژ روز / ۳): ${weightUsed}`;
            }
        } else if (mode === '2h') {
            const shiftIdx = Math.floor(colIndex / 4);
            const shiftStart = shiftIdx * 4;
            const shiftEnd = shiftStart + 4;
            let validCountInShift = 0;
            for(let k=shiftStart; k<shiftEnd; k++) {
                if(record.dataPoints[k] && isValid(record.dataPoints[k].value)) validCountInShift++;
            }

            const shiftTon = record.shiftTonnages?.[shiftIdx];
            if (shiftTon && shiftTon > 0) {
                weightUsed = validCountInShift > 0 ? Number((shiftTon / validCountInShift).toFixed(2)) : 0;
                weightDescription = `سهم از شیفت (تناژ شیفت / تعداد نمونه شیفت): ${shiftTon} / ${validCountInShift}`;
            } else {
                weightUsed = validCountInShift > 0 ? Number(((record.tonnage / 3) / validCountInShift).toFixed(2)) : 0;
                weightDescription = `تخمین سهم (یک سوم تناژ روز / تعداد نمونه شیفت)`;
            }
        }
    } else {
        weightUsed = 1;
        weightDescription = "۱ (بدون ضریب وزنی)";
    }

    return {
        rawPoints,
        aggregatedValue,
        weightUsed,
        formulaDescription,
        weightDescription
    };
};

export const checkRuleMatch = (val: number, rule: Rule): boolean => {
    if (rule.rawCondition === 'x < 65') return val < 65;
    const minOk = rule.minOp === 'lt' ? val > rule.min : val >= rule.min;
    const maxOk = rule.maxOp === 'lt' ? val < rule.max : val <= rule.max;
    return minOk && maxOk;
};

export const formatRuleRange = (rule: Rule) => {
    if (rule.rawCondition) return rule.rawCondition;
    const minOp = rule.minOp === 'lt' ? '>' : '≥';
    const maxOp = rule.maxOp === 'lt' ? '<' : '≤';
    if (rule.max >= 1000) return `x ${minOp} ${rule.min}`;
    if (rule.min <= 0 && rule.max < 1000) return `x ${maxOp} ${rule.max}`;
    return `${rule.min} ${rule.minOp === 'lt' ? '<' : '≤'} x ${rule.maxOp === 'lt' ? '<' : '≤'} ${rule.max}`;
};

export const calculateWeekStats = (weekRecords: Record[], config: Config, profiles: Profile[], mode: CalcMode, isWeighted: boolean): WeekStats => {
    let totalWeight = 0;
    let totalTonnage = 0;

    let fInRange = 0, fLow = 0, fHigh = 0;
    let cInRange = 0, cLow = 0, cHigh = 0;

    weekRecords.forEach(r => {
        const tonnage = r.tonnage || 0;
        totalTonnage += tonnage;

        const values = getAggregatedValues(r, mode);
        
        values.forEach((val, idx) => {
            if (isNaN(val)) return;

            let weight = 1;

            if (isWeighted) {
                if (mode === 'daily') {
                    weight = r.tonnage;
                } 
                else if (mode === 'shift') {
                    if (r.shiftTonnages && r.shiftTonnages[idx] !== undefined && r.shiftTonnages[idx] > 0) {
                        weight = r.shiftTonnages[idx];
                    } else {
                        weight = r.tonnage / 3;
                    }
                } 
                else if (mode === '2h') {
                    const shiftIdx = Math.floor(idx / 4);
                    const start = shiftIdx * 4;
                    const end = start + 4;
                    let validCountInShift = 0;
                    for (let k = start; k < end; k++) {
                        if (!isNaN(values[k])) validCountInShift++;
                    }

                    if (r.shiftTonnages && r.shiftTonnages[shiftIdx] !== undefined && r.shiftTonnages[shiftIdx] > 0) {
                        weight = validCountInShift > 0 ? (r.shiftTonnages[shiftIdx] / validCountInShift) : 0;
                    } else {
                        weight = r.tonnage > 0 ? (r.tonnage / 12) : 0; 
                    }
                }
            }

            totalWeight += weight;

            if (val >= config.minRange && val <= config.maxRange) fInRange += weight;
            else if (val < config.minRange) fLow += weight;
            else fHigh += weight;

            if (val >= config.customMinRange && val <= config.customMaxRange) cInRange += weight;
            else if (val < config.customMinRange) cLow += weight;
            else cHigh += weight;
        });
    });

    const fPct = totalWeight > 0 ? (fInRange / totalWeight) * 100 : 0;
    const cPct = totalWeight > 0 ? (cInRange / totalWeight) * 100 : 0;

    const fProf = profiles.find(p => p.id === 'ccs_fixed');
    const cProf = profiles.find(p => p.id === 'ccs_custom');

    const fMatch = fProf?.rules.find(r => checkRuleMatch(fPct, r));
    const cMatch = cProf?.rules.find(r => checkRuleMatch(cPct, r));

    return {
        pct: { fixed: fPct, custom: cPct },
        impact: {
            fixed: totalTonnage * (fMatch?.factor || 0) / 100,
            custom: totalTonnage * (cMatch?.factor || 0) / 100
        },
        factor: { fixed: fMatch?.factor || 0, custom: cMatch?.factor || 0 },
        ruleLabels: { fixed: fMatch?.label, custom: cMatch?.label },
        isRej: { fixed: (fMatch?.factor || 0) <= -100, custom: (cMatch?.factor || 0) <= -100 },
        style: {
            fixed: fMatch?.type === 'danger' ? 'text-red-600' : fMatch?.type === 'warning' ? 'text-orange-600' : 'text-green-600',
            custom: cMatch?.type === 'danger' ? 'text-red-600' : cMatch?.type === 'warning' ? 'text-orange-600' : 'text-green-600'
        },
        counts: {
            total: Math.round(totalWeight),
            fixed: { inRange: Math.round(fInRange), low: Math.round(fLow), high: Math.round(fHigh) },
            custom: { inRange: Math.round(cInRange), low: Math.round(cLow), high: Math.round(cHigh) }
        },
        totalTonnage
    };
};

export const DEFAULT_PROFILES: Profile[] = [
    {
        id: 'ccs_fixed', name: 'قوانین اولیه (استاندارد)', readonly: false,
        rules: [
            { min: 65, minOp: 'gt', max: 65, maxOp: 'lt', label: 'غیرقابل قبول (REj)', type: 'danger', factor: -100, rawCondition: 'x < 65' },
            { min: 65, minOp: 'lt', max: 70, maxOp: 'le', label: '۲٪ جریمه تناژ', type: 'warning', factor: -2 },
            { min: 70, minOp: 'lt', max: 73, maxOp: 'le', label: '۱٪ جریمه تناژ', type: 'warning', factor: -1 },
            { min: 73, minOp: 'lt', max: 75, maxOp: 'le', label: '۰.۵٪ جریمه تناژ', type: 'warning', factor: -0.5 },
            { min: 80, minOp: 'le', max: 83, maxOp: 'lt', label: '۰.۵٪ پاداش تناژ', type: 'success_light', factor: 0.5 },
            { min: 83, minOp: 'le', max: 85, maxOp: 'lt', label: '۱٪ پاداش تناژ', type: 'success_medium', factor: 1 },
            { min: 85, minOp: 'le', max: 90, maxOp: 'lt', label: '۱.۵٪ پاداش تناژ', type: 'success_high', factor: 1.5 },
            { min: 90, minOp: 'le', max: 1000, maxOp: 'lt', label: '۲٪ پاداش تناژ', type: 'success_max', factor: 2 },
        ]
    },
    {
        id: 'ccs_custom', name: 'قوانین جدید (سفارشی)', readonly: false,
        rules: [
            { min: 0, minOp: 'le', max: 60, maxOp: 'lt', label: '۲٪ جریمه تناژ', type: 'danger', factor: -2 },
            { min: 60, minOp: 'le', max: 65, maxOp: 'le', label: '۱.۵٪ جریمه تناژ', type: 'danger', factor: -1.5 },
            { min: 65, minOp: 'lt', max: 70, maxOp: 'le', label: '۱٪ جریمه تناژ', type: 'warning', factor: -1 },
            { min: 70, minOp: 'lt', max: 73, maxOp: 'le', label: '۰.۵٪ جریمه تناژ', type: 'warning', factor: -0.5 },
            { min: 80, minOp: 'le', max: 83, maxOp: 'lt', label: '۰.۵٪ پاداش تناژ', type: 'success_light', factor: 0.5 },
            { min: 83, minOp: 'le', max: 85, maxOp: 'lt', label: '۱٪ پاداش تناژ', type: 'success_medium', factor: 1 },
            { min: 85, minOp: 'le', max: 90, maxOp: 'lt', label: '۱.۵٪ پاداش تناژ', type: 'success_high', factor: 1.5 },
            { min: 90, minOp: 'le', max: 1000, maxOp: 'lt', label: '۲٪ پاداش تناژ', type: 'success_max', factor: 2 },
        ]
    }
];