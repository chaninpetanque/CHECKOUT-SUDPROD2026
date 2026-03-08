import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowLeft, Lock, BarChart3, Calendar, TrendingUp, Package, CheckCircle2, AlertTriangle, CircleX } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Skeleton } from './ui/skeleton';
import { cn } from '../lib/utils';
import { fetchStats } from '../lib/api';

// --- PIN Entry Screen ---
const PinEntry = ({ onSubmit, error }) => {
    const [pin, setPin] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(pin);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
            <Card className="w-full max-w-sm border-0 shadow-2xl bg-white/95 backdrop-blur">
                <CardHeader className="text-center space-y-4 pb-2">
                    <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                        <Lock className="h-8 w-8 text-blue-600" />
                    </div>
                    <CardTitle className="text-xl">สรุปสถิติ</CardTitle>
                    <p className="text-sm text-gray-500">กรุณากรอก PIN เพื่อเข้าดูรายงาน</p>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <Input
                            type="password"
                            value={pin}
                            onChange={(e) => setPin(e.target.value)}
                            placeholder="กรอก PIN..."
                            className="text-center text-2xl tracking-[0.5em] h-14"
                            maxLength={7}
                            autoFocus
                        />
                        {error && (
                            <p className="text-sm text-red-500 text-center">PIN ไม่ถูกต้อง</p>
                        )}
                        <Button type="submit" className="w-full h-12 text-lg" disabled={!pin.trim()}>
                            เข้าสู่ระบบ
                        </Button>
                        <div className="text-center">
                            <Link to="/" className="text-sm text-blue-600 hover:underline">
                                ← กลับหน้าหลัก
                            </Link>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

// --- Bar Chart (CSS-based) ---
const BarChart = ({ data, labelKey, bars }) => {
    const maxVal = Math.max(...data.flatMap(d => bars.map(b => d[b.key] || 0)), 1);

    return (
        <div className="space-y-1">
            {data.map((item, idx) => (
                <div key={idx} className="group">
                    <div className="text-xs text-gray-500 mb-1 font-medium">{item[labelKey]}</div>
                    <div className="flex gap-1 items-center">
                        {bars.map((bar) => {
                            const val = item[bar.key] || 0;
                            const pct = Math.max((val / maxVal) * 100, 2);
                            return (
                                <div key={bar.key} className="flex-1 relative">
                                    <div
                                        className={cn('h-7 rounded-md transition-all duration-500 flex items-center px-2', bar.color)}
                                        style={{ width: `${pct}%`, minWidth: val > 0 ? '32px' : '4px' }}
                                    >
                                        <span className="text-xs text-white font-bold whitespace-nowrap">
                                            {val > 0 ? val : ''}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
            {/* Legend */}
            <div className="flex flex-wrap gap-3 pt-3 border-t mt-3">
                {bars.map((bar) => (
                    <div key={bar.key} className="flex items-center gap-1.5">
                        <div className={cn('w-3 h-3 rounded-sm', bar.color)} />
                        <span className="text-xs text-gray-600">{bar.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- Summary Card ---
// eslint-disable-next-line no-unused-vars
const SummaryCard = ({ icon: Icon, label, value, color, bgColor }) => (
    <div className={cn('rounded-xl p-4 border', bgColor)}>
        <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg', color)}>
                <Icon className="h-5 w-5 text-white" />
            </div>
            <div>
                <p className="text-xs text-gray-500 font-medium">{label}</p>
                <p className="text-2xl font-bold">{value.toLocaleString()}</p>
            </div>
        </div>
    </div>
);

// --- Main Stats Report ---
const StatsReport = () => {
    const [pin, setPin] = useState('');
    const [pinError, setPinError] = useState(false);
    const [authenticated, setAuthenticated] = useState(false);
    const [tab, setTab] = useState('daily'); // 'daily' or 'monthly'

    // Date ranges
    const [today] = useState(() => new Date(Date.now() + 7 * 60 * 60 * 1000));
    const dailyFrom = new Date(today);
    dailyFrom.setDate(dailyFrom.getDate() - 6);
    const monthlyFrom = new Date(today);
    monthlyFrom.setMonth(monthlyFrom.getMonth() - 2);
    monthlyFrom.setDate(1);

    const fromDate = tab === 'daily'
        ? dailyFrom.toISOString().split('T')[0]
        : monthlyFrom.toISOString().split('T')[0];
    const toDate = today.toISOString().split('T')[0];

    const { data: rawStats, isLoading } = useQuery({
        queryKey: ['stats', fromDate, toDate, pin],
        queryFn: () => fetchStats(fromDate, toDate, pin),
        enabled: authenticated,
        staleTime: 60000,
    });

    // Process data
    const { chartData, totals } = useMemo(() => {
        if (!rawStats || !Array.isArray(rawStats)) {
            return { chartData: [], totals: { expected: 0, scanned: 0, missing: 0, surplus: 0 } };
        }

        let processed = rawStats;

        if (tab === 'monthly') {
            // Group into months
            const thMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
            const months = {};
            rawStats.forEach((day) => {
                const d = new Date(day.date);
                const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

                if (!months[monthKey]) {
                    months[monthKey] = {
                        label: `${thMonths[d.getMonth()]} ${d.getFullYear() + 543}`,
                        total_expected: 0,
                        scanned: 0,
                        missing: 0,
                        surplus: 0,
                        total_scanned: 0,
                    };
                }
                months[monthKey].total_expected += day.total_expected || 0;
                months[monthKey].scanned += day.scanned || 0;
                months[monthKey].missing += day.missing || 0;
                months[monthKey].surplus += day.surplus || 0;
                months[monthKey].total_scanned += day.total_scanned || 0;
            });

            processed = Object.entries(months)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([, v]) => v);
        } else {
            // Format daily labels
            const thDays = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
            processed = rawStats.map((day) => {
                const d = new Date(day.date);
                return {
                    ...day,
                    label: `${thDays[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`,
                };
            });
        }

        const totals = processed.reduce(
            (acc, d) => ({
                expected: acc.expected + (d.total_expected || 0),
                scanned: acc.scanned + (d.scanned || 0),
                missing: acc.missing + (d.missing || 0),
                surplus: acc.surplus + (d.surplus || 0),
            }),
            { expected: 0, scanned: 0, missing: 0, surplus: 0 }
        );

        return { chartData: processed, totals };
    }, [rawStats, tab]);

    // Handle PIN submit
    const handlePinSubmit = (enteredPin) => {
        setPin(enteredPin);
        // Optimistic: set authenticated and let query run — if PIN is wrong, API returns 403
        setAuthenticated(true);
        setPinError(false);
    };

    // Show PIN screen
    if (!authenticated) {
        return <PinEntry onSubmit={handlePinSubmit} error={pinError} />;
    }

    const barConfig = [
        { key: 'scanned', label: 'สแกนตรง', color: 'bg-emerald-500' },
        { key: 'surplus', label: 'เกิน', color: 'bg-rose-500' },
        { key: 'missing', label: 'ตกหล่น', color: 'bg-amber-500' },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
            {/* Header */}
            <div className="bg-white border-b shadow-sm">
                <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link to="/" className="text-gray-400 hover:text-gray-600 transition-colors">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                        <div className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-blue-600" />
                            <h1 className="text-lg font-bold text-gray-800">สรุปสถิติ</h1>
                        </div>
                    </div>
                    <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                        <Button
                            variant={tab === 'daily' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setTab('daily')}
                            className={tab === 'daily' ? '' : 'text-gray-600'}
                        >
                            <Calendar className="h-4 w-4 mr-1" /> รายวัน
                        </Button>
                        <Button
                            variant={tab === 'monthly' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setTab('monthly')}
                            className={tab === 'monthly' ? '' : 'text-gray-600'}
                        >
                            <TrendingUp className="h-4 w-4 mr-1" /> รายเดือน
                        </Button>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
                {isLoading ? (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
                        </div>
                        <Skeleton className="h-80 rounded-xl" />
                    </div>
                ) : (
                    <>
                        {/* Summary Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <SummaryCard
                                icon={Package}
                                label={`ยอดรวม${tab === 'daily' ? ' 7 วัน' : ' 3 เดือน'}`}
                                value={totals.scanned + totals.surplus}
                                color="bg-blue-500"
                                bgColor="bg-blue-50 border-blue-200"
                            />
                            <SummaryCard
                                icon={CheckCircle2}
                                label="สแกนตรง"
                                value={totals.scanned}
                                color="bg-emerald-500"
                                bgColor="bg-emerald-50 border-emerald-200"
                            />
                            <SummaryCard
                                icon={CircleX}
                                label="ตกหล่น"
                                value={totals.missing}
                                color="bg-amber-500"
                                bgColor="bg-amber-50 border-amber-200"
                            />
                            <SummaryCard
                                icon={AlertTriangle}
                                label="เกิน"
                                value={totals.surplus}
                                color="bg-rose-500"
                                bgColor="bg-rose-50 border-rose-200"
                            />
                        </div>

                        {/* Chart */}
                        <Card className="shadow-lg border-0">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-gray-800">
                                    <BarChart3 className="h-5 w-5 text-blue-600" />
                                    {tab === 'daily' ? 'สถิติรายวัน (7 วันล่าสุด)' : 'สถิติรายเดือน (3 เดือนล่าสุด)'}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {chartData.length === 0 ? (
                                    <div className="text-center py-12 text-gray-400">
                                        <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                        <p>ไม่มีข้อมูลในช่วงเวลาที่เลือก</p>
                                    </div>
                                ) : (
                                    <BarChart
                                        data={chartData}
                                        labelKey="label"
                                        bars={barConfig}
                                    />
                                )}
                            </CardContent>
                        </Card>

                        {/* Data Table */}
                        <Card className="shadow-lg border-0">
                            <CardHeader>
                                <CardTitle className="text-gray-800">ตารางข้อมูล</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="rounded-md border overflow-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b bg-gray-50">
                                                <th className="h-10 px-4 text-left font-medium text-gray-500">
                                                    {tab === 'daily' ? 'วันที่' : 'เดือน'}
                                                </th>
                                                <th className="h-10 px-4 text-right font-medium text-blue-600">คาดหวัง</th>
                                                <th className="h-10 px-4 text-right font-medium text-emerald-600">สแกนตรง</th>
                                                <th className="h-10 px-4 text-right font-medium text-amber-600">ตกหล่น</th>
                                                <th className="h-10 px-4 text-right font-medium text-rose-600">เกิน</th>
                                                <th className="h-10 px-4 text-right font-medium text-gray-600">สำเร็จ %</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {chartData.map((row, idx) => {
                                                const pct = row.total_expected > 0
                                                    ? Math.round((row.scanned / row.total_expected) * 100)
                                                    : 0;
                                                return (
                                                    <tr key={idx} className="border-b hover:bg-gray-50">
                                                        <td className="p-4 font-medium">{row.label || row.date}</td>
                                                        <td className="p-4 text-right tabular-nums">{row.total_expected}</td>
                                                        <td className="p-4 text-right tabular-nums text-emerald-700 font-semibold">{row.scanned}</td>
                                                        <td className="p-4 text-right tabular-nums text-amber-700">{row.missing}</td>
                                                        <td className="p-4 text-right tabular-nums text-rose-700">{row.surplus}</td>
                                                        <td className="p-4 text-right">
                                                            <span className={cn(
                                                                'px-2 py-0.5 rounded-full text-xs font-bold',
                                                                pct >= 90 ? 'bg-emerald-100 text-emerald-700' :
                                                                    pct >= 50 ? 'bg-amber-100 text-amber-700' :
                                                                        'bg-rose-100 text-rose-700'
                                                            )}>
                                                                {pct}%
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            {/* Totals Row */}
                                            <tr className="bg-gray-100 font-bold">
                                                <td className="p-4">รวม</td>
                                                <td className="p-4 text-right tabular-nums">{totals.expected}</td>
                                                <td className="p-4 text-right tabular-nums text-emerald-700">{totals.scanned}</td>
                                                <td className="p-4 text-right tabular-nums text-amber-700">{totals.missing}</td>
                                                <td className="p-4 text-right tabular-nums text-rose-700">{totals.surplus}</td>
                                                <td className="p-4 text-right">
                                                    <span className={cn(
                                                        'px-2 py-0.5 rounded-full text-xs font-bold',
                                                        totals.expected > 0 && Math.round((totals.scanned / totals.expected) * 100) >= 90
                                                            ? 'bg-emerald-100 text-emerald-700'
                                                            : 'bg-amber-100 text-amber-700'
                                                    )}>
                                                        {totals.expected > 0 ? Math.round((totals.scanned / totals.expected) * 100) : 0}%
                                                    </span>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>
        </div>
    );
};

export default StatsReport;
