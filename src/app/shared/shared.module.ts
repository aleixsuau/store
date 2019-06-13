import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule, MatInputModule, MatButtonModule, MatProgressBarModule, MatToolbarModule, MatCheckboxModule, MatIconModule } from '@angular/material';
import { FlexLayoutModule } from '@angular/flex-layout';


@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    HttpClientModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressBarModule,
    MatToolbarModule,
    MatCheckboxModule,
    MatIconModule,
    FlexLayoutModule,
  ],
  exports: [
    CommonModule,
    HttpClientModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressBarModule,
    MatToolbarModule,
    MatCheckboxModule,
    MatIconModule,
    FlexLayoutModule,
  ],
})
export class SharedModule { }
