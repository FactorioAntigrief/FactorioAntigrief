const fetch = require("node-fetch")
const { MessageEmbed } = require("discord.js")
const ConfigModel = require("../../database/schemas/config")
const { handleErrors } = require("../../utils/functions")
const Command = require("../../base/Command")

class Revoke extends Command {
    constructor(client) {
        super(client, {
            name: "revoke",
            description: "Revokes a player's violation with the violation ID",
            aliases: ["revokeid"],
            category: "violations",
            usage: "[violationid]",
            examples: ["{{p}}revoke 60689a97674ac1edb15186f0"],
            dirname: __dirname,
            enabled: true,
            guildOnly: true,
            memberPermissions: ["BAN_MEMBERS"],
            botPermissions: ["SEND_MESSAGES", "EMBED_LINKS"],
            nsfw: false,
            ownerOnly: false,
            args: false,
            cooldown: 3000,
            requiredConfig: true
        })
    }
    async run(message, args, config) {
        if (!config.apikey)
            return message.reply("No API key set")
        
        if (!args[0]) return message.reply("Provide a ObjectID for the violation to revoke")
        const violationID = args.shift()

        const violationRaw = await fetch(`${this.client.config.apiurl}/violations/getbyid?id=${violationID}`)
        const violation = await violationRaw.json()
        if (violation === null)
            return message.channel.send(`Violation with ID \`${violationID}\` doesn't exist`)
        if (violation.error && violation.description.startsWith('id expected ObjectID'))
            return message.reply(`\`${violationID}\` is not a proper Mongo ObjectID`)

        let embed = new MessageEmbed()
            .setTitle("FAGC Violation Revocation")
            .setColor("GREEN")
            .setTimestamp()
            .setAuthor("FAGC Community")
            .setDescription(`FAGC Violation \`${violation._id}\` of player \`${violation.playername}\` in community ${config.communityname}`)
        embed.addFields(
            { name: "Admin name", value: violation.admin_name },
            { name: "Broken rule ID", value: violation.broken_rule },
            { name: "Proof", value: violation.proof },
            { name: "Description", value: violation.description },
            { name: "Automated", value: violation.automated },
            { name: "Violated time", value: Date(violation.violated_time) }
        )
        message.channel.send(embed)

        const reactionFilter = (reaction, user) => {
            return user.id == message.author.id
        }
        const confirm = await message.channel.send("Are you sure you want to revoke this violation?")
        confirm.react("✅")
        confirm.react("❌")

        let reactions
        try {
            reactions = (await confirm.awaitReactions(reactionFilter, { max: 1, time: 120000, errors: ['time'] }))
        } catch (error) {
            return message.channel.send("Timed out.")
        }

        let reaction = reactions.first()
        if (reaction.emoji.name === "❌")
            return message.channel.send("Violation revocation cancelled")

        try {
            const responseRaw = await fetch(`${this.client.config.apiurl}/violations/revoke`, {
                method: "DELETE",
                body: JSON.stringify({
                    id: violationID,
                    admin_name: message.author.tag
                }),
                headers: { 'apikey': config.apikey, 'content-type': 'application/json' }
            })

            const response = await responseRaw.json()

            if (response._id && response.revokedBy && response.revokedTime) {
                return message.channel.send(`Violation revoked!`)
            } else {
                return handleErrors(message, response)
            }
        } catch (error) {
            console.error({ error })
            return message.channel.send("Error revoking violation. Please check logs.")
        }
    }
}
module.exports = Revoke