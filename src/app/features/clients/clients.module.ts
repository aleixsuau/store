import { NgModule } from '@angular/core';
import { MatTableModule, MatPaginatorModule } from '@angular/material';

import { ClientsRoutingModule } from './clients-routing.module';
import { ClientsListComponent } from './containers/clients-list/clients-list.component';
import { SharedModule } from 'src/app/shared/shared.module';


@NgModule({
  declarations: [ClientsListComponent],
  imports: [
    SharedModule,
    ClientsRoutingModule,
    MatTableModule,
    MatPaginatorModule,
  ],
})
export class ClientsModule { }
