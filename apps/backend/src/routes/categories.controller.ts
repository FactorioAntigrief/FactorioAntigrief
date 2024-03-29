import { FastifyReply, FastifyRequest } from "fastify"
import { Controller, DELETE, GET, PATCH, POST } from "fastify-decorators"
import CategoryModel from "../database/category"
import GuildConfigModel from "../database/guildconfig"
import { MasterAuthenticate } from "../utils/authentication"
import {
	guildConfigChanged,
	categoryCreatedMessage,
	categoryRemovedMessage,
	categoriesMergedMessage,
	categoryUpdatedMessage,
	filterObjectChanged,
} from "../utils/info"
import { Category } from "@fdgl/types"
import { z } from "zod"
import ReportInfoModel from "../database/reportinfo"
import FilterModel from "../database/filterobject"

@Controller({ route: "/categories" })
export default class CategoryController {
	@GET({
		url: "/",
		options: {
			schema: {
				description: "Fetch all categories",
				tags: ["categories"],
				response: {
					"200": z.array(Category),
				},
			},
		},
	})
	async fetchAll(
		_req: FastifyRequest,
		res: FastifyReply
	): Promise<FastifyReply> {
		const categories = await CategoryModel.find({})
		return res.send(categories)
	}

	@GET({
		url: "/:id",
		options: {
			schema: {
				params: z
					.object({
						id: z.string(),
					})
					.required(),

				description: "Fetch category",
				tags: ["categories"],
				response: {
					"200": Category.nullable(),
				},
			},
		},
	})
	async fetch(
		req: FastifyRequest<{
			Params: {
				id: string
			}
		}>,
		res: FastifyReply
	): Promise<FastifyReply> {
		const { id } = req.params
		const category = await CategoryModel.findOne({ id: id })
		return res.send(category)
	}

	@POST({
		url: "/",
		options: {
			schema: {
				body: z
					.object({
						name: z.string(),
						description: z.string(),
					})
					.required(),

				description: "Create category",
				tags: ["master"],
				security: [
					{
						masterAuthorization: [],
					},
				],
				response: {
					"200": Category,
				},
			},
		},
	})
	@MasterAuthenticate
	async create(
		req: FastifyRequest<{
			Body: {
				name: string
				description: string
			}
		}>,
		res: FastifyReply
	): Promise<FastifyReply> {
		const { name, description } = req.body
		const category = await CategoryModel.create({
			name: name,
			description: description,
		})
		categoryCreatedMessage(category)
		return res.send(category)
	}

	@PATCH({
		url: "/:id",
		options: {
			schema: {
				params: z
					.object({
						id: z.string(),
					})
					.required(),
				body: z
					.object({
						name: z.string().optional(),
						description: z.string().optional(),
					})
					.optional(),

				description: "Update category",
				tags: ["master"],
				security: [
					{
						masterAuthorization: [],
					},
				],
				response: {
					"200": Category,
				},
			},
		},
	})
	@MasterAuthenticate
	async update(
		req: FastifyRequest<{
			Params: {
				id: string
			}
			Body: {
				name?: string
				description?: string
			}
		}>,
		res: FastifyReply
	): Promise<FastifyReply> {
		const { name, description } = req.body
		const { id } = req.params

		const category = await CategoryModel.findOne({ id: id })
		if (!category) return res.send(null)
		if (!name && !description) {
			return res.send(await CategoryModel.findOne({ id: id }))
		}

		const oldCategory = category.toObject()
		if (name) category.name = name
		if (description) category.description = description
		await category.save()
		categoryUpdatedMessage(oldCategory, category.toObject())

		return res.send(category)
	}

