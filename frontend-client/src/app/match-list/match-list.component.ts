import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatchHttpService } from '../match-http.service';

@Component({
  selector: 'app-match-list',
  templateUrl: './match-list.component.html',
  styleUrls: ['./match-list.component.css']
})
export class MatchListComponent implements OnInit {

  matchLists: Array<any> = [];

  constructor(private match: MatchHttpService, private router: Router) { }

  ngOnInit(): void {
    // When page load, retrieve from the server all the matches that aren't over
    this.match.get_matches().subscribe((data: Array<any>) => {
      this.matchLists = data;
      console.log("Retrieve all the open matches");
    }, (err) => {
      this.matchLists = [];
      console.log("Error while retrieving all the open matches");
      console.log("Error: " + err);

      // Just check if the JWT is invalid. Otherwise go to login page
      if (err.status == "401" && err.code == "invalid_token") {
        this.router.navigate(["/login"]);
      }
    });
  }

  /**
   * Function used to join a match from the page match-list
   * @param matchId 
   */
  joinMatch(matchId: string): void {
    this.router.navigate(['/match', matchId]);
  }
}
