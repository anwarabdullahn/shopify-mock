import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { MockProduct } from './mock-product.entity';

@Entity('mock_variants')
export class MockVariant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  product_id: string;

  @Column()
  shopify_id: string;

  @Column()
  sku: string;

  @Column()
  title: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'int', default: 0 })
  quantity: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;

  @ManyToOne(() => MockProduct, (product) => product.variants)
  product: MockProduct;
}
