export interface UserCandidate {
    name: string;
}

export interface User extends UserCandidate {
    id: number;
    created_at: Date;
}
