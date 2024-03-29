import { FastifyReply, FastifyRequest } from "fastify"
import { Controller, GET, POST } from "fastify-decorators"
import CategoryModel from "../database/category"
import { Authenticate } from "../utils/authentication"
import { reportCreatedMessage } from "../utils/info"
import ReportInfoModel from "../database/reportinfo"
import { validateDiscordUser, client } from "../utils/discord"
import {
	Community,
	Category,
	Report,
	ReportMessageExtraOpts,
} from "@fdgl/types"
import GuildConfigModel from "../database/guildconfig"
import { z } from "zod"
import validator from "validator"
import FilterModel from "../database/filterobject"

@Controller({ route: "/reports" })
export default class ReportController {
	@GET({
		url: "/",
		options: {
			schema: {
				querystring: z.object({
					playername: z.string().or(z.array(z.string())).optional(),
					communityId: z.string().or(z.array(z.string())).optional(),
					categoryId: z.string().or(z.array(z.string())).optional(),
					adminId: z.string().or(z.array(z.string())).optional(),
					after: z
						.string()
						.optional()
						.refine(
							(input) =>
								input === undefined ||
								validator.isISO8601(input),
							"Invalid timestamp"
						),
				}),
				description: "Fetch reports",
				tags: ["reports"],
				response: {
					"200": z.array(Report),
				},
			},
		},
	})
	async fetchAll(
		req: FastifyRequest<{
			Querystring: {
				playername?: string | string[]
				communityId?: string | string[]
				categoryId?: string | string[]
				adminId?: string | string[]
				after?: string
			}
		}>,
		res: FastifyReply
	): Promise<FastifyReply> {
		const { playername, communityId, categoryId, adminId, after } =
			req.query
		const reports = await ReportInfoModel.find({
			playername: playername,
			communityId: communityId,
			categoryId: categoryId,
			adminId: adminId,
			...(after ? { reportCreatedAt: { $gt: new Date(after) } } : {}),
			revokedAt: { $exists: false },
		})
		return res.send(reports)
	}

	@POST({
		url: "/",
		options: {
			schema: {
				body: z.object({
					adminId: z.string(),
					playername: z.string(),
					categoryId: z.string(),
					automated: z.boolean().nullish().default(false),
					reportedTime: z
						.string()
						.default(() => new Date().toISOString())
						.refine(
							(input) => validator.isISO8601(input),
							"reportedTime must be a valid ISO8601 date"
						),
					description: z.string().default("No description"),
					proof: z
						.string()
						.default("No proof")
						.refine((input) => {
							if (input === "No proof") return true
							return input
								.split(" ")
								.map((part) => validator.isURL(part))
								.reduce((prev, current) => prev && current)
						}, "Proof must be URLs split by a space"),
				}),

				description: "Create report",
				tags: ["reports"],
				security: [
					{
						authorization: [],
					},
				],
				response: {
					"200": Report,
				},
			},
		},
	})
	@Authenticate
	async create(
		req: FastifyRequest<{
			Body: {
				adminId: string
				playername: string
				categoryId: string
				automated: boolean
				reportedTime: string
				description: string
				proof: string
			}
		}>,
		res: FastifyReply
	): Promise<FastifyReply> {
		const {
			adminId,
			playername,
			categoryId,
			automated,
			reportedTime,
			description,
			proof,
		} = req.body

		const { community } = req.requestContext.get("auth")
		if (!community)
			return res.status(400).send({
				errorCode: 400,
				error: "Community Not Found",
				message: "Your community could not be found",
			})

		const category = await CategoryModel.findOne({ id: categoryId })
		if (!category)
			return res.status(400).send({
				errorCode: 400,
				error: "Bad Request",
				message: "categoryId must be a valid ID",
			})

		const isDiscordUser = await validateDiscordUser(adminId)
		if (!isDiscordUser)
			return res.status(400).send({
				errorCode: 400,
				error: "Bad Request",
				message: "adminId must be a valid Discord user ID",
			})
		const admin = await client.users.fetch(adminId)

		// check whether any one of the community configs allows for this category, if not, then don't accept the report
		const filter = await FilterModel.findOne({
			id: community.filterObjectId,
		})
		if (!filter)
			return res.status(400).send({
				errorCode: 400,
				error: "Bad Request",
				message: "Your community does not have a filter",
			})

		if (filter.categoryFilters.indexOf(categoryId) === -1)
			return res.status(400).send({
				errorCode: 400,
				error: "Bad Request",
				message:
					"Your community does not filter for the specified category",
			})

		const report = await ReportInfoModel.create({
			playername: playername,
			adminId: adminId,
			categoryId: categoryId,
			automated: automated,
			reportedTime: reportedTime,
			description: description,
			proof: proof,
			communityId: community.id,
		})

		const allReports = await ReportInfoModel.find({
			playername: playername,
			revokedAt: { $exists: false },
		}).select(["communityId"])
		const differentCommunities: Set<string> = new Set()
		allReports.forEach((report) =>
			differentCommunities.add(report.communityId)
		)

		reportCreatedMessage(report, {
			community: <Community>(<unknown>community.toObject()),
			category: <Category>(<unknown>category.toObject()),
			createdBy: <ReportMessageExtraOpts["createdBy"]>(<unknown>admin),
			totalReports: allReports.length,
			totalCommunities: differentCommunities.size,
		})
		return res.status(200).send(report)
	}

	@GET({
		url: "/:id",
		options: {
			schema: {
				params: z.object({
					id: z.string(),
				}),

				description: "Fetch report",
				tags: ["reports"],
				response: {
					"200": Report.nullable(),
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
		const community = await ReportInfoModel.findOne({
			id: id,
			revokedAt: { $exists: false },
		})
		return res.send(community)
	}
}
