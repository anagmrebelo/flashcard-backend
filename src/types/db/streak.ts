export interface StreakCandidate {
    user_id: number;
    card_id: number;
    streak: number;
}

export interface Streak extends StreakCandidate {
    next_review_date: Date;
}
