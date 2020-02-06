//================================================================ 
/** @module tgrid.protocols.workers */
//================================================================
import thread = require("worker_threads");

/**
 * @hidden
 */
class ParentPort
{
    public static postMessage(message: any): void
    {
        thread.parentPort!.postMessage(message);
    }

    public static close(): void
    {
        global.process.exit(0);
    }

    public static set onmessage(listener: (event: MessageEvent) => void)
    {
        thread.parentPort!.on("message", msg =>
        {
            listener({data: msg} as MessageEvent);
        });
    }

    public static get document(): Document | undefined
    {
        return (thread.parentPort === null)
            ? null! as Document // NOT WORKER
            : undefined;
    }
}
export = ParentPort;