import { Routes } from '@angular/router';
import { ListComponent } from './pages/list/list.component';
import { FormComponent } from './pages/form/form.component';

export const routes: Routes = [
  { path: '', redirectTo: 'concerts', pathMatch: 'full' },
  { path: 'add', component: FormComponent },
  { path: 'edit/:id', component: FormComponent },
  { path: ':category', component: ListComponent },
];