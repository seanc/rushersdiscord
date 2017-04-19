const { Client } = require('discord.js')
const bot = new Client()
const config = require('../lib/config')
const logger = require('catlog')('bot:main ')
const Subscription = require('../models/subscription')
const each = require('each-async')
const plans = Object.keys(config.plans).slice(0, 3).map(p => {
  return config.plans[p]
})
const pixie = require('pixie')

// const verify = require('verify')

const CYCLE_TIME = 120000 // ms -> 2 min
const PLAN_ROLES = plans.map(p => p.itemNumber)


bot.once('ready', () => {
  logger.log('Started')

  const guild = bot.guilds.get(config.bot.guild)
  suspendUsers(guild)
  updateRoles(guild)

  setInterval(() => {
    suspendUsers(guild)
    updateRoles(guild)
  }, CYCLE_TIME)
})

function updateRoles(guild) {
  const members = guild.members
  Subscription.find({ $and: [{ active: true }, { suspended: false }] }, (err, subs) => {
    if (err) return console.log(err)

    each(subs, (sub, index, done) => {
      if (members.has(sub.discordID)) {
        const member = members.get(sub.discordID)
        if (member.roles.has(sub.item_number)) return
        member.removeRoles(PLAN_ROLES).then(member => {
          logger.log(`Removed all roles from ${member.user.username}#${member.user.discriminator}`)
          member.addRole(sub.item_number).then(member => {
            logger.log(`Added role ${guild.roles.get(sub.item_number).name} to ${member.user.username}#${member.user.discriminator}`)
            if (config.bot.confirmMessage) {
              const confirmChannel = guild.channels.get(config.bot.confirmChannel)
              const message = pixie.render(config.bot.confirmMessage, {
                item: guild.roles.get(sub.item_number),
                user: member.user.username,
                userMention: member.user
              })

              confirmChannel.send(message)
            }
            done()
          }).catch(console.log)
        }).catch(console.log)
      }
    }, err => {
      logger.log('Updated roles')
    })
  })
}

function suspendUsers(guild) {
  const members = guild.members

  Subscription.find({ $and: [{ active: false }, { suspended: true }, { managed: false }] }, (err, subs) => {
    if (err) return console.log(err)

    each(subs, (sub, index, done) => {
      if (members.has(sub.discordID)) {
        const member = members.get(sub.discordID)

        if (member.roles.has(sub.item_number)) {
          sub.managed = true
          sub.save()

          member.removeRole(sub.item_number).then(() => {
            logger.log(`Removed role ${guild.roles.get(sub.item_number).name} from ${member.user.username}#${member.user.discriminator}`)
            done()
          }).catch(console.log)
        }
      }
    }, () => {
      logger.log('Removed roles')
    })
  })
}

function start() {
  bot.login(config.bot.token)
}

start.getOnline = function getOnline() {
  return new Promise((resolve, reject) => {
    function get() {
      if (bot.status !== 0) {
        setTimeout(() => get(), 1000)
      } else {
        resolve(bot.guilds.get(config.bot.guild).members.filter(m => m.presence.status === 'online').size)
      }
    }

    get()
  })
}

module.exports = start
