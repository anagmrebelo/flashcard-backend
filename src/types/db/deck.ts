export interface DeckCandidate {
    name: string;
}

export interface Deck extends DeckCandidate {
    id: number;
    created_at: Date;
}
