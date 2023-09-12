import * as db from "../db/index";

export async function rowExists(tableName: string, id: string) {
    const result = await db.queryAndLog(
        `SELECT 1 FROM ${tableName} WHERE id = $1`,
        [id]
    );

    return result.rowCount === 1;
}
