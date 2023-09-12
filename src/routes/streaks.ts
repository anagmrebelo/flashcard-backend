import express from "express";
import { Streak, StreakCandidate } from "../types/db/streak";
import { rowExists } from "../utils/helperQueries";
import { getReviewDay } from "../utils/streakReviewDate";
import * as db from "../db/index";

const router = express.Router();

router.put<
    { cardId: string; userId: string },
    Streak | string,
    Pick<StreakCandidate, "streak">
>("/:cardId/:userId", async (req, res) => {
    try {
        const { streak } = req.body;

        if (streak < 1) {
            return res.status(400).send("Cannot send streak below 1.");
        }

        const daysToReview = getReviewDay(streak);
        const result = await db.queryAndLog(
            `INSERT INTO streaks (
                user_id,
                card_id,
                streak,
                next_review_date
            ) VALUES (
                $1,
                $2,
                $3, 
                CURRENT_DATE + ${daysToReview}
            ) ON CONFLICT (user_id, card_id)
                DO UPDATE
                SET streak = $3, 
                    next_review_date = CURRENT_DATE + ${daysToReview}
            RETURNING *`,
            [req.params.userId, req.params.cardId, streak]
        );

        result.rowCount === 1
            ? res.status(201).json(result.rows[0])
            : res.status(400).send("Streak not created/updated.");
    } catch (error) {
        console.error(error);
        res.status(500).send("An error occurred. Check server logs.");
    }
});

router.delete<{ cardId: string; userId: string }>(
    "/:cardId/:userId",
    async (req, res) => {
        try {
            const { cardId, userId } = req.params;
            if (!(await rowExists("cards", cardId))) {
                return res.status(400).send("Card does not exist.");
            }

            if (!(await rowExists("users", userId))) {
                return res.status(400).send("User does not exist.");
            }

            await db.queryAndLog(
                "DELETE FROM streaks WHERE card_id = $1 AND user_id = $2",
                [cardId, userId]
            );

            res.status(200).send();
        } catch (error) {
            console.error(error);
            res.status(500).send("An error occurred. Check server logs.");
        }
    }
);

export default router;
