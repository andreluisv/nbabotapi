const axios = require('axios')
const GoogleImages = require('google-images');
const client = new GoogleImages('8da725a31ca9677a8', 'AIzaSyCTXgRpl7xwe3QVSM3iynclZW_Nvz43kCc');

const fetchTime = async (request) => {
  let idTeam = request.body.queryResult.parameters.teams
  console.log(`Team ${idTeam} consultation`);
  let value = await axios.get('https://www.balldontlie.io/api/v1/teams/' + idTeam)
  let data = value.data;

  const result = await client.search(data['full_name'] + " logo");
  const url = result[0].url;

  let photo = {
        "imageUri": url
  };

  let textInit = "Achamos o seguinte time 👀";
  let text = "Time: <b>"+ data['full_name'] +"</b>\nNome: " + data['name'] + "\nAbreviação: " + data['abbreviation'] + "\nCidade: " + data["city"] + "\nConferência: " + data["conference"] + "\nDivisão: " + data["division"];

  let firstMessage = request.body.queryResult.fulfillmentMessages[0];
  firstMessage.payload.telegram.text = text;

  let res = {
        "fulfillmentMessages": [
        {
          "text": {
            "text": [textInit]
          },
          "platform": "TELEGRAM"
        },
        {
          "image": photo,
          "platform": "TELEGRAM"
        },
          firstMessage,
          request.body.queryResult.fulfillmentMessages[1]
        ]
      }

  return res;
}

const fetchJogador = async (request) => {
  let player = (request.body.queryResult.parameters['person']||{})['name'] || request.body.queryResult.parameters['first-name'] || request.body.queryResult.parameters['last-name'] || "";
    console.log(`Player ${player} consultation`);
    let value = await axios.get('https://www.balldontlie.io/api/v1/players?search=' + player);
    var data = value.data.data;
    if (data.length == 0){
      //Vazio
      let res = {
          "fulfillmentMessages": [
          {
            "text": {
              "text": ["Não achamos nenhum jogador com esse nome :( [" + player + "]"]
            },
            "platform": "TELEGRAM"
          },
          ]
        };
    
      return res;
    }
    data = data[0];
    
    const result = await client.search(data['first_name'] + " " + data['last_name']);
    const url = result[0].url;
    
    let photo = {
          "imageUri": url
    };
    
    const convert = (str) => {
      if (!str) return "";
      var r = "|";
      for (let c of str){
        if (c=="F") r += "Forward|";
        if (c=="C") r += "Center|";
        if (c=="G") r += "Guard|";
      }
      return r;
    };
    
    let textInit = "Achamos o seguinte jogador 👀";
    let text = "<b>"+ data['first_name'] + " " + data['last_name'] + "</b>\nTime: " + (data['team']||{})['full_name'] + "\nPeso: " + String(Number(data['weight_pounds']) * 0.453592 + 0.000001).split(".")[0] + "kg\nAltura: " + String(Number(data["height_feet"])*30.48 + Number(data["height_inches"])*2.54).substr(0,3) + "cm\nPosição: " + convert(data["position"]);
    let firstMessage = request.body.queryResult.fulfillmentMessages[0];
    
    firstMessage.payload.telegram.text = text;
        
    let res = {
          "fulfillmentMessages": [
          {
            "text": {
              "text": [textInit]
            },
            "platform": "TELEGRAM"
          },
          {
            "image": photo,
            "platform": "TELEGRAM"
          },
            firstMessage,
            //request.body.queryResult.fulfillmentMessages[1]
          ]
        };
    
    return res;
}

function formatDate(d) {
    const month = '' + (d.getMonth() + 1),
        day = '' + d.getDate(),
        year = d.getFullYear();

    return [year, (month.length<2 ? '0':'')+month, (day.length<2 ? '0':'')+day].join('-');
}

function formatDateLocal(d) {
    const month = '' + (d.getMonth() + 1),
        day = '' + d.getDate(),
        year = d.getFullYear();

    return [(day.length<2 ? '0':'')+day,(month.length<2 ? '0':'')+month,year].join('/');
}

const nextGames = async (request) => {
  let teamId = request.body.queryResult.parameters.teams;
  var numberPattern = /\d+/g;
  teamId = teamId.match( numberPattern ).join([]);
  const date = formatDate(new Date());
  
  var games = [];
  var current_page = 1, total_pages = 1;
  do{
    var value = await axios.get('https://www.balldontlie.io/api/v1/games?seasons[]=2020&start_date='+date+'&per_page=100&page='+current_page+'&team_ids[]='+teamId);
    value = value.data;
    const gamesArray = value.data;
    for (const game of gamesArray){
      if (game.home_team.id == teamId || game.visitor_team.id == teamId){
        games.push(game);
      }
    }

    current_page += 1;
    total_pages = Number(value.meta.total_pages);
  }while(current_page <= total_pages);
  games = games.sort((a,b)=>{return (new Date(a.date).getTime() - new Date(b.date).getTime())}).splice(0,5);
  
  if (games[0].home_team.id == teamId) {
    return [games, games[0].home_team.full_name]
  } 
  
  return [games, games[0].visitor_team.full_name]
  
}

