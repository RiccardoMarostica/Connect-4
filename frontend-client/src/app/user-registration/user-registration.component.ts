import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UserHttpService } from '../user-http.service';

@Component({
   selector: 'app-user-registration',
   templateUrl: './user-registration.component.html',
   styleUrls: ['./user-registration.component.css']
})
export class UserRegistrationComponent implements OnInit {

   public errorMessage: string | undefined = undefined;
   public user: any = { email: '', password: '', username: '', avatar: '' }; // User template informations needs before signup
   adminId: any = null; // String or null, used to check if this compoment is used for a normal login or for the first login of a new moderator

   constructor(public us: UserHttpService, public router: Router, private activatedRoute: ActivatedRoute) { }

   ngOnInit(): void {

      // Token is present, so avoid user to go to registration and go to home-page (this means that user is logged)
      if (this.us.check_token_presence()) {
         this.router.navigate(["/home-page"]);
      }

      // Check if in the URL is present an id. This means that a moderator was loggin for the first time.
      // Its informations needs to be updated before make login
      this.activatedRoute.paramMap.subscribe(async (params) => {
         // Try to get the user id from the params
         this.adminId = params.get("user_id");
      }, (err) => {
         console.log("ERROR: " + err);
         this.router.navigate(["/login"]);
      })
   }

   /**
    * Function used to make the signup to the application
    */
   signup(): void {
      // Creating a body request, setting this user is not a new moderator
      // and also the user informations
      var body = { newMod: false, user: this.user, adminId: '' }

      // Check if the admin id is not null. In this case the admin id is used to 
      // update user informations
      if (this.adminId !== null) {
         body.newMod = true;
         body.adminId = this.adminId;
      }

      // Call the user service used to registrer a new user
      this.us.registration(body).subscribe((data) => {
         console.log("SUCCESS: Created a new account. Login granted!");
         this.router.navigate(["/home-page"]);
      }, (err) => {
         console.log('Signup error: ' + JSON.stringify(err.error.errormessage));
         this.errorMessage = err.error.message;
      })
   }

   /**
    * Function used to set the user avatar inside the object
    * @param imageName name of the icon
    */
   setAvatar(imageName: string): void {
      console.log(imageName);
      this.user.avatar = imageName;
   }
}
