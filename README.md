# exercise-annotation-tool
A web-based exercise annotation tool originally created for GymCam.

## Development server
Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files

## Build
Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory. Use the `-prod` flag for a production build

## Usage
While this tool is created for labeling gym activities and counting the repetitions, it can be used more generically for any labelling tasks of videos recorded from a stationary camera.

### Load video
To start, load a video supported by your browser. One caveat is that as of now, the tool does not detect video FPS automatically and assumes a hard-coded value in `/src/app/video-metadata.ts`.

### Load/create annotation files
After the video is loaded, you can continue from a previously saved annotation file or create a new one. When an annotation file is loaded/created, you will see a paperclip symbol next to the time code display.

### Save annotation files
Whenever you have made some changes to loaded annotation file, you will see a `\*` sign next to the paperclip symbol. You can save the annotation file in JSON format. The saved file contains annotation file version (currently 3), timestamp, video metadata, and block infos.

### Create a new annotation block
Pause at the frame which the annotated action begins, and draw the annotation block on top of the video. You need to give the block a name. The name does not have to be unique, and the tool will suggest a name that you can use which is not guaranteed to be unique.

### Adding a text annotation to a block
At any point of the video, you can click on a block to add a text annotation that is associated with that particular frame. When you mark the end frame of a block, you will be prompt to add a summary, a special type of text annotation. In GymCam, it is used for the number of repetitions of some exercise, but you can use it for whatever string that fits your needs.

### Changing frame endpoints
When a block is first created, it has a end frame of the last frame of the video. You can edit the endpoints of a block (both start and end frame).

### Block classification
If needed, you can add a class name to each annotation block. Just click on the block in the list, and enter a name. All used names will be stored locally as autocomplete candidates. You can edit the default types in `/src/app/tagging-tool.component.ts`.
