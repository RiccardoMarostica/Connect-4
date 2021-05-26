/**
 *  ---------- BACKEND - SERVER SIDE ----------
 * 
 * Simple HTTP REST Server using MongoDB (Mongoose) and Middlewares (Express)
 * 
 * This server will handle all the incoming requests from frontend (Angular). 
 * The requests can be grouped in 5 groups:
 * 
 * 1- Login / Sign in: This group of requests handle the login and registration of an user inside the application.
 *    Just remember that an user can have different roles: normal user or moderator.
 * 
 *    REQUEST           ATTRIBUTES        METHOD            DESCRIPTION
 *    /login            ---               POST              Login an exsisting user, using a JSON Web Token (JWT) and returning it to client-side
 *    /register         ---               POST              Register a new user, creating the corresponding JWT and returning it to client-side
 *    /register         ---               POST              Used when a moderator made his first login, he will be redirected to a register page used to update his fields inside the array. After that he made a request to update his values. The infos are shared inside the body of the request
 *    /delete           ?user=            DELETE            Remove user access
 *    
 * 
 * 2- Friend list: An user can add or remove a friend inside his friendlist.
 * 
 *    REQUEST                 ATTRIBUTES        METHOD            DESCRIPTION
 *    /friends                ---               GET               Retrieve user's friendlist
 *    /friends                ?user=            POST              Send a request to the friend passed from parameters
 *                            ---               POST              Accept or deny friend request, using the infos shared inside the body of the request
 *    /friends                ?user=            DELETE            Remove a friend form user's friendlist
 * 
 * 3- Send messages: Inside the application an user can send a message to a friend, or during a game. 
 *    
 *    REQUEST                 ATTRIBUTES        METHOD            DESCRIPTION
 *    /messages               ?user=            GET               Return all the posted messages with a specific user, retrieving these from MongoDB
 *    /messages               ?match=           GET               Return all the posted messages during a specific game using WebSocket.
 * 
 * 4- Statistics: Each player can see his statistics during the period. Also, moderators can see the statistics of any other user
 * 
 *    REQUEST                 ATTRIBUTES        METHOD            DESCRIPTION
 *    /stats                  ---               GET               Get the statistics. If this call is made by a moderator show statistics of each user, otherwise only for current user
 *    /stats                  ---               POST              Update user stats   
 *    /stats                  ?user=            GET               Get the statistics of a specific user, used by moderator
 * 
 * 5- Game mechanics: Handled all the request to start a game with a normal person or a friend. Also, there are the request to handle the moves made by each user
 * 
 *    REQUEST                 ATTRIBUTES        METHOD            DESCRIPTION
 *    /game                   ---               GET               Get all the matches in progress and not concluded
 *    /game                   ?game=            GET               Get the informations about a specific game using his id, including the messages
 *    /game/create            ?user=            GET               Create a game with a friend inside user's friendlist. Instead to create a game with waiting state we used socket.io
 *    /game/move              ?game=            POST              Make a moves during the game passing where user put the disk, just need x value of the matrix cause then send a notification to opponent showing which moves user made.
 *    /game/message           ?game=            POST              Post a message inside the match chat
 * 
 * ----------------------------------------------------------
 * 
 * There are present 3 classes used by backend:
 * 
 * 1- User: Class to create and manage a user informations. Also, used to create the collections inside MongoDB
 * 2- Messages: Class to create and manage messages informations like checking if the format of the message send from a request is correcto or not, etc... (All the functions of this class are explained inside the Report).
 * 3- Game: Class to memorize informations about a game between two opponents.   
 * 
 * ----------------------------------------------------------
 * 
 * How to start server-side:
 * 
 * 1) Install all the required methods:
 * 
 *    npm install
 * 
 * 2) Compile all the code, in this way the TypeScript files are converted in JavaScript files
 * 
 *    npm run compile
 *    
 *    To check if MongoDB is running type on terminal: sudo systemctl status mongod
 * 
 * 3) Run the server:
 * 
 *    npm start || npm run start || node server
 */

/**
 * The dotenv module will load a file named ".env" file and load all the key-value pairs into process.env (environment variable).
 */

