import { Injectable } from '@angular/core';

import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http'; // Import HTTP used to create requests to our server
import { Observable, throwError } from 'rxjs'; // When you make an HTTP call, the return value is an Observable so import it
import { tap, catchError } from 'rxjs/operators';

import jwt from 'jwt-decode';

interface TokenData {
  username: string,
  mail: string,
  roles: string[],
  id: string
}

@Injectable()
export class UserHttpService {

  private token: any;
  public url: string = 'http://localhost:8080';

  constructor(private http: HttpClient) {
    this.token = localStorage.getItem('server_token'); // Search if inside local storage there is the key "sever_token" and return its value (null if isn't present)
    if (!this.token || this.token.length < 1) { // There isn't a token in local storage
      console.log("No token found in local storage");
      this.token = '';
    } else { // There is a token in local storage
      console.log("Token found in local storage");
    }
  }

  login(mail: string, password: string, remember: boolean): Observable<any> {

    console.log("Making login");

    const options = {
      headers: new HttpHeaders({
        authorization: 'Basic ' + btoa(mail + ':' + password),
        'cache-control': 'no-cache',
        'Content-Type': 'application/x-www-form-urlencoded',
      })
    };

    /**
     * Make an HTTP call to the server sending the informations to login
     * Inside the body it isn't necessary put something but it is important to specify
     * the options because we're sending the headers option in the request.
     */
    return this.http.post(this.url + "/login", "", options).pipe(
      // combine multiple functions into a single function, that executes them in sequence    
      tap((data: any) => {
        console.log("DATA: " + JSON.stringify(data));
        this.token = data['token'];
        if (remember) localStorage.setItem('server_token', this.token);
      })
    )
  }

  registration(user: any): Observable<any> {

    /**
     * Make an HTTP call to the server sending the datas to memorize from the registration form
     * In this case make a POST request to specific endpoint and get from the response the token
     */
    return this.http.post(this.url + "/register", user, {
      headers: new HttpHeaders({
        'cache-control': 'no-cache',
        'Content-Type': 'application/json',
      })
    }).pipe(
      tap((data: any) => {
        console.log("DATA: " + JSON.stringify(data));
        this.token = data["token"]; // set up the token and save it inside the local storage
        localStorage.setItem('server_token', this.token);
      })
    )
  }

  /**
   * Function that make a GET request to server used to retrieve user's friend list.
   * To send user infos use the token that it is memorized when user log or regist himself
   * @returns Friends list
   */
  get_friends(): Observable<any> {
    return this.http.get(this.url + "/friends", {
      headers: new HttpHeaders({
        authorization: 'Bearer ' + this.get_token(),
        'cache-control': 'no-cache',
        'Content-Type': 'application/json',
      })
    });
  }

  /**
   * This function call the endpoint /friends in POST method with the query parameters friends.
   * In this way we made a notification with socket.io to the other user.
   * 
   * @param userId id of the user that you want to add to your friendlist
   * @returns an observable
   */
  send_friend_request(userId: string): Observable<any> {
    return this.http.post(this.url + "/friends", "", {
      headers: new HttpHeaders({
        authorization: 'Bearer ' + this.get_token(),
        'cache-control': 'no-cache',
        'Content-Type': 'application/json',
      }),
      params: new HttpParams({
        fromString: "user=" + userId,
      })
    });
  }

  /**
   * This function call the endpoint /friends in POST method with the query parameters status.
   * The status contains the string to check if the user accept the friend request or not.
   * The infos are passed inside the body of the request
   * 
   * @param userId id of the other user
   * @param options a string that sign if the user accept or deny the friend invitation
   * @returns an observable
   */
  complete_friend_request(user: any, status: any): Observable<any> {
    return this.http.post(this.url + "/friends", {
      user: user,
      status: status
    }, {
      headers: new HttpHeaders({
        authorization: 'Bearer ' + this.get_token(),
        'cache-control': 'no-cache',
        'Content-Type': 'application/json',
      })
    });
  }

  /**
   * Function used to remove a person from user's friend list
   * @param userId person friend id
   * @returns an observable
   */
  remove_friend(userId: string): Observable<any> {
    return this.http.delete(this.url + "/friends", {
      headers: new HttpHeaders({
        authorization: 'Bearer ' + this.get_token(),
        'cache-control': 'no-cache',
        'Content-Type': 'application/json',
      }),
      params: new HttpParams({
        fromString: "user=" + userId,
      })
    })
  }

  friend_request_game(userId: string): Observable<any> {
    return this.http.get(this.url + "/game/create", {
      headers: new HttpHeaders({
        authorization: 'Bearer ' + this.get_token(),
        'cache-control': 'no-cache',
        'Content-Type': 'application/json',
      }),
      params: new HttpParams({
        fromString: "user=" + userId,
      })
    })
  }

  get_token(): any {
    return this.token;
  }

  get_user_id(): string {
    return (jwt(this.token) as TokenData).id;
  }
}
