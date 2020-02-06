//================================================================ 
/** @module tgrid.protocols.workers */
//================================================================
import thread = require("worker_threads");

/**
 * @hidden
 */
export class Worker
{
    private worker_: thread.Worker;
    
    public constructor(jsFile: string, ...argv: string[])
    {
        this.worker_ = new thread.Worker(jsFile, { argv: argv } as any);
    }

    public terminate(): void
    {
        this.worker_.terminate();
    }

    public set onmessage(listener: (event: MessageEvent) => void)
    {
        this.worker_.on("message", value =>
        {
            listener({data: value} as MessageEvent);
        });
    }

    public postMessage(message: any): void
    {
        this.worker_.postMessage(message);
    }
}