const env = require('dotenv').config();

if (env.error) {
   console.log("ERROR: ".red + "Unable to load \".env\" file. Please provide one file to store the JWT secret key");
   process.exit(-1); // Code: -1 Return an error
} else if (!process.env.JWT_SECRET) {
   console.log("ERROR: ".red + "\".env\" file loaded but HWT_SECRET=<secret> key-value pair was not found");
   process.exit(-1);
}


/**
 * -------------------------------------------------------
 * MODULES USED TO DEVELOP THE BACKEND OF THE APPLICATION
 * -------------------------------------------------------
 */

import http = require('http');                  // HTTP module, used to create our server
import colors = require('colors');              // Module used to import colors, it is useful when logging informations
colors.enabled = true;
import mongoose = require('mongoose');          // Module designed to use MongoDB in an asynchronous enviroment


import * as user from './user';                 // Imports the file user that contains all the methods an interfaces to handle the user part
import * as message from './message';           // Imports the file that contains all the methods an interfaces to handle the message and chat part   
import * as match from './match';               // Imports the file that contains all the methods an interfaces to handle the game between players   

import express = require('express');            // Module that provides a simple and robust middleware infrastructure for building web applications
import bodyparser = require('body-parser')      // Module that parse incoming request bodies in a middleware before your handlers. 
// Provide a JavaScript object if the "Content-Type" is application/json
import passport = require('passport');          // Authentication middleware used for Express, designed to serve a singular purpose: authenticate requests
import passportHTTP = require('passport-http')  // Module that make possibile to implements Basi and Digest authentication for HTTP

import cors = require('cors');                  // Enable CORS middleware
import sio = require('socket.io');               // Socket.io websocket library

import jsonwebtoken = require('jsonwebtoken')   // Module that implements JSON Web Token (JWT) generation
import jwt = require('express-jwt')             // Middleware that parsing JWT for Express



/**
 * -------------------------------------------------------
 *                 INSERT THE MIDDLEWARES
 * -------------------------------------------------------
 */

var ios = undefined;
var app = express(); // Create an Express application, mainly to create the routing and insert the middlewares on the backend

/**
 * We create the JWT authentication middleware provided by the express-jwt library.  
 * How it works (from the official documentation):
 * If the token is valid, req.user will be set with the JSON object decoded to be used by later middleware for authorization and access control.
*/
var auth = jwt({ secret: process.env.JWT_SECRET });

/**
 * The CORS mechanism supports secure cross-origin requests and data transfers between browsers and servers.
 */
app.use(cors());

// Install the top-level middleware "bodyparser", that extracts the entire body portion of an incoming request stream and exposes it on req.body
app.use(bodyparser.json());

// This is a custom middleware used to log how some one make a request to the server. Log who made the request and the method that is used
app.use((req, res, next) => {

   console.log("REQUEST URL: ".yellow + req.url);
   console.log("METHOD: ".yellow + req.method);
   console.log("REQUET HEADERS: ".yellow + req.headers.authorization);
   next();

})

/**
 * -------------------------------------------------------
 *                 HANDLING THE ROUTING
 * -------------------------------------------------------
 */

// User doesn't add something to the request so just send him a response code 200 and return a response that contains a simple JSON
app.get("/", (req, res) => {
   res.status(200).json({
      api_version: "1.0",
      message: "Hi, welcome to Connect-four Server"
   });
});

/**
 * -------------------------------------------------------
 *          AUTHENTICATION AND REGISTRATION
 * 
 * To handle the login part, passport.js can be used.
 * This module infact is an authentication middleware and
 * it is perfect for our purpose. After create a way to check
 * the validation of an user it is necessary to implement an
 * endpoint that handle the login using passport.
 * 
 * Instead, to resolve the registration part it is necessary
 * an endpoint that can handle this in the correct way.
 * -------------------------------------------------------
 */

