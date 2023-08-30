import { Client } from "pg";
import queryAndLog from "./queryLogging";

export async function userExists(client: Client, id: string) {
    const result = await queryAndLog(
        client,
        "SELECT 1 FROM users WHERE id = $1",
        [id]
    );

    return result.rowCount === 1;
}
