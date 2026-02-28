import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { ChevronDown, ChevronUp, TriangleAlert, CircleX, Copy, Check } from 'lucide-react';
import { cn } from '../../lib/utils';

const AwbList = ({ title, awbs, icon: Icon, theme }) => {
    const [expanded, setExpanded] = useState(false);
    const [copied, setCopied] = useState(false);

    if (!awbs || awbs.length === 0) return null;

    const displayed = expanded ? awbs : awbs.slice(0, 5);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(awbs.join('\n'));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Card className={cn('border', theme.border, theme.bg)}>
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className={cn('text-sm font-semibold flex items-center gap-2', theme.text)}>
                        <Icon className="h-4 w-4" />
                        {title}
                        <Badge variant="outline" className={cn('ml-1 text-xs', theme.badge)}>
                            {awbs.length}
                        </Badge>
                    </CardTitle>
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={handleCopy}
                            title="คัดลอกทั้งหมด"
                        >
                            {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5 text-gray-400" />}
                        </Button>
                        {awbs.length > 5 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs gap-1"
                                onClick={() => setExpanded(!expanded)}
                            >
                                {expanded ? (
                                    <><ChevronUp className="h-3.5 w-3.5" /> ย่อ</>
                                ) : (
                                    <><ChevronDown className="h-3.5 w-3.5" /> ดูทั้งหมด ({awbs.length})</>
                                )}
                            </Button>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-0">
                <div className={cn(
                    'space-y-1 overflow-y-auto transition-all',
                    expanded ? 'max-h-64' : 'max-h-none'
                )}>
                    {displayed.map((awb, i) => (
                        <div
                            key={`${awb}-${i}`}
                            className={cn(
                                'flex items-center justify-between px-3 py-1.5 rounded-md text-sm font-mono',
                                theme.item
                            )}
                        >
                            <span>{awb}</span>
                            <span className="text-xs text-gray-400">#{i + 1}</span>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
};

const themes = {
    surplus: {
        border: 'border-red-200',
        bg: 'bg-red-50/50',
        text: 'text-red-700',
        badge: 'border-red-200 text-red-600 bg-red-100',
        item: 'bg-white/70 hover:bg-red-100/50',
    },
    missing: {
        border: 'border-amber-200',
        bg: 'bg-amber-50/50',
        text: 'text-amber-700',
        badge: 'border-amber-200 text-amber-600 bg-amber-100',
        item: 'bg-white/70 hover:bg-amber-100/50',
    },
};

const AwbListSection = ({ surplusAwbs = [], missingAwbs = [] }) => {
    if (surplusAwbs.length === 0 && missingAwbs.length === 0) return null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AwbList
                title="เลขที่เกินมา"
                awbs={surplusAwbs}
                icon={TriangleAlert}
                theme={themes.surplus}
            />
            <AwbList
                title="เลขที่ตกหล่น"
                awbs={missingAwbs}
                icon={CircleX}
                theme={themes.missing}
            />
        </div>
    );
};

export default AwbListSection;
