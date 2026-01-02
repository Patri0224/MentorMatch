require('dotenv').config();
const app = require('./app.js');

console.log(process.env.DATABASE_URL);

const PORT = process.env.PORT || 3000;


