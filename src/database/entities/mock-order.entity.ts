import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { MockOrderLineItem } from './mock-order-line-item.entity';
import { MockFulfillment } from './mock-fulfillment.entity';

@Entity('mock_orders')
export class MockOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  shop_id: string;

  @Column()
  shopify_id: string;

  @Column()
  order_number: number;

  @Column()
  customer_email: string;

  @Column({ type: 'enum', enum: ['pending', 'confirmed', 'processing', 'cancelled', 'completed'], default: 'pending' })
  status: string;

  @Column({ type: 'enum', enum: ['unshipped', 'shipped', 'delivered', 'cancelled'], default: 'unshipped' })
  fulfillment_status: string;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  shipping_address: any;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total_price: number;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  metadata: any;

  @OneToMany(() => MockOrderLineItem, (lineItem) => lineItem.order)
  line_items: MockOrderLineItem[];

  @OneToMany(() => MockFulfillment, (fulfillment) => fulfillment.order)
  fulfillments: MockFulfillment[];

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}
