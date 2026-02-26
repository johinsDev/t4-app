import { SMSMessage } from "./sms-message";
import { JsonTransport } from "./transports/json";
import { TwilioTransport } from "./transports/twilio";
import type { ProviderConfig, SMSJob, SMSManagerConfig, SMSResponse, SMSTransport } from "./types";

function createTransport(config: ProviderConfig): SMSTransport {
	switch (config.provider) {
		case "json":
			return new JsonTransport();
		case "twilio":
			return new TwilioTransport(config);
	}
}

class SMSSender {
	readonly #transport: SMSTransport;
	readonly #mailerName: string;

	constructor(transport: SMSTransport, mailerName: string) {
		this.#transport = transport;
		this.#mailerName = mailerName;
	}

	async send(callback: (message: SMSMessage) => void): Promise<SMSResponse> {
		const message = new SMSMessage();
		callback(message);
		return this.#transport.send(message.toData());
	}

	buildJob(callback: (message: SMSMessage) => void, sourceClass?: string): SMSJob {
		const message = new SMSMessage();
		callback(message);
		return {
			id: crypto.randomUUID(),
			mailer: this.#mailerName,
			message: message.toData(),
			createdAt: new Date().toISOString(),
			...(sourceClass && { sourceClass }),
		};
	}
}

export class SMSManager<TMailers extends Record<string, ProviderConfig>> {
	readonly #config: SMSManagerConfig<TMailers>;
	readonly #transports = new Map<string, SMSTransport>();

	constructor(config: SMSManagerConfig<TMailers>) {
		this.#config = config;
	}

	#getTransport(name: string): SMSTransport {
		let transport = this.#transports.get(name);
		if (!transport) {
			const providerConfig = this.#config.config[name];
			if (!providerConfig) {
				throw new Error(`Unknown mailer: ${name}`);
			}
			transport = createTransport(providerConfig);
			this.#transports.set(name, transport);
		}
		return transport;
	}

	use<K extends keyof TMailers & string>(name: K): SMSSender {
		return new SMSSender(this.#getTransport(name), name);
	}

	async send(callback: (message: SMSMessage) => void): Promise<SMSResponse> {
		return this.use(this.#config.default).send(callback);
	}

	buildJob(
		callback: (message: SMSMessage) => void,
		mailer?: keyof TMailers & string,
		sourceClass?: string,
	): SMSJob {
		const name = mailer ?? this.#config.default;
		return this.use(name).buildJob(callback, sourceClass);
	}

	async executeJob(job: SMSJob): Promise<SMSResponse> {
		const transport = this.#getTransport(job.mailer);
		return transport.send(job.message);
	}
}
