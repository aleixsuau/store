import { FlexLayoutModule } from '@angular/flex-layout';
import { MatFormFieldModule } from '@angular/material/form-field';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreComponent } from './containers/store/store.component';
import { StoreRoutingModule } from './store-routing.module';
import { MatTableModule } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';



@NgModule({
  declarations: [
    StoreComponent
  ],
  imports: [
    CommonModule,
    StoreRoutingModule,
    MatTableModule,
    MatFormFieldModule,
    MatSelectModule,
    FlexLayoutModule,
  ],
  exports: [
    StoreComponent,
  ]
})
export class StoreModule { }
