import * as fs from 'fs'
import { Telegraf } from 'telegraf'
import random from 'random'

const token = fs.readFileSync('token.txt', { encoding: 'utf8', flag: 'r' })
const bot = new Telegraf(token)

type DickRecord = {
	user_id: number,
	username: string,
	length: number,
	timestamp: number
}

type DickData = {
	dicks: DickRecord[];
}

bot.on('text', async (ctx) => {
	const bot_user = await bot.telegram.getMe()
	// Commands processing
	if (ctx.message.text.startsWith("/help@" + bot_user.username)) {
		const help_message = fs.readFileSync('./help.md', { encoding: 'utf8', flag: 'r' })
		await ctx.telegram.sendMessage(ctx.chat.id, help_message, { parse_mode: "MarkdownV2" })
		return
	}
	if (ctx.message.text.startsWith("/dick@" + bot_user.username)) {
		const json_text = fs.readFileSync('./dicks.json', { encoding: 'utf8', flag: 'r' })
		let dick_data: DickData = JSON.parse(json_text)
		let author_data = dick_data.dicks.find((dick_record) => { return dick_record.user_id == ctx.message.from.id })
		if (author_data == undefined) {
			author_data = {
				length: 0,
				user_id: ctx.message.from.id,
				timestamp: 0,
				username: ctx.message.from.first_name,
			}
			dick_data.dicks.push(author_data)
		} else {
			author_data.username = ctx.message.from.first_name
		}

		const now = new Date()
		const last_change = new Date(author_data.timestamp)

		if (now.getFullYear() == last_change.getFullYear() && now.getMonth() == last_change.getMonth() && now.getDate() == last_change.getDate()) {
			await ctx.telegram.sendMessage(
				ctx.chat.id,
				markdown_mention(ctx.message.from) + ", ти сьогодні вже грав\\(ла\\)\\.\nПродовжуй через " + markdownFriendlyCountdown(),
				{ reply_to_message_id: ctx.message.message_id, parse_mode: "MarkdownV2" }
			)
			return
		}

		const change = random.int(0, 15) - 5
		if (author_data.length + change < 0) author_data.length = 0
		else author_data.length = author_data.length + change
		author_data.timestamp = now.getTime()
		dick_data.dicks[dick_data.dicks.findIndex((dick_record: DickRecord) => { return dick_record.user_id == author_data?.user_id })].length = author_data.length
		dick_data.dicks[dick_data.dicks.findIndex((dick_record: DickRecord) => { return dick_record.user_id == author_data?.user_id })].timestamp = author_data.timestamp
		fs.writeFileSync('./dicks.json', JSON.stringify(dick_data), { encoding: 'utf8' })

		if (change > 0) {
			await ctx.telegram.sendMessage( // .., твій песюн виріс на 3 см.
				ctx.chat.id,
				markdown_mention(ctx.message.from) + ", твій песюн виріс на " + change + "см\\.\nТепер його довжина — " + author_data.length + "см\\.\nПродовжуй грати через " + markdownFriendlyCountdown(),
				{ reply_to_message_id: ctx.message.message_id, parse_mode: "MarkdownV2" }
			)
		} else {
			if (author_data.length == 0) { // .., в тебе немає песюна 🌚.
				await ctx.telegram.sendMessage(
					ctx.chat.id,
					markdown_mention(ctx.message.from) + ", в тебе немає песюна 🌚\\.\nПродовжуй грати через " + markdownFriendlyCountdown(),
					{ reply_to_message_id: ctx.message.message_id, parse_mode: "MarkdownV2" }
				)
			} else {
				if (change < 0) {
					await ctx.telegram.sendMessage( // .., твій песюн скоротився на 1 см.
						ctx.chat.id,
						markdown_mention(ctx.message.from) + ", твій песюн скоротився на " + (-change) + "см\\.\nТепер його довжина — " + author_data.length + "см\\.\nПродовжуй грати через " + markdownFriendlyCountdown(),
						{ reply_to_message_id: ctx.message.message_id, parse_mode: "MarkdownV2" }
					)
				} else {
					await ctx.telegram.sendMessage( // .., твій песюн сьогодні не змінився.
						ctx.chat.id,
						markdown_mention(ctx.message.from) + ", твій песюн сьогодні не змінився\\.\nЙого довжина — " + author_data.length + "см\\.\nПродовжуй грати через " + markdownFriendlyCountdown(),
						{ reply_to_message_id: ctx.message.message_id, parse_mode: "MarkdownV2" }
					)
				}
			}
		}
		return
	}
	if (ctx.message.text.startsWith("/give")) {
		if (ctx.message.reply_to_message == undefined) {
			await ctx.telegram.sendMessage(ctx.chat.id, "Використовуйте цю команду як відповідь на повідомлення отримувачу.", { reply_to_message_id: ctx.message.message_id })
			return
		}
		if (ctx.message.reply_to_message.from == undefined) {
			console.log("message replying to has undefied sender");
			await ctx.telegram.sendMessage(ctx.chat.id, "Сталась помилка. Збережено для аналізу", { reply_to_message_id: ctx.message.message_id })
			return
		}
		if (ctx.message.reply_to_message.from?.id == ctx.message.from.id) {
			await ctx.telegram.sendMessage(ctx.chat.id, "Не можна переводити сантиметри самому собі.", { reply_to_message_id: ctx.message.message_id })
			return
		}
		if (ctx.message.reply_to_message.from?.is_bot) {
			await ctx.telegram.sendMessage(ctx.chat.id, "Боти не приймають участі в грі.", { reply_to_message_id: ctx.message.message_id })
			return
		}
		const words = get_lowercase_words(ctx.message.text)
		const count = parseInt(words[1], 10)
		if (isNaN(count)) await ctx.telegram.sendMessage(ctx.chat.id, "Кількість см неправильна.", { reply_to_message_id: ctx.message.message_id })
		const json_text = fs.readFileSync('./dicks.json', { encoding: 'utf8', flag: 'r' })
		let dick_data: DickData = JSON.parse(json_text)
		let initiator_data = dick_data.dicks.find((dick_record) => { return dick_record.user_id == ctx.message.from.id })
		if (initiator_data == undefined) {
			await ctx.telegram.sendMessage(ctx.chat.id, "В тебе немає песюна 🌚.", { reply_to_message_id: ctx.message.message_id })
			initiator_data = createDickRecord(ctx.message.from)
			dick_data.dicks.push(initiator_data)
			fs.writeFileSync('./dicks.json', JSON.stringify(dick_data), { encoding: 'utf8' })
			return
		}
		if (initiator_data.length == 0) {
			await ctx.telegram.sendMessage(ctx.chat.id, "В тебе немає песюна 🌚.", { reply_to_message_id: ctx.message.message_id })
			return
		}
		if (count > initiator_data.length) {
			await ctx.telegram.sendMessage(ctx.chat.id, "В тебе недостатньо сантиметрів щоб ними поділитись.", { reply_to_message_id: ctx.message.message_id })
			return
		}
		let reciever_data = dick_data.dicks.find((dick_record) => { return dick_record.user_id == ctx.message.reply_to_message?.from?.id })
		if (typeof reciever_data === 'undefined') { // TypeScript somehow dont understand that reciever_data can't be undefined after that
			reciever_data = createDickRecord(ctx.message.reply_to_message.from)
			dick_data.dicks.push(reciever_data)
		}
		dick_data.dicks[dick_data.dicks.findIndex((dick_record) => { return dick_record.user_id == (reciever_data as DickRecord).user_id })].length = reciever_data.length + count
		dick_data.dicks[dick_data.dicks.findIndex((dick_record) => { return dick_record.user_id == (initiator_data as DickRecord).user_id })].length = initiator_data.length - count
		fs.writeFileSync('./dicks.json', JSON.stringify(dick_data), { encoding: 'utf8' })
		await ctx.telegram.sendMessage(
			ctx.chat.id,
			"Успішно переведено " + count + "см до песюна " + markdown_mention(ctx.message.reply_to_message.from) +
			"\\.\nТепер його довжина — " + dick_data.dicks[dick_data.dicks.findIndex((dick_record) => { return dick_record.user_id == (reciever_data as DickRecord).user_id })].length + "см\\.",
			{ reply_to_message_id: ctx.message.message_id, parse_mode: "MarkdownV2" }
		)
		return
	}

	if (ctx.message.text.startsWith("/top@" + bot_user.username)) {
		const json_text = fs.readFileSync('./dicks.json', { encoding: 'utf8', flag: 'r' })
		let dick_data: DickData = JSON.parse(json_text)
		dick_data.dicks.sort((dick_record_a, dick_record_b): number => {
			if (dick_record_a.length > dick_record_b.length) return -1
			if (dick_record_a.length < dick_record_b.length) return 1
			return 0
		})
		let top_text = "Рейтинг гравців:\n"
		dick_data
		for (let i = 0; i < dick_data.dicks.length; i++) {
			const dick_record = dick_data.dicks[i]
			if (dick_record.length != 0) {
				top_text = top_text + "\n" + (i + 1) + ". " + dick_record.username + " — " + dick_record.length + " см"
			} else {
				top_text = top_text + "\n" + (i + 1) + ". " + dick_record.username + " не має песюна"
			}
		}
		await ctx.telegram.sendMessage(ctx.chat.id, top_text)
		return
	}
})

function createDickRecord(user: any): DickRecord {
	let dick_record: DickRecord = {
		length: 0,
		user_id: user.id,
		timestamp: 0,
		username: user.first_name,
	}
	return dick_record
}

function markdown_mention(user: any): string {
	let username = user.first_name
	username = username.replace(".", "\\.")
	const text = "[" + username + "](tg://user?id=" + user.id + ")"
	return text
}

function markdownFriendlyCountdown(): string {
	const now = new Date()
	const text = (23 - now.getHours()) + "год\\. " + (59 - now.getMinutes()) + "хв\\. " + (60 - now.getSeconds()) + "сек\\."
	return text
}

function get_lowercase_words(string: string): string[] {
	const words = string.toLowerCase().split(/\s+/)
	return words
}

bot.launch()
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))