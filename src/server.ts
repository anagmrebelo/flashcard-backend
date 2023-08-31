import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { Client } from "pg";
import { getEnvVarOrFail } from "./support/envVarUtils";
import { setupDBClientConfig } from "./support/setupDBClientConfig";
import { Card, CardCandidate } from "./types/db/card";
import {
    CardWithStreak,
    Deck,
    DeckCandidate,
    DeckContent,
} from "./types/db/deck";
import { Streak, StreakCandidate } from "./types/db/streak";
import { User, UserCandidate } from "./types/db/user";
import { rowExists } from "./utils/helperQueries";
import queryAndLog from "./utils/queryLogging";
import { getReviewDay } from "./utils/streakReviewDate";

dotenv.config(); //Read .env file lines as though they were env vars.

const dbClientConfig = setupDBClientConfig();
const client = new Client(dbClientConfig);

//Configure express routes
const app = express();

app.use(express.json()); //add JSON body parser to each following route handler
app.use(cors()); //add CORS support to each following route handler

app.get("/", async (_req, res) => {
    res.json({ msg: "Hello! There's nothing interesting for GET /" });
});

app.get("/health-check", async (_req, res) => {
    try {
        //For this to be successful, must connect to db
        await client.query("select now()");
        res.status(200).send("system ok");
    } catch (error) {
        //Recover from error rather than letting system halt
        console.error(error);
        res.status(500).send("An error occurred. Check server logs.");
    }
});

// ROUTE HANDLERS: /users
app.get<{}, User[] | string>("/users", async (_req, res) => {
    try {
        const result = await queryAndLog(client, "SELECT * FROM users");
        res.status(200).json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).send("An error occurred. Check server logs.");
    }
});

app.post<{}, User | string, UserCandidate>("/users", async (req, res) => {
    try {
        const result = await queryAndLog(
            client,
            "INSERT INTO users (name) VALUES ($1) RETURNING *",
            [req.body.name]
        );
        result.rowCount === 1
            ? res.status(201).json(result.rows[0])
            : res.status(400).send("An error occurred. Check server logs.");
    } catch (error) {
        console.error(error);
        res.status(500).send("An error occurred. Check server logs.");
    }
});

// ROUTE HANDLERS: /decks
app.get<{}, Deck[] | string>("/decks", async (_req, res) => {
    try {
        const result = await queryAndLog(client, "SELECT * FROM decks");
        res.status(200).json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).send("An error occurred. Check server logs.");
    }
});

app.post<{}, Deck | string, DeckCandidate>("/decks", async (req, res) => {
    try {
        const result = await queryAndLog(
            client,
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

app.patch<{ id: string }, Deck[] | string, DeckCandidate>(
    "/decks/:id",
    async (req, res) => {
        try {
            const result = await queryAndLog(
                client,
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

app.delete<{ id: string }>("/decks/:id", async (req, res) => {
    try {
        if (!(await rowExists(client, "decks", req.params.id))) {
            return res.status(400).send("Deck does not exist.");
        }

        const result = await queryAndLog(
            client,
            "SELECT id FROM cards WHERE deck_id = $1",
            [req.params.id]
        );
        const cardIds = result.rows.flatMap(({ id }) => id);

        for (const cardId of cardIds) {
            await queryAndLog(
                client,
                "DELETE FROM streaks WHERE card_id = $1",
                [cardId]
            );

            await queryAndLog(client, "DELETE FROM cards WHERE id = $1", [
                cardId,
            ]);
        }

        await queryAndLog(client, "DELETE FROM decks WHERE id = $1", [
            req.params.id,
        ]);

        res.status(200).send();
    } catch (error) {
        console.error(error);
        res.status(500).send("An error occurred. Check server logs.");
    }
});

app.get<{ id: string; userId: string }, DeckContent | string>(
    "/decks/:id/:userId",
    async (req, res) => {
        if (!(await rowExists(client, "users", req.params.userId))) {
            return res.status(400).send("User does not exist.");
        }

        if (!(await rowExists(client, "decks", req.params.id))) {
            return res.status(400).send("Deck does not exist.");
        }

        try {
            const deckResult = await queryAndLog(
                client,
                "SELECT * FROM decks WHERE id = $1",
                [req.params.id]
            );

            const cardResult = await queryAndLog(
                client,
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

// ROUTE HANDLERS: /cards
app.post<{}, Card | string, CardCandidate>("/cards", async (req, res) => {
    try {
        const { question, answer, deck_id } = req.body;
        const result = await queryAndLog(
            client,
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

app.patch<{ id: string }, Card[] | string, Omit<CardCandidate, "deck_id">>(
    "/cards/:id",
    async (req, res) => {
        try {
            const { question, answer } = req.body;
            const result = await queryAndLog(
                client,
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

app.delete<{ id: string }>("/cards/:id", async (req, res) => {
    try {
        if (!(await rowExists(client, "cards", req.params.id))) {
            return res.status(400).send("Card does not exist.");
        }

        await queryAndLog(client, "DELETE FROM streaks WHERE card_id = $1", [
            req.params.id,
        ]);
        await queryAndLog(client, "DELETE FROM cards WHERE id = $1", [
            req.params.id,
        ]);

        res.status(200).send();
    } catch (error) {
        console.error(error);
        res.status(500).send("An error occurred. Check server logs.");
    }
});

// ROUTE HANDLERS: /streaks
app.put<
    { cardId: string; userId: string },
    Streak | string,
    Pick<StreakCandidate, "streak">
>("/streaks/:cardId/:userId", async (req, res) => {
    try {
        const { streak } = req.body;

        if (streak < 1) {
            return res.status(400).send("Cannot send streak below 1.");
        }

        const daysToReview = getReviewDay(streak);
        const result = await queryAndLog(
            client,
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

app.delete<{ cardId: string; userId: string }>(
    "/streaks/:cardId/:userId",
    async (req, res) => {
        try {
            const { cardId, userId } = req.params;
            if (!(await rowExists(client, "cards", cardId))) {
                return res.status(400).send("Card does not exist.");
            }

            if (!(await rowExists(client, "users", userId))) {
                return res.status(400).send("User does not exist.");
            }

            await queryAndLog(
                client,
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

connectToDBAndStartListening();

async function connectToDBAndStartListening() {
    console.log("Attempting to connect to db");
    await client.connect();
    console.log("Connected to db!");

    const port = getEnvVarOrFail("PORT");
    app.listen(port, () => {
        console.log(
            `Server started listening for HTTP requests on port ${port}.  Let's go!`
        );
    });
}
