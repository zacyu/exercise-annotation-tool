// Next ID: 3
export enum SubjectEventType {
  Unknown = 0,
  TextAnnotation = 1,
  ExitSummary = 2,
}

export class SubjectLocation {
  constructor(public x: number,
    public y: number,
    public width: number,
    public height: number) { }

  static fromExported(exportedLocation: Object): SubjectLocation {
    return new SubjectLocation(
      exportedLocation['x'], exportedLocation['y'],
      exportedLocation['width'], exportedLocation['height']);
  }

  get exported(): Object {
    return {
      'x': this.x,
      'y': this.y,
      'width': this.width,
      'height': this.height
    }
  }
}

export class SubjectEvent {
  constructor(private _frameNum: number,
    private _type: SubjectEventType,
    public data: any = null) { }

  static fromExported(exportedEvent: Object, sacle: number): SubjectEvent {
    return new SubjectEvent(
      Math.round(exportedEvent['frame_num'] * sacle), exportedEvent['type'],
      exportedEvent['data']);
  }

  get exported(): Object {
    return {
      'frame_num': this._frameNum,
      'type': this._type,
      'data': this.data
    };
  }

  get frameNum() {
    return this._frameNum;
  }

  get type() {
    return this._type;
  }
}

export class SubjectBlock {
  private _events: Array<SubjectEvent> = [];

  constructor(private _location: SubjectLocation,
    public name: string,
    public enterFrame: number = 0,
    public exitFrame: number = 0,
    public type: string = '') { }

  static fromExported(exportedSubjectBlock: Object,
                      scale: number): SubjectBlock {
    let subjectBlock = new SubjectBlock(
      SubjectLocation.fromExported(exportedSubjectBlock['location']),
      exportedSubjectBlock['name'],
      Math.round(exportedSubjectBlock['enter_frame'] * scale),
      Math.round(exportedSubjectBlock['exit_frame'] * scale),
      exportedSubjectBlock['type'] || '');
    for (let exportedEvent of exportedSubjectBlock['events']) {
      subjectBlock.addEvent(
        SubjectEvent.fromExported(exportedEvent, scale));
    }
    return subjectBlock;
  }

  get exported(): Object {
    return {
      'name': this.name,
      'enter_frame': this.enterFrame,
      'exit_frame': this.exitFrame,
      'location': this._location.exported,
      'type': this.type,
      'events': this._events.map((event) => event.exported)
    };
  }

  get events(): Array<SubjectEvent> {
    return this._events;
  }

  get location(): SubjectLocation {
    return this._location;
  }

  addEvent(event: SubjectEvent) {
    if (event.type == SubjectEventType.ExitSummary) {
      for (let key in this._events) {
        if (this._events[key].type == SubjectEventType.ExitSummary ||
          this._events[key].frameNum > event.frameNum) {
          this._events.splice(parseInt(key), 1);
        }
      }
    }
    this._events.push(event);
    this._events.sort((e1, e2) => e1.frameNum - e2.frameNum);
  }

  changeEvent(key: string, event: SubjectEvent) {
    this._events[parseInt(key)] = event;
  }

  removeEvent(key: string) {
    this._events.splice(parseInt(key), 1);
  }
}
