// const EXERCISE_TYPE_CGI_URI = 'https://www.contrib.andrew.cmu.edu/user/zacy1/cgi-bin/exercise-types.cgi'
const DEFAULT_EXERCISE_TYPES = ['squats', 'lat pulldown', 'benchpress', 'warmup', 'deadlift'];

import {
  ChangeDetectorRef, Component, HostListener, Inject, ViewChild
} from '@angular/core';
import {
  MatMenuModule, MatDialog, MatDialogRef, MatMenu, MatSnackBar,
  MAT_DIALOG_DATA
} from '@angular/material';
import { environment } from '../environments/environment';
import { saveAs } from 'file-saver';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Annotation } from './annotation';
import {
  SubjectBlock, SubjectEvent, SubjectEventType, SubjectLocation
} from './subject-block';
import { VideoMetadata } from './video-metadata';

@Component({
  selector: 'new-file-warning-dialog',
  template: '<h2 mat-dialog-title>{{data.warningText}}</h2>' +
  '<mat-dialog-content><p>All unsaved progress will be lost. ' +
  'Are you sure you want to continue?</p></mat-dialog-content>' +
  '<mat-dialog-actions><button mat-button mat-dialog-close color="accent">No</button>' +
  '<button (click)="data.confirm()" mat-button ' +
  '[mat-dialog-close]="true" color="primary">Yes</button>' +
  '</mat-dialog-actions>'
})
export class NewFileWarningDialog {
  constructor(private cdRef: ChangeDetectorRef,
    @Inject(MAT_DIALOG_DATA) public data: any,
    public dialogRef: MatDialogRef<NewFileWarningDialog>) { }
}

@Component({
  selector: 'string-prompt-dialog',
  template: '<h2 mat-dialog-title>{{data.promptTitle}}</h2>' +
  '<mat-dialog-content><p>{{data.promptText}}</p>' +
  '<mat-form-field>' +
  '<input matInput required [(ngModel)]="input" [placeholder]="data.placeholder">' +
  '</mat-form-field>' +
  '</mat-dialog-content>' +
  '<mat-dialog-actions>' +
  '<button *ngIf="data.cancel" (click)="data.cancel()" ' +
  'mat-button mat-dialog-close color="accent">' +
  '{{data.cancelText || "Cancel"}}</button>' +
  '<button (click)="save()" mat-button ' +
  'color="primary">Save</button>' +
  '</mat-dialog-actions>'
})
export class StringPromptDialog {
  public input: string = '';

  constructor(private cdRef: ChangeDetectorRef,
    @Inject(MAT_DIALOG_DATA) public data: any,
    public dialogRef: MatDialogRef<StringPromptDialog>) {
    if (data.initValue) {
      this.input = data.initValue;
    }
  }

  save() {
    if (this.input.length) {
      this.data.save(this.input);
      this.dialogRef.close();
    }
  }
}

class DisplaySubjectBlock {
  constructor(public style: any, public name: string, public key: string) { }
}

function padNum(num: number, length: number): string {
  return (num + '').padStart(length, '0');
}

function formatHmsTime(durationSecsFloat): string {
  let durationSecs = Math.floor(durationSecsFloat);
  let seconds = durationSecs % 60;
  let minutes = Math.floor(durationSecs / 60);
  let hours = Math.floor(minutes / 60);
  let result = (hours == 0 ? '' : hours + ':') + padNum(minutes, 2) + ':' +
    padNum(seconds, 2);
  return result;
}

@Component({
  selector: 'tagging-tool',
  templateUrl: './tagging-tool.component.html',
  styleUrls: ['./tagging-tool.component.css']
})
export class TaggingToolComponent {
  @ViewChild('annotationLoader') annotationLoader;

  @ViewChild('video') video;

  @ViewChild('videoArea') videoArea;

  @ViewChild('videoLoader') videoLoader;

  private _annotation: Annotation = null;

  private _exerciseTypes: Array<string> = [];

  private _drawingBlockStart: [number, number] = null;

  private _drawingBlockEnd: [number, number] = null;

  private _editingBlockKey: string;

  private _fileName: string = 'video';

