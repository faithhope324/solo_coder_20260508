import { DataSource } from 'typeorm';
import { User } from '../entities/User';
import { Domain } from '../entities/Domain';
import { Task } from '../entities/Task';
import * as path from 'path';

export const AppDataSource = new DataSource({
  type: 'sqlite',
  database: path.join(__dirname, '../../data/cdn.db'),
  synchronize: true,
  logging: false,
  entities: [User, Domain, Task],
  migrations: [],
  subscribers: [],
});
