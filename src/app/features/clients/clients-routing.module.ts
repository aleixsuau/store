import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { ClientsListComponent } from './containers/clients-list/clients-list.component';
import { ClientsResolverService } from './resolvers/clients.resolver';
import { ContractsResolverService } from '../retail/resolvers/contracts/contracts.resolver';

const routes: Routes = [
  {
    path: '',
    resolve: {
      clients: ClientsResolverService,
      contracts: ContractsResolverService,
    },
    component: ClientsListComponent,
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ClientsRoutingModule { }
