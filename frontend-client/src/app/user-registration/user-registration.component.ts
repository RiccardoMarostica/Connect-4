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
   public user: any = { email: '', password: '', username: '', avatar: '' };

   adminId: any = null;

   constructor(public us: UserHttpService, public router: Router, private activatedRoute: ActivatedRoute) { }

   ngOnInit(): void {
      // First of all retrieve the if of the friend passed as router params
      this.activatedRoute.paramMap.subscribe(async (params) => {
         // Try to get the info from the server
         this.adminId = params.get("user_id");
      }, (err) => {
         this.router.navigate(["/login"]);
      })
   }

   signup() {

      // Creating a body request, setting this user is not a new moderator
      // and also the user informations
      var body = {
         newMod: false,
         user: this.user,
         adminId: ''
      }

      // Check if the admin id is not null. In this case the admin id is used to 
      // update user informations
      if (this.adminId !== undefined) { 
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

   setAvatar(imageName: string): void {
      console.log(imageName);
      this.user.avatar = imageName;
   }
}
