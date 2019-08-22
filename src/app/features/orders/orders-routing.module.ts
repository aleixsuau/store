import { OrdersResolverService } from './resolvers/orders/orders.resolver';
import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { OrdersComponent } from './containers/orders/orders.component';
import { ContractsResolverService } from '../retail/resolvers/contracts/contracts.resolver';

const routes: Routes = [
  {
    path: '',
    resolve: {
      orders: OrdersResolverService,
      contracts: ContractsResolverService,
    },
    component: OrdersComponent,
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class OrdersRoutingModule { }
