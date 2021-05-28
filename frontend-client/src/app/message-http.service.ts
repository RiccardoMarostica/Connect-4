import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { UserHttpService } from './user-http.service';
import { HttpClient, HttpHeaders, HttpParams, HttpErrorResponse } from '@angular/common/http';

@Injectable({
   providedIn: 'root'
})
export class MessageHttpService {

   constructor(private user: UserHttpService, private http: HttpClient) {
      console.log("Message service instantiated");
      console.log("Token: " + user.get_token());
   }

   /**
    * Function used to retrieve from server the messages with an user
    * using the friend id. In this way we retrieve the document saved on mongoDB
    * from the server
    * @param userId 
    * @returns 
    */
   getChatMessages(userId: string): Observable<any> {
      return this.http.get(this.user.url + "/messages", {
         headers: new HttpHeaders({
            authorization: 'Bearer ' + this.user.get_token(),
            'cache-control': 'no-cache',
            'Content-Type': 'application/json',
         }),
         params: new HttpParams({
            fromString: "user=" + userId
         })
      })
   }

   /**
    * Function used to post a new message. The params chatId is used to saved the current
    * message inside mongoDB.
    * 
    * @param chatId 
    * @param message Content of the message
    * @returns 
    */
   postChatMessages(chatId: string, message: string): Observable<any> {
      return this.http.post(this.user.url + "/messages", {
         content: message
      }, {
         headers: new HttpHeaders({
            authorization: 'Bearer ' + this.user.get_token(),
            'cache-control': 'no-cache',
            'Content-Type': 'application/json',
         }),
         params: new HttpParams({
            fromString: "chat_id=" + chatId
         })
      });
   }

   /**
    * Function used to post a new message inside the chat of a match. The params matchId
    * rappresent the match that user is currently playing or watching. The message is the 
    * content and it is passed inside the body of the request.
    *  
    * @param matchId 
    * @param message 
    * @returns 
    */
   postGameMessages(matchId: string, message: string): Observable<any> {
      return this.http.post(this.user.url + "/messages", {
         content: message
      }, {
         headers: new HttpHeaders({
            authorization: 'Bearer ' + this.user.get_token(),
            'cache-control': 'no-cache',
            'Content-Type': 'application/json',
         }),
         params: new HttpParams({
            fromString: "match=" + matchId
         })
      })
   }
}
