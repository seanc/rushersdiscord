const { mongodb } = require('./config')
const mongoose = require('mongoose')

mongoose.plugin(require('mongoose-find-one-or-create'))
mongoose.connect(`mongodb://${mongodb.host}:${mongodb.port}/${mongodb.db}`)

const { connection } = mongoose
connection.once('open', console.log.bind(console, 'Mongoose connected'))
connection.once('error', console.error.bind(console, 'Connection Error:'))

module.exports = mongoose
