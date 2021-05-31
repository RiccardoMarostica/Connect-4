import { LocationStrategy } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatchHttpService } from '../match-http.service';
import { MessageHttpService } from '../message-http.service';
import { SocketioService } from '../socketio.service';
import { UserHttpService } from '../user-http.service';

@Component({
   selector: 'app-match',
   templateUrl: './match.component.html',
   styleUrls: ['./match.component.css']
})
export class MatchComponent implements OnInit {

   isUserPlaying: boolean = false; // Flag used to set if the current user is playing the match or if he is just watching the game
   diskColour: string | null = null; // Variable used to set the disk colour if the user is playing
   matchInfos: any; // Get the infos from the server

   watchingErrorMessage: boolean = false; // Flag used to show a message if a watching player want to make a moves
   messageError: boolean = false; // flag used to show a message if a message post request return with an error

   winnerPlayer: string | undefined = undefined; // Flag used to check who is the winner. The values of this variable are: WIN, LOSE, DRAW or undefined

   constructor(private activatedRoute: ActivatedRoute, private router: Router, private location: LocationStrategy, private match: MatchHttpService, public user: UserHttpService, private message: MessageHttpService, private socket: SocketioService) {
      // preventing back button in browser
      history.pushState(null, '', window.location.href);
      this.location.onPopState(() => {
         history.pushState(null, '', window.location.href);
      });
   }

   ngOnInit(): void {
      // First of all retrieve the if of the friend passed as router params
      this.activatedRoute.paramMap.subscribe(async (params) => {

         // Try to get the info from the server
         var param: any = params.get("match_id");

         // Call the match service that will make a GET request to the server. Then handle the observable
         this.match.get_match_data(param).subscribe((data) => {

            // To avoid every problem, example when user reload the page, just check if isOver is equals to true
            if (data.matchInfos !== undefined && data.matchInfos.isOver == true) {
               // Check if the socket pass a string containing the winner id;
               if (data.winner != "DRAW") {
                  this.winnerPlayer = (data.winner == this.user.get_user_id()) ? "WIN" : "LOSE"; // Set if user win or lose
               } else {
                  this.winnerPlayer = data; // Here just set undefined (game is not over) or a draw
               }
               this.matchInfos = data.matchInfos;
            } else { // Otherwise the match is not end so just take the match infos
               this.matchInfos = data;
            }

            // Filter the array of messages
            this.matchInfos.messages = this.controlMessageList(this.matchInfos.messages);

            // Check if id of current user is inside participants
            var checkUserPlaying = this.matchInfos.participants.find((elem: any) => elem._id == this.user.get_user_id());
            // if true, just update the flag and set the disk colour
            if (checkUserPlaying !== undefined) {
               this.isUserPlaying = true; // Update flag that user is playing
               this.diskColour = checkUserPlaying.colour;
            }

            // Socket that update the matchInfo var every time there is a new move or a new message
            this.socket.listen("match_update_" + this.matchInfos["_id"]).subscribe((data: string) => {
               this.getMatchInfo(this.matchInfos["_id"]); // Get the infos from the server
            }, (err) => { // Error case when listening an websocket event
               console.log("Error while retrieving the informations from the server!");
               console.log("ERROR: " + JSON.stringify(err));
               this.router.navigate(["/home-page"]);
            });

         }, (err) => { // Error case when user try to get the match data
            console.log("Error while retrieving the informations from the server!");
            console.log("ERROR: " + JSON.stringify(err));
            this.router.navigate(["/home-page"]);
         });
      }, (err) => {
         // Error case
         console.log("Error while retrieving the match id from the URL!");
         this.router.navigate(["/home-page"]);
      });
   }

