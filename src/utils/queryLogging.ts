import { performance } from "perf_hooks";
import { Client } from "pg";

let queryCounter = 1;

function addLeftPad(target: number | string, padding: number, filler = " ") {
    if (typeof target === "number") {
        return target.toString().padStart(padding, filler);
    } else {
        return target.padStart(padding, filler);
    }
}

async function queryAndLog(client: Client, sql: string, params: string[] = []) {
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

export default queryAndLog;
