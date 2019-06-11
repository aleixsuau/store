import { ConfigResolverService } from './core/config/resolver/config.resolver';
import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { LoginComponent } from './features/login/containers/login/login.component';
import { AuthGuard } from './core/auth/auth-guard/auth.guard';
import { BaseComponent } from './core/components/base/base.component';

const routes: Routes = [
  {
    path: ':siteId',
    component: BaseComponent,
    resolve: {
      config: ConfigResolverService,
    },
    children: [
      {
        path: 'login',
        component: LoginComponent,
      },
      {
        path: '',
        canActivate: [AuthGuard],
        canActivateChild: [AuthGuard],
        children: [
          {
            path: '',
            loadChildren: () => import('./features/clients/clients.module').then(m => m.ClientsModule),
          }
        ]
      },
    ]
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
