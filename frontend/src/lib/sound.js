/**
 * Sound utility for scan feedback
 * Reusable across Dashboard and Scanner
 */

let audioCtx = null;

const getAudioContext = () => {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
};

export const initAudio = () => {
    getAudioContext();
};

export const playSound = (type) => {
    try {
        const ctx = getAudioContext();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        const now = ctx.currentTime;

        if (type === 'match') {
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(880, now);
            gainNode.gain.setValueAtTime(0.2, now);
            oscillator.start();
            oscillator.stop(now + 0.15);
        } else if (type === 'surplus') {
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(150, now);
            gainNode.gain.setValueAtTime(0.3, now);
            oscillator.start();
            oscillator.stop(now + 0.6);
        } else if (type === 'duplicate') {
            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(440, now);
            gainNode.gain.setValueAtTime(0.15, now);
            oscillator.start();
            oscillator.stop(now + 0.1);

            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.type = 'square';
            osc2.frequency.setValueAtTime(440, now);
            gain2.gain.setValueAtTime(0.15, now);
            osc2.start(now + 0.15);
            osc2.stop(now + 0.25);
        }
    } catch (e) {
        console.error('Sound error:', e);
    }
};
