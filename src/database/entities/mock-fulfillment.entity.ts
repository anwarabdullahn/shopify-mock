import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { MockOrder } from './mock-order.entity';

@Entity('mock_fulfillments')
export class MockFulfillment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  order_id: string;

  @Column()
  shopify_id: string;

  @Column({ type: 'enum', enum: ['pending', 'scheduled', 'in_transit', 'delivered', 'failure'], default: 'pending' })
  status: string;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  line_items: any[];

  @Column({ nullable: true })
  tracking_number: string;

  @Column({ nullable: true })
  tracking_url: string;

  @Column({ type: 'timestamp', nullable: true })
  shipped_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  delivered_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updated_at: Date;

  @ManyToOne(() => MockOrder, (order) => order.fulfillments)
  order: MockOrder;
}
