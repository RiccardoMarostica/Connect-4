import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { UserHttpService } from './user-http.service';

@Injectable({
  providedIn: 'root'
})
export class MatchHttpService {

  constructor(private user: UserHttpService, private http: HttpClient) { }

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
}
