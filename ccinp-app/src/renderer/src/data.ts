import {Exercise} from "./types";

export const EXERCISES: Exercise[] = [
    ...Array.from({ length: 58 }, (_, i) => ({ id: i + 1, type: 'Analyse' })),
    ...Array.from({ length: 36 }, (_, i) => ({ id: i + 59, type: 'Algebre' })),
    ...Array.from({ length: 18 }, (_, i) => ({ id: i + 95, type: 'Probabilites' }))
];

export const BACKGROUND_LOGOS = Array.from({ length: 15 }).map((_, i) => ({
    id: i,
    iconIndex: i % 5,
    startX: Math.random() * 100,
    startY: Math.random() * 100,
    endX: Math.random() * 100,
    endY: Math.random() * 100,
    rot: (Math.random() > 0.5 ? 1 : -1) * (180 + Math.random() * 180),
    duration: 60 + Math.random() * 100,
    delay: -(Math.random() * 100),
    size: 40 + Math.random() * 80
}));