// Configure HTTP basic authentication strategy trough passport middleware.
// NOTE: Always use HTTPS with Basic Authentication
passport.use(new passportHTTP.BasicStrategy(
   (mail, password, done) => {

      // Inside this function we handled the methods to veriy user credentials
      console.log("REQUEST: ".yellow + "New login attempt from: " + mail);

      // Make a query to find if the mail used to login exists
      user.getModel().findOne({ email: mail }, (err, user) => {

         // Handle the response and check if user exists or not
         if (err) { // An error occurred during query
            return done({
               status: 500,
               error: true,
               message: err
            });
         }
         if (!user) { // Error occurred because user is invalid
            return done(null, false, {
               statusCode: 500,
               error: true,
               message: "Invalid user"
            })
         }
         if (!user.validatePassword(password)) { // Error occurred because password is wrong
            return done(null, false, {
               statusCode: 500,
               error: true,
               message: "Invalid password"
            })
         }

         // No error, so return the user
         return done(null, user);
      })

   })
)

/**
 * Handle the login router.
 * This endpoint uses passport middleware to check user credentials before generating a new JWT
 */
app.post("/login", passport.authenticate('basic', { session: false }), (req, res, next) => {

   // If we are inside this function, this means that user successfully authenticated.
   // This means that user has been injected int req.user from the previous function
   // So generate a JWT with useful informations and return it as response

   console.log("SUCCESS: ".green + "Login granted. Generating JWT token");

   var token = { // Create the token with useful informations
      username: req.user["username"],
      email: req.user["email"],
      id: req.user["id"],
      stats: req.user["stats"]
   }

   // Now sign the token
   var token_signed = jsonwebtoken.sign(token, process.env.JWT_SECRET, { expiresIn: '1h' });

   return res.status(200).json({
      error: false,
      token: token_signed,
      message: "Login granted"
   })
})

/**
 * Handle the registration router.
 * Inside current endpoint, the body of the request contains the informations about an user.
 * From that create an user but before check if all infos are present inside the request otherwise return an error (404)
 */
app.post("/register", (req, res, next) => {

   console.log("REQUEST: ".yellow + "Creating a new user");

   var userData = req.body;

   // Add the stats to user, donì't care if is normal or he is a moderator
   userData.stats = {
      games: 0,
      win: 0,
      lose: 0,
      draw: 0
   }

   // User doesn't pass the role, so it is a normal user
   if (userData.roles == undefined) {
      userData.roles = {};
   }

   // Create a user using Mongo using request body where the informations are stored
   var newUser = user.newUser(userData);

   // Check if user put a password
   if (!userData.password) return next({
      statusCode: 404,
      error: true,
      message: "Password field missing"
   });

   // Save an user inside MongoDB
   newUser.setPassword(userData.password);
   newUser.save().then((result) => {

      console.log("SUCCESS: ".yellow + "User has been registrated");

      var token = { // Create the token with useful informations
         username: newUser.username,
         email: newUser.email,
         id: newUser._id
      }

      // Now sign the token
      var token_signed = jsonwebtoken.sign(token, process.env.JWT_SECRET, { expiresIn: '1h' });

      return res.status(200).json({
         error: false,
         token: token_signed,
         id: result._id
      })
   }).catch((error) => {
      if (error.reason === 11000) return next({
         statusCode: 404,
         error: true,
         message: "User already exists"
      });

      return next({
         statusCode: 404,
         error: true,
         message: "DB error: " + error.errmsg
      });
   })
})

/**
 * -------------------------------------------------------
 *                         CHAT
 * 
 * From now on, there are the routing endpoints used to handle
 * the messages sent from an user to a friend or during a match.
 * 
 * There is only one endpoint "/messages" but there are both GET
 * and POST methods so there are two different endpoints in the
 * end.
 * -------------------------------------------------------
 */


app.route("/messages").get(auth, async function (req, res, next) {

   // Handling the GET method when an user want to get the messages
   // with another user
   if (req.query.user) {

      // Create an array with participants of the chat (in this case only 2)
      var participants: Array<any> = [];
      participants.push(req.query.user);
      participants.push(req.user["id"]);

      var result: any = await message.getModel().find({ participants: { $all: participants } });

      // Result is empty so no document is present inside mongo. Create a new one
      if (result == undefined || result.length == 0 || result == null) {
         result = await message.getModel().create({
            participants: participants,
            messages: []
         });

         console.log("SUCCESS: ".green + "Create a new chat room!");
         console.log("TEST: ".gray + JSON.stringify(result));

         return res.status(200).json(result);
      } else { // There is a chat inside mongo so retrieve it
         return res.status(200).json(result[0]);
      }
   }

   // An error occurred cause user make a request with parameters inside query that are not valid. Call next middleware
   console.log("ERROR: ".red + "Request query parameter is not valid");

   return next({
      statusCode: 404,
      error: true,
      message: "Request query parameter is not valid"
   })

}).post(auth, async (req, res, next) => {

   var receiveMessage = req.body;
   receiveMessage.timestamp = new Date();
   receiveMessage.author = req.user["id"];

   // Check if receiveMessage is a message or not
   if (message.isMessage(receiveMessage)) {

      // POST method when two users are exchanging messages
      if (req.query.chat_id) {

         var id: any = req.query.chat_id

         // Update chat document on mongoDB saving the last message
         message.getModel().updateOne({ _id: id }, {
            $push: {
               messages: {
                  $each: [receiveMessage],
                  $sort: -1
               }
            }
         }).then(() => {

            console.log("SUCCESS: ".green + "Added a new message inside the chat id: " + id);

            // Emit to the user participanting the chat with specific id
            ios.emit("chat_" + id);

            return res.status(200).json({
               message: "Message added inside the chat!"
            })
         }).catch((reason) => {

            // An error occurred during the call "create" on MongoDB. Call next middleware
            console.log("ERROR: ".red + reason);

            return next({
               statusCode: 404,
               error: true,
               message: "DB error: " + reason
            })
         });
      } else {
         // An error occurred cause user make a request with parameters inside query that are not valid. Call next middleware
         console.log("ERROR: ".red + "Request query parameter is not valid");

         return next({
            statusCode: 404,
            error: true,
            message: "Request query parameter is not valid"
         })
      }
   } else {
      // An error occurred, cause request body is not correct to create a new message. Call next middleware
      return next({
         statusCode: 404,
         error: true,
         message: "Data is not a valid Message"
      })
   }
});

/**
 * -------------------------------------------------------
 *                         FRIEND LIST
 * 
 * Routing used to handle the request to get the friendlist of an user,
 * add a friend to the list or remove on of them from it.
 * -------------------------------------------------------
 */

