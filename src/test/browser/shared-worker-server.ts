import { SharedWorkerServer } from "../../protocols/workers";
import { Calculator } from "../providers/Calculator";

/// chrome://inspect/#workers
async function main(): Promise<void>
{
    let server = new SharedWorkerServer();
    await server.open(async acceptor =>
    {
        await acceptor.accept(new Calculator());
    });
}
main();