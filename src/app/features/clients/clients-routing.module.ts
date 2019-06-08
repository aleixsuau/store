import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { ClientsListComponent } from './containers/clients-list/clients-list.component';
import { ClientsResolverService } from './resolvers/clients.resolver';

const routes: Routes = [
  {
    path: '',
    resolve: {
      clients: ClientsResolverService,
    },
    component: ClientsListComponent,
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ClientsRoutingModule { }