app.route("/friends").get(auth, (req, res, next) => {

   // Get user id
   var userId = req.user['id'];

   // Make a query to MongoDB and retrieve the friendlist using the user's id
   user.getModel().find({ _id: userId }).then((data) => {
      return res.status(200).json({
         error: false,
         friends: data[0]['friendlist']
      })
   }).catch((err) => {
      return next({
         statusCode: 404,
         error: true,
         message: "DB error: " + err
      })
   })
}).post(auth, (req, res, next) => {
   // If the POST request has a parameters user, this means that server has to send (using socketio) a notification to the other user
   // that he recives a friend request
   if (req.query.user) {

      // Get the friends id from the query params
      var friendId: any = req.query.user;
      console.log(friendId);

      var response = undefined;
      // TODO: Check if user has already this user as friend
      // user.getModel().find({ _id: req.user["id"]}).then((data) => {

      //    var myArray: Array<any> = data["friendlist"];
      //    response = myArray.find((elem) => {
      //       return elem._id = friendId;
      //    });
      // }).catch((err: any) => {
      //    return next({
      //       statusCode: 400,
      //       error: true,
      //       message: "DB error: " + err
      //    });
      // })

      if (response) {
         return res.status(200).json({
            message: "This user is already your friend!"
         });
      }
      // Use socket.io to send a notification to the client
      ios.emit("friendreq_" + friendId, {
         username: req.user["username"],
         id: req.user["id"]
      });

      // return code 200
      return res.status(200).json({
         message: "Send friend request to other player!"
      });
   } else {
      // This part of code is used when an user confirm or deny the friend request. So first of all, to avoid erros, check if the request body
      // has the correct values (username, id and status)
      var reqBody = req.body;

      console.log(reqBody);

      if (reqBody != undefined && reqBody.user != undefined && reqBody.status != undefined) {

         // User accept the friend request so add both user to corrispective friendlist
         if (reqBody.status == "ACCEPT") {

            // Create the template to add an user to friendlist
            var addUser = {
               username: reqBody.user.username,
               _id: reqBody.user.id
            }

            // Add to user the friend
            user.getModel().updateOne({ _id: req.user["id"] }, { $push: { friendlist: addUser } }).then(() => {
               console.log("SUCCESS: ".green + "Added a new friend to: " + req.user["id"]);
            }).catch((err) => {
               return next({
                  statusCode: 400,
                  error: true,
                  message: "DB error: " + err
               })
            });

            addUser.username = req.user["username"];
            addUser._id = req.user["id"];

            // Now add to friend the user
            user.getModel().updateOne({ _id: reqBody.user.id }, { $push: { friendlist: addUser } }).then(() => {
               console.log("SUCCESS: ".green + "Added a new friend to: " + reqBody.user.id);
            }).catch((err) => {
               return next({
                  statusCode: 400,
                  error: true,
                  message: "DB error: " + err
               })
            });

            // At the end just send a notification using socketio that the operation is made
            ios.emit("addfriend_" + reqBody.user.id);
            ios.emit("addfriend_" + req.user["id"]);
         }

         return res.status(200).json({
            message: "Added a new user to your friendlist!"
         });
      }
   }

   return next({
      statusCode: 400,
      error: true,
      message: "An error occurred during the friends request phase!"
   });
}).delete(auth, (req, res, next) => {

   // Check if inside the paramaters there is one called user
   if (req.query.user) {

      var otherUserId: any = req.query.user;

      // Remove the friend from user friendlist in mongoDB document
      user.getModel().updateOne({ _id: req.user["id"] }, { $pull: { friendlist: { _id: otherUserId } } }).then((data) => {
         console.log("SUCCESS: ".green + "Delete user: " + otherUserId + " from user: " + req.user["id"] + " friend list! ");
      }).catch((err) => {
         return next({
            statusCode: 400,
            error: true,
            message: "DB error: " + err
         });
      });

      // Remove the user from friend friendlist in mongoDB document
      user.getModel().updateOne({ _id: otherUserId }, { $pull: { friendlist: { _id: req.user["id"] } } }).then((data) => {
         console.log("SUCCESS: ".green + "Delete user: " + req.user["id"] + " from user: " + otherUserId + " friend list! ");
      }).catch((err) => {
         return next({
            statusCode: 400,
            error: true,
            message: "DB error: " + err
         });
      })

      // Both call to mongoDB was successfull so just return a 200 code that everything goes well
      return res.status(200).json({
         message: "User removed from friend list"
      })
   }

   // User doesn't pass a paramaters in query called user so return an error
   return next({
      statusCode: 400,
      error: true,
      message: "An error occurred while deleting a friend from friend list!"
   })
});

/**
 * -------------------------------------------------------
 *                         GAME
 * 
 * Endpoints used to handle the creation and the develop of a match
 * 
 * -------------------------------------------------------
 */
