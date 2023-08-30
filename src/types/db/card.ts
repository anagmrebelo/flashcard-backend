import { Streak } from "./streak";

export interface CardCandidate {
    question: string;
    answer: string;
    deck_id: number;
}

export interface Card extends CardCandidate {
    id: number;
    created_at: Date;
}

export type CardWithStreak = Omit<Card, "deck_id"> &
    Pick<Streak, "streak"> & { need_review: boolean };

// Equivalent to:
//
// interface CardWithStreak {
//     id: number;
//     question: string;
//     answer: string;
//     created_at: Date;
//
//     streak: number;
//
//     need_review: boolean;
// }
