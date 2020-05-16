const config = {
  user:       process.env.USER     || 'sa',
  password:   process.env.PASSWORD || 'default', 
  database:   process.env.DB       || 'master',
  server:     process.env.HOST     || '127.0.0.1',
  options: {
    database: process.env.HOST     || '127.0.0.1',
    encrypt: false
  },
  requestTimeout: 30000
}

module.exports = config