app.route("/game").get(auth, (req, res, next) => {

   // The match param inside query is used to memorize which match user wants to knwo more informations
   // Useful for a participant and for a player who is only watching the game
   if (req.query.match) {
      var matchId: any = req.query.match; // Get the match id from the query

      // Now try to get the data from the database
      match.getModel().find({ _id: matchId }).then((data) => {

         console.log("SUCCESS: ".green + "Retrieve match infos from the server and return it as response!");
         return res.status(200).json(data[0]);
      }, (err) => {

         return next({ statusCode: 400, error: true, message: "DB errror: " + err });
      })
   }

}).post(auth, (req, res, next) => {

   // When make a post call first of all check if user can make the moves checking the turn on db
   var requestBody = req.body;

   console.log("TEST: ".gray + "body request: " + JSON.stringify(requestBody));

   // Check if inside the body there is the match id
   if (req.query.match) {
      console.log("HERE");
      if (match.getWinner(requestBody.grid) === undefined) {

         console.log("HERE");

         match.getModel().updateOne({ _id: req.query.match }, {
            $set: {
               grid: requestBody["grid"],
               turn: requestBody["turn"]
            }
         }).then(() => {
            console.log("SUCCESS: ".green + "Update match values inside database!");

            // TODO: Emit a message to all the players listening inside this match
            ios.emit("match_update_" + req.query.match);

            return res.status(200).json({
               error: false,
               message: "Match update!"
            })
         }, (err) => {
            console.log("ERROR: ".red + "Cannot update match informations!");
            return next({
               statusCode: 400,
               error: true,
               message: "DB error: " + err
            })
         });
      } else {
         console.log("HERE ELSE");
      }
   } else {
      // Return an error
      return next({
         statusCode: 500,
         error: true,
         message: "Unable to find a suitable handler!"
      })
   }

})


app.route("/game/create").get(auth, (req, res, next) => {

   // In this case, an user ask to his friend to play a game.
   if (req.query.user) {

      console.log("TEST: ".gray + "Ask to create a match to " + req.query.user);

      // Create a socket used to send a request to other player
      ios.emit("game_request_" + req.query.user, {
         _id: req.user["id"],
         username: req.user["username"],
         stats: req.user["stats"]
      })

   }

   return res.status(200).json({});
});


/**
 * -------------------------------------------------------
 *                         STATS
 * 
 * From now on, there are the routing endpoints used to handle
 * user stats.
 * 
 * Just remember that a moderator can see the stats of all players 
 * -------------------------------------------------------
 */

app.route("/stats").get(auth, (req, res, next) => {

   var user = req.user;

   console.log(user);

   return res.status(200).json({
      statusCode: 200,
      error: false,
      message: "stats retrieved"
   });

})


/**
 * -------------------------------------------------------
 *                 ERRORS MIDDLEWARE
 * 
 * These last two middlewares are used to return a response
 * if an error occurred when user make a request
 * -------------------------------------------------------
 */


// Add error handling middleware
app.use(function (err, req, res, next) {

   console.log("REQUEST ERROR: ".red + JSON.stringify(err));
   res.status(err.statusCode || 500).json(err);

});


// The very last middleware will report an error 404 
// (will be eventually reached if no error occurred and if
//  the requested endpoint is not matched by any route)
//
app.use((req, res, next) => {

   console.log("ERROR: ".red + "Invalid endpoint!");

   res.status(404).json({ statusCode: 404, error: true, errormessage: "Invalid endpoint" });
})



/**
 * -------------------------------------------------------
 *     CREATE THE CONNECTION WITH MONGODB AND SERVER
 * -------------------------------------------------------
 */

/**
 * Using mongoose make a connection request to MongoDB.
 * The return of the connect method is a request so put then() to handle all the promeses needed
 * If an error occurred use catch() to log the error
 * */
