import { Command } from "../../base/Command"

const SetContact: Command = {
	name: "setcontact",
	description: "Set your community's contact",
	aliases: [],
	usage: "setcontact (user)",
	examples: [ "setcontact @oof2win2#3149", "setcontact 429696038266208258" ],
	category: "config",
	requiresRoles: true,
	requiresApikey: true,
	requiredPermissions: ["setConfig"],
	run: async ({client, message, args, guildConfig}) => {
		if (!guildConfig.apiKey) return message.channel.send(`${client.emotes.warn} You must have an API key set for this command`)
		const user = message.mentions.users.first() || await client.users.fetch(args[0]).catch(() => null)
		if (!user) return message.channel.send(`${client.emotes.warn} Provided user is invalid`)

		await client.fagc.communities.setCommunityConfig({
			config: {
				contact: user.id
			},
			reqConfig: {
				apikey: guildConfig.apiKey
			}
		})

	}
}

export default SetContact