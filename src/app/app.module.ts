import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { BrowserModule } from '@angular/platform-browser';
import { MatDialogModule, MatToolbarModule } from '@angular/material';
import { NgModule } from '@angular/core';
import { TaggingToolModule } from './tagging-tool.module';

import { AppComponent } from './app.component';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserAnimationsModule,
    BrowserModule,
    MatDialogModule,
    MatToolbarModule,
    TaggingToolModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
