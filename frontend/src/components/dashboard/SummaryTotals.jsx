import React from 'react';
import { Card, CardContent } from '../ui/card';
import { cn } from '../../lib/utils';
import { ScanLine, FileOutput, AlertTriangle, CheckCircle2 } from 'lucide-react';

const SummaryItem = ({ icon: Icon, label, value, color, bgGradient, percentage, breakdown }) => (
    <Card className={cn('relative overflow-hidden border-0 shadow-lg', bgGradient)}>
        <CardContent className="p-5">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <p className={cn('text-xs font-semibold uppercase tracking-wider', color.label)}>
                        {label}
                    </p>
                    <div className="flex items-baseline gap-2">
                        <span className={cn('text-3xl font-extrabold tabular-nums', color.value)}>
                            {value}
                        </span>
                        {percentage !== undefined && percentage !== null && (
                            <span className={cn('text-sm font-semibold', color.label)}>
                                ({percentage}%)
                            </span>
                        )}
                    </div>
                    {breakdown && (
                        <p className={cn('text-xs font-medium opacity-75 mt-1', color.label)}>
                            {breakdown}
                        </p>
                    )}
                </div>
                <div className={cn('p-3 rounded-xl', color.iconBg)}>
                    <Icon className={cn('h-6 w-6', color.icon)} />
                </div>
            </div>
        </CardContent>
    </Card>
);

const themes = {
    totalScanned: {
        bgGradient: 'bg-gradient-to-br from-indigo-50 via-purple-50 to-indigo-100',
        color: {
            label: 'text-indigo-600',
            value: 'text-indigo-900',
            iconBg: 'bg-indigo-100',
            icon: 'text-indigo-600',
        },
    },
    exported: {
        bgGradient: 'bg-gradient-to-br from-sky-50 via-cyan-50 to-sky-100',
        color: {
            label: 'text-sky-600',
            value: 'text-sky-900',
            iconBg: 'bg-sky-100',
            icon: 'text-sky-600',
        },
    },
    surplus: {
        bgGradient: 'bg-gradient-to-br from-rose-50 via-pink-50 to-rose-100',
        color: {
            label: 'text-rose-600',
            value: 'text-rose-900',
            iconBg: 'bg-rose-100',
            icon: 'text-rose-600',
        },
    },
    matched: {
        bgGradient: 'bg-gradient-to-br from-emerald-50 via-green-50 to-emerald-100',
        color: {
            label: 'text-emerald-600',
            value: 'text-emerald-900',
            iconBg: 'bg-emerald-100',
            icon: 'text-emerald-600',
        },
    },
};

const SummaryTotals = ({ stats }) => {
    if (!stats) return null;

    const totalScanned = stats.total_scanned ?? (stats.scanned + stats.surplus);
    const totalExpected = stats.total_expected ?? 0;
    const surplus = stats.surplus ?? 0;
    const matched = stats.scanned ?? 0;

    const matchPercent = totalExpected > 0
        ? Math.round((matched / totalExpected) * 100)
        : 0;

    return (
        <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                📊 สรุปยอดรวม
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <SummaryItem
                    icon={ScanLine}
                    label="สแกนตรง + เกิน (รวม)"
                    value={totalScanned}
                    breakdown={`ตรง ${matched} + เกิน ${surplus}`}
                    {...themes.totalScanned}
                />
                <SummaryItem
                    icon={FileOutput}
                    label="ยอดส่งออก (ไฟล์ขนส่ง)"
                    value={totalExpected}
                    {...themes.exported}
                />
                <SummaryItem
                    icon={AlertTriangle}
                    label="ยอดเกิน"
                    value={surplus}
                    {...themes.surplus}
                />
                <SummaryItem
                    icon={CheckCircle2}
                    label="ตรงกับไฟล์ขนส่ง"
                    value={matched}
                    percentage={matchPercent}
                    {...themes.matched}
                />
            </div>
        </div>
    );
};

export default SummaryTotals;