   /**
    * Function used to get the infos about a match (id, participants, messages, turn, etc...) from the server
    * @param param 
    */
   getMatchInfo(param: any): void {
      // Call the match service that will make a GET request to the server. Then handle the observable
      this.match.get_match_data(param).subscribe((data) => {
         // if data contains that is over is true, so just check the winner
         if (data.matchInfos !== undefined && data.matchInfos.isOver == true) {
            // Check if the socket pass a string containing the winner id;
            if (data.winner != "DRAW") {
               this.winnerPlayer = (data.winner == this.user.get_user_id()) ? "WIN" : "LOSE"; // Set if user win or lose
            } else {
               this.winnerPlayer = data; // Here just set undefined (game is not over) or a draw
            }
            this.matchInfos = data.matchInfos;
         } else {
            this.matchInfos = data; // Save the data in a local field
         }

         // Update the message list based if the user is playing or watching
         this.matchInfos.messages = this.controlMessageList(this.matchInfos.messages);
      }, (err) => {
         console.log("Error while retrieving the informations from the server!");
         console.log("ERROR: " + JSON.stringify(err));
         this.router.navigate(["/home-page"]);
      });
   }

   /**
    * Function used to filter the array of messages
    * @param messages 
    * @returns 
    */
   controlMessageList(messages: Array<any>): Array<any> {
      var tempMessages = messages;
      // Check if user is playing. If true, filter the array and get only the messages from both participants
      if (this.isUserPlaying) {
         tempMessages = messages.filter((elem) => {
            return this.matchInfos.participants.find((value: any) => value["_id"] == elem.author) !== undefined;
         });
      }

      if (tempMessages.length >= 10) {
         tempMessages = tempMessages.slice(0, 10);
      }

      // Otherwise, the user is watching the match. Just show all messages
      return tempMessages;
   }


   makeMoves(colIndex: number): void {

      // First of all check if user is a participant of the match or he is just watching the match
      if (this.isUserPlaying == true) {

         // Now check the the player turn and check if there is no winner
         if (this.matchInfos.turn == this.user.get_user_id() && this.winnerPlayer == undefined) {

            this.matchInfos.turn = ""; // Set it to "null" just to avoid multiple call
            var rowIndex: number = -1;

            console.log("It's your turn! You want to add a disk inside the: " + (colIndex + 1) + " column");

            // Now just update the grid putting the disk in the correct space
            for (var i = this.matchInfos.grid.length - 1; i >= 0; i--) {
               // Check in which row the disk can be inserted inside the specific column
               if (this.matchInfos.grid[i][colIndex] == "EMPTY") {
                  this.matchInfos.grid[i][colIndex] = this.diskColour;
                  rowIndex = i;
                  break;
               }
            }

            // Check if row index is not equal to -1. This means that user can put the disk inside a column
            // Used to avoid errors
            if (rowIndex != -1) {
               var changeTurn = this.matchInfos.participants.find((elem: any) => elem["_id"] != this.user.get_user_id());
               // Create the body of the request that will be passed to the server
               var requestBody: any = {
                  grid: this.matchInfos.grid,
                  turn: changeTurn["_id"]
               }

               // Call the match service to make the http request
               this.match.post_match_data(this.matchInfos["_id"], requestBody).subscribe(() => console.log("Send moves to the server!"),
                  (err) => {
                     console.log("An error occurred: " + err);
                     this.router.navigate(["/login"]);
                  });
            } else {
               this.matchInfos.turn = this.user.get_user_id();
            }

         } else {
            console.log("It's not your turn!");
         }

      } else {
         this.watchingErrorMessage = true; // Set this flag used to show an error message to visitors showing that he can't make a move
      }
   }

   /**
    * Function used to call the service to post a new message inside the chat
    * @param content 
    */
   postGameMessage(content: string): void {
      this.message.postGameMessages(this.matchInfos["_id"], content).subscribe(() => {
         console.log("New message is posted inside the chat!");
      }, (err) => {
         console.log("An error occurred while posting a new message inside the chat!");
         this.messageError = true;
      })
   }

   quitMatch(): void {
      if (this.winnerPlayer !== undefined || this.isUserPlaying == false) {
         this.router.navigate(["/home-page"]);
      }
   }
}