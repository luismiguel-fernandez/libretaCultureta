import { Injectable, signal, computed, effect } from '@angular/core';
import { LeisureItem, Category, Series } from '../models';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private readonly STORAGE_KEY = 'leisure_tracker_data_v1';
  private storageAvailable = true;
  
  // Main state signal
  private itemsSignal = signal<LeisureItem[]>(this.loadFromStorage());

  // Computed signals for filtering
  readonly items = this.itemsSignal.asReadonly();
  
  constructor() {
    // Effect to auto-save whenever items change
    effect(() => {
      this.saveToStorage(this.itemsSignal());
    });
  }

  private loadFromStorage(): LeisureItem[] {
    try {
      // Check availability by trying to access the property
      const storage = window.localStorage;
      const data = storage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.warn('LocalStorage access is restricted. Persistence disabled.');
      this.storageAvailable = false;
      return [];
    }
  }

  private saveToStorage(items: LeisureItem[]) {
    if (!this.storageAvailable) return;
    
    try {
      window.localStorage.setItem(this.STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn('Failed to save to LocalStorage:', e);
      // If we fail to save once due to security, stop trying
      if (e instanceof DOMException && e.name === 'SecurityError') {
        this.storageAvailable = false;
      }
    }
  }

  addItem(item: LeisureItem) {
    this.itemsSignal.update(items => [item, ...items]);
  }

  updateItem(updatedItem: LeisureItem) {
    this.itemsSignal.update(items => 
      items.map(item => item.id === updatedItem.id ? updatedItem : item)
    );
  }

  deleteItem(id: string) {
    this.itemsSignal.update(items => items.filter(item => item.id !== id));
  }

  getItemsByCategory(category: Category) {
    return computed(() => this.itemsSignal().filter(item => item.category === category));
  }

  // Helper for series
  toggleEpisode(seriesId: string, seasonIndex: number, episodeIndex: number) {
    const items = this.itemsSignal();
    const series = items.find(i => i.id === seriesId);
    
    if (series && series.category === 'series') {
      const updatedSeries = structuredClone(series) as Series;
      const episode = updatedSeries.seasons[seasonIndex].episodes[episodeIndex];
      episode.isWatched = !episode.isWatched;
      this.updateItem(updatedSeries);
    }
  }

  updateEpisodeComment(seriesId: string, seasonIndex: number, episodeIndex: number, comment: string) {
    const items = this.itemsSignal();
    const series = items.find(i => i.id === seriesId);
    
    if (series && series.category === 'series') {
      const updatedSeries = structuredClone(series) as Series;
      const episode = updatedSeries.seasons[seasonIndex].episodes[episodeIndex];
      episode.comment = comment;
      this.updateItem(updatedSeries);
    }
  }
}