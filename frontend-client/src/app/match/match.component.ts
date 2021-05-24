import { LocationStrategy } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatchHttpService } from '../match-http.service';

@Component({
  selector: 'app-match',
  templateUrl: './match.component.html',
  styleUrls: ['./match.component.css']
})
export class MatchComponent implements OnInit {

  private isUserPlaying: boolean = false; // Flag used to set if the current user is playing the match or if he is just watching the game
  matchInfos: any;

  constructor(private activatedRoute: ActivatedRoute, private router: Router, private location: LocationStrategy, private match: MatchHttpService) {
    // preventing back button in browser
    history.pushState(null, '', window.location.href);
    this.location.onPopState(() => {
      history.pushState(null, '', window.location.href);
    });
  }

  ngOnInit(): void {
    // First of all retrieve the if of the friend passed as router params
    this.activatedRoute.paramMap.subscribe(async (params) => {

      // Try to get the info from the server
      var param: any = params.get("match_id");
      await this.getMatchInfo(param);

      // TODO: Testare che await blocchi esecuzione prossimi comandi
      console.log(this.matchInfos["_id"]);

    }, (err) => {
      // Error case
      console.log("Error while retrieving the match id from the URL!");
      this.router.navigate(["/home-page"]);
    });
  }

  /**
   * Function used to get the infos about a match (id, participants, messages, turn, etc...) from the server
   * @param param 
   */
  getMatchInfo(param: any): void {
    // Call the match service that will make a GET request to the server. Then handle the observable
    this.match.get_match_data(param).subscribe((data) => {
      this.matchInfos = data;
    }, (err) => {
      console.log("Error while retrieving the informations from the server!");
      console.log("ERROR: " + JSON.stringify(err));
      this.router.navigate(["/home-page"]);
    });
  }
}
