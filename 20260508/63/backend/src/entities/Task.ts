import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { Domain } from './Domain';
import { User } from './User';

export type TaskType = 'preheat' | 'refresh';
export type TaskStatus = 'pending' | 'processing' | 'success' | 'failed';

@Entity()
export class Task {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text' })
  urls: string;

  @Column()
  type: TaskType;

  @Column({ default: 'pending' })
  status: TaskStatus;

  @Column({ default: 0 })
  progress: number;

  @Column({ default: 0 })
  totalCount: number;

  @Column({ default: 0 })
  successCount: number;

  @Column({ default: 0 })
  failCount: number;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @ManyToOne(() => Domain, domain => domain.tasks)
  domain: Domain;

  @ManyToOne(() => User)
  user: User;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ nullable: true })
  completedAt: Date;
}
