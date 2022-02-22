import {
	Entity,
	Column,
	PrimaryGeneratedColumn,
	CreateDateColumn,
} from "typeorm"

@Entity()
export default class Whitelist {
	@PrimaryGeneratedColumn("increment")
	id!: number

	@Column({
		type: "text",
		length: 32, // length of a Discord snowflake
	})
	adminId!: string

	@Column({
		type: "text",
		length: 32, // hopefully max length of a playername
	})
	playername!: string

	@Column({
		type: "text",
		length: 200, // estimated max reason length
		nullable: true,
	})
	reason!: string | null

	@CreateDateColumn()
	createdAt!: Date
}