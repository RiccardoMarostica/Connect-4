import { LocationStrategy } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatchHttpService } from '../match-http.service';
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

   watchingErrorMessage: boolean = false;

   constructor(private activatedRoute: ActivatedRoute, private router: Router, private location: LocationStrategy, private match: MatchHttpService, private user: UserHttpService, private socket: SocketioService) {
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
            this.matchInfos = data;

            // Check if current user is playing or not. If true check it
            var userId = this.user.get_user_id();
            var checkUserPlaying = this.matchInfos.participants.find((elem: any) => elem._id == userId); // Check if id of current user is inside participants
            // if true, just update the flag and set the disk colour
            if (checkUserPlaying !== undefined) {
               this.isUserPlaying = true; // Update flag that user is playing
               this.diskColour = checkUserPlaying.colour;
            }

            // Socket that update the matchInfo var every time there is a new move or a new message
            this.socket.listen("match_update_" + this.matchInfos["_id"]).subscribe(() => { this.getMatchInfo(this.matchInfos["_id"]) });

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
         this.matchInfos = data;
      }, (err) => {
         console.log("Error while retrieving the informations from the server!");
         console.log("ERROR: " + JSON.stringify(err));
         this.router.navigate(["/home-page"]);
      });
   }

   makeMoves(colIndex: number): void {

      // First of all check if user is a participant of the match or he is just watching the match
      if (this.isUserPlaying == true) {

         // Now check the turn
         if (this.matchInfos.turn == this.user.get_user_id()) {

            this.matchInfos.turn = ""; // Set it to "null" just to avoid multiple call
            var rowIndex: number = -1;

            console.log("It's your turn! You want to add a disk inside the: " + (colIndex + 1) + " column");

            // Now just update the grid putting the disk in the correct space
            for (var i = this.matchInfos.grid.length - 1; i > 0; i--) {
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
}

// TODO: Aggiornare in real time la grid, aggiungere hhtml per invio e ricezione dei messaggi
