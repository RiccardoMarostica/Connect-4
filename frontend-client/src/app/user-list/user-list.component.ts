import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { UserHttpService } from '../user-http.service';

@Component({
  selector: 'app-user-list',
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.css']
})
export class UserListComponent implements OnInit {

  userList: Array<any> = [];

  constructor(public user: UserHttpService, private router: Router) { }

  ngOnInit(): void {
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

}
