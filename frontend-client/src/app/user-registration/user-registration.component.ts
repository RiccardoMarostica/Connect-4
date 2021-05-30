import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { UserHttpService } from '../user-http.service';

@Component({
  selector: 'app-user-registration',
  templateUrl: './user-registration.component.html',
  styleUrls: ['./user-registration.component.css']
})
export class UserRegistrationComponent implements OnInit {

  public errorMessage: string | undefined = undefined;
  public user: any = { email: '', password: '', username: '' };

  constructor(public us: UserHttpService, public router: Router) { }

  ngOnInit(): void {
  }

  signup() {

    // Creating a body request, setting this user is not a new moderator
    // and also the user informations
    var body = {
      newMod: false,
      user: this.user
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
}