  private _videoAreaScale: number = 1;

  private _videoMetadata: VideoMetadata = null;

  public allBlocks: Array<SubjectBlock> = [];

  public annotationContainerStyle: Object = null;

  public blocks: Array<DisplaySubjectBlock> = [];

  public currTime: number = 0;

  public duration: number = 1;

  public exerciseOptions: Array<string> = [];

  public exerciseType: string;

  public highlightedBlockKey: string = null;

  public isAnnotationLoaded: boolean = false;

  public isAnnotationModified: boolean = false;

  public isDrawingBlock: boolean = false;

  public isPlaying: boolean = false;

  public isSavingBlock: boolean = false;

  public isShowingFrameNum: boolean = true;

  public isVideoLoaded: boolean = false;

  public isVideoReady: boolean = false;

  public version: string;

  public videoFile: File;

  public videoUrl: string;

  public safeVideoUrl: SafeResourceUrl;

  public subjectEvents: Array<SubjectEvent> = [];

  constructor(private sanitizer: DomSanitizer,
    private matDialog: MatDialog,
    private snackBar: MatSnackBar) {
    this.version = environment.version;
    this.loadExerciseTypes();
  }

  get videoMetadata(): VideoMetadata {
    if (!this.isVideoLoaded) {
      console.error('Video is not loaded yet.');
      return null;
    }
    if (!this._videoMetadata) {
      this._videoMetadata = new VideoMetadata(this.video.nativeElement);
    }
    return this._videoMetadata;
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event) {
    if (this.isAnnotationModified) {
      return event.returnValue = true;
    }
  }

  abortDrawingBlock(event) {
    if (event.target.id != 'annotation-container' ||
      !this.isDrawingBlock) return;
    this.isDrawingBlock = false;
    this.isSavingBlock = false;
  }

  annotationUpdate(forceLoad: boolean) {
    let annotationLoaderEle = this.annotationLoader.nativeElement;
    if (!annotationLoaderEle.files || !annotationLoaderEle.files[0]) return;
    let annotationFile = annotationLoaderEle.files[0];
    let fileReader = new FileReader();
    fileReader.onload = (e) => {
      let annotationText = e.target['result'];
      try {
        let exportedAnnotation = JSON.parse(annotationText);
        if (!forceLoad &&
          !this.videoMetadata.verifyExported(
            exportedAnnotation['video_metadata'],
            exportedAnnotation['version'])) {
          let snackBarRef =
            this.snackBar.open('Video metadata mismatch.', 'Load Anyway', {
              duration: 5000
            });
          snackBarRef.onAction().subscribe(() => {
            this.annotationUpdate(true);
          });
          snackBarRef.afterDismissed().subscribe(() => {
            annotationLoaderEle.value = '';
          });
          return;
        }
        annotationLoaderEle.value = '';
        this._annotation = new Annotation(this.videoMetadata);
        this.allBlocks = this._annotation.subjectBlocks;
        this.highlightedBlockKey = null;
        let scale = 1;
        let upgraded = false;
        if (exportedAnnotation['version'] < 3) {
          upgraded = true;
          if (exportedAnnotation['video_metadata']['frame_rate'] !=
            this.videoMetadata.frameRate) {
            scale = this.videoMetadata.frameRate /
              exportedAnnotation['video_metadata']['frame_rate'];
          }
        }
        if (upgraded) {
          let snackBarRef =
            this.snackBar.open('Annotation file upgraded', 'Save', {
              duration: 5000
            });
          snackBarRef.onAction().subscribe(() => {
            this.saveAnnotation();
          });
        }
        this._annotation.loadExportedBlocks(
          exportedAnnotation['subject_blocks'], scale);
        this.allBlocks = this._annotation.subjectBlocks;
        this.isAnnotationLoaded = true;
        this.isAnnotationModified = upgraded;
        this.updateVisibleBlocks();
      } catch (e) {
        annotationLoaderEle.value = '';
        this.snackBar.open('Failed to open annotation: ' + e.message, null, {
          duration: 3000
        });
        console.error(e);
      }
    }
    fileReader.readAsText(annotationFile);
  }

  changePlaybackSpeed() {
    let playbackSpeeds = [1, 1.5, 2, 3, 4];
    this.video.nativeElement.playbackRate = playbackSpeeds[
      (playbackSpeeds.indexOf(this.video.nativeElement.playbackRate) + 1) %
      playbackSpeeds.length
    ];
  }

  changeSubjectName() {
    this.matDialog.open(StringPromptDialog, {
      data: {
        cancel: () => { },
        initValue: this._annotation.subjectBlocks[this._editingBlockKey].name,
        placeholder: 'Block name',
        promptText: 'Please name the block.',
        promptTitle: 'Change Block Name',
        save: (name) => {
          this._annotation.modifyBlock(this._editingBlockKey, {
            name: name
          });
          this.isAnnotationModified = true;
          this.allBlocks = this._annotation.subjectBlocks;
          this.updateVisibleBlocks();
        }
      }
    });
  }

  classifiedBlockCount() {
    return this.allBlocks.filter((e) => !!e.type).length;
  }

  deleteBlock() {
    this._annotation.removeBlock(this._editingBlockKey);
    this.allBlocks = this._annotation.subjectBlocks;
    this.highlightedBlockKey = null;
    this.isAnnotationModified = true;
    this.updateVisibleBlocks();
  }

  editBlock(blockKey: string) {
    this.video.nativeElement.pause();
    this._editingBlockKey = blockKey;
    this.subjectEvents = this._annotation.subjectBlocks[blockKey].events;
  }

  endDrawingBlock(event) {
    if (event.target.id != 'annotation-container' ||
      !this.isDrawingBlock) return;
    this.isSavingBlock = true;
    this.isDrawingBlock = false;
    this._drawingBlockEnd = [event.offsetX, event.offsetY];
    if (this._drawingBlockEnd[0] == this._drawingBlockStart[0] &&
      this._drawingBlockEnd[1] == this._drawingBlockStart[1]) {
      this.isSavingBlock = false;
      return;
    }
    if (Math.abs(this._drawingBlockEnd[0] - this._drawingBlockStart[0]) *
      Math.abs(this._drawingBlockEnd[1] - this._drawingBlockStart[1]) < 100) {
      this.isSavingBlock = false;
      this.snackBar.open('Block too small.', null, {
        duration: 1000
      });
      return;
    }
    this.matDialog.open(StringPromptDialog, {
      data: {
        cancel: () => {
          this.isSavingBlock = false;
        },
        placeholder: 'Block name',
        promptText: 'Please name the block (you can change the later).',
        promptTitle: 'Create New Block',
        initValue: 'E' + (this.allBlocks.length + 1),
        save: (name) => {
          this.isSavingBlock = false;
          let location = new SubjectLocation(
            Math.round(Math.min(this._drawingBlockStart[0],
              this._drawingBlockEnd[0]) / this._videoAreaScale),
            Math.round(Math.min(this._drawingBlockStart[1],
              this._drawingBlockEnd[1]) / this._videoAreaScale),
            Math.round(Math.abs(this._drawingBlockStart[0] -
              this._drawingBlockEnd[0]) / this._videoAreaScale),
            Math.round(Math.abs(this._drawingBlockStart[1] -
              this._drawingBlockEnd[1]) / this._videoAreaScale)
          );
          let block = new SubjectBlock(location, name,
            this.currTime, this.duration);
          this._annotation.addSubjectBlock(block);
          this.allBlocks = this._annotation.subjectBlocks;
          this.isAnnotationModified = true;
          this.updateVisibleBlocks();
        }
      },
      disableClose: true
    });
  }

  exerciseTypeUpdate() {
    if (this.exerciseType !== this.allBlocks[this.highlightedBlockKey].type) {
      this.allBlocks[this.highlightedBlockKey].type = this.exerciseType;
      this._annotation.modifyBlock(this.highlightedBlockKey, {
        'type': this.exerciseType
      });
      this.isAnnotationModified = true;
    }
    this.exerciseOptions = DEFAULT_EXERCISE_TYPES.concat(this._exerciseTypes).filter((e)=>e.toLowerCase().startsWith(this.exerciseType));
  }

