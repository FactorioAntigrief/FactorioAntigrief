import { SlashCommandBuilder } from "@discordjs/builders"
import { CommandWithSubcommands, SubCommand } from "../utils/Command.js"
import { readdirSync } from "fs"

const commands: SubCommand[] = readdirSync("./commands/communities")
	.filter((x) => x.endsWith(".js"))
	.map((commandName) => {
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const command = require(`./communities/${commandName}`)
		return command.default
	})

const Communities: CommandWithSubcommands = {
	data: new SlashCommandBuilder()
		.setName("communities")
		.setDescription("FDGL Communities")
		.setDefaultPermission(false),
	execute: async ({ client, interaction }) => {
		const subcommand = interaction.options.getSubcommand()!
		const command = commands.find(
			(command) => command.data.name === subcommand
		)
		if (!command)
			return interaction.reply("An error executing the command occured")
		return command.execute({ client, interaction })
	},
}

commands.forEach((command) => {
	Communities.data.addSubcommand(command.data)
})

export default Communities
