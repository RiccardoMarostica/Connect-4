import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { UserHttpService } from '../user-http.service';

@Component({
   selector: 'app-user-profile',
   templateUrl: './user-profile.component.html',
   styleUrls: ['./user-profile.component.css']
})
export class UserProfileComponent implements OnInit {

   userInformations: any;

   constructor(private user: UserHttpService, private router: Router) { }

   ngOnInit(): void {

      // Use user service to make an http request to the server, asking to retrieve the informations about him self
      this.user.get_profile().subscribe((data: any) => {

         console.log("Retrieve user profile");
         this.userInformations = data["informations"];

      }, (err) => {
         // An error occurred while retrieving the error, check if the JWT is the error or not
         console.log("An error occurred while retrieving the user profile!");
         console.log(JSON.stringify(err));
         // Check if the JWT is expried or there is an internal server error
         if (err.status == "500" || (err.error.status == "401" && err.error.code == "invalid_token")) {
            this.router.navigate(["/login"]);
         } else {
            this.router.navigate(["/home-page"]);
         }
      });

   }

}
