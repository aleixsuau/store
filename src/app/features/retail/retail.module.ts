import { NgModule } from '@angular/core';
import { RetailComponent } from './containers/retail/retail.component';
import { SharedModule } from 'src/app/shared/shared.module';
import { RetailRoutingModule } from './retail-routing.module';

@NgModule({
  declarations: [RetailComponent],
  imports: [
    RetailRoutingModule,
    SharedModule,
  ],
})
export class RetailModule { }