mongoose.connect('mongodb://localhost:27017/connectfour').then(() => {

   // In this case the connection is successfull so the server can start using MongoDB
   console.log("SUCCESS: ".green + "Connect to MongoDB");

   return user.getModel().findOne({ email: "admin@admin.it" });

}).then((document) => {
   // document is the returned value from the previous then(). In this case the previous then()
   // check if the first account is already created on MongoDB. If this user is not present, it means
   // that the collection doesn't exist, so create it.
   if (!document) {
      console.log("MONGODB: ".green + "Creating admin user");

      var firstUser = user.newUser({
         username: "admin",
         email: "admin@admin.it",
         roles: {},
         stats: {
            games: 0,
            win: 0,
            lose: 0,
            draw: 0
         },
         friendlist: [],
         isOnline: false
      });

      firstUser.setModerator();
      firstUser.setPassword("admin");

      console.log(firstUser);

      return firstUser.save(); // Save the new user inside MongoDB and return this promises
   } else {
      console.log("MONGODB: ".green + "Admin user already exists");
   }

}).then(() => {

   var server: http.Server = http.createServer(app); // Create a http server using app (so using express)
   server.listen(8080, () => console.log("SUCCESS: ".green + "HTTP Server started on port 8080"));

   // Creat the webSocket
   ios = new sio.Server(server, {
      cors: {
         origin: "http://localhost:4200",
         methods: ["GET", "POST"]
      }
   });

   // Array used to memorize the ids of the players inside the waiting status
   var userInWaiting: Array<any> = [];

   ios.on('connection', (socket) => {
      console.log("SUCCESS: ".green + "Socket.io client connected, socket id:" + socket.id);

      // This on function is used when a player start a random match with random user
      socket.on('waiting status', async (data: any) => {

         var checkIndex = userInWaiting.findIndex(elem => elem.user.id == data);
         // Check if an user is already inside the array. If not just add the user, otherwise update the socket
         if (checkIndex == -1) {
            // Retrieve from mongoDB the stats about a user and add it to the array with the socket
            var stats: any = await user.getModel().find({ _id: data }, { stats: 1, _id: 0 });
            stats = stats[0]["stats"];

            userInWaiting.push({
               user: {
                  id: data,
                  stats: stats
               },
               socket: socket
            });
         } else {
            // Update the socket data
            userInWaiting[checkIndex].socket = socket;
         }

         // We can create a match if there are at least two user inside the array
         if (userInWaiting.length >= 2) {

            var checkGameCondition = false;

            // Get first user and remove it from the array
            var randomValue: number = Math.floor(Math.random()) * userInWaiting.length;
            var firstUser: any = userInWaiting.splice(randomValue, 1);
            firstUser = firstUser[0];

            // Get second user and remove it from the array
            randomValue = Math.floor(Math.random()) * userInWaiting.length;
            var secondUser: any = userInWaiting.splice(randomValue, 1);
            secondUser = secondUser[0];

            // Check if the stats are present for both user
            if (firstUser.user.stats !== undefined && secondUser.user.stats !== undefined) {
               // Now check if the difference between games and wins are the same
               if ((Math.abs(firstUser.user.stats.get("games") - secondUser.user.stats.get("games")) < 10) && (Math.abs(firstUser.user.stats.get("win") - secondUser.user.stats.get("win")) < 10)) {
                  checkGameCondition = true;
               }
            }

            // User has same stats, they can play together
            if (checkGameCondition == true) {
               var colours = ["RED", "YELLOW"];
               var randomValue = Math.floor(Math.random() * 2);

               // Create the array of the two participants with the corrispective color to use during the match
               var participants: Array<any> = [{
                  _id: firstUser.user.id,
                  colour: colours[randomValue]
               }, {
                  _id: secondUser.user.id,
                  colour: colours[Math.abs(randomValue - 1)]
               }]

               // Choose who start first
               var playerFirstTurn = participants[randomValue]["_id"];

               var grid = [
                  ["EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY"],
                  ["EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY"],
                  ["EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY"],
                  ["EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY"],
                  ["EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY"],
                  ["EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY"],
                  ["EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY", "EMPTY"]
               ];

               // Create the match, adding the participants, setting that the match isn't over and who has the first turn
               var matchInfo = await match.getModel().create({
                  participants: participants,
                  messages: [],
                  isOver: false,
                  turn: playerFirstTurn,
                  grid: grid
               });
               // TODO Continuare da qui per creazione partita

               console.log("SUCCESS: ".green + "Create a new match with id: " + matchInfo["_id"]);

               // Now emit the informations given when the match is created to the players
               firstUser.socket.emit("match created", matchInfo["_id"]);
               secondUser.socket.emit("match created", matchInfo["_id"]);
            } else { // Put both user inside the array and wait to see if another user comes with similar stats so they can play together
               userInWaiting.push(firstUser);
               userInWaiting.push(secondUser);
            }
         }
      });

      // Remove the socket from the array
      socket.on('exit waiting status', (data: string) => {
         userInWaiting = userInWaiting.filter(elem => elem.user.id !== data);
      })
   });



}).catch((error) => {

   console.log("ERROR: ".red + error);

});

