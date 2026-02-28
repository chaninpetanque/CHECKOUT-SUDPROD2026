import React, { useState } from 'react';
import { Trash2, AlertTriangle, CalendarX, ShieldAlert, Eye, EyeOff } from 'lucide-react';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { cn } from '../../lib/utils';

const MODES = [
    {
        id: 'old',
        label: 'ล้างข้อมูลเก่า',
        description: 'ลบเฉพาะรายการที่อัปโหลดแล้ว และไม่ใช่วันนี้',
        icon: Trash2,
        color: 'blue',
        cardClass: 'border-blue-200 bg-blue-50 hover:border-blue-400',
        iconClass: 'text-blue-600',
        selectedClass: 'border-blue-500 bg-blue-100 ring-2 ring-blue-400',
        badge: 'ปลอดภัย',
        badgeClass: 'bg-blue-100 text-blue-700',
    },
    {
        id: 'today',
        label: 'ล้างข้อมูลวันนี้',
        description: 'ลบทุกรายการของวันนี้ทั้งหมด',
        icon: CalendarX,
        color: 'orange',
        cardClass: 'border-orange-200 bg-orange-50 hover:border-orange-400',
        iconClass: 'text-orange-500',
        selectedClass: 'border-orange-500 bg-orange-100 ring-2 ring-orange-400',
        badge: 'ระวัง',
        badgeClass: 'bg-orange-100 text-orange-700',
    },
    {
        id: 'all',
        label: 'ล้างข้อมูลทั้งหมด',
        description: 'ลบทุกรายการทุกวัน — ไม่สามารถกู้คืนได้',
        icon: ShieldAlert,
        color: 'red',
        cardClass: 'border-red-200 bg-red-50 hover:border-red-400',
        iconClass: 'text-red-600',
        selectedClass: 'border-red-500 bg-red-100 ring-2 ring-red-500',
        badge: '⚠️ อันตราย',
        badgeClass: 'bg-red-100 text-red-700',
    },
];

const CLEAR_ALL_PASSWORD = '852369';

const ClearDataModal = ({ open, onOpenChange, onConfirm, isLoading }) => {
    const [selectedMode, setSelectedMode] = useState('old');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [passwordError, setPasswordError] = useState('');

    const handleClose = () => {
        setSelectedMode('old');
        setPassword('');
        setPasswordError('');
        setShowPassword(false);
        onOpenChange(false);
    };

    const handleConfirm = () => {
        if (selectedMode === 'all') {
            if (password !== CLEAR_ALL_PASSWORD) {
                setPasswordError('รหัสผ่านไม่ถูกต้อง');
                return;
            }
        }
        setPassword('');
        setPasswordError('');
        setShowPassword(false);
        onConfirm(selectedMode);
        onOpenChange(false);
    };

    const handleModeSelect = (modeId) => {
        setSelectedMode(modeId);
        setPassword('');
        setPasswordError('');
    };

    const selectedModeData = MODES.find((m) => m.id === selectedMode);
    const isAllMode = selectedMode === 'all';
    const canConfirm = !isLoading && (!isAllMode || password.length > 0);

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Trash2 className="h-5 w-5 text-red-500" />
                        เลือกประเภทการล้างข้อมูล
                    </DialogTitle>
                    <DialogDescription>
                        กรุณาเลือกประเภทข้อมูลที่ต้องการลบ แล้วกดยืนยัน
                    </DialogDescription>
                </DialogHeader>

                {/* Mode Selection */}
                <div className="space-y-3 my-2">
                    {MODES.map((mode) => {
                        const Icon = mode.icon;
                        const isSelected = selectedMode === mode.id;
                        return (
                            <button
                                key={mode.id}
                                onClick={() => handleModeSelect(mode.id)}
                                className={cn(
                                    'w-full flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all duration-150 cursor-pointer',
                                    isSelected ? mode.selectedClass : mode.cardClass
                                )}
                            >
                                <div className={cn('mt-0.5 shrink-0', mode.iconClass)}>
                                    <Icon className="h-5 w-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-semibold text-gray-800 text-sm">{mode.label}</span>
                                        <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', mode.badgeClass)}>
                                            {mode.badge}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-0.5">{mode.description}</p>
                                </div>
                                {/* Radio indicator */}
                                <div className={cn(
                                    'w-4 h-4 rounded-full border-2 shrink-0 mt-0.5 transition-colors',
                                    isSelected
                                        ? `border-${mode.color}-500 bg-${mode.color}-500`
                                        : 'border-gray-300'
                                )}>
                                    {isSelected && <div className="w-full h-full rounded-full bg-white scale-[0.4]" />}
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Password input for "all" mode */}
                {isAllMode && (
                    <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-xl space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="flex items-center gap-2 text-red-700">
                            <AlertTriangle className="h-4 w-4 shrink-0" />
                            <p className="text-xs font-semibold">การดำเนินการนี้ไม่สามารถกู้คืนได้! กรุณาใส่รหัสผ่านเพื่อยืนยัน</p>
                        </div>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    setPasswordError('');
                                }}
                                placeholder="กรอกรหัสผ่าน"
                                className={cn(
                                    'w-full pr-10 pl-3 py-2 text-sm rounded-lg border outline-none transition-colors',
                                    passwordError
                                        ? 'border-red-500 focus:border-red-500 bg-red-50'
                                        : 'border-gray-300 focus:border-red-400 bg-white'
                                )}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleConfirm();
                                }}
                                autoFocus
                            />
                            <button
                                type="button"
                                className="absolute inset-y-0 right-2 flex items-center text-gray-400 hover:text-gray-600"
                                onClick={() => setShowPassword((v) => !v)}
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                        {passwordError && (
                            <p className="text-xs text-red-600 font-medium">{passwordError}</p>
                        )}
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={handleClose} disabled={isLoading}>
                        ยกเลิก
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={!canConfirm}
                        className={cn(
                            'transition-colors',
                            isAllMode
                                ? 'bg-red-600 hover:bg-red-700 text-white'
                                : selectedMode === 'today'
                                    ? 'bg-orange-500 hover:bg-orange-600 text-white'
                                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                        )}
                    >
                        {isLoading
                            ? 'กำลังล้างข้อมูล...'
                            : `✓ ยืนยัน${selectedModeData ? ' ' + selectedModeData.label : ''}`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ClearDataModal;
