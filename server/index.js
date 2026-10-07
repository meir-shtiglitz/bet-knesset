const express = require("express");
const app = express();
const path = require("path");

const mongoose = require("mongoose");
const bodyParser = require("body-parser");
require("dotenv").config();
const routeUser = require('./routes/user');
const routeBets = require('./routes/bets-route');
const cors = require("cors");

//connect to DB 
mongoose.connect(process.env.DATABASE, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
  useCreateIndex: true
}).then(() => console.log("conected to DB"))
.catch(() => console.error('Database connection failed'));

//midlewars
app.use(bodyParser.json({ limit: '32kb' }))

app.use(cors());
app.use('/api', routeUser);
app.use('/api/bets', routeBets);
app.use('/api', (req, res) => res.status(404).json({ error: 'API endpoint not found' }));


//end midlewars

const buildPath = path.join(__dirname, 'build');
app.use(express.static(buildPath));

app.get('*', (req, res) => res.sendFile(`${buildPath}/index.html`));
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  const status = error.type === 'entity.too.large' ? 413 :
    error.type === 'entity.parse.failed' ? 400 : 503;
  res.status(status).json({ error: status === 413 ? 'Request body too large' :
    status === 400 ? 'Invalid JSON body' : 'Unable to complete request' });
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log('runnnn '+ port)
})