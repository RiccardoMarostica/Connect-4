import { LocationStrategy } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatchHttpService } from '../match-http.service';
import { UserHttpService } from '../user-http.service';

@Component({
  selector: 'app-match',
  templateUrl: './match.component.html',
  styleUrls: ['./match.component.css']
})
export class MatchComponent implements OnInit {

  isUserPlaying: boolean = false; // Flag used to set if the current user is playing the match or if he is just watching the game
  diskColour: string | null = null; // Variable used to set the disk colour if the user is playing
  matchInfos: any; // Get the infos from the server

  constructor(private activatedRoute: ActivatedRoute, private router: Router, private location: LocationStrategy, private match: MatchHttpService, private user: UserHttpService) {
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

      // Call the match service that will make a GET request to the server. Then handle the observable
      this.match.get_match_data(param).subscribe((data) => {
        this.matchInfos = data;

        // Check if current user is playing or not. If true check it
        var userId = this.user.get_user_id();
        var checkUserPlaying = this.matchInfos.participants.find((elem: any) => elem._id == userId); // Check if id of current user is inside participants
        // if true, just update the flag and set the disk colour
        if (checkUserPlaying !== undefined) {
          this.isUserPlaying = true; // Update flag that user is playing
          this.diskColour = checkUserPlaying.colour;
        }
      }, (err) => {
        console.log("Error while retrieving the informations from the server!");
        console.log("ERROR: " + JSON.stringify(err));
        this.router.navigate(["/home-page"]);
      });
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
