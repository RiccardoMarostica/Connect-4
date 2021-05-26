import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { UserHttpService } from './user-http.service';

@Injectable({
   providedIn: 'root'
})
export class MatchHttpService {

   constructor(private user: UserHttpService, private http: HttpClient) { }

   /**
    * Function that make an HTTP GET method call to the server used to retrieve the informations
    * about a match that is currently open.
    * This method is used both for players and for wathing members   
    * 
    * @param matchId match id
    * @returns 
    */
   get_match_data(matchId: string): Observable<any> {
      return this.http.get(this.user.url + "/game", {
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

   /**
    * Function that make an HTTP POST method call to update informations save on the backend.
    * 
    * @param matchId match id
    * @param requestBody request of the body that contains the infos used to update the document on the server
    * @returns 
    */
   post_match_data(matchId: string, requestBody: any): Observable<any> {
      return this.http.post(this.user.url + "/game", requestBody, {
         headers: new HttpHeaders({
            authorization: 'Bearer ' + this.user.get_token(),
            'cache-control': 'no-cache',
            'Content-Type': 'application/json',
         }),
         params: new HttpParams({
            fromString: "match=" + matchId,
         })
      });
   }
}
