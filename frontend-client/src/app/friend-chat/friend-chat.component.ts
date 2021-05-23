import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, NavigationStart, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Chat } from '../customTemplates';
import { MessageHttpService } from '../message-http.service';
import { SocketioService } from '../socketio.service';

@Component({
  selector: 'app-friend-chat',
  templateUrl: './friend-chat.component.html',
  styleUrls: ['./friend-chat.component.css']
})
export class FriendChatComponent implements OnInit {

  public friendId: any = ''; // The id of the friend
  public chat: Chat;  // An array that contains all the messages between the users
  public createdListenSocket: boolean = false;


  constructor(private msgService: MessageHttpService, private activeRoute: ActivatedRoute, private socket: SocketioService) {
    this.chat = {
      _id: "0",
      participants: [],
      messages: []
    }
  }

  ngOnInit(): void {
    // First of all retrieve the if of the friend passed as router params
    this.activeRoute.paramMap.subscribe(params => {
      this.friendId = params.get("friend_id");

      // Now get the list of the messages using the friend id
      this.getChatMessages(this.friendId);


    });
  }

  /**
   * Function used to call the service that will make an http request to the server.
   * This function will get all the messages and informations about the chat with the friend.
   * @param userId id of the friend
   */
  getChatMessages(userId: string): void {
    this.msgService.getChatMessages(userId).subscribe((data) => {
      if (data) {
        this.chat = data;

        // use a flag to create a listen socket when the function is called
        if (!this.createdListenSocket) {
          // Create the socket to update update the chat
          this.socket.listen("chat_" + this.chat._id).subscribe(() => {
            this.getChatMessages(this.friendId);
          })
          this.createdListenSocket = true;
        }

        console.log("Messages received from the server!");
        console.log("TEST: " + JSON.stringify(this.chat));
      }
    })
  }

  /**
   * Function used to call the service that will make an http request to the server.
   * The request will post a message, save it on mongoDB and notify the other player,
   * if he is inside the same chat, that a new message has been posted.
   * @param message content of the message
   */
  postChatMessages(message: string): void {
    this.msgService.postChatMessages(this.chat._id, message).subscribe(() => {
      console.log("Send a message to the chat!");
    })
  }
}
