// Imports
import { Component, OnInit } from '@angular/core';
import { UserHttpService } from '../user-http.service';
import { Router } from '@angular/router';

/**
 * The component of this page contains only one method, used to login the user to the page
 * We use the UserHttpService service to execute the HTTP request to the server.
 * Also there is the errorMessage field used to memorize the error if the request fails.
 * If the errorMessage is not undefined this is shown inside the html of this component.
 * Insted if the request is successfull redirect the user to the main page of the application..
 */
@Component({
  selector: 'app-user-login',
  templateUrl: './user-login.component.html',
  styleUrls: ['./user-login.component.css']
})
export class UserLoginComponent implements OnInit {

  public errorMessage: string | undefined = undefined;

  constructor( private user : UserHttpService, private router : Router) { }

  ngOnInit(): void {
  }

  login (mail: string, password: string, remember: boolean) {
    this.user.login(mail, password, remember).subscribe( (value) => {
      console.log("SUCCESS: Login granted!");
      this.errorMessage = undefined;
      this.router.navigate(["/home-page"]);
    }, (err) => {
      console.log("ERROR: Login error! Value: " + JSON.stringify(err));
      this.errorMessage = err.message;
    });
  }
}