import { CardWithStreak } from "./card";

export interface DeckCandidate {
    name: string;
}

export interface Deck extends DeckCandidate {
    id: number;
    created_at: Date;
}

export interface DeckContent extends Deck {
    cards: CardWithStreak[];
}
export { CardWithStreak };
