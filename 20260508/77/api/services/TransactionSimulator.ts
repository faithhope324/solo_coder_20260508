import { v4 as uuidv4 } from 'uuid';
import type { Transaction, TransactionFeatures } from '../types';
import { IsolationForest } from './IsolationForest';

interface City {
  name: string;
  country: string;
  lat: number;
  lng: number;
  risk: number;
}

const CITIES: City[] = [
  { name: 'New York', country: 'USA', lat: 40.7128, lng: -74.0060, risk: 0.3 },
  { name: 'London', country: 'UK', lat: 51.5074, lng: -0.1278, risk: 0.25 },
  { name: 'Tokyo', country: 'Japan', lat: 35.6762, lng: 139.6503, risk: 0.15 },
  { name: 'Paris', country: 'France', lat: 48.8566, lng: 2.3522, risk: 0.28 },
  { name: 'Sydney', country: 'Australia', lat: -33.8688, lng: 151.2093, risk: 0.2 },
  { name: 'Dubai', country: 'UAE', lat: 25.2048, lng: 55.2708, risk: 0.45 },
  { name: 'Singapore', country: 'Singapore', lat: 1.3521, lng: 103.8198, risk: 0.22 },
  { name: 'Hong Kong', country: 'China', lat: 22.3193, lng: 114.1694, risk: 0.35 },
  { name: 'Mumbai', country: 'India', lat: 19.0760, lng: 72.8777, risk: 0.5 },
  { name: 'Sao Paulo', country: 'Brazil', lat: -23.5505, lng: -46.6333, risk: 0.55 },
  { name: 'Moscow', country: 'Russia', lat: 55.7558, lng: 37.6173, risk: 0.6 },
  { name: 'Lagos', country: 'Nigeria', lat: 6.5244, lng: 3.3792, risk: 0.7 },
  { name: 'Cairo', country: 'Egypt', lat: 30.0444, lng: 31.2357, risk: 0.65 },
  { name: 'Toronto', country: 'Canada', lat: 43.6532, lng: -79.3832, risk: 0.2 },
  { name: 'Berlin', country: 'Germany', lat: 52.5200, lng: 13.4050, risk: 0.22 },
  { name: 'Seoul', country: 'South Korea', lat: 37.5665, lng: 126.9780, risk: 0.18 },
  { name: 'Bangkok', country: 'Thailand', lat: 13.7563, lng: 100.5018, risk: 0.4 },
  { name: 'Istanbul', country: 'Turkey', lat: 41.0082, lng: 28.9784, risk: 0.48 },
  { name: 'Mexico City', country: 'Mexico', lat: 19.4326, lng: -99.1332, risk: 0.52 },
  { name: 'Jakarta', country: 'Indonesia', lat: -6.2088, lng: 106.8456, risk: 0.58 },
];

const MERCHANTS = [
  { name: 'Amazon', risk: 0.1 },
  { name: 'Walmart', risk: 0.12 },
  { name: 'Apple Store', risk: 0.08 },
  { name: 'Netflix', risk: 0.15 },
  { name: 'Uber', risk: 0.25 },
  { name: 'Airbnb', risk: 0.3 },
  { name: 'Starbucks', risk: 0.1 },
  { name: 'McDonalds', risk: 0.11 },
  { name: 'Target', risk: 0.13 },
  { name: 'Best Buy', risk: 0.18 },
  { name: 'Home Depot', risk: 0.14 },
  { name: 'Luxury Watch Store', risk: 0.7 },
  { name: 'High-End Jewelry', risk: 0.75 },
  { name: 'Electronics Boutique', risk: 0.55 },
  { name: 'Casino Resort', risk: 0.65 },
  { name: 'Private Jet Charter', risk: 0.8 },
  { name: 'Crypto Exchange', risk: 0.72 },
  { name: 'Online Gaming', risk: 0.45 },
  { name: 'Adult Entertainment', risk: 0.5 },
  { name: 'Anonymous Marketplace', risk: 0.85 },
];

