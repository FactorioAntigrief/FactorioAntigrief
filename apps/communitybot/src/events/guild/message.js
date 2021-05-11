const ConfigModel = require("../../database/schemas/config")

module.exports = async (client, message) => {
	if (message.author.bot) return
	if (!message.guild) return
	const prefix = client.config.prefix
	if (!message.content.startsWith(prefix)) return

	let args = message.content.slice(prefix.length).trim().split(/ +/g)
	let command = args.shift().toLowerCase()
	let cmd = client.commands.get(command) || client.commands.get(client.aliases.get(command))
	if (!cmd) return message.channel.send(`\`${prefix}${command}\` is not a valid command! Use \`fagc!help\` to view commands`)

	if (!cmd.config.enabled)
		return message.channel.send("This command is currently disabled!")
	if (cmd.config.ownerOnly && message.author.id !== client.config.owner.id)
		return message.channel.send(`Only the owner of ${client.user.username} can run this commands!`)

	const rate = client.checkTimeout(message.author.id, cmd.config.cooldown)
	if (rate && !client.config.adminIDs.includes(message.author.id)) return message.channel.send("You're too fast!")
	client.RateLimit.set(message.author.id, Date.now())

	let guildConfig = await ConfigModel.findOne({ guildid: message.guild.id })

	if (message.guild) {
		let neededPermissions = []
		if (!cmd.config.botPermissions.includes("EMBED_LINKS"))
			cmd.config.botPermissions.push("EMBED_LINKS")

		// bot permissions
		cmd.config.botPermissions.forEach((perm) => {
			if (!message.channel.permissionsFor(message.guild.me).has(perm))
				neededPermissions.push(perm)
		})
		if (neededPermissions.length > 0)
			return message.channel.send(`I need the following permissions to execute this command: ${neededPermissions.map((p) => `\`${p}\``).join(", ")}`)

		// user permissions
		neededPermissions = []
		cmd.config.memberPermissions.forEach((perm) => {
			if (!message.channel.permissionsFor(message.member).has(perm))
				neededPermissions.push(perm)
		})
		if (neededPermissions.length > 0)
			return message.channel.send(`You need the following permissions to execute this command: ${neededPermissions.map((p) => `\`${p}\``).join(", ")}`)
	}

	try {
		cmd.run(message, args, guildConfig)
	} catch (e) {
		console.error(e)
		return message.channel.send("Something went wrong... Please try again later!")
	}
}