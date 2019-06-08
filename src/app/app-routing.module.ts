import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { LoginComponent } from './features/login/containers/login/login.component';
import { AuthGuard } from './core/auth/auth-guard/auth.guard';

const routes: Routes = [
  {
    path: ':siteId',
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
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
