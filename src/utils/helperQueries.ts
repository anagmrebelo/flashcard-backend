import { Client } from "pg";
import queryAndLog from "./queryLogging";

export async function rowExists(client: Client, tableName: string, id: string) {
    const result = await queryAndLog(
        client,
        `SELECT 1 FROM ${tableName} WHERE id = $1`,
        [id]
    );

    return result.rowCount === 1;
}
