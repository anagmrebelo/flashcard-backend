import express from "express";
import { User, UserCandidate } from "../types/db/user";
import * as db from "../db/index";

const router = express.Router();

router.get<{}, User[] | string>("/", async (_req, res) => {
    try {
        const result = await db.queryAndLog("SELECT * FROM users");
        res.status(200).json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).send("An error occurred. Check server logs.");
    }
});

router.post<{}, User | string, UserCandidate>("/", async (req, res) => {
    try {
        const result = await db.queryAndLog(
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

export default router;
