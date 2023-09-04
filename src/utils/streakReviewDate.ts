export function getReviewDay(streak: number): number {
    if (streak < 1) {
        return 0;
    }

    switch (streak) {
        case 1:
            return 1;
        case 2:
            return 2;
        case 3:
            return 3;
        case 4:
            return 5;
        case 5:
            return 7;
        case 6:
            return 10;
        case 7:
            return 14;
        case 8:
            return 30;
        case 9:
            return 60;
        default:
            return 180;
    }
}
