import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, OneToMany } from 'typeorm';
import { User } from './User';
import { Task } from './Task';

@Entity()
export class Domain {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  domain: string;

  @Column({ default: 'active' })
  status: string;

  @Column({ default: 'aliyun' })
  provider: string;

  @Column({ default: '' })
  cname: string;

  @Column({ default: 'CN' })
  region: string;

  @ManyToOne(() => User, user => user.domains)
  user: User;

  @OneToMany(() => Task, task => task.domain)
  tasks: Task[];

  @CreateDateColumn()
  createdAt: Date;
}
