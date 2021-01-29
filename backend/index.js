const express = require('express')
const chalk = require('chalk')
const cors = require('cors')
const bodyParser = require('body-parser')
const webpush = require('web-push')

const app = express()
app.use(cors())
const PORT = 8000

// Config web-push
const publicVapidKey = 'BOgjL4TQxxngezXpmDytqwDc01U-JdI6JikShCWQSW6X92S5Pe5Hq_wGidEK-SsPpIi4dhsB2S-0i7N8fSBcfGE'
const privateVapidKey = 'drffnLNhK9wWL6nuzM4rYSCQ88dAjsaVW_tTJzfFPdI'
webpush.setVapidDetails(
  'mailto: baptiste.lechat@ynov.com',
  publicVapidKey,
  privateVapidKey
)

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))
// parse application/json
app.use(bodyParser.json())


const stringToHash = (string) => {

  var hash = 0;

  if (string.length == 0) return hash;

  for (i = 0; i < string.length; i++) {
    char = string.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  return hash;
}

app.get('/', (req, res) => {
  res.send('🌍 PWA Mini BR Backend Work !')
})


const MongoClient = require('mongodb').MongoClient;
const connectionString = "mongodb+srv://admin:pwaAdmin@pwa-mini-br-cluster.32rxd.mongodb.net/miniBR?retryWrites=true&w=majority";
MongoClient.connect(connectionString, { useUnifiedTopology: true }, (err, client) => {
  if (err) return console.error(err)
  console.log('Connected to Database')
  const db = client.db('miniBR')
  const gamesCollection = db.collection('games')
  const playersCollection = db.collection('players')
  const lootsCollection = db.collection('loots')
  app.get('/clearData', async (req, res) => {

    gamesCollection.deleteMany({}, function (err, delOK) {
      if (err) throw err;
      if (delOK) console.log("Collection deleted");
    });

    playersCollection.deleteMany({}, function (err, delOK) {
      if (err) throw err;
      if (delOK) console.log("Collection deleted");
    });

    lootsCollection.deleteMany({}, function (err, delOK) {
      if (err) throw err;
      if (delOK) console.log("Collection deleted");
    });

    res.status(200);
    res.json({
      message: "All collection cleared"
    })
  });

  // -------------------------------------
  // --------------- GAMES ---------------
  // -------------------------------------

  // findAll games
  app.get('/games', async (req, res) => {
    gamesCollection.find().toArray().then(results => {
      console.log(chalk.bgBlue.black('findAll games'))
      res.json({
        data: results
      })
    }).catch(error => console.error(error))
  })

  // findOne game
  app.get('/games/:id', (req, res) => {
    const gameId = req.params.id

    let query = { gameId: gameId };

    gamesCollection.findOne(query).then(result => {
      console.log(chalk.bgBlue.black('findOne game'))
      res.json({
        dataGame: result
      })
    }).catch(error => console.error(error))

  })

  // Create New partie
  app.post('/games/add', (req, res) => {
    const dataGame = req.body;
    const dataPlayer = dataGame.data.grid.data.players;

    gamesCollection.insertOne(dataGame).then(result => {
      let newGame = result.ops[0];
      console.log("insertOne game", newGame);
      playersCollection.insertMany(dataPlayer).then(result => {
        console.log("insert game players", newGame);
        res.json({
          dataGame: newGame,
          dataPlayer: result.ops
        })
      }).catch(error => console.error(error));
    }).catch(error => console.error(error));
  })

  // games updateTurnPlayerId
  app.put('/games/updateTurnPlayerId/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const data = req.body;

    let query = { gameId: id };
    var newValues = { $set: { turnPlayerId: data.turnPlayerId } };
    gamesCollection.updateOne(query, newValues).then(result => {
      console.log("update TurnPlayerId");
      res.sendStatus(200)
    }).catch(error => console.error(error));
  })



  // -------------------------------------
  // -------------- PLAYERS --------------
  // -------------------------------------

  // findAll players
  app.get('/players', (req, res) => {
    playersCollection.find().toArray().then(results => {
      console.log(chalk.bgBlue.black('findAll players'))
      res.json({
        data: results
      })
    }).catch(error => console.error(error))
  })

  // findOne player
  app.get('/players/:game/:id', (req, res) => {
    const game = req.params.game
    const id = parseInt(req.params.id)
    const player = []

    let query = { gameId: game, playerId: id };

    playersCollection.find(query).toArray().then(results => {
      console.log(chalk.bgBlue.black('findOne player'))
      res.json({
        data: results
      })
    }).catch(error => console.error(error))

  })

  // insertOne player
  app.post('/players/add', (req, res) => {
    const newPlayer = req.body;
    let query = { gameId: newPlayer.gameId };

    playersCollection.find(query).toArray().then(gamePlayers => {

      if (gamePlayers.length == 5) {
        res.json({
          message: "The game is already full"
        })
      } else {
        let ids = [1, 2, 3, 4, 5];
        let alreadyUsedIds = [];
        gamePlayers.forEach(player => {
          if (ids.includes(player.playerId)) {
            alreadyUsedIds.push(player.playerId);
          }
        });

        let notUsedIds = ids.filter(item => !alreadyUsedIds.includes(item));
        if (notUsedIds.length == 0) {
          res.json({
            message: "Tout les id sont déjà utilisé"
          })
        } else {
          newPlayer.playerId = notUsedIds[0];

          let positionList = [{ x: 3, y: 2 }, { x: 38, y: 17 }, { x: 38, y: 2 }, { x: 3, y: 17 }, { x: 21, y: 9 }]

          newPlayer.position = positionList[newPlayer.playerId - 1];

          playersCollection.insertOne(newPlayer).then(result => {
            let query = { gameId: newPlayer.gameId };

            gamesCollection.findOne(query).then(result => {
              let gameWithNewPlayer = result.data.grid.data.players = [...result.data.grid.data.players, newPlayer];
              gamesCollection.updateOne(query, gameWithNewPlayer).then(result => {
                res.json({
                  newPlayer: newPlayer
                })
              }).catch(error => console.error(error));
            }).catch(error => console.error(error))
          }).catch(error => console.error(error));
        }
      }
    }).catch(error => console.error(error))
  })

  const updatePlayer = (gameId, playerId, newValues, res) => {
    let query = { gameId: gameId, playerId: parseInt(playerId) };
    console.log(query, newValues);
    playersCollection.updateOne(query, newValues).then(result => {
      console.log(result);
      if (result.health <= 0) {
        playersCollection.updateOne(query, { $set: { isDead: true } }).then(result => {
          res.json({
            data: result
          })
        }).catch(error => console.error(error));
      }

      res.json({
        data: result
      })
    }).catch(error => console.error(error));
  }

  // update player Health
  app.put('/players/updateHealth/:game/:id', (req, res) => {
    const game = req.params.game
    const id = parseInt(req.params.id)
    const data = req.body;
    var newValues = { $set: { health: data.health } };
    updatePlayer(game, id, newValues, res);
  })


  // Pupdate player Equipment
  app.put('/players/updateEquipment/:gameId/:playerId', (req, res) => {
    const gameId = req.params.gameId
    const playerId = parseInt(req.params.playerId)
    const data = req.body

    let newEquipment = {};
    if (data.armor) {
      newEquipment.armor = data.armor;
    }
    if (data.weapon) {
      newEquipment.weapon = data.weapon;
    }
    var newValues = { $set: { newEquipment } };
    updatePlayer(gameId, playerId, newValues, res);
  })

  // update player Position
  app.put('/players/updatePosition/:gameId/:playerId', (req, res) => {
    const gameId = req.params.gameId
    const playerId = parseInt(req.params.playerId)
    const data = req.body

    var newValues = { $set: { position: data.position, nbMoveAvailable: data.nbMoveAvailable } };
    updatePlayer(gameId, playerId, newValues, res);
  })

  // -------------------------------------
  // ----------- LOOTS ------------
  // -------------------------------------

  // findOne Loots
  app.get('/loots/:game', (req, res) => {
    const game = req.params.game

    let query = { gameId: game };

    lootsCollection.findOne(query).then(result => {
      res.json(result)
    }).catch(error => console.error(error))

  })

  // insertOne loots
  app.post('/loots/add', (req, res) => {
    const gameId = req.body.gameId;
    const lootedCell = req.body.lootedCell;
    let lootsExist = false;

    let query = { gameId: gameId };

    lootsCollection.findOne(query).then(result => {
      if (result && result.lootedCells) {
        var newValues = { $set: { lootedCells: [...result.lootedCells, lootedCell] } };
        lootsCollection.updateOne(query, newValues).then(result => {
          res.sendStatus(200)
        }).catch(error => console.error(error));
      } else {
        lootsCollection.insertOne({ gameId: gameId, lootedCells: [lootedCell] }).then(result => {
          res.sendStatus(200)
        }).catch(error => console.error(error));
      }

    }).catch(error => console.error(error))

  })


  // -------------------------------------
  // ----------- SUBSCRIPTION ------------
  // -------------------------------------


  // Subcribe route
  app.post('/subscribe', (req, res) => {
    // Get pushSubscription Options
    const subscription = req.body.subscription
    const gameId = req.body.gameId
    const playerId = parseInt(req.body.playerId)


    let query = { gameId: gameId, playerId: playerId };
    var newValues = { $set: { subscription: subscription } };
    gamesCollection.updateOne(query, newValues).then(result => {
      res.status(201).json({})

      const payload = JSON.stringify({
        title: 'PWA Mini BR',
        body: 'Vous vous êtes abonné aux notifications',
        icon: 'https://img.icons8.com/dusk/64/000000/appointment-reminders--v1.pn'
      })

      webpush.sendNotification(subscription, payload).catch(err => console.log(err))
    }).catch(error => console.error(error));
  })

  app.post('/sendNotification', (req, res) => {
    const subscription = req.body.subscription
    const notificationTitle = req.body.payload.title
    const notificationBody = req.body.payload.body
    const notificationIcon = req.body.payload.icon

    res.status(201).json({})

    const payload = JSON.stringify({
      title: notificationTitle,
      body: notificationBody,
      icon: notificationIcon
    })

    webpush.sendNotification(subscription, payload).catch(err => console.log(err))
  })

  app.post('/sendNotificationTo', (req, res) => {
    const gameId = req.body.gameId
    const playerId = parseInt(req.body.playerId)
    const notificationTitle = req.body.payload.title
    const notificationBody = req.body.payload.body
    const notificationIcon = req.body.payload.icon

    let query = { gameId: gameId, playerId: playerId };

    playersCollection.findOne(query).then(result => {

      let subscription = result.subscription;
      res.status(201).json({})
      if (subscription != null) {
        //Create payload
        const payload = JSON.stringify({
          title: notificationTitle,
          body: notificationBody,
          icon: notificationIcon
        })
        // Send object into sendNotification
        webpush.sendNotification(subscription, payload).catch(err => console.log(err))
      }


    }).catch(error => console.error(error))

  })

  app.post('/notifyAll', (req, res) => {
    const notificationTitle = req.body.payload.title
    const notificationBody = req.body.payload.body
    const notificationIcon = req.body.payload.icon


    playersCollection.find().toArray().then(players => {
      let subscriptions = []

      for (let i = 0; i < players.length; i++) {
        if (players[i].subscription != null) {
          subscriptions.push(players[i].subscription)
        }
      }

      // Send 201 - Ressource create
      res.status(201).json({})

      //Create payload
      const payload = JSON.stringify({
        title: notificationTitle,
        body: notificationBody,
        icon: notificationIcon
      })

      subscriptions.forEach((subscription, index) => {
        // Send object into sendNotification
        webpush.sendNotification(subscription, payload).catch(err => console.log(err))
        console.log('notify' + index);
      });

      res.body = {
        "Message": "SUCCESS !"
      }


    }).catch(error => console.error(error))

  })

  // findOne player subscription
  app.get('/subscriber/:game/:id', (req, res) => {
    const game = req.params.game
    const id = parseInt(req.params.id)

    let query = { gameId: game, playerId: id };

    playersCollection.findOne(query).then(result => {
      res.json(result.subscription)

    }).catch(error => console.error(error))

  })

})


// ------------------------------------
// -------------- SERVER --------------
// ------------------------------------

// Server listening on port 8000
app.listen(PORT, () => console.log(chalk.bgGreen.black('Server listening on port ' + PORT)))