import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { StorageService } from '../../services/storage.service';
import { Category, LeisureItem, Series, Season } from '../../models';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './list.component.html'
})
export class ListComponent {
  private route = inject(ActivatedRoute);
  storage = inject(StorageService);

  // Determine current category from URL
  category = toSignal(
    this.route.paramMap.pipe(map(params => params.get('category') as Category)),
    { initialValue: 'concerts' as Category }
  );

  // Get items for current category
  items = computed(() => {
    const cat = this.category();
    if (!cat) return [];
    return this.storage.getItemsByCategory(cat)();
  });

  filteredItems = computed(() => {
    let filtered = this.items().filter(item => {
      const term = this.searchTerm().toLowerCase();
      if (!term) return true;
      const title = item.title.toLowerCase();
      let details = this.getDetails(item).toLowerCase();
      return title.includes(term) || details.includes(term);
    });

    if (this.sortColumn()) {
      filtered.sort((a, b) => {
        let aVal, bVal;
        switch (this.sortColumn()) {
          case 'title':
            aVal = a.title.toLowerCase();
            bVal = b.title.toLowerCase();
            break;
          case 'details':
            aVal = this.getDetails(a).toLowerCase();
            bVal = this.getDetails(b).toLowerCase();
            break;
          case 'status':
            aVal = this.getStatusValue(a);
            bVal = this.getStatusValue(b);
            break;
          default:
            return 0;
        }
        if (aVal < bVal) return this.sortDirection() === 'asc' ? -1 : 1;
        if (aVal > bVal) return this.sortDirection() === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return filtered;
  });

  // UI Helper for category titles
  categoryTitle = computed(() => {
    const titles: Record<string, string> = {
      concerts: 'Conciertos',
      books: 'Libros',
      movies: 'Películas',
      series: 'Series',
      games: 'Videojuegos'
    };
    return titles[this.category()] || 'Listado';
  });

  // Series expansion state (local UI state)
  expandedSeries = signal<Set<string>>(new Set());
  expandedSeasons = signal<Record<string, boolean>>({}); // key: seriesId-seasonIdx

  viewMode = signal<'cards' | 'table'>('cards');

  searchTerm = signal('');
  sortColumn = signal<string>('');
  sortDirection = signal<'asc' | 'desc'>('asc');

  toggleSeries(seriesId: string) {
    this.expandedSeries.update(set => {
      const newSet = new Set(set);
      if (newSet.has(seriesId)) newSet.delete(seriesId);
      else newSet.add(seriesId);
      return newSet;
    });
  }

  toggleViewMode() {
    this.viewMode.set(this.viewMode() === 'cards' ? 'table' : 'cards');
  }

  toggleSeason(seriesId: string, seasonIdx: number) {
    const key = `${seriesId}-${seasonIdx}`;
    this.expandedSeasons.update(record => ({
      ...record,
      [key]: !record[key]
    }));
  }

  isSeriesExpanded(id: string) {
    return this.expandedSeries().has(id);
  }

  isSeasonExpanded(seriesId: string, seasonIdx: number) {
    return this.expandedSeasons()[`${seriesId}-${seasonIdx}`];
  }

  // Action wrappers
  toggleItemStatus(item: LeisureItem) {
    const updated = structuredClone(item);
    
    switch(updated.category) {
      case 'concerts': updated.attended = !updated.attended; break;
      case 'books': updated.isRead = !updated.isRead; break;
      case 'movies': updated.isSeen = !updated.isSeen; break;
      case 'games': updated.isPlayed = !updated.isPlayed; break;
      // Series status is handled per episode
    }
    this.storage.updateItem(updated);
  }

  toggleEpisode(seriesId: string, sIdx: number, eIdx: number) {
    this.storage.toggleEpisode(seriesId, sIdx, eIdx);
  }

  deleteItem(id: string) {
    if (confirm('¿Estás seguro de querer eliminar este elemento?')) {
      this.storage.deleteItem(id);
    }
  }

  isSeasonWatched(season: Season): boolean {
    return season.episodes.every(ep => ep.isWatched);
  }

  isSeriesWatched(series: Series): boolean {
    return series.seasons.every(season => this.isSeasonWatched(season));
  }

  toggleSeasonWatched(seriesId: string, seasonIdx: number) {
    const series = this.items().find(item => item.id === seriesId) as Series;
    if (!series) return;
    const season = series.seasons[seasonIdx];
    const allWatched = this.isSeasonWatched(season);
    const targetWatched = !allWatched;
    season.episodes.forEach((ep, eIdx) => {
      if (ep.isWatched !== targetWatched) {
        this.storage.toggleEpisode(seriesId, seasonIdx, eIdx);
      }
    });
  }

  toggleSeriesWatched(seriesId: string) {
    const series = this.items().find(item => item.id === seriesId) as Series;
    if (!series) return;
    const allWatched = this.isSeriesWatched(series);
    const targetWatched = !allWatched;
    series.seasons.forEach((season, sIdx) => {
      season.episodes.forEach((ep, eIdx) => {
        if (ep.isWatched !== targetWatched) {
          this.storage.toggleEpisode(seriesId, sIdx, eIdx);
        }
      });
    });
  }

  // Cast helper for template
  asSeries(item: LeisureItem): Series {
    return item as Series;
  }

  totalEpisodes(series: Series): number {
    return series.seasons.reduce((total, season) => total + season.episodes.length, 0);
  }

  watchedEpisodes(series: Series): number {
    return series.seasons.reduce((total, season) => total + season.episodes.filter(ep => ep.isWatched).length, 0);
  }

  getDetails(item: LeisureItem): string {
    switch (item.category) {
      case 'concerts':
        return (item.venue || 'Lugar desconocido') + ' ' + (item.year || '');
      case 'books':
        return item.author;
      case 'movies':
        return (item.director || '') + ' ' + (item.year || '') + ' ' + (item.cast || '');
      case 'series':
        return (item.platform || 'TV') + ' ' + (item.seasons?.length || 0) + ' T. ' + this.totalEpisodes(this.asSeries(item)) + ' eps';
      case 'games':
        return item.platform || 'PC';
      default:
        return '';
    }
  }

  getStatusValue(item: LeisureItem): number {
    if (item.category === 'series') {
      return this.watchedEpisodes(this.asSeries(item)) / this.totalEpisodes(this.asSeries(item));
    } else {
      return ((item as any).attended || (item as any).isRead || (item as any).isSeen || (item as any).isPlayed) ? 1 : 0;
    }
  }

  toggleSort(column: string) {
    if (this.sortColumn() === column) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortColumn.set(column);
      this.sortDirection.set('asc');
    }
  }

  editEpisodeComment(seriesId: string, sIdx: number, eIdx: number) {
    const series = this.items().find(item => item.id === seriesId) as Series;
    if (!series) return;
    const episode = series.seasons[sIdx].episodes[eIdx];
    const newComment = window.prompt('Editar comentario del episodio:', episode.comment || '');
    if (newComment !== null) {
      this.storage.updateEpisodeComment(seriesId, sIdx, eIdx, newComment);
    }
  }

  deleteEpisodeComment(seriesId: string, sIdx: number, eIdx: number) {
    if (confirm('¿Eliminar el comentario de este episodio?')) {
      this.storage.updateEpisodeComment(seriesId, sIdx, eIdx, '');
    }
  }
}