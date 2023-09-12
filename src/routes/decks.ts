import express from "express";
import { CardWithStreak } from "../types/db/card";
import { Deck, DeckCandidate, DeckContent } from "../types/db/deck";
import { rowExists } from "../utils/helperQueries";
import * as db from "../db/index";

const router = express.Router();

router.get<{}, Deck[] | string>("/", async (_req, res) => {
    try {
        const result = await db.queryAndLog("SELECT * FROM decks");
        res.status(200).json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).send("An error occurred. Check server logs.");
    }
});

router.post<{}, Deck | string, DeckCandidate>("/", async (req, res) => {
    try {
        const result = await db.queryAndLog(
            "INSERT INTO decks (name) VALUES ($1) RETURNING *",
            [req.body.name]
        );
        result.rowCount === 1
            ? res.status(201).json(result.rows[0])
            : res.status(400).send("Deck not created.");
    } catch (error) {
        console.error(error);
        res.status(500).send("An error occurred. Check server logs.");
    }
});

router.patch<{ id: string }, Deck[] | string, DeckCandidate>(
    "/:id",
    async (req, res) => {
        try {
            const result = await db.queryAndLog(
                "UPDATE decks SET name = $2 WHERE id = $1 RETURNING *",
                [req.params.id, req.body.name]
            );

            result.rowCount === 1
                ? res.status(200).json(result.rows)
                : res.status(204).send();
        } catch (error) {
            console.error(error);
            res.status(500).send("An error occurred. Check server logs.");
        }
    }
);

router.delete<{ id: string }>("/:id", async (req, res) => {
    try {
        if (!(await rowExists("decks", req.params.id))) {
            return res.status(400).send("Deck does not exist.");
        }

        const result = await db.queryAndLog(
            "SELECT id FROM cards WHERE deck_id = $1",
            [req.params.id]
        );
        const cardIds = result.rows.flatMap(({ id }) => id);

        for (const cardId of cardIds) {
            await db.queryAndLog("DELETE FROM streaks WHERE card_id = $1", [
                cardId,
            ]);

            await db.queryAndLog("DELETE FROM cards WHERE id = $1", [cardId]);
        }

        await db.queryAndLog("DELETE FROM decks WHERE id = $1", [
            req.params.id,
        ]);

        res.status(200).send();
    } catch (error) {
        console.error(error);
        res.status(500).send("An error occurred. Check server logs.");
    }
});

router.get<{ id: string; userId: string }, DeckContent | string>(
    "/:id/:userId",
    async (req, res) => {
        if (!(await rowExists("users", req.params.userId))) {
            return res.status(400).send("User does not exist.");
        }

        if (!(await rowExists("decks", req.params.id))) {
            return res.status(400).send("Deck does not exist.");
        }

        try {
            const deckResult = await db.queryAndLog(
                "SELECT * FROM decks WHERE id = $1",
                [req.params.id]
            );

            const cardResult = await db.queryAndLog(
                `SELECT 
	            id,
	            question,
	            answer,
                created_at,
                streaks.streak,
                CASE
                    WHEN CURRENT_DATE - streaks.next_review_date < 0 THEN false
                    ELSE true
                END AS needs_review
                FROM cards
                LEFT JOIN streaks
                    ON streaks.card_id = cards.id
                    AND streaks.user_id = $2
                WHERE cards.deck_id = $1
                ORDER BY created_at`,
                [req.params.id, req.params.userId]
            );

            const deckInfo: Deck = deckResult.rows[0];
            const cardInfo: CardWithStreak[] = cardResult.rows;
            res.status(200).json({ ...deckInfo, cards: cardInfo });
        } catch (error) {
            console.error(error);
            res.status(500).send("An error occurred. Check server logs.");
        }
    }
);

export default router;
