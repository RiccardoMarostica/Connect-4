import { TestBed } from '@angular/core/testing';

import { MatchHttpService } from './match-http.service';

describe('MatchHttpService', () => {
  let service: MatchHttpService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MatchHttpService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
