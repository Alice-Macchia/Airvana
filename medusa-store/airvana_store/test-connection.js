const { Client } = require('pg');

const client = new Client({
  user: 'postgres',
  host: '165.22.75.145',
  database: 'medusa_db',
  password: 'airvana',
  port: 15432,
  ssl: false,  // Disabilita SSL
});

client.connect()
  .then(() => console.log('Connected to database'))
  .catch(err => console.error('Connection error', err.stack))
  .finally(() => client.end());