const nextGamesResponse = (games,name,request) => {
  
  let text = ""
  
  for (const game of games) {
    let timeH = String(Number(game.status.split(":")[0]) + (game.status.split(" ")[1]=='PM' ? 12 : 0) + 1), timeM = game.status.split(" ")[0].split(":")[1];
    let time = game.status ? " | "+timeH + ":" + timeM : "";
    let date = "[ " + formatDateLocal(new Date(game.date)) + " ] ";
    
    if (game.home_team.full_name == name) {
      game.home_team.full_name = "<b>"+game.home_team.full_name+"</b>"
    } else {
      game.visitor_team.full_name = "<b>"+game.visitor_team.full_name+"</b>"
    }
    
    text += date + game.home_team.full_name + " x " + game.visitor_team.full_name + "\n"
  
  }
  
  
  request.body.queryResult.fulfillmentMessages[0].payload.telegram.text = (request.body.queryResult.fulfillmentMessages[0].payload.telegram.text.replace("{team_full_name}",name)).replace("{numero}", games.length)
  
  let res = {
        "fulfillmentMessages": [
        request.body.queryResult.fulfillmentMessages[0],
        {
          "payload": {
            "telegram": {
               "parse_mode": "html",
              "text": text
            }
          },
          "platform": "TELEGRAM"
        }
        ]
    }
  
  return res;
  
}

const prevGames = async (request) => {
  let teamId = request.body.queryResult.parameters.teams;
  const date = formatDate(new Date());
  
  var games = [];
  var current_page = 1, total_pages = 1;
  do{
    var value = await axios.get('https://www.balldontlie.io/api/v1/games?seasons[]=2020&end_date='+date+'&per_page=100&page='+current_page+'&team_ids[]='+teamId);
    value = value.data;
    const gamesArray = value.data;
    for (const game of gamesArray){
      if (game.status != 'Final') continue;
      if (game.home_team.id == teamId || game.visitor_team.id == teamId){
        games.push(game);
      }
    }

    current_page += 1;
    total_pages = Number(value.meta.total_pages);
  }while(current_page <= total_pages);
  
  games = games.sort((a,b)=>{return (new Date(a.date).getTime() - new Date(b.date).getTime())}).splice(-5);
  
  if (games[0].home_team.id == teamId) {
    return [games, games[0].home_team.full_name]
  }
  
  return [games, games[0].visitor_team.full_name]
}

const prevGamesResponse = (games,name,request) => {
  let text = ""
  
  for (const game of games) {
    let date = "[ " + formatDateLocal(new Date(game.date)) + " ] ";
    
    if (game.home_team.full_name == name) {
      game.home_team.full_name = "<b>"+game.home_team.full_name+"</b>"
    } else {
      game.visitor_team.full_name = "<b>"+game.visitor_team.full_name+"</b>"
    }
    
    text += date + game.home_team.full_name + " " + game.home_team_score + " x " + game.visitor_team_score + " " +  game.visitor_team.full_name + "\n"
  
  }
  
  request.body.queryResult.fulfillmentMessages[0].payload.telegram.text = (request.body.queryResult.fulfillmentMessages[0].payload.telegram.text.replace("{team_full_name}",name)).replace("{numero}", games.length)
  for (let i = 0; i < 5; i++){
    const gameId = games[i].id;
    const gameDate = formatDateLocal(new Date(games[i].date));
    request.body.queryResult.fulfillmentMessages[1].payload.telegram.reply_markup.keyboard[i][0].text += gameDate + " #" + gameId;
  }
  request.body.queryResult.fulfillmentMessages[1].payload.telegram.reply_markup.keyboard[5][0].text = name;
  
  
  let res = {
        "fulfillmentMessages": [
          request.body.queryResult.fulfillmentMessages[0],
          {
            "payload": {
              "telegram": {
                 "parse_mode": "html",
                "text": text
              }
            },
            "platform": "TELEGRAM"
          },
          request.body.queryResult.fulfillmentMessages[1]
        ]
    }
  
  console.log(res.fulfillmentMessages[2].payload.telegram.reply_markup.keyboard)
  return res;
  
}

module.exports = {
  fetchJogador,
  fetchTime,
  nextGames,
  nextGamesResponse,
  prevGames,
  prevGamesResponse
}