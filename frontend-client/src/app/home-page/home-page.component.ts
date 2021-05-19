import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SocketioService } from '../socketio.service';
import { UserHttpService } from '../user-http.service';

@Component({
  selector: 'app-home-page',
  templateUrl: './home-page.component.html',
  styleUrls: ['./home-page.component.css']
})
export class HomePageComponent implements OnInit {

  public friendList: any = [];
  public friendRequest: any = undefined;

  constructor(private user: UserHttpService, private router: Router, private socket: SocketioService) { }

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
    })
  }

  /**
   * Function used to make a call to UserHttpService to retrieve the friendlist of an user
   */
  get_friends(): void {

    this.user.get_friends().subscribe((data) => {
      this.friendList = data.friends;
      console.log("Friend list: " + JSON.stringify(this.friendList));
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

}