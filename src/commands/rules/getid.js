const { MessageEmbed } = require("discord.js")
const Command = require("../../base/Command")

class GetIDRule extends Command {
	constructor(client) {
		super(client, {
			name: "getruleid",
			description: "Gets a rule by its ID",
			aliases: [],
			usage: "[ruleID]",
			examples: ["{{p}}getruleid 605ee7eae3585679cb881c7b"],
			category: "rules",
			dirname: __dirname,
			enabled: true,
			memberPermissions: [],
			botPermissions: ["SEND_MESSAGES", "EMBED_LINKS"],
			ownerOnly: false,
			cooldown: 3000,
			requiredConfig: false,
		})
	}
	async run(message, args) {
		if (!args[0]) return message.reply("Provide rule ID to search by")
		const rule = await this.client.fagc.rules.fetchRule(args[0])

		if (rule === null)
			return message.reply(`No rule with ID of \`${args[0]}\` exists`)
		if (rule.error && rule.description.includes("id must be ID"))
			return message.reply(`\`${args[0]}\` is not a valid rule`)
		if (rule.error) return message.reply(`Error: ${rule.description}`)

		let embed = new MessageEmbed()
			.setTitle("FAGC Rules")
			.setColor("GREEN")
			.setTimestamp()
			.setAuthor("FAGC Community")
			.setDescription(`FAGC Rule with ID \`${rule.id}\``)
		embed.addField(rule.shortdesc, rule.longdesc)
		message.channel.send(embed)
	}
}
module.exports = GetIDRule
