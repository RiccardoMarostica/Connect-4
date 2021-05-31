import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Components import
import { UserLoginComponent } from './user-login/user-login.component';
import { UserRegistrationComponent } from './user-registration/user-registration.component';
import { HomePageComponent } from './home-page/home-page.component';
import { FriendChatComponent } from './friend-chat/friend-chat.component';
import { MatchComponent } from './match/match.component';
import { MatchListComponent } from './match-list/match-list.component';
import { UserProfileComponent } from './user-profile/user-profile.component';
import { UserListComponent } from './user-list/user-list.component';

/**
 * Imports all the components used on client side.
 * First of all if user call the client without specifing a specific route
 * redirect him to login component.
 * Otherwise, based on the route redirect the user to specific component.
 */

const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: UserLoginComponent },
  { path: 'registration', component: UserRegistrationComponent },
  { path: 'registration/:user_id', component: UserRegistrationComponent },
  { path: 'home-page', component: HomePageComponent },
  { path: 'friend-chat/:friend_id', component: FriendChatComponent },
  { path: 'match/:match_id', component: MatchComponent },
  { path: 'match-list', component: MatchListComponent },
  { path: 'profile', component: UserProfileComponent },
  { path: 'user-list', component: UserListComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
