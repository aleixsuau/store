import { ErrorsComponent } from './core/errors/errors-component/errors.component';
import { ConfigResolverService } from './core/config/resolver/config.resolver';
import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { LoginComponent } from './features/login/containers/login/login.component';
import { AuthGuard } from './core/auth/auth-guard/auth.guard';
import { BaseComponent } from './core/components/base/base.component';
import { ConfigGuard } from './core/guards/config-guard/config.guard';

const routes: Routes = [
  {
    path: ':siteId',
    canActivate: [ConfigGuard],
    canActivateChild: [ConfigGuard],
    children: [
      {
        path: 'login',
        component: LoginComponent,
      },
      {
        path: '',
        component: BaseComponent,
        canActivate: [AuthGuard],
        canActivateChild: [AuthGuard],
        children: [
          {
            path: '',
            pathMatch: 'full',
            redirectTo: 'clients',
          },
          {
            path: 'clients',
            loadChildren: () => import('./features/clients/clients.module').then(m => m.ClientsModule),
          },
          {
            path: 'retail',
            loadChildren: () => import('./features/retail/retail.module').then(m => m.RetailModule),
          },
          {
            path: 'orders',
            loadChildren: () => import('./features/orders/orders.module').then(m => m.OrdersModule),
          },
        ]
      },
    ]
  },
  { path: '**', component: ErrorsComponent, data: { error: 404 } },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {enableTracing: true})],
  exports: [RouterModule]
})
export class AppRoutingModule { }
