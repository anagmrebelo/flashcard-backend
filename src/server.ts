import cors from "cors";
import express from "express";
import cardsRouter from "./routes/cards";
import decksRouter from "./routes/decks";
import streaksRouter from "./routes/streaks";
import usersRouter from "./routes/users";
import { getEnvVarOrFail } from "./support/envVarUtils";

//Configure express routes
const app = express();

app.use(express.json()); //add JSON body parser to each following route handler
app.use(cors()); //add CORS support to each following route handler

app.get("/", async (_req, res) => {
    res.json({ msg: "Hello! There's nothing interesting for GET /" });
});

// app.get("/health-check", async (_req, res) => {
//     try {
//         //For this to be successful, must connect to db
//         await client.query("select now()");
//         res.status(200).send("system ok");
//     } catch (error) {
//         //Recover from error rather than letting system halt
//         console.error(error);
//         res.status(500).send("An error occurred. Check server logs.");
//     }
// });

app.use("/users", usersRouter);
app.use("/streaks", streaksRouter);
app.use("/cards", cardsRouter);
app.use("/decks", decksRouter);

const port = getEnvVarOrFail("PORT");

app.listen(port, () => {
    console.log(
        `Server started listening for HTTP requests on port ${port}.  Let's go!`
    );
});
