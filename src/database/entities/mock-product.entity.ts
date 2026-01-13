import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { MockVariant } from './mock-variant.entity';

@Entity('mock_products')
export class MockProduct {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  shop_id: string;

  @Column()
  shopify_id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  images: any[];

  @OneToMany(() => MockVariant, (variant) => variant.product)
  variants: MockVariant[];

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}
