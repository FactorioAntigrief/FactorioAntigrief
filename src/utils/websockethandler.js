const { MessageEmbed } = require("discord.js")

// This is only an example file, it is not used anywhere in the bot currently
// Can be used instead of Webhooks, but those have the advantage of being managed by the backend entirely
// so they don't need to be updated from the bot-side
// You can also use the fagc-api-wrapper, which can handle events and you just get the content and send messages

module.exports = SocketMessage

async function SocketMessage(message, channels) {
	switch (message.messageType) {
	case "violation": {
		let embed = new MessageEmbed()
			.setTitle("FAGC Notifications")
			.setColor("ORANGE")
			.setDescription("FAGC violation has been created")
			.setTimestamp()
			.setAuthor("FAGC Community")
			.addFields(
				{ name: "Playername", value: message.playername },
				{ name: "Admin ID", value: message.adminId },
				{ name: "Community ID", value: message.communityId },
				{ name: "Broken Rule", value: message.brokenRule },
				{ name: "Automated", value: message.automated },
				{ name: "Proof", value: message.proof },
				{ name: "Description", value: message.description },
				{ name: "Violation ID", value: message.id },
				{ name: "Violation Time", value: message.reportedTime }
			)
		channels.forEach((channel) => {
			channel.send(embed)
		})
		break
	}
	case "revocation": {
		let embed = new MessageEmbed()
			.setTitle("FAGC Notifications")
			.setDescription("Violation Revoked")
			.setColor("ORANGE")
			.addFields(
				{ name: "Playername", value: message.playername },
				{ name: "Admin ID", value: message.adminId },
				{ name: "Community ID", value: message.communityId },
				{ name: "Broken Rules", value: message.brokenRule },
				{ name: "Automated", value: message.automated },
				{ name: "Proof", value: message.proof },
				{ name: "Description", value: message.description },
				{ name: "Revocation ID", value: message.id },
				{ name: "Revocation Time", value: message.RevokedTime },
				{ name: "Revoked by", value: message.revokedBy }
			)
			.setTimestamp()
		channels.forEach((channel) => {
			channel.send(embed)
		})
		break
	}
	case "ruleCreated": {
		let embed = new MessageEmbed()
			.setTitle("FAGC Notifications")
			.setDescription("Rule created")
			.setColor("ORANGE")
			.addFields(
				{
					name: "Rule short description",
					value: message.shortdesc,
				},
				{ name: "Rule long description", value: message.longdesc }
			)
		channels.forEach((channel) => {
			channel.send(embed)
		})
		break
	}
	case "ruleRemoved": {
		let embed = new MessageEmbed()
			.setTitle("FAGC Notifications")
			.setDescription("Rule removed")
			.setColor("ORANGE")
			.addFields(
				{
					name: "Rule short description",
					value: message.shortdesc,
				},
				{ name: "Rule long description", value: message.longdesc }
			)
		channels.forEach((channel) => {
			channel.send(embed)
		})
		break
	}
	}
}
