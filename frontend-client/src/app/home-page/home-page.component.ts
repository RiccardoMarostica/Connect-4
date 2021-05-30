import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SocketioService } from '../socketio.service';
import { UserHttpService } from '../user-http.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { LocationStrategy } from '@angular/common';

@Component({
   selector: 'app-home-page',
   templateUrl: './home-page.component.html',
   styleUrls: ['./home-page.component.css']
})
export class HomePageComponent implements OnInit {

   friendList: any = []; // Array of friends
   friendRequest: any = undefined; // flag used when an user receive a friend request
   friendGameRequest: any = undefined; // flag used when an user receive a game request froma a friend

   moderatorTemplate = { email: '', password: '', username: '' }; // template of the moderator when a mod wants to add a new one
   moderatorMessage: string | undefined = undefined;

   constructor(public user: UserHttpService, public router: Router, private socket: SocketioService, private modalService: NgbModal, private location: LocationStrategy) {
      // preventing back button in browser
      history.pushState(null, '', window.location.href);
      this.location.onPopState(() => {
         history.pushState(null, '', window.location.href);
      });
   }

   ngOnInit() {
      // First of all get from mongoDB user friend list
      this.get_friends();

      // The socket will listen if from the server will arrive an emit saying that
      // an other user wants to add you to his friend list
      this.socket.listen("friendreq_" + this.user.get_user_id()).subscribe((data) => {
         console.log("request from: " + JSON.stringify(data));
         this.friendRequest = data;
      });

      // Socket listen if the other user confirm to add the friend request.
      // In this case just call the get_friends() method to update the friend list
      // getting the values from the database inside serverww
      this.socket.listen("addfriend_" + this.user.get_user_id()).subscribe(() => {
         this.get_friends();
      });

      // Socket listen if an user remove him from his friend list. If true just update
      // the friend list calling the get_friends() method to retrieve the data from the
      // server
      this.socket.listen("removefriend_" + this.user.get_user_id()).subscribe(() => {
         console.log("Other use removed you from friend list");
         this.get_friends();
      });

      // Socket that listen if a game request is coming from a player inside his friendlist.
      this.socket.listen("game_request_" + this.user.get_user_id()).subscribe((data) => {
         console.log("Request to create a new game with: " + data.userId);
         this.friendGameRequest = data;
      }, (err) => {
         console.log("Error while receiving a game request from a friend!");
         console.log("ERROR: " + err);
         this.friendGameRequest = undefined;
      });

      // Socket used when an user accept to play a game with a friend. Check if the socket
      // received contains the user as participant. If true, take the id of the match and redirect
      // the player to the match page
      this.socket.listen("accept_friend_game").subscribe((data) => {
         if (data.participants.find((elem: any) => elem["_id"] == this.user.get_user_id())) {
            this.router.navigate(['/match', data["_id"]]);
         }
      })

      // Socket used when an user in waiting status find another user and they start a match
      // Get the id of the match and redirect the user to the match page.
      this.socket.listen("match created").subscribe((data) => {
         this.modalService.dismissAll(); // Remove the popup window
         this.router.navigate(['/match', data]); // Navigate to the page refered to the match
      });
   }

   /**
    * Function used to make a call to UserHttpService to retrieve the friendlist of an user
    */
   get_friends(): void {

      this.user.get_friends().subscribe((data) => {
         console.log("Get the friend list!");
         this.friendList = data.friends;
      }, (err) => {
         console.log("Unable to retrieve the friend list!");
         console.log("ERROR: " + err);
         this.friendList = [];
      });
   }

   /**
    * Function used to make an HTTP call to the server to make a friends request to an user
    * @param id friend id
    */
   send_friend_request(id: string) {
      this.user.send_friend_request(id).subscribe(() => {
         console.log("Friend request send!");
      });
   }

   /**
    * Function used to make an hTTP that will conclude the friend request adding the user to the
    * friendlist if the status is "ACCEPT"
    * 
    * @param user An object that contains the username and the id
    * @param status "ACCEPT" if use accept the friend request, "DENY" otherwise
    */
   complete_friend_request(user: any, status: string): void {
      this.user.complete_friend_request(user, status).subscribe(() => {
         console.log("Request status: " + status);
         this.friendRequest = undefined;
      });
   }

   /**
    * Function used to call the function inside UserHttpService used to make a call
    * to remove the person from friend list
    * @param userId person id
    */
   remove_friend(userId: string): void {
      this.user.remove_friend(userId).subscribe(() => {
         this.get_friends();
      });
   }

   /**
    * Function used to make an HTTP GET method call to a friend asking him if he/she
    * wants to play a match
    * @param userId 
    */
   create_friend_game(userId: string): void {
      this.user.friend_request_game(userId).subscribe(() => {
         console.log("Request to create a new game is sent to the other player");
      }, (err) => {
         console.log("An error occurred while sending match request to a friend");
         console.log("ERROR: " + err);
      })
   }

   /**
    * Function used to confirm or deny the game request made by a friend
    * @param friendId // Id of the friend who asked 
    * @param status 
    */
   complete_match_request(friendId: string, status: string): void {
      if (status == "ACCEPT") {
         this.user.complete_friend_game_request(friendId, status).subscribe(() => {
            console.log("Creating a match with friend");
         }, (err) => {
            console.log("An error occurred while creating a match with a friend");
            console.log("ERROR: " + err);
         })
      } else {
         this.friendGameRequest = undefined;
         console.log("Deny to play a match with a friend!");
      }
   }

   /**
    * Function used to trigger the socket on server to handle the emit
    * based if user wants to join or leave the waiting room status.
    * @param status 
    */
   waiting_room(status: string) {
      var emitString: string = '';
      if (status == "WAITING") {
         emitString = "waiting status";
      }
      if (status == "EXIT") {
         emitString = "exit waiting status";
      }

      // Put a timeout of 2 seconds before make an emit
      setTimeout(() => {
         this.socket.emit(emitString, this.user.get_user_id());
      }, 2000);
   }


   /**
    * Function used to open the popup on window used to put the player in the waiting status
    * If he close the popup window he will be removed from the waiting status
    * @param contentName 
    * @param content 
    */
   open(contentName: string, content: any) {

      switch (contentName) {
         case "WAITING ROOM":
            this.waiting_room("WAITING");
            this.modalService.open(content, { ariaLabelledBy: 'modal-basic-title' }).result.then(() => {
            }, () => {
               this.waiting_room("EXIT");
            });
            break;
         case "CREATE MOD":
            this.modalService.open(content, { ariaLabelledBy: 'modal-basic-title' }).result.then(() => {
            }, () => {
               console.log("Exit to create a moderator!");
            });
            break;
      }
   }

   /**
    * Function called when a moderator wants to add a new moderator
    * Inside this function moderatorMessage is used to set the message
    * after adding a moderator. Can go well or find an error
    */
   add_new_moderator(): void {
      if (this.user.is_admin()) { // Just check if user is a moderator
         this.user.create_moderator(this.moderatorTemplate).subscribe(() => {
            this.moderatorMessage = "SUCCESS";
         }, (err) => {
            this.moderatorMessage = "ERROR";
            console.log("ERROR: " + err);
         })
      } else {
         this.moderatorMessage = "ERROR";
      }
   }
}
