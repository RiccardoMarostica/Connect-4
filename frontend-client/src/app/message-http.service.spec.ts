import { TestBed } from '@angular/core/testing';

import { MessageHttpService } from './message-http.service';

describe('MessageHttpService', () => {
  let service: MessageHttpService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MessageHttpService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
