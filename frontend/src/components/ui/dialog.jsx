import React, { useEffect } from 'react';
import { cn } from '../../lib/utils';

const Dialog = ({ open, onOpenChange, children }) => {
    useEffect(() => {
        if (open) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [open]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={() => onOpenChange?.(false)}
            />
            {/* Content wrapper */}
            <div className="relative z-10 w-full max-w-md mx-4">
                {children}
            </div>
        </div>
    );
};

const DialogContent = ({ className, children }) => (
    <div
        className={cn(
            'bg-white rounded-2xl shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-200',
            className
        )}
        onClick={(e) => e.stopPropagation()}
    >
        {children}
    </div>
);

const DialogHeader = ({ className, children }) => (
    <div className={cn('mb-4', className)}>{children}</div>
);

const DialogTitle = ({ className, children }) => (
    <h2 className={cn('text-xl font-bold text-gray-900', className)}>{children}</h2>
);

const DialogDescription = ({ className, children }) => (
    <p className={cn('text-sm text-gray-500 mt-1', className)}>{children}</p>
);

const DialogFooter = ({ className, children }) => (
    <div className={cn('flex gap-2 justify-end mt-6', className)}>{children}</div>
);

export { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter };
