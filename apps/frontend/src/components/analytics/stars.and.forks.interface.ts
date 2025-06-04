export interface StarsList {
  totalStars: number;
  date: string;
}
export interface TotalList {
  total: number;
  date: string;
}
export interface ForksList {
  totalForks: number;
  date: string;
}
export interface Stars {
  id: string;
  stars: number;
  totalStars: number;
  login: string;
  date: string;
}
export interface StarsAndForksInterface {
  list: Array<{
    login: string;
    stars: StarsList[];
    forks: ForksList[];
  }>;
  trending: {
    last: string;
    predictions: string;
  };
}
