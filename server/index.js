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
.catch(error =>console.log(error));

//midlewars
app.use(bodyParser.json())

app.use(cors());
app.use('/api', routeUser);
app.use('/api/bets', routeBets);


//end midlewars

const buildPath = path.join(__dirname, '..', 'client', 'build');
app.use(express.static(buildPath));

app.get('*', (req, res, next) => {
  console.log('req.baseUrl',req.baseUrl)
  if(!req.baseUrl.includes('api')){
    res.sendFile(`${buildPath}/index.html`);
  } else{
    next()
  }
})


const port = process.env.PORT || 4000;
app.listen(port, () => {
    console.log('runnnn '+process.env.PORT)
})