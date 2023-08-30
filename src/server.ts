import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { Client } from "pg";
import { getEnvVarOrFail } from "./support/envVarUtils";
import { setupDBClientConfig } from "./support/setupDBClientConfig";
import {
    CardWithStreak,
    Deck,
    DeckCandidate,
    DeckContent,
} from "./types/db/deck";
import { User, UserCandidate } from "./types/db/user";
import queryAndLog from "./utils/queryLogging";
import { userExists } from "./utils/helperQueries";

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
            : res.status(400).send("Deck does not exist.");
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
        if (!(await userExists(client, req.params.userId))) {
            return res.status(400).send("User does not exist.");
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
                    WHEN CURRENT_DATE - streaks.next_review_date > 0 THEN false
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
