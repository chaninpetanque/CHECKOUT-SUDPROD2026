import React from 'react';
import { Card, CardContent } from '../ui/card';
import { cn } from '../../lib/utils';
import { FileOutput, AlertTriangle, CheckCircle2, CircleX, Package } from 'lucide-react';

// Facebook Logo SVG
const FacebookIcon = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
);

// TikTok Logo SVG
const TiktokIcon = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.71a8.21 8.21 0 0 0 4.76 1.52v-3.4a4.85 4.85 0 0 1-1-.14z"/>
    </svg>
);

// eslint-disable-next-line no-unused-vars
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
    facebook: {
        bgGradient: 'bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100',
        color: {
            label: 'text-blue-600',
            value: 'text-blue-900',
            iconBg: 'bg-blue-100',
            icon: 'text-blue-600',
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
    missing: {
        bgGradient: 'bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100',
        color: {
            label: 'text-amber-600',
            value: 'text-amber-900',
            iconBg: 'bg-amber-100',
            icon: 'text-amber-600',
        },
    },
    tiktok: {
        bgGradient: 'bg-gradient-to-br from-fuchsia-50 via-pink-50 to-fuchsia-100',
        color: {
            label: 'text-fuchsia-600',
            value: 'text-fuchsia-900',
            iconBg: 'bg-fuchsia-100',
            icon: 'text-fuchsia-600',
        },
    },
};

const SummaryTotals = ({ stats }) => {
    if (!stats) return null;

    const fbScanned = stats.scanned ?? 0;       // Facebook matched
    const fbSurplus = stats.surplus ?? 0;        // Facebook surplus
    const fbTotal = stats.total_scanned ?? (fbScanned + fbSurplus);
    const totalExpected = stats.total_expected ?? 0;
    const missing = stats.missing ?? 0;
    const tiktokScanned = stats.tiktok_scanned ?? 0;
    const grandTotal = fbTotal + tiktokScanned;

    const matchPercent = totalExpected > 0
        ? Math.round((fbScanned / totalExpected) * 100)
        : 0;

    return (
        <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                📊 สรุปยอดรวม
            </h3>

            {/* Grand Total Bar */}
            <Card className="relative overflow-hidden border-0 shadow-xl bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900">
                <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                                ยอดรวมสุทธิทั้งหมด
                            </p>
                            <div className="flex items-baseline gap-3">
                                <span className="text-4xl font-extrabold tabular-nums text-white">
                                    {grandTotal}
                                </span>
                                <span className="text-sm font-medium text-gray-400">
                                    พัสดุ
                                </span>
                            </div>
                            <p className="text-xs font-medium text-gray-500 mt-1">
                                Facebook {fbTotal} + TikTok {tiktokScanned}
                            </p>
                        </div>
                        <div className="p-3 rounded-xl bg-white/10">
                            <Package className="h-7 w-7 text-white" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Platform & Detail Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <SummaryItem
                    icon={FacebookIcon}
                    label="Facebook"
                    value={fbTotal}
                    breakdown={`ตรง ${fbScanned} + เกิน ${fbSurplus}`}
                    {...themes.facebook}
                />
                <SummaryItem
                    icon={TiktokIcon}
                    label="TikTok"
                    value={tiktokScanned}
                    {...themes.tiktok}
                />
                <SummaryItem
                    icon={FileOutput}
                    label="ยอดส่งออก (ไฟล์ขนส่ง)"
                    value={totalExpected}
                    {...themes.exported}
                />
                <SummaryItem
                    icon={CircleX}
                    label="ตกหล่น"
                    value={missing}
                    {...themes.missing}
                />
                <SummaryItem
                    icon={AlertTriangle}
                    label="ยอดเกิน (Facebook)"
                    value={fbSurplus}
                    {...themes.surplus}
                />
                <SummaryItem
                    icon={CheckCircle2}
                    label="ตรงกับไฟล์ขนส่ง"
                    value={fbScanned}
                    percentage={matchPercent}
                    {...themes.matched}
                />
            </div>
        </div>
    );
};

export default SummaryTotals;
