//================================================================ 
/** @module tgrid.protocols.web */
//================================================================
import * as ws from "websocket";

import { CommunicatorBase } from "../../components/CommunicatorBase";
import { IAcceptor } from "../internal/IAcceptor";
import { Invoke } from "../../components/Invoke";

import { DomainError } from "tstl/exception";

export class WebAcceptor
	extends CommunicatorBase
	implements IAcceptor<WebAcceptor.State>
{
	/**
	 * @hidden
	 */
	private request_: ws.request;

	/**
	 * @hidden
	 */
	private connection_: ws.connection;

	/**
	 * @hidden
	 */
	private state_: WebAcceptor.State;

	/**
	 * @hidden
	 */
	private listening_: boolean;

	/* ----------------------------------------------------------------
		CONSTRUCTORS
	---------------------------------------------------------------- */
	/**
	 * @hidden
	 */
	private constructor(request: ws.request)
	{
		super();
		
		this.request_ = request;
		this.connection_ = null;

		this.state_ = WebAcceptor.State.NONE;
		this.listening_ = false;
	}

	/**
	 * Close connection.
	 */
	public async close(): Promise<void>
	{
		// VALIDATIONS
		if (this.connection_ === null)
			throw new DomainError("Not accepted or rejected.");
		else if (!this.connection_.connected)
			throw new DomainError("Not connected.");

		//----
		// CLOSE WITH JOIN
		//----
		// PREPARE LAZY RETURN
		let ret: Promise<void> = this.join();

		// CHANGING STATE
		this.state_ = WebAcceptor.State.CLOSING;
		{
			// DO CLOSE
			ret = this.join();
			this.connection_.close();
		}
		// state would be closed in destructor() via _Handle_close()

		// DO RETURN
		await ret;
	}

	/**
	 * @hidden
	 */
	protected async destructor(): Promise<void>
	{
		await super.destructor();
		this.state_ = WebAcceptor.State.CLOSED;
	}

	/* ----------------------------------------------------------------
		HANDSHAKES
	---------------------------------------------------------------- */
	/**
	 * Accept connection.
	 * 
	 * @param protocol 
	 * @param allowOrigin 
	 * @param cookies 
	 */
	public accept(
			protocol?: string, 
			allowOrigin?: string, 
			cookies?: WebAcceptor.ICookie[]
		): Promise<void>
	{
		return new Promise((resolve, reject) =>
		{
			this.state_ = WebAcceptor.State.ACCEPTING;

			// PREPARE EVENT LISTENERS
			this.request_.on("requestAccepted", connection =>
			{
				this.connection_ = connection;
				this.connection_.on("close", this._Handle_close.bind(this));
				this.connection_.on("message", this._Handle_message.bind(this));

				this.state_ = WebAcceptor.State.OPEN;
				resolve();
			});

			// DO ACCEPT
			try
			{
				this.request_.accept(protocol, allowOrigin, cookies);
			}
			catch (exp)
			{
				this.connection_ = null;
				this.state_ = WebAcceptor.State.CLOSED;

				reject(exp);
			}
		});
	}

	/**
	 * Reject connection.
	 * 
	 * @param status Status code.
	 * @param reason Detailed reason to reject.
	 * @param extraHeaders Extra headers if required.
	 */
	public reject(status?: number, reason?: string, extraHeaders?: object): Promise<void>
	{
		return new Promise(resolve =>
		{
			// PREPARE HANDLER
			this.request_.on("requestRejected", async () =>
			{
				await this.destructor();
				resolve();
			});

			// DO REJECT
			this.state_ = WebAcceptor.State.REJECTING;
			this.request_.reject(status, reason, extraHeaders);
		});
	}

	/**
	 * @inheritDoc
	 */
	public async listen<Provider extends object>
		(provider: Provider): Promise<void>
	{
		// SET PROVIDER
		this.provider_ = provider;
		if (this.listening_ === true)
			return;
		
		// INFORM TO CLIENT
		this.listening_ = true;
		this.connection_.sendUTF("PROVIDE");
	}

	/* ----------------------------------------------------------------
		ACCESSORS
	---------------------------------------------------------------- */
	public get path(): string
	{
		return this.request_.resource;
	}

	public get protocol(): string
	{
		return this.connection_.protocol;
	}

	public get extensions(): string
	{
		return this.connection_
			.extensions
			.map(elem => elem.name)
			.toString();
	}

	/**
	 * @inheritDoc
	 */
	public get state(): WebAcceptor.State
	{
		return this.state_;
	}

	/* ----------------------------------------------------------------
		COMMUNICATOR
	---------------------------------------------------------------- */
	/**
	 * @hidden
	 */
	protected sender(invoke: Invoke): void
	{
		this.connection_.sendUTF(JSON.stringify(invoke));
	}

	/**
	 * @hidden
	 */
	protected inspector(): Error
	{
		if (!this.connection_)
			return new DomainError("Not accepted.");
		else if (!this.connection_.connected)
			return new DomainError("Disconnected.");
		else
			return null;
	}

	/**
	 * @hidden
	 */
	private _Handle_message(message: ws.IMessage): void
	{
		let invoke: Invoke = JSON.parse(message.utf8Data);
		this.replier(invoke);
	}

	/**
	 * @hidden
	 */
	private async _Handle_close({}: number, {}: string): Promise<void>
	{
		await this.destructor();
	}
}

export namespace WebAcceptor
{
	export const enum State
	{
		NONE = -1,
		ACCEPTING,
		OPEN,
		REJECTING,
		CLOSING,
		CLOSED
	}

	export interface ICookie 
	{
		name: string;
		value: string;
		path?: string;
		domain?: string;
		expires?: Date;
		maxage?: number;
		secure?: boolean;
		httponly?: boolean;
	}
}