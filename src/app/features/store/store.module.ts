import { DialogModule } from './../../shared/components/dialog/dialog.module';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatFormFieldModule } from '@angular/material/form-field';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ListComponent } from './containers/list/list.component';
import { StoreRoutingModule } from './store-routing.module';
import { MatTableModule } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';
import { AddComponent } from './containers/add/add.component';
import { MaterialFileInputModule } from 'ngx-material-file-input';
import { MatIconModule } from '@angular/material/icon';
import { ReactiveFormsModule } from '@angular/forms';
import { FocusModule } from 'src/app/shared/directives/focus/focus.module';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';




@NgModule({
  declarations: [
    ListComponent,
    AddComponent
  ],
  imports: [
    CommonModule,
    StoreRoutingModule,
    FlexLayoutModule,
    ReactiveFormsModule,
    FocusModule,
    MatInputModule,
    MatButtonModule,
    MaterialFileInputModule,
    MatIconModule,
    MatTableModule,
    MatFormFieldModule,
    MatSelectModule,
    DialogModule,
  ],
  exports: [
    ListComponent,
  ]
})
export class StoreModule { }
