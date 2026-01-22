export type Category = 'concerts' | 'books' | 'movies' | 'series' | 'games';

export const PLATFORMS_SERIES = ['Netflix', 'Prime', 'Movistar', 'HBO', 'Filmin', 'Disney', 'RTVE', 'Otra'];
export const PLATFORMS_GAMES = ['Steam', 'GoG', 'Epic', 'Amazon', 'EA', 'Ubisoft', 'Otra'];

export interface BaseItem {
  id: string;
  category: Category;
  title: string; // Name/Title
  comment?: string;
  createdAt: number;
}

export interface Concert extends BaseItem {
  category: 'concerts';
  venue?: string;
  year?: number;
  attended: boolean;
}

export interface Book extends BaseItem {
  category: 'books';
  author: string;
  isRead: boolean;
}

export interface Movie extends BaseItem {
  category: 'movies';
  director?: string;
  cast?: string;
  year?: number;
  isSeen: boolean;
}

export interface Episode {
  number: number;
  isWatched: boolean;
  comment?: string;
}

export interface Season {
  seasonNumber: number;
  episodes: Episode[];
  isExpanded?: boolean; // UI state
}

export interface Series extends BaseItem {
  category: 'series';
  platform?: string;
  seasons: Season[];
}

export interface Game extends BaseItem {
  category: 'games';
  platform?: string;
  isPlayed: boolean; // Jugado vs Pendiente
}

export type LeisureItem = Concert | Book | Movie | Series | Game;