export interface Clock {
  now(): number;
}

export class SystemClock implements Clock {
  now(): number {
    return Date.now();
  }
}

export class FakeClock implements Clock {
  private t: number;

  constructor(startTime = 0) {
    this.t = startTime;
  }

  now(): number {
    return this.t;
  }

  advance(ms: number): void {
    if (ms > 0) this.t += ms;
  }

  set(time: number): void {
    this.t = time;
  }
}
