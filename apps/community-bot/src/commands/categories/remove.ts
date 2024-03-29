import { SubCommand } from "../../base/Command"
import { SlashCommandSubcommandBuilder } from "@discordjs/builders"
import { createPagedEmbed } from "../../utils/functions"
import { Category } from "@fdgl/types"
import { AuthError } from "@fdgl/wrapper"

const slashCommand = new SlashCommandSubcommandBuilder()
	.setName("remove")
	.setDescription("Removes a category filter")
	.addStringOption(
		(option) =>
			option
				.setName("category")
				.setDescription("The category to remove")
				.setRequired(true)
		// .setAutocomplete(true) // TODO implement autocomplete
	)

// Add 9 more category arguments
new Array(9).fill(0).forEach((_, i) => {
	slashCommand.addStringOption((option) =>
		option
			.setName(`category${i + 2}`)
			.setDescription(`The category to remove`)
			.setRequired(false)
	)
})

const CategoriesRemove: SubCommand<false, true> = {
	type: "SubCommand",
	data: slashCommand,
	requiredPermissions: ["setCategories"],
	requiresRoles: true,
	requiresApikey: false,
	fetchFilters: true,
	execute: async ({ interaction, client, filters, guildConfig }) => {
		const argCategories =
			interaction.options.data[0].options?.map(
				(option) => option.value as string
			) ?? []

		// check if the categories are in the community's category filters
		const categories = argCategories
			.map((categoryId) =>
				isNaN(Number(categoryId))
					? client.fdgl.categories.resolveId(categoryId)
					: // if it is an index in filtered categories, it needs to be resolved
					  client.fdgl.categories.resolveId(
							filters.categoryFilters[Number(categoryId) - 1]
					  )
			)
			.filter((r): r is Category => Boolean(r))
			.filter((r) => filters.categoryFilters.includes(r.id))

		// if there are no categories that are already in the community's filters, then exit
		if (!categories.length)
			return interaction.reply("No valid categories to be removed")

		// otherwise, send a paged embed with the categories to be removed and ask for confirmation
		const embed = client
			.createBaseEmbed()
			.setTitle("FDGL Categories")
			.setDescription(
				"Remove Filtered Categories. [Explanation](https://gist.github.com/oof2win2/370050d3aa1f37947a374287a5e011c4#file-trusted-md)"
			)
		const categoryFields = categories.map((category) => {
			return {
				name: `${category.name} (\`${category.id}\`)`,
				value: category.description,
				inline: false,
			}
		})

		createPagedEmbed(categoryFields, embed, interaction, interaction.user, {
			maxPageCount: 5,
		})

		const confirm = await client.getConfirmation(
			interaction,
			"Are you sure you want to remove these categories from your category filters?",
			interaction.user,
			{ followUp: true }
		)
		if (!confirm)
			return interaction.followUp("Removing categories cancelled")

		// remove the categories from the community's filters
		const categoryIds = categories.map((category) => category.id)
		const newCategoryFilters = filters.categoryFilters.filter(
			(categoryFilter) => !categoryIds.includes(categoryFilter)
		)

		try {
			await client.saveFilters(
				{
					id: filters.id,
					categoryFilters: newCategoryFilters,
				},
				guildConfig.communityId ?? null
			)

			return interaction.followUp(
				"Successfully removed specified filtered categories"
			)
		} catch (e) {
			if (e instanceof AuthError) {
				return interaction.followUp(
					`${client.emotes.warn} Your API key is not recognized by FDGL`
				)
			}
			throw e
		}
	},
}

export default CategoriesRemove
