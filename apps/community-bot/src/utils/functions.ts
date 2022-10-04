import {
	MessageEmbed,
	EmbedField,
	Message,
	MessageEmbedOptions,
	MessageOptions,
	Guild,
	MessagePayload,
	User,
} from "discord.js"
import { readdirSync } from "fs"
import { SubCommand, SubCommandGroup } from "../base/Command"
import FAGCBot from "../base/fagcbot"

export async function createPagedEmbed(
	fields: EmbedField[],
	embedMsgOptions: MessageEmbed | MessageEmbedOptions,
	message: Message,
	options: {
		maxPageCount?: number
		user?: User
	} = {}
) {
	const newOptions = {
		maxPageCount: 25,
		...options,
	}
	if (newOptions.maxPageCount > 25) newOptions.maxPageCount = 25 // discord limit is 25 things per embed
	const embed = new MessageEmbed(embedMsgOptions)
	let page = 0
	// if the amount of pages is 1 then there is actually only one page, f.e. 5/5 = 1 but the program will work with 0, 1
	const maxPages = Math.floor(fields.length / newOptions.maxPageCount)
	embed.fields = fields.slice(0, options.maxPageCount)
	let embedMsg =
		options.user && options.user.id !== message.author.id
			? await message.edit({ embeds: [embed] })
			: await message.channel.send({
					embeds: [embed],
			  })

	const setData = async () => {
		const start = page * newOptions.maxPageCount
		embed.fields = fields.slice(start, start + newOptions.maxPageCount)
		embedMsg = await embedMsg.edit({
			embeds: [embed],
		})
	}
	const removeReaction = async (emoteName: string) => {
		const foundReaction = embedMsg.reactions.cache.find(
			(r) => r.emoji.name === emoteName
		)
		if (foundReaction)
			foundReaction.users.remove(options.user?.id ?? message.author.id)
	}
	// if there is only 1 page then no sense to make arrows, just slows other reactions down
	if (maxPages) {
		await embedMsg.react("⬅️")
		await embedMsg.react("➡️")
	}
	await embedMsg.react("🗑️")

	const reactionCollector = embedMsg.createReactionCollector({
		filter: (reaction, user) =>
			user.id === (options.user?.id ?? message.author.id),
		time: 120000,
	})

	// remove reactions after timeout runs out
	setTimeout(async () => {
		await embedMsg.reactions.cache.get("⬅️")?.remove().catch()
		await embedMsg.reactions.cache.get("➡️")?.remove().catch()
		await embedMsg.reactions.cache.get("🗑️")?.remove().catch()
	}, 120000)

	reactionCollector.on("collect", (reaction) => {
		switch (reaction.emoji.name) {
			case "⬅️": {
				page--
				removeReaction("⬅️") // remove the user's reaction no matter what
				if (page <= -1) page = 0
				else setData()
				break
			}
			case "➡️": {
				page++
				removeReaction("➡️") // remove the user's reaction no matter what
				if (page > maxPages) page = maxPages
				else setData()
				break
			}
			case "🗑️": {
				reactionCollector.stop()

				if (embedMsg.id !== message.id) {
					embedMsg.delete()
					message.delete()
				}
			}
		}
	})
}

export async function sendToGuild(
	guild: Guild,
	options: string | MessagePayload | MessageOptions
) {
	const guildOwner = await guild.fetchOwner()

	const owner = () => {
		guildOwner
			.send(options)
			.catch(() =>
				console.log(`Could not send embed for guild ID ${guild.id}`)
			)
	}

	const systemChannel = () => {
		if (guild.systemChannel)
			guild.systemChannel.send(options).catch(() => owner())
		else owner()
	}

	const publicUpdates = () => {
		if (guild.publicUpdatesChannel)
			guild.publicUpdatesChannel
				.send(options)
				.catch(() => systemChannel())
		else systemChannel()
	}
	publicUpdates()
}

export async function afterJoinGuild(guild: Guild, client: FAGCBot) {
	// create initial config only if it doesn't exist yet
	client.fagc.communities
		.fetchGuildConfig({
			guildId: guild.id,
		})
		.then((config) => {
			if (config) return
			console.log(`Creating config for guild with ID ${guild.id}`)
			client.fagc.communities.createGuildConfig({
				guildId: guild.id,
			})
		})
	const embed = client.createBaseEmbed().setTitle("Welcome to FAGC")
	embed.addFields(
		{ name: "FAGC Invite", value: client.config.fagcInvite },
		{
			name: "Initial Setup",
			value:
				"We assume that you want to set your guild up. For now, your guild data has been set to a few defaults, " +
				`such as the guild contact being the guild's owner. Everything with the API is readonly until you run \`${client.env.BOTPREFIX}setapikey\`. ` +
				`Run \`${client.env.BOTPREFIX}help\` to view command help. Commands don't work in DMs!`,
		},
		{
			name: "Bot Prefix",
			value: `The bot prefix is, and always will be, \`${client.env.BOTPREFIX}\`. This is displayed in the bot's status`,
		}
	)

	sendToGuild(guild, {
		embeds: [embed],
	})
}

export function loadSubcommands(
	commandName: string,
	...children: string[]
): (SubCommand<boolean, boolean> | SubCommandGroup<boolean, boolean>)[] {
	let path = `${__dirname}/../commands/${commandName}`
	if (children.length) path += `/${children.join("/")}`

	return readdirSync(path)
		.filter((command) => command.endsWith(".js"))
		.map((endCommand) => {
			// eslint-disable-next-line @typescript-eslint/no-var-requires
			const command = require(`${path}/${endCommand}`)
			return command.default
		})
}
