import dotenv from "dotenv";
import { performance } from "perf_hooks";
import { Client } from "pg";

dotenv.config(); //read any .env file(s)

if (!process.env.DATABASE_URL) {
    throw "No DATABASE_URL env var provided.  Did you create an .env file?";
}

const config = {
    connectionString: process.env.DATABASE_URL,
};

const client = new Client(config);

const connectToDb = async () => {
    console.log("Attempting to connect to db");
    await client.connect();
    console.log("Connected to db!");
};

connectToDb();

let queryCounter = 1;

function addLeftPad(target: number | string, padding: number, filler = " ") {
    if (typeof target === "number") {
        return target.toString().padStart(padding, filler);
    } else {
        return target.padStart(padding, filler);
    }
}

export async function queryAndLog(
    sql: string,
    params: (string | number)[] = []
) {
    const qNum = queryCounter++;
    const qNumFmt = addLeftPad(qNum, 4, "0");
    const startTime = performance.now();

    console.log(`SQL START qNum: ${qNumFmt} sql: ${sql} params:`, params);
    const result = await client.query(sql, params);
    const endTime = performance.now();
    const runTime = (endTime - startTime).toFixed(3);
    const runTimeFmt = addLeftPad(runTime, 9);
    const rowCount = result.rowCount;
    const rowCountFmt = addLeftPad(rowCount, 5);
    console.log(
        `SQL END   qNum: ${qNumFmt} time: ${runTimeFmt}ms rowCount: ${rowCountFmt} sql: ${sql} params:`,
        params
    );

    return result;
}
