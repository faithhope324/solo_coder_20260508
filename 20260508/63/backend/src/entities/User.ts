import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { Domain } from './Domain';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  username: string;

  @Column()
  password: string;

  @Column({ unique: true })
  email: string;

  @Column({ default: 'user' })
  role: string;

  @OneToMany(() => Domain, domain => domain.user)
  domains: Domain[];

  @CreateDateColumn()
  createdAt: Date;
}
