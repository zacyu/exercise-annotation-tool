import { SubjectBlock, SubjectEvent } from './subject-block';
import { VideoMetadata } from './video-metadata';

export class Annotation {
  private _subjectBlocks: Array<SubjectBlock> = []

  constructor(private _videoMetadata: VideoMetadata) {}

  get subjectBlocks() {
    return this._subjectBlocks;
  }

  get exported(): Object {
    return {
      'version': 3,
      'timestamp': Date.now(),
      'video_metadata': this._videoMetadata.exported,
      'subject_blocks': this._subjectBlocks.map((block) => block.exported)
    };
  }

  addSubjectBlock(block: SubjectBlock) {
    this._subjectBlocks.push(block);
  }

  addSubjectEvent(blockKey: string, event: SubjectEvent) {
    this._subjectBlocks[blockKey].addEvent(event);
  }

  changeSubjectEventData(blockKey: string, eventKey: string, data) {
    let new_event = this._subjectBlocks[blockKey].events[eventKey];
    new_event.data = data;
    this._subjectBlocks[blockKey].changeEvent(eventKey, new_event);
  }

  loadExportedBlocks(exportedBlocks: Array<Object>, scale: number) {
    this._subjectBlocks = exportedBlocks.map(
      (exportedBlock) => SubjectBlock.fromExported(exportedBlock, scale));
  }

  modifyBlock(blockKey: string, data: any) {
    for (let key in data) {
      let value = data[key];
      switch(key) {
        case 'name':
        case 'enterFrame':
        case 'exitFrame':
        case 'type':
          this._subjectBlocks[blockKey][key] = value;
          break;
        default:
          console.error('Key \'' + key + '\' of SubjectBlock is not mutable.');
      }
    }
  }

  removeBlock(blockKey: string) {
    this._subjectBlocks.splice(parseInt(blockKey), 1);
  }

  removeSubjectEventData(blockKey: string, eventKey: string) {
    this._subjectBlocks[blockKey].removeEvent(eventKey);
  }
}
