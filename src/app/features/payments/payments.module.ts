import { SharedModule } from 'src/app/shared/shared.module';
import { NgModule } from '@angular/core';

import { PaymentsRoutingModule } from './payments-routing.module';
import { PaymentsComponent } from './containers/payments/payments.component';

@NgModule({
  declarations: [PaymentsComponent],
  imports: [
    PaymentsRoutingModule,
    SharedModule,
  ]
})
export class PaymentsModule { }
