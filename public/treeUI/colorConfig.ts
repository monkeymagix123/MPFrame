export const COLOR_CONFIG = {
    background: '#11111b',
    
    nodes: {
        unlocked: {
            fill: '#22c55e',
            border: '#16a34a'
        },
        available: {
            fill: '#3b82f6',
            border: '#2563eb'
        },
        locked: {
            fill: '#6b7280',
            border: '#4b5563'
        }
    },
    
    edges: {
        bothUnlocked: { color: '#4a5568', alpha: 0.6, width: 4 },
        startUnlocked: { color: '#3367d6', alpha: 0.8, width: 6 },
        locked: { color: '#666666', alpha: 0.3, width: 3 }
    },
    
    tooltip: {
        background: '#1f2937',
        backgroundAlpha: 0.95,
        border: '#374151',
        borderAlpha: 0.8,
        text: '#f3f4f6'
    },
    
    skillPoints: {
        text: '#f3f4f6'
    }
};