import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormArray, FormGroup } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { StorageService } from '../../services/storage.service';
import { PLATFORMS_SERIES, PLATFORMS_GAMES, Category, LeisureItem, Series, Season, Episode } from '../../models';

@Component({
  selector: 'app-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './form.component.html'
})
export class FormComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private storage = inject(StorageService);

  platformsSeries = PLATFORMS_SERIES;
  platformsGames = PLATFORMS_GAMES;
  
  editMode = signal(false);
  itemId = signal<string | null>(null);
  
  // Current selected category
  selectedCategory = signal<Category>('concerts');

  yearUnknown = signal(false);

  form = this.fb.group({
    title: ['', Validators.required],
    comment: [''],
    // Concerts
    venue: [''],
    year: [new Date().getFullYear()],
    attended: [false],
    // Books
    author: [''],
    isRead: [false],
    // Movies
    director: [''],
    cast: [''],
    isSeen: [false],
    // Series
    platform: [''],
    seasons: this.fb.array([]),
    // Games
    isPlayed: [false],
  });

  constructor() {
    // Handle query params for initial type
    this.route.queryParams.subscribe(params => {
      if (params['type']) {
        this.selectedCategory.set(params['type'] as Category);
      }
    });

    // Handle Edit Mode
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.editMode.set(true);
        this.itemId.set(id);
        this.loadItem(id);
      }
    });
  }

  get seasonsArray() {
    return this.form.get('seasons') as FormArray;
  }

  changeCategory(cat: Category) {
    this.selectedCategory.set(cat);
    // Reset specific validations or fields if needed, but keeping simple for now
  }

  toggleYearUnknown() {
    this.yearUnknown.set(!this.yearUnknown());
    if (this.yearUnknown()) {
      this.form.get('year')?.setValue(null);
    } else {
      this.form.get('year')?.setValue(new Date().getFullYear());
    }
  }

  loadItem(id: string) {
    const item = this.storage.items().find(i => i.id === id);
    if (!item) {
      this.router.navigate(['/']);
      return;
    }

    this.selectedCategory.set(item.category);
    this.form.patchValue(item as any);

    if (item.category === 'concerts') {
      const concert = item as any;
      this.yearUnknown.set(!concert.year);
    }

    if (item.category === 'series') {
      const series = item as Series;
      this.seasonsArray.clear();
      series.seasons.forEach(season => {
        const seasonGroup = this.createSeasonGroup(season.seasonNumber);
        seasonGroup.get('episodeCount')?.setValue(season.episodes.length);
        const episodesArray = seasonGroup.get('episodes') as FormArray;
        season.episodes.forEach(ep => {
          episodesArray.push(this.fb.group({
            number: [ep.number],
            isWatched: [ep.isWatched],
            comment: [ep.comment || '']
          }));
        });
        this.seasonsArray.push(seasonGroup);
      });
    }
  }

  createSeasonGroup(number: number) {
    return this.fb.group({
      seasonNumber: [number],
      episodeCount: [10], // Helper for generation
      episodes: this.fb.array([])
    });
  }

  // Helper to add a new season with X episodes
  addSeason() {
    const nextNum = this.seasonsArray.length + 1;
    const group = this.createSeasonGroup(nextNum);
    // Pre-fill episodes based on default count
    this.generateEpisodes(group, 10);
    this.seasonsArray.push(group);
  }

  removeSeason(index: number) {
    this.seasonsArray.removeAt(index);
  }

  // Update episodes when user changes "Episode Count" input in a season
  updateEpisodesForSeason(index: number, count: any) {
    const val = parseInt(count, 10);
    if (isNaN(val) || val < 1) return;
    
    const seasonGroup = this.seasonsArray.at(index) as FormGroup;
    this.generateEpisodes(seasonGroup, val);
  }

  generateEpisodes(seasonGroup: FormGroup, count: number) {
    const arr = seasonGroup.get('episodes') as FormArray;
    // Clear and rebuild (simple approach)
    
    const currentLength = arr.length;
    
    if (count > currentLength) {
      for (let i = currentLength + 1; i <= count; i++) {
        arr.push(this.fb.group({
          number: [i],
          isWatched: [false],
          comment: ['']
        }));
      }
    } else if (count < currentLength) {
      for (let i = currentLength - 1; i >= count; i--) {
        arr.removeAt(i);
      }
    }
  }

  // Safe ID generator that works in insecure contexts
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  onSubmit() {
    if (this.form.invalid) return;

    const formVal = this.form.value;
    const cat = this.selectedCategory();
    
    const baseItem: any = {
      id: this.itemId() || this.generateId(),
      category: cat,
      title: formVal.title!,
      comment: formVal.comment || '',
      createdAt: Date.now()
    };

    let finalItem: LeisureItem;

    switch (cat) {
      case 'concerts':
        finalItem = { ...baseItem, venue: formVal.venue, year: formVal.year, attended: formVal.attended } as any;
        break;
      case 'books':
        finalItem = { ...baseItem, author: formVal.author, isRead: formVal.isRead } as any;
        break;
      case 'movies':
        finalItem = { ...baseItem, director: formVal.director, cast: formVal.cast, year: formVal.year, isSeen: formVal.isSeen } as any;
        break;
      case 'games':
        finalItem = { ...baseItem, platform: formVal.platform, isPlayed: formVal.isPlayed } as any;
        break;
      case 'series':
        // Process seasons
        const seasonsData = (formVal.seasons as any[]).map((s: any) => ({
          seasonNumber: s.seasonNumber,
          episodes: s.episodes
        }));
        finalItem = { ...baseItem, platform: formVal.platform, seasons: seasonsData } as Series;
        break;
      default:
        return;
    }

    if (this.editMode()) {
      this.storage.updateItem(finalItem);
    } else {
      this.storage.addItem(finalItem);
    }

    this.router.navigate(['/' + cat]);
  }

  goBack() {
    this.router.navigate(['/' + this.selectedCategory()]);
  }
}