import { WebSocketEvents } from "fagc-api-wrapper/dist/WebsocketListener"
import FAGCBot from "./FAGCBot"
import {
	MessageEmbed,
	NewsChannel,
	TextChannel,
	ThreadChannel,
} from "discord.js"
import {
	guildConfigChangedBanlists,
	handleReport,
	handleRevocation,
	splitIntoGroups,
} from "../utils/functions"

interface HandlerOpts<T extends keyof WebSocketEvents> {
	event: Parameters<WebSocketEvents[T]>[0]
	client: FAGCBot
}

export const communityCreated = ({
	client,
	event,
}: HandlerOpts<"communityCreated">) => {
	const embed = new MessageEmbed({ ...event.embed, type: undefined })

	client.infochannels.forEach((guildChannels) => {
		guildChannels.forEach((c) => {
			const channel = client.channels.cache.get(c.channelId)
			if (!channel || !channel.isNotDMChannel()) return
			client.addEmbedToQueue(channel.id, embed)
		})
	})
}

export const communityRemoved = ({
	client,
	event,
}: HandlerOpts<"communityRemoved">) => {
	const embed = new MessageEmbed({ ...event.embed, type: undefined })

	client.infochannels.forEach((guildChannels) => {
		guildChannels.forEach((c) => {
			const channel = client.channels.cache.get(c.channelId) as
				| NewsChannel
				| TextChannel
				| ThreadChannel
				| undefined
			if (!channel) return
			client.addEmbedToQueue(channel.id, embed)
		})
	})
}

export const categoryCreated = ({
	client,
	event,
}: HandlerOpts<"categoryCreated">) => {
	const embed = new MessageEmbed({ ...event.embed, type: undefined })

	client.infochannels.forEach((guildChannels) => {
		guildChannels.forEach((c) => {
			const channel = client.channels.cache.get(c.channelId)
			if (!channel || !channel.isNotDMChannel()) return
			client.addEmbedToQueue(channel.id, embed)
		})
	})
}

export const categoryRemoved = async ({
	client,
	event,
}: HandlerOpts<"categoryRemoved">) => {
	const embed = new MessageEmbed({ ...event.embed, type: undefined })

	client.infochannels.forEach((guildChannels) => {
		guildChannels.forEach((c) => {
			const channel = client.channels.cache.get(c.channelId)
			if (!channel || !channel.isNotDMChannel()) return
			client.addEmbedToQueue(channel.id, embed)
		})
	})
}

export const report = async ({ client, event }: HandlerOpts<"report">) => {
	const embed = new MessageEmbed({ ...event.embed, type: undefined })

	const whereToSend = [...client.guildConfigs.values()].filter(
		(guildConfig) => {
			// check whether the revocation is valid under this guild's config
			return (
				guildConfig.categoryFilters.includes(event.report.categoryId) &&
				guildConfig.trustedCommunities.includes(
					event.report.communityId
				)
			)
		}
	)

	// the report is invalid for all guilds, so we don't care about it
	if (whereToSend.length == 0) return

	// send the embed to each guilds's info channels
	whereToSend.map((guildConfig) => {
		const infochannels = client.infochannels.get(guildConfig.guildId)
		if (!infochannels) return
		infochannels.forEach((c) => {
			const channel = client.channels.cache.get(c.channelId)
			if (!channel || !channel.isNotDMChannel()) return
			client.addEmbedToQueue(channel.id, embed)
		})
	})

	// get guilds where to ban
	const guildsToBan = await handleReport({
		database: await client.db,
		report: event.report,
		allGuildConfigs: [...client.guildConfigs.values()],
	})
	if (!guildsToBan) return

	// unban in guilds that its supposed to
	guildsToBan.map((guildId) => {
		const command = client.createBanCommand(event.report, guildId)
		if (!command) return // if it is not supposed to do anything in this guild, then it won't do anything
		client.rcon.rconCommandGuild(
			`/sc ${command}; rcon.print(true)`,
			guildId
		)
	})
}

export const revocation = async ({
	client,
	event,
}: HandlerOpts<"revocation">) => {
	const embed = new MessageEmbed({ ...event.embed, type: undefined })

	const whereToSend = [...client.guildConfigs.values()].filter(
		(guildConfig) => {
			// check whether the revocation is valid under this guild's config
			return (
				guildConfig.categoryFilters.includes(
					event.revocation.categoryId
				) &&
				guildConfig.trustedCommunities.includes(
					event.revocation.communityId
				)
			)
		}
	)

	// the report is invalid for all guilds, so we don't care about it
	if (whereToSend.length == 0) return

	// send the embed to each guilds's info channels
	whereToSend.map((guildConfig) => {
		const infochannels = client.infochannels.get(guildConfig.guildId)
		if (!infochannels) return
		infochannels.forEach((c) => {
			const channel = client.channels.cache.get(c.channelId) as
				| NewsChannel
				| TextChannel
				| ThreadChannel
				| undefined
			if (!channel) return
			client.addEmbedToQueue(channel.id, embed)
		})
	})

	// get guilds where to unban
	const guildsToUnban = await handleRevocation({
		database: await client.db,
		revocation: event.revocation,
		allGuildConfigs: [...client.guildConfigs.values()],
	})
	if (!guildsToUnban) return

	// unban in guilds that its supposed to
	guildsToUnban.map((guildId) => {
		const command = client.createUnbanCommand(
			event.revocation.playername,
			guildId
		)
		if (!command) return // if it is not supposed to do anything in this guild, then it won't do anything
		client.rcon.rconCommandGuild(
			`/sc game.unban_player("${event.revocation.playername}"); rcon.print(true)`,
			guildId
		)
	})
}

export const guildConfigChanged = async ({
	client,
	event,
}: HandlerOpts<"guildConfigChanged">) => {
	client.guildConfigs.set(event.config.guildId, event.config) // set the new config

	const validReports = await client.fagc.reports.list({
		categoryIds: event.config.categoryFilters,
		communityIds: event.config.trustedCommunities,
	})

	const results = await guildConfigChangedBanlists({
		database: await client.db,
		newConfig: event.config,
		allGuildConfigs: [...client.guildConfigs.values()],
		validReports: validReports,
	})

	// ban players
	const playerBanStrings = results.toBan.map(
		(playername) =>
			`game.ban_player("${playername}", "View your FAGC reports on https://factoriobans.club/api/reports/search?${new URLSearchParams(
				{ playername: playername }
			).toString()}")`
	)
	for (const playerBanGroup of splitIntoGroups(playerBanStrings)) {
		await client.rcon.rconCommandGuild(
			`/sc ${playerBanGroup.join(";")}; rcon.print(true)`,
			event.config.guildId
		)
	}

	// unban players
	const playerUnbanStrings = results.toUnban.map(
		(playername) => `game.unban_player("${playername}")`
	)
	for (const playerUnbanGroup of splitIntoGroups(playerUnbanStrings)) {
		await client.rcon.rconCommandGuild(
			`/sc ${playerUnbanGroup.join(";")}; rcon.print(true)`,
			event.config.guildId
		)
	}
}
