//================================================================ 
/** @module tgrid.protocols.workers */
//================================================================
/**
 * @hidden
 */
class Process
{
    public static postMessage(message: any): void
    {
        (global.process as Required<NodeJS.Process>).send(message);
    }

    public static close(): void
    {
        global.process.exit();
    }

    public static set onmessage(listener: (event: MessageEvent) => void)
    {
        global.process.on("message", msg =>
        {
            listener({data: msg} as MessageEvent);
        });
    }

    public static get document(): Document | undefined
    {
        return (process.send === undefined)
            ? null! as Document // NOT WORKER
            : undefined;
    }
}
export = Process;