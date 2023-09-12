import express from "express";
import { Card, CardCandidate } from "../types/db/card";
import { rowExists } from "../utils/helperQueries";
import * as db from "../db/index";

const router = express.Router();

router.post<{}, Card | string, CardCandidate>("/", async (req, res) => {
    try {
        const { question, answer, deck_id } = req.body;
        const result = await db.queryAndLog(
            "INSERT INTO cards (question, answer, deck_id) VALUES ($1, $2, $3) RETURNING *",
            [question, answer, deck_id.toString()]
        );
        result.rowCount === 1
            ? res.status(201).json(result.rows[0])
            : res.status(400).send("Card not created.");
    } catch (error) {
        console.error(error);
        res.status(500).send("An error occurred. Check server logs.");
    }
});

router.patch<{ id: string }, Card[] | string, Omit<CardCandidate, "deck_id">>(
    "/:id",
    async (req, res) => {
        try {
            const { question, answer } = req.body;
            const result = await db.queryAndLog(
                "UPDATE cards SET question = $2, answer = $3 WHERE id = $1 RETURNING *",
                [req.params.id, question, answer]
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
        if (!(await rowExists("cards", req.params.id))) {
            return res.status(400).send("Card does not exist.");
        }

        await db.queryAndLog("DELETE FROM streaks WHERE card_id = $1", [
            req.params.id,
        ]);
        await db.queryAndLog("DELETE FROM cards WHERE id = $1", [
            req.params.id,
        ]);

        res.status(200).send();
    } catch (error) {
        console.error(error);
        res.status(500).send("An error occurred. Check server logs.");
    }
});

export default router;
