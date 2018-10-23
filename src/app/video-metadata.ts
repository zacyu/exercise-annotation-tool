// TODO(zacy1): get actual frame rate when HTML5 standards expose such info.
const DURATION_TOLERANCE = 5;
const FRAME_RATE = 15;

export class VideoMetadata {
  private _duration: number;

  private _frameRate: number;

  private _height: number;

  private _width: number;

  get duration(): number {
    return this._duration;
  }

  get exported(): Object {
    return {
      'duration': this._duration,
      'frame_rate': this._frameRate,
      'height': this._height,
      'width': this._width
    }
  }

  get frameRate(): number {
    return this._frameRate;
  }

  get height(): number {
    return this._height;
  }

  get width(): number {
    return this._width;
  }

  updateDuration() {
    this._duration = Math.round(this.videoEle.duration * this.frameRate);
  }

  verifyExported(exportedData, version: number): boolean {
    let exported = Object.assign({}, exportedData);
    if (version < 3 && exported['frame_rate'] != this._frameRate) {
      exported['duration'] = Math.round(
        exported['duration'] * this._frameRate / exported['frame_rate']);
      exported['frame_rate'] = this._frameRate;
    }
    return this._frameRate == exported['frame_rate'] &&
    this._height == exported['height'] &&
    this._width == exported['width'] &&
    Math.abs(this.duration - exported['duration']) <= DURATION_TOLERANCE;
  }

  constructor(private readonly videoEle: HTMLVideoElement) {
    this.updateDuration();
    this._frameRate = FRAME_RATE;
    this._height = videoEle.videoHeight;
    this._width = videoEle.videoWidth;
  }
}
