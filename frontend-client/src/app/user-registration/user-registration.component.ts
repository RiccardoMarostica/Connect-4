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
    this.us.registration(this.user).subscribe((data) => {
      console.log("SUCCESS: Created a new account. Login granted!");
      this.router.navigate(["/home-page"]);
    }, (err) => {
      console.log('Signup error: ' + JSON.stringify(err.error.errormessage));
      this.errorMessage = err.error.message;
    })
  }
}