  formatTime(currTimeFN, durationFN, frameNum) {
    if (frameNum) {
      return currTimeFN + ' / ' + durationFN;
    } else {
      return formatHmsTime(currTimeFN / this.videoMetadata.frameRate) + ' / ' +
        formatHmsTime(durationFN / this.videoMetadata.frameRate);
    }
  }

  getDrawingBlockStyle() {
    if (!this._drawingBlockStart || !this._drawingBlockEnd) {
      console.error('Drawing box data not available.');
      return {};
    }
    return {
      'left': Math.min(this._drawingBlockStart[0],
        this._drawingBlockEnd[0]) + 'px',
      'top': Math.min(this._drawingBlockStart[1],
        this._drawingBlockEnd[1]) + 'px',
      'width': Math.abs(this._drawingBlockStart[0] -
        this._drawingBlockEnd[0]) + 'px',
      'height': Math.abs(this._drawingBlockStart[1] -
        this._drawingBlockEnd[1]) + 'px'
    }
  }

  highlightBlock(key: string) {
    this.highlightedBlockKey = key;
    this.seek(this.allBlocks[key].enterFrame);
    this.exerciseType = this.allBlocks[key].type;
    this.exerciseTypeUpdate();
    if (!this.isPlaying) {
      this.video.nativeElement.play();
    }
  }

  loadAnnotation() {
    let annotationLoaderEle = this.annotationLoader.nativeElement;
    if (this.isAnnotationModified) {
      this.matDialog.open(NewFileWarningDialog, {
        data: {
          warningText: 'Open New Annotation File',
          confirm: () => { annotationLoaderEle.click(); }
        }
      });
    } else {
      annotationLoaderEle.click();
    }
  }

  loadExerciseTypes() {
    // fetch(EXERCISE_TYPE_CGI_URI).then(res => res.json()).then(
    //   storedTypes => this._exerciseTypes = storedTypes
    // );
    let storedTypes = localStorage.getItem('exercise_types');
    if (storedTypes) {
      this._exerciseTypes = JSON.parse(storedTypes);
    }
  }

  loadVideo() {
    let videoLoaderEle = this.videoLoader.nativeElement;
    if (this.isAnnotationModified) {
      this.matDialog.open(NewFileWarningDialog, {
        data: {
          warningText: 'Open New Video',
          confirm: () => { videoLoaderEle.click(); }
        }
      });
    } else {
      videoLoaderEle.click();
    }
  }

  moveDrawingBlock(event) {
    if (event.target.id != 'annotation-container' ||
      !this.isDrawingBlock) return;
    this._drawingBlockEnd = [event.offsetX, event.offsetY];
  }

  newAnnotation() {
    if (this.isAnnotationLoaded) {
      this.matDialog.open(NewFileWarningDialog, {
        data: {
          warningText: 'Create New Annotation',
          confirm: () => {
            this._annotation = new Annotation(this.videoMetadata);
            this.allBlocks = [];
            this.highlightedBlockKey = null;
            this.isAnnotationModified = this.isAnnotationLoaded = true;
            this.blocks = [];
          }
        }
      });
    } else {
      this._annotation = new Annotation(this.videoMetadata);
      this.allBlocks = [];
      this.highlightedBlockKey = null;
      this.isAnnotationModified = this.isAnnotationLoaded = true;
      this.blocks = [];
    }
  }

  onKeyDown(event) {
    if (!this.isVideoReady) return;
    if (event.which == 32) {  // Spacebar
      if (event.target.tagName == 'BUTTON' || event.target.tagName == 'INPUT') return;
      this.playPause();
    } if (event.which == 37 && this.currTime > 0) {  // <-
      if (event.target.tagName == 'MD-SLIDER') return;
      this.seek(this.currTime - 1);
    } else if (event.which == 39 && this.currTime < this.duration) {  // ->
      if (event.target.tagName == 'MD-SLIDER') return;
      this.seek(this.currTime + 1);
    } else if (event.which == 84) {  // 'T'
      this.isShowingFrameNum = !this.isShowingFrameNum;
    }
  }