	@DELETE({
		url: "/:id",
		options: {
			schema: {
				params: z.object({
					id: z.string(),
				}),

				description: "Delete category",
				tags: ["master"],
				security: [
					{
						masterAuthorization: [],
					},
				],
				response: {
					"200": Category,
				},
			},
		},
	})
	@MasterAuthenticate
	async delete(
		req: FastifyRequest<{
			Params: {
				id: string
			}
		}>,
		res: FastifyReply
	): Promise<FastifyReply> {
		const { id } = req.params
		const category = await CategoryModel.findOneAndRemove({
			id: id,
		})

		if (category) {
			categoryRemovedMessage(category)
			// store the IDs of the affected guilds - ones which have the category filtered
			const affectedFilters = await FilterModel.find({
				categoryFilters: [category.id],
			})

			// remove the category ID from any guild configs which may have it
			await FilterModel.updateMany(
				{
					categoryFilters: category.id,
				},
				{
					$pull: { categoryFilters: category.id },
				}
			)

			const newFilters = await FilterModel.find({
				_id: { $in: affectedFilters.map((config) => config._id) },
			})

			await ReportInfoModel.deleteMany({
				categoryId: category.id,
			})

			// tell guilds about it after the revocations + reports have been removed
			const sendGuildConfigInfo = async () => {
				const wait = (ms: number): Promise<void> =>
					new Promise((resolve) => {
						setTimeout(() => {
							resolve()
						}, ms)
					})
				for (const config of newFilters) {
					filterObjectChanged(config)
					// 1000 * 100 / 1000 = amount of seconds it will take for 100 communities
					// staggered so not everyone at once tries to fetch their new banlists
					await wait(100)
				}
			}
			sendGuildConfigInfo() // this will make it execute whilst letting other code still run
		}
		return res.send(category)
	}

	@PATCH({
		url: "/:idReceiving/merge/:idDissolving",
		options: {
			schema: {
				params: z.object({
					idReceiving: z.string(),
					idDissolving: z.string(),
				}),

				description:
					"Merge category idDissolving into category idReceiving",
				tags: ["master"],
				security: [
					{
						masterAuthorization: [],
					},
				],
				response: {
					"200": Category,
				},
			},
		},
	})
	@MasterAuthenticate
	async mergeCategories(
		req: FastifyRequest<{
			Params: {
				idReceiving: string
				idDissolving: string
			}
		}>,
		res: FastifyReply
	): Promise<FastifyReply> {
		const { idReceiving, idDissolving } = req.params
		const receiving = await CategoryModel.findOne({
			id: idReceiving,
		})
		if (!receiving)
			return res.status(400).send({
				errorCode: 400,
				error: "Bad Request",
				message: "idOne must be a valid category ID",
			})
		const dissolving = await CategoryModel.findOne({
			id: idDissolving,
		})
		if (!dissolving)
			return res.status(400).send({
				errorCode: 400,
				error: "Bad Request",
				message: "idTwo must be a valid category ID",
			})

		await CategoryModel.findOneAndDelete({
			id: idDissolving,
		})
		await ReportInfoModel.updateMany(
			{
				categoryId: idDissolving,
			},
			{
				categoryId: idReceiving,
			}
		)

		await FilterModel.updateMany(
			{
				categoryFilters: idDissolving,
			},
			{
				$addToSet: { categoryFilters: idReceiving },
			}
		)
		await FilterModel.updateMany(
			{
				categoryFilters: idDissolving,
			},
			{
				$pull: { categoryFilters: idDissolving },
			}
		)

		const affectedConfigs = await FilterModel.find({
			categoryFilters: idReceiving,
		})

		const sendGuildConfigInfo = async () => {
			const wait = (ms: number): Promise<void> =>
				new Promise((resolve) => {
					setTimeout(() => {
						resolve()
					}, ms)
				})
			for (const config of affectedConfigs) {
				filterObjectChanged(config)
				// 1000 * 100 / 1000 = amount of seconds it will take for 100 communities
				// staggered so not everyone at once tries to fetch their new banlists
				await wait(100)
			}
		}
		sendGuildConfigInfo() // this will make it execute whilst letting other code still run

		categoriesMergedMessage(receiving, dissolving)

		return res.send(receiving)
	}
}
