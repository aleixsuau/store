import { SharedModule } from 'src/app/shared/shared.module';
import { NgModule } from '@angular/core';

import { OrdersRoutingModule } from './orders-routing.module';
import { OrdersComponent } from './containers/orders/orders.component';

@NgModule({
  declarations: [OrdersComponent],
  imports: [
    OrdersRoutingModule,
    SharedModule,
  ]
})
export class OrdersModule { }
