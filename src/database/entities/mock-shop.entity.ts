import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('mock_shops')
export class MockShop {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  shop_name: string;

  @Column()
  access_token: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}
