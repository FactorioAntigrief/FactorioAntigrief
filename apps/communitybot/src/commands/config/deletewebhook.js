const Command = require("../../base/Command")

class AddWebhook extends Command {
	constructor(client) {
		super(client, {
			name: "deletewebhook",
			description: "Remove a webhook from a specified channel to stop sending FAGC notifications to",
			aliases: [],
			usage: "[channel]",
			examples: ["{{p}}deletewebhook #notifications"],
			category: "config",
			dirname: __dirname,
			enabled: true,
			memberPermissions: ["MANAGE_WEBHOOKS"],
			botPermissions: ["SEND_MESSAGES", "EMBED_LINKS"],
			ownerOnly: false,
			cooldown: 3000,
			requiredConfig: false,
			customPermissions: ["webhooks"],
		})
	}
	async run(message) {
		if (!message.mentions.channels.first()) return message.channel.send("Channel not provided!")
		const channel = message.mentions.channels.first()
		const webhooks = await channel.fetchWebhooks()
		webhooks.each(webhook => this.client.fagc.info.removeWebhook(webhook.id, webhook.token))
		return message.channel.send("Attempted at removing webhooks")
	}
}
module.exports = AddWebhook