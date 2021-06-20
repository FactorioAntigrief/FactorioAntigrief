const { MessageAttachment } = require("discord.js")
const Command = require("../../base/Command")

class Genbanlist extends Command {
	constructor(client) {
		super(client, {
			name: "generatebanlist",
			description: "Creates a .json banlist file to use for servers",
			aliases: ["banlist", "genbanlist"],
			category: "basic",
			dirname: __dirname,
			enabled: true,
			memberPermissions: [],
			botPermissions: ["SEND_MESSAGES", "EMBED_LINKS"],
			ownerOnly: false,
			cooldown: 5000,
			requiredConfig: true
		})
	}
	async run(message, _, config) {
		if (!config.trustedCommunities) return message.reply("Please set trusted communities first")
		if (!config.ruleFilters) return message.reply("Please set rule filters first")
		message.reply("Processing banlist. Please wait")

		// get all reports based off of followed rules
		let rulePromises = config.ruleFilters.map((rule) => {
			return this.client.fagc.reports.fetchByRule(rule)
		})
		let ruleReports = await Promise.all(rulePromises)
		let reportArr = []
		ruleReports.forEach((reports) => {
			reports.forEach((report) => {
				reportArr.push(report)
			})
		})

		// filter reports so only trusted communities are on the banlist
		reportArr = reportArr.filter((report) => config.trustedCommunities.includes(report.communityId))
		// remove duplicates
		reportArr = reportArr.filter((report, i) => reportArr.indexOf(report) === i)

		// create & send banlist
		let banlist = reportArr.map((report) => {
			return {
				username: report.playername,
				reason: `Banned on FAGC. Please check one of the community Discord servers or go to ${this.client.config.apiurl}/profiles/getall?playername=${report.playername}`
			}
		})
		// using (null, 4) in JSON.stringify() to have nice formatting - 4 = 4 spaces for tab
		let file = new MessageAttachment(Buffer.from(JSON.stringify(banlist, null, 4)), "banlist.json")
		await message.channel.send("Banlist attatched", {
			files: [file]
		})
	}
}

module.exports = Genbanlist