  playPause() {
    if (!this.isPlaying) {
      this.video.nativeElement.play();
    } else if (this.highlightedBlockKey !== null) {
      this.highlightedBlockKey = null;
    } else {
      this.video.nativeElement.pause();
    }
  }

  saveAnnotation() {
    let exportedText = JSON.stringify(this._annotation.exported);
    let blob = new Blob([exportedText], { type: 'application/json' });
    let fileName = this._fileName + '_' + Date.now() + '_annotation.json';
    saveAs(blob, fileName);
    this.isAnnotationModified = false;
    this.saveExerciseTypes();
  }

  saveExerciseTypes() {
    this._exerciseTypes = this._exerciseTypes.concat(
      this.allBlocks.map(e=>e.type).filter((t)=>!!t &&
      DEFAULT_EXERCISE_TYPES.indexOf(t) &&
      this._exerciseTypes.indexOf(t) < 0));
    if (this._exerciseTypes.length) {
      // fetch(EXERCISE_TYPE_CGI_URI, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json'
      //   },
      //   body: JSON.stringify(this._exerciseTypes)
      // }).then(res => res.json()).then(
      //   storedTypes => this._exerciseTypes = storedTypes
      // );
      localStorage.setItem('exercise_types', JSON.stringify(this._exerciseTypes));
    }
  }

  seek(frameNumber: number) {
    this.currTime = frameNumber;
    this.video.nativeElement.currentTime =
      frameNumber / this.videoMetadata.frameRate;
  }

  seekSubjectEnd() {
    this.seek(this._annotation.subjectBlocks[this._editingBlockKey].exitFrame);
  }

  seekSubjectStart() {
    this.seek(this._annotation.subjectBlocks[this._editingBlockKey].enterFrame);
  }

  setStartFrame(frameNumber: number) {
    this._annotation.modifyBlock(this._editingBlockKey, {
      enterFrame: frameNumber
    });
    this.isAnnotationModified = true;
    this.updateVisibleBlocks();
  }

  setEndFrame(frameNumber: number) {
    this._annotation.modifyBlock(this._editingBlockKey, {
      exitFrame: frameNumber
    });
    this.matDialog.open(StringPromptDialog, {
      data: {
        placeholder: 'Summary (e.g. repetition count)',
        promptText: 'Please enter an exit frame summary.',
        promptTitle: 'Exit Frame Summary',
        save: (summaryText) => {
          let summaryEvent = new SubjectEvent(
            this.currTime, SubjectEventType.ExitSummary, summaryText);
          this._annotation.addSubjectEvent(this._editingBlockKey, summaryEvent);
          this.isAnnotationModified = true;
          this.updateVisibleBlocks();
        }
      },
      disableClose: true
    });
  }

  addTextAnnotation() {
    this.matDialog.open(StringPromptDialog, {
      data: {
        placeholder: 'Annotation text',
        promptText: 'Please enter the annotation text.',
        promptTitle: 'Add Text Annotation',
        save: (annotationText) => {
          let annotation = new SubjectEvent(
            this.currTime, SubjectEventType.TextAnnotation, annotationText);
          this._annotation.addSubjectEvent(this._editingBlockKey, annotation);
          this.isAnnotationModified = true;
          this.updateVisibleBlocks();
        }
      },
      disableClose: true
    });
    this.isAnnotationModified = true;
    this.updateVisibleBlocks();
  }

  editTextAnnotation(eventKey: string) {
    this.matDialog.open(StringPromptDialog, {
      data: {
        cancel: () => {
          this._annotation.removeSubjectEventData(this._editingBlockKey,
            eventKey);
          this.isAnnotationModified = true;
          this.updateVisibleBlocks();
        },
        cancelText: 'Delete',
        initValue: this._annotation.subjectBlocks[this._editingBlockKey]
          .events[eventKey].data,
        placeholder: 'Annotation text',
        promptText: 'Please enter the annotation text.',
        promptTitle: 'Edit Text Annotation',
        save: (annotationText) => {
          this._annotation.changeSubjectEventData(this._editingBlockKey,
            eventKey, annotationText);
          this.isAnnotationModified = true;
          this.updateVisibleBlocks();
        }
      },
    });
    this.isAnnotationModified = true;
    this.updateVisibleBlocks();
  }

