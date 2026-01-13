import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { MockOrder } from './mock-order.entity';

@Entity('mock_order_line_items')
export class MockOrderLineItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  order_id: string;

  @Column()
  shopify_variant_id: string;

  @Column()
  title: string;

  @Column()
  sku: string;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;

  @ManyToOne(() => MockOrder, (order) => order.line_items)
  order: MockOrder;
}
