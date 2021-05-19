import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FriendChatComponent } from './friend-chat.component';

describe('FriendChatComponent', () => {
  let component: FriendChatComponent;
  let fixture: ComponentFixture<FriendChatComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FriendChatComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FriendChatComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
