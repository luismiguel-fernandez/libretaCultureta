import { Component, signal, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './app.component.html'
})
export class AppComponent {
  private router = inject(Router);
  menuOpen = signal(false);
  currentTitle = signal('Leisure Tracker');

  navItems = [
    { path: '/concerts', label: 'Conciertos', icon: '🎤' },
    { path: '/books', label: 'Libros', icon: '📚' },
    { path: '/movies', label: 'Películas', icon: '🎬' },
    { path: '/series', label: 'Series', icon: '📺' },
    { path: '/games', label: 'Videojuegos', icon: '🎮' },
  ];

  constructor() {
    this.router.events.pipe(
      filter(ev => ev instanceof NavigationEnd)
    ).subscribe((ev: any) => {
      this.updateTitle(ev.urlAfterRedirects);
    });
  }

  private updateTitle(url: string) {
    if (url.includes('/concerts')) this.currentTitle.set('Conciertos');
    else if (url.includes('/books')) this.currentTitle.set('Libros');
    else if (url.includes('/movies')) this.currentTitle.set('Películas');
    else if (url.includes('/series')) this.currentTitle.set('Series');
    else if (url.includes('/games')) this.currentTitle.set('Videojuegos');
    else if (url.includes('/add')) this.currentTitle.set('Nuevo Registro');
    else if (url.includes('/edit')) this.currentTitle.set('Editar');
    else this.currentTitle.set('Leisure Tracker');
  }

  toggleMenu() {
    this.menuOpen.update(v => !v);
  }

  closeMenu() {
    this.menuOpen.set(false);
  }
}