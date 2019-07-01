import { RetailComponent } from './containers/retail/retail.component';
import { ContractsResolverService } from './resolvers/contracts/contracts.resolver';
import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { ClientsResolverService } from '../clients/resolvers/clients.resolver';

const routes: Routes = [
  {
    path: '',
    resolve: {
      contracts: ContractsResolverService,
    },
    component: RetailComponent,
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RetailRoutingModule { }
