const config = {
  user:       USER     || process.env.USER     || 'sa',
  password:   PASSWORD || process.env.PASSWORD || 'default', 
  database:   DB       || process.env.DB       || 'master',
  server:     HOST     || process.env.HOST     || '127.0.0.1',
  options: {
    database: HOST     || process.env.HOST     || '127.0.0.1',
    encrypt: false
  },
  requestTimeout: 30000
}

module.exports = config