  startDrawingBlock(event) {
    if (event.target.id != 'annotation-container') return;
    this.video.nativeElement.pause();
    this.highlightedBlockKey = null;
    this.isDrawingBlock = true;
    this._drawingBlockStart = this._drawingBlockEnd = [event.offsetX, event.offsetY];
  }

  updateAnnotationStyle() {
    if (!this.isVideoLoaded) return;
    let videoRatio = this.videoMetadata.width / this.videoMetadata.height;
    let videoAreaRatio = this.videoArea.nativeElement.clientWidth /
      this.videoArea.nativeElement.clientHeight;
    if (videoRatio < videoAreaRatio) {
      this.annotationContainerStyle = {
        'left': Math.round((videoAreaRatio - videoRatio) *
          this.videoArea.nativeElement.clientHeight / 2) + 'px',
        'top': '0',
        'width': Math.round(this.videoArea.nativeElement.clientHeight *
          videoRatio) + 'px',
        'height': '100%'
      }
      this._videoAreaScale = this.videoArea.nativeElement.clientHeight /
        this.videoMetadata.height;
    } else {
      this.annotationContainerStyle = {
        'left': '0',
        'top': Math.round((this.videoArea.nativeElement.clientHeight -
          this.videoArea.nativeElement.clientWidth / videoRatio) / 2) + 'px',
        'width': '100%',
        'height': Math.round(this.videoArea.nativeElement.clientWidth /
          videoRatio) + 'px',
      };
      this._videoAreaScale = this.videoArea.nativeElement.clientWidth /
        this.videoMetadata.width;
    }
    if (this.isAnnotationLoaded) {
      this.updateVisibleBlocks();
    }
  }

  updateDuration() {
    this.videoMetadata.updateDuration();
    this.duration = this.videoMetadata.duration;
  }

  updateTime() {
    if (!this.isVideoReady) return false;
    this.currTime = Math.round(this.video.nativeElement.currentTime *
      this.videoMetadata.frameRate);
    if (this.highlightedBlockKey != null &&
      this.currTime > this.allBlocks[this.highlightedBlockKey].exitFrame) {
      this.seek(this.allBlocks[this.highlightedBlockKey].enterFrame);
      return;
    }
    if (this.isAnnotationLoaded) {
      this.updateVisibleBlocks();
    }
  }

  updateVideoMetadata() {
    this.updateDuration();
    this.updateTime();
    this.updateAnnotationStyle();
    this.isVideoReady = true;
  }

  updateVisibleBlocks() {
    this.blocks = [];
    for (let blockKey in this._annotation.subjectBlocks) {
      let block = this._annotation.subjectBlocks[blockKey];
      if (this.currTime >= block.enterFrame &&
        this.currTime < block.exitFrame) {
        this.blocks.push(new DisplaySubjectBlock({
          'left': Math.round(block.location.x * this._videoAreaScale) + 'px',
          'top': Math.round(block.location.y * this._videoAreaScale) + 'px',
          'width': Math.round(block.location.width *
            this._videoAreaScale) + 'px',
          'height': Math.round(block.location.height *
            this._videoAreaScale) + 'px'
        }, block.name, blockKey));
      }
    }
  }

  videoUpdate() {
    let videoLoaderEle = this.videoLoader.nativeElement;
    if (!videoLoaderEle.files || !videoLoaderEle.files[0]) return;
    let videoFile = videoLoaderEle.files[0];
    if (this.videoFile !== videoFile) {
      URL.revokeObjectURL(this.videoUrl);
      this._fileName = videoFile.name.replace('.', '_');
      this._videoMetadata = null;
      this.currTime = 0;
      this.highlightedBlockKey = null;
      this.isAnnotationLoaded = false;
      this.isAnnotationModified = false;
      this.isPlaying = false;
      this.isVideoLoaded = true;
      this.isVideoReady = false;
      this.videoFile = videoFile;
      this.videoUrl = URL.createObjectURL(this.videoFile);
      this.safeVideoUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.videoUrl);
    }
  }
}
