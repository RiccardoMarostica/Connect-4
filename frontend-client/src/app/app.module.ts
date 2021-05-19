// General modules
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { AppRoutingModule } from './app-routing.module';
import { FormsModule } from '@angular/forms';

// Component modules
import { UserRegistrationComponent } from './user-registration/user-registration.component';
import { UserLoginComponent } from './user-login/user-login.component';
import { HomePageComponent } from './home-page/home-page.component';
import { AppComponent } from './app.component';

// Service modules
import { UserHttpService } from './user-http.service';
import { SocketioService } from './socketio.service';
import { FriendChatComponent } from './friend-chat/friend-chat.component';

@NgModule({
  declarations: [ // The set of components, directives, and pipes that belong to this module.
    AppComponent,
    UserLoginComponent,
    UserRegistrationComponent,
    HomePageComponent,
    FriendChatComponent
  ],
  imports: [ // The set of NgModules whose exported declarables are available to templates in this module.
    BrowserModule,
    HttpClientModule,
    AppRoutingModule,
    FormsModule,
  ],
  providers: [ // The set of injectable objects that are available in the injector of this module.
    { provide: UserHttpService, useClass: UserHttpService },
    { provide: SocketioService, useClass: SocketioService }
  ],
  bootstrap: [AppComponent] // The set of components that are bootstrapped when this module is bootstrapped
})
export class AppModule { }
