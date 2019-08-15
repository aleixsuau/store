import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule, MatInputModule, MatButtonModule, MatProgressBarModule, MatToolbarModule, MatCheckboxModule, MatIconModule, MatSnackBarModule, MatDialogModule, MatRadioModule, MatDatepickerModule, MatCardModule, MatAutocompleteModule, MatSelectModule, MatExpansionModule, MatTabsModule } from '@angular/material';
import { FlexLayoutModule } from '@angular/flex-layout';
import { RouterModule } from '@angular/router';


@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressBarModule,
    MatToolbarModule,
    MatCheckboxModule,
    MatIconModule,
    MatSnackBarModule,
    MatDialogModule,
    MatRadioModule,
    MatDatepickerModule,
    MatCardModule,
    MatAutocompleteModule,
    MatSelectModule,
    MatExpansionModule,
    MatTabsModule,
    FlexLayoutModule,
  ],
  exports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressBarModule,
    MatToolbarModule,
    MatCheckboxModule,
    MatIconModule,
    MatSnackBarModule,
    MatDialogModule,
    MatRadioModule,
    MatDatepickerModule,
    MatCardModule,
    MatAutocompleteModule,
    MatSelectModule,
    MatExpansionModule,
    MatTabsModule,
    FlexLayoutModule,
  ],
})
export class SharedModule { }
