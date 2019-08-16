import { PaymentsResolverService } from './resolvers/payments/payments.resolver';
import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { PaymentsComponent } from './containers/payments/payments.component';
import { ContractsResolverService } from '../retail/resolvers/contracts/contracts.resolver';

const routes: Routes = [
  {
    path: '',
    resolve: {
      payments: PaymentsResolverService,
      contracts: ContractsResolverService,
    },
    component: PaymentsComponent,
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PaymentsRoutingModule { }
