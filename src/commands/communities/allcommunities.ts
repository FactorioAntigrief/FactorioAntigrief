import { MessageEmbed } from "discord.js"
import { Command } from "../../base/Command"
import { createPagedEmbed } from "../../utils/functions"

const GetAllCommunities: Command = {
	name: "allcommunities",
	description: "Gets all communities",
	aliases: [],
	usage: "",
	examples: [],
	category: "communities",
	requiresRoles: false,
	requiresApikey: false,
	run: async ({ client, message }) => {
		const communities = await client.fagc.communities.fetchAll({})

		const embed = new MessageEmbed()
			.setTitle("FAGC Communities")
			.setColor("GREEN")
			.setTimestamp()
			.setAuthor({ name: client.config.embeds.author })
			.setFooter({ text: client.config.embeds.footer })
			.setDescription("All FAGC Communities")

		const fields = await Promise.all(
			communities.map(async (community) => {
				return {
					name: `${community.name} | \`${community.id}\``,
					value: await client.safeGetContactString(community.contact),
					inline: false,
				}
			})
		)
		createPagedEmbed(fields, embed, message, { maxPageCount: 10 })
	},
}
export default GetAllCommunities
