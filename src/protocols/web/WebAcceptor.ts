/** 
 * @packageDocumentation
 * @module tgrid.protocols.web
 */
//----------------------------------------------------------------
import http from "http";
import WebSocket from "ws";

import { AcceptorBase } from "../internal/AcceptorBase";
import { IWebCommunicator } from "./internal/IWebCommunicator";

import { Invoke } from "../../components/Invoke";

import { DomainError } from "tstl/exception/DomainError";
import { WebError } from "./WebError";

/**
 * Web Socket Acceptor.
 *  - available only in NodeJS.
 * 
 * The `WebAcceptor` is a communicator class interacting with the remote (web socket) client
 * using RFC (Remote Function Call). The `WebAcceptor` objects are always created by the 
 * {@link WebServer} class whenever a remote client connects to its server.
 * 
 * To accept connection and start interaction with the remote client, call the {@link accept}() 
 * method with special `Provider`. Also, don't forget to closing the connection after your 
 * busines has been completed.
 * 
 * @template Headers Type of headers containing initialization data like activation.
 * @template Provider Type of features provided for remote system.
 * @author Jeongho Nam - https://github.com/samchon
 */
export class WebAcceptor<
        Headers extends object | null, 
        Provider extends object | null>
    extends AcceptorBase<Headers, Provider>
    implements IWebCommunicator
{
    /**
     * @hidden
     */
    private request_: http.IncomingMessage;

    /**
     * @hidden
     */
    private socket_: WebSocket;

    /* ----------------------------------------------------------------
        CONSTRUCTORS
    ---------------------------------------------------------------- */
    /**
     * @internal
     */
    public static create<Headers extends object, Provider extends object | null>
        (request: http.IncomingMessage, socket: WebSocket, headers: Headers): WebAcceptor<Headers, Provider>
    {
        return new WebAcceptor(request, socket, headers);
    }

    /**
     * @hidden
     */
    private constructor(request: http.IncomingMessage, socket: WebSocket, headers: Headers)
    {
        super(headers);
        
        this.request_ = request;
        this.socket_ = socket;
    }

    /**
     * @inheritDoc
     */
    public async close(code?: number, reason?: string): Promise<void>
    {
        // TEST CONDITION
        let error: Error | null = this.inspectReady("close");
        if (error)
            throw error;
        
        //----
        // CLOSE WITH JOIN
        //----
        // PREPARE LAZY RETURN
        let ret: Promise<void> = this.join();

        // DO CLOSE
        this.state_ = WebAcceptor.State.CLOSING;
        if (code === 1000)
            this.socket_!.close();
        else
            this.socket_!.close(code!, reason!);
        
        // state would be closed in destructor() via _Handle_close()
        await ret;
    }

    /**
     * @hidden
     */
    protected async destructor(error?: Error): Promise<void>
    {
        await super.destructor(error);
        this.state_ = WebAcceptor.State.CLOSED;
    }

    /* ----------------------------------------------------------------
        ACCESSORS
    ---------------------------------------------------------------- */
    public get ip(): string
    {
        return this.request_.connection.remoteAddress!;
    }

    public get path(): string
    {
        return this.request_.url!;
    }

    /* ----------------------------------------------------------------
        HANDSHAKES
    ---------------------------------------------------------------- */
    /**
     * @inheritDoc
     */
    public async accept(provider: Provider | null = null): Promise<void>
    {
        // VALIDATION
        if (this.state_ !== WebAcceptor.State.NONE)
            throw new DomainError("Error on WebAcceptor.accept(): you've already accepted (or rejected) the connection.");

        // PREPARE ASSETS
        this.state_ = WebAcceptor.State.ACCEPTING;
        this.provider_ = provider;

        // REGISTER EVENTS
        this.socket_.on("message", this._Handle_message.bind(this));
        this.socket_.on("close", this._Handle_close.bind(this));
        this.socket_.send(WebAcceptor.State.OPEN.toString());

        // FINISHED
        this.state_ = WebAcceptor.State.OPEN;
    }

    /**
     * Reject connection.
     *
     * Reject without acceptance, any interaction. The connection would be closed immediately.
     *
     * @param status Status code.
     * @param reason Detailed reason to reject.
     */
    public async reject(status?: number, reason?: string): Promise<void>
    {
        // VALIDATION
        if (this.state_ !== WebAcceptor.State.NONE)
            throw new DomainError("You've already accepted (or rejected) the connection.");

        // SEND CLOSING FRAME
        this.state_ = WebAcceptor.State.REJECTING;
        this.socket_.close(status, reason);
        
        // FINALIZATION
        await this.destructor();
    }

    /* ----------------------------------------------------------------
        COMMUNICATOR
    ---------------------------------------------------------------- */
    /**
     * @hidden
     */
    protected sendData(invoke: Invoke): void
    {
        this.socket_.send(JSON.stringify(invoke));
    }

    /**
     * @hidden
     */
    private _Handle_message(data: WebSocket.Data): void
    {
        if (typeof data === "string")
        {
            let invoke: Invoke = JSON.parse(data);
            this.replyData(invoke);
        }
    }

    /**
     * @hidden
     */
    private async _Handle_close(code: number, reason: string): Promise<void>
    {
        let error: WebError | undefined = (code !== 100)
            ? new WebError(code, reason)
            : undefined;
        
        await this.destructor(error);
    }
}

export namespace WebAcceptor
{
    export import State = AcceptorBase.State;
}