const express = require("express");
const app = express();
const bodyParser = require('body-parser');
const func = require('./function.js');
var cors = require('cors');
var corsOptions = {
  origin: '*',
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(express.static("public"));

app.get("/", (request, response) => {
  response.sendFile(__dirname + "/views/index.html");
});

// request dialogflow
app.post("/noah", async (request, response) => {
  console.log("Requisição Dialogflow")
  var intentName = request.body.queryResult.intent.displayName
  console.log("INTENT " + intentName)
  var res = {};
  
  if (intentName == '[Times] - Inicio') {
    res = await func.fetchTime(request);
  } else if (intentName == '[Jogador] Inicio'){
    res = await func.fetchJogador(request);
  } else if (intentName == "[Times] - Proximas Partidas"){
    const nextGames = await func.nextGames(request);
    res = func.nextGamesResponse(nextGames[0],nextGames[1],request);
  }else if (1){
    const nextGames = await func.prevGames(request);
    res = func.prevGamesResponse(nextGames[0],nextGames[1],request);
  }
  
  response.json(res);
});

// listen for requests :)
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
