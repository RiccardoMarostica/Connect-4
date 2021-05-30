import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { UserHttpService } from '../user-http.service';

@Component({
   selector: 'app-user-list',
   templateUrl: './user-list.component.html',
   styleUrls: ['./user-list.component.css']
})
export class UserListComponent implements OnInit {

   userList: Array<any> = []; // list of users (can be all of them if the user is a mod, or just the friends if normal user)
   errorMessage: string | undefined = undefined; // error message save a code and show a message based on the type of error

   constructor(public user: UserHttpService, private router: Router) { }

   ngOnInit(): void {
      this.get_users();
   }

   get_users(): void {
      // Call the function that make a request to the server
      // If user is a moderator, retrieve the list of all the user
      // Otherwise, retrieve the his friendlist and the stats about them
      this.user.get_user_list().subscribe((data) => {
         // Get the list of users. (It can be empty)
         this.userList = data;
      }, (err) => {
         // An error occurred
         console.log("There is an error while retrieving the list of users!");
         console.log(JSON.stringify(err));
         this.router.navigate(["/login"]);
      })
   }

   /**
    * Function used to use to user service and make the http request to the server
    * @param userId 
    */
   remove_user(userId: string): void {
      if (this.user.is_admin()) {
         this.user.remove_user(userId).subscribe((data) => {
            console.log(JSON.stringify(data));
            if (data.error == false) { // No problem on server side, just update the user list
               this.get_users();
            } else {
               this.errorMessage = "REMOVE_FRIEND";
            }
         });
      } else {
         this.errorMessage = "NO_PERMISSION";
      }
   }
}
