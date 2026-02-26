import type { SMSManager } from "./sms-manager";
import { SMSMessage } from "./sms-message";
import type { ProviderConfig, SMSJob, SMSResponse } from "./types";

export abstract class BaseSms {
	protected message = new SMSMessage();

	abstract prepare(): void | Promise<void>;

	#buildCallback() {
		return (m: SMSMessage) => {
			const data = this.message.toData();
			m.to(data.to).content(data.content);
			if (data.from) m.from(data.from);
		};
	}

	async send<T extends Record<string, ProviderConfig>>(
		manager: SMSManager<T>,
		mailer?: keyof T & string,
	): Promise<SMSResponse> {
		await this.prepare();
		if (mailer) {
			return manager.use(mailer).send(this.#buildCallback());
		}
		return manager.send(this.#buildCallback());
	}

	async sendLater<T extends Record<string, ProviderConfig>>(
		manager: SMSManager<T>,
		mailer?: keyof T & string,
	): Promise<SMSJob> {
		await this.prepare();
		return manager.buildJob(this.#buildCallback(), mailer, this.constructor.name);
	}
}