const CARD_TYPES = ['Visa', 'MasterCard', 'Amex', 'Discover', 'JCB'];
const TRANSACTION_TYPES = ['Purchase', 'Cash Advance', 'Balance Transfer', 'Online Payment', 'ATM Withdrawal'];

export class TransactionSimulator {
  private model: IsolationForest;
  private lastTransactionTimes: Map<string, number> = new Map();
  private userHomeLocations: Map<string, City> = new Map();

  constructor(model: IsolationForest) {
    this.model = model;
    this.initializeUserProfiles();
  }

  private initializeUserProfiles(): void {
    for (let i = 0; i < 100; i++) {
      const userId = `user_${i}`;
      const homeCity = CITIES[Math.floor(Math.random() * 10)];
      this.userHomeLocations.set(userId, homeCity);
    }
  }

  private random<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  private randomRange(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  private calculateLocationDeviation(city: City, userId: string): number {
    const home = this.userHomeLocations.get(userId);
    if (!home) return 0.5;

    const R = 6371;
    const dLat = ((city.lat - home.lat) * Math.PI) / 180;
    const dLng = ((city.lng - home.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((home.lat * Math.PI) / 180) *
        Math.cos((city.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return Math.min(1, distance / 15000);
  }

  private calculateTransactionFrequency(userId: string): number {
    const now = Date.now();
    const lastTime = this.lastTransactionTimes.get(userId) || 0;
    const timeDiff = (now - lastTime) / 1000 / 60;

    this.lastTransactionTimes.set(userId, now);

    if (timeDiff < 1) return 1;
    if (timeDiff < 5) return 0.8;
    if (timeDiff < 30) return 0.5;
    if (timeDiff < 60) return 0.3;
    return 0.1;
  }

  public generateTransaction(): Transaction {
    const isFraudPattern = Math.random() < 0.03;
    const userId = `user_${Math.floor(Math.random() * 100)}`;

    let city: City;
    let merchant: { name: string; risk: number };
    let amount: number;
    let hourDeviation: number;

    if (isFraudPattern) {
      city = CITIES.filter((c) => c.risk > 0.4)[Math.floor(Math.random() * CITIES.filter((c) => c.risk > 0.4).length)];
      merchant = MERCHANTS.filter((m) => m.risk > 0.5)[
        Math.floor(Math.random() * MERCHANTS.filter((m) => m.risk > 0.5).length)
      ];
      amount = this.randomRange(3000, 50000);
      hourDeviation = this.randomRange(8, 24);
    } else {
      city = this.random(CITIES.slice(0, 15));
      merchant = this.random(MERCHANTS.filter((m) => m.risk < 0.4));
      amount = this.randomRange(10, 2000);
      hourDeviation = this.randomRange(0, 8);
    }

    const locationDeviation = this.calculateLocationDeviation(city, userId);
    const frequency = this.calculateTransactionFrequency(userId);
    const merchantRisk = merchant.risk;

    const features: TransactionFeatures = {
      amount,
      hourDeviation,
      locationDeviation,
      merchantRisk,
      frequency,
    };

    const featureVector = IsolationForest.extractFeatures(features);
    const { score, isFraud } = this.model.predict(featureVector, 0.6);

    return {
      id: uuidv4(),
      amount: Math.round(amount * 100) / 100,
      merchant: merchant.name,
      location: `${city.name}, ${city.country}`,
      lat: city.lat + this.randomRange(-0.05, 0.05),
      lng: city.lng + this.randomRange(-0.05, 0.05),
      city: city.name,
      country: city.country,
      fraudScore: Math.round(score * 1000) / 1000,
      isFraud,
      timestamp: new Date().toISOString(),
      cardType: this.random(CARD_TYPES),
      transactionType: this.random(TRANSACTION_TYPES),
    };
  }

  public generateBatch(count: number): Transaction[] {
    const transactions: Transaction[] = [];
    for (let i = 0; i < count; i++) {
      transactions.push(this.generateTransaction());
    }
    return transactions;
  }
}
