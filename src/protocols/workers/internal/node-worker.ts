//================================================================ 
/** @module tgrid.protocols.workers */
//================================================================
import { tmpdir } from "os";
import { sep } from "path";

import { FileSystem } from "./FileSystem";

/* ----------------------------------------------------------------
    GLOBAL FUNCTIONS
---------------------------------------------------------------- */
/**
 * @hidden
 */
export async function compile(content: string): Promise<string>
{
    let path: string = tmpdir() + sep + "tgrid";
    if (await FileSystem.exists(path) === false)
        await FileSystem.mkdir(path);

    while (true)
    {
        let myPath: string = path + sep + `${new Date().getTime()}_${Math.random()}_${Math.random()}.js`; 
        if (await FileSystem.exists(myPath) === false)
        {
            path = myPath;
            break;
        }
    }

    await FileSystem.write(path, content);
    return path;
}

/**
 * @hidden
 */
export function execute(jsFile: string, ...args: any[]): Worker
{
    return new g.Worker(jsFile, ...args) as any;
}

/**
 * @hidden
 */
export async function remove(path: string): Promise<void>
{
    // THE FILE CAN BE REMOVED BY OS AUTOMATICALLY
    try
    {
        await FileSystem.unlink(path);
    }
    catch {}
}

/**
 * @hidden
 */
interface IFeature
{
    Worker: typeof Worker;
}

/**
 * @hidden
 */
const g: IFeature = (function () 
{
    try 
    { 
        require("worker_threads");
        return require("./threads/Worker"); 
    }
    catch 
    { 
        return require("./processes/Worker"); 
    }
})();