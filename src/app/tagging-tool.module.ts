import { FormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import {
  MatAutocompleteModule, MatButtonModule, MatCardModule, MatDialogModule,
  MatFormFieldModule, MatGridListModule, MatIconModule, MatInputModule,
  MatListModule, MatMenuModule, MatSliderModule, MatSnackBarModule,
  MatTooltipModule,
} from '@angular/material';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { NewFileWarningDialog, StringPromptDialog, TaggingToolComponent }
  from './tagging-tool.component';

@NgModule({
  declarations: [
    NewFileWarningDialog,
    StringPromptDialog,
    TaggingToolComponent
  ],
  entryComponents: [
    NewFileWarningDialog,
    StringPromptDialog
  ],
  exports: [
    NewFileWarningDialog,
    TaggingToolComponent
  ],
  imports: [
    BrowserAnimationsModule,
    CommonModule,
    FormsModule,
    MatAutocompleteModule,
    MatFormFieldModule,
    MatInputModule,
    MatListModule,
    MatMenuModule,
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatGridListModule,
    MatIconModule,
    MatSliderModule,
    MatSnackBarModule,
    MatTooltipModule
  ],
  providers: []
})
export class TaggingToolModule { }
