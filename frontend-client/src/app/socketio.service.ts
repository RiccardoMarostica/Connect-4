import { Injectable } from '@angular/core';
import sio from 'socket.io-client';
import { Observable } from 'rxjs';
import { UserHttpService } from './user-http.service';

@Injectable({
  providedIn: 'root'
})
export class SocketioService {

  private socket: any;

  constructor(public user: UserHttpService) {
    this.socket = sio(this.user.url);
  }

  listen(eventName: string): Observable<any> {
    return new Observable((subscriber) => {
      this.socket.on(eventName, (data: any) => {
        subscriber.next(data);
      })
    })
  }

  emit(eventName: string, data: any): void {
    this.socket.emit(eventName, data);
  }